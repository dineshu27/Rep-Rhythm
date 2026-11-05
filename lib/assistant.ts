import { z } from 'zod';
import { exerciseCatalogue, presetExercise } from './exercise-catalog';
import { foodSchema, workspaceSchema, type Workspace, type FoodRecord, shiftDate, dayNutrition } from './workspace';
import type { WorkoutState, Plan } from './workouts';

export const assistantModes = ['food', 'workout', 'meals', 'review'] as const;
export type AssistantMode = typeof assistantModes[number];
export const aiRequestSchema = z.object({
  mode: z.enum(assistantModes), description: z.string().trim().min(3).max(2000), consent: z.literal(true),
  provider: z.enum(['openai', 'anthropic']).optional(), usePersonalKey: z.boolean().optional(), billingConsent: z.boolean().optional(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) })).max(8).optional(),
  facts: z.array(z.object({ id: z.string().max(60), value: z.string().max(250) })).max(15),
});
export const aiDraftSchema = z.object({
  message: z.string().max(1500),
  foods: z.array(z.object({ query: z.string().min(2).max(100), grams: z.number().positive().max(10000).nullable(), note: z.string().max(300) })).max(12),
  exercises: z.array(z.object({ presetId: z.string().max(100), rounds: z.number().int().min(1).max(5), amount: z.number().int().min(1).max(120), restSeconds: z.number().int().min(0).max(300), reason: z.string().max(300) })).max(8),
  tips: z.array(z.object({ text: z.string().max(500), factIds: z.array(z.string().max(60)).max(15) })).max(5),
});
export type AIDraft = z.infer<typeof aiDraftSchema>;
export const matchedDraftSchema = aiDraftSchema.extend({ matches: z.array(z.array(foodSchema).max(3)).max(12) });
export type MatchedDraft = z.infer<typeof matchedDraftSchema>;
export type FoodChoice = { food: FoodRecord; grams: number };
export function validateDraft(raw: unknown, request: z.infer<typeof aiRequestSchema>) {
  const draft = aiDraftSchema.parse(raw);
  if (draft.exercises.some(row => !exerciseCatalogue.some(item => item.id === row.presetId && (item.kind === 'seconds' || row.amount <= 30)))) throw new Error('Unknown exercise or invalid reps.');
  if (new Set(draft.exercises.map(row => row.presetId)).size !== draft.exercises.length) throw new Error('Duplicate exercise.');
  if (draft.tips.some(tip => tip.factIds.some(id => !request.facts.some(fact => fact.id === id)))) throw new Error('Unknown fact.');
  if ((request.mode === 'food' || request.mode === 'meals') ? draft.exercises.length > 0 : draft.foods.length > 0) throw new Error('Unexpected draft content.');
  if (request.mode !== 'workout' && draft.exercises.length) throw new Error('Unexpected exercises.');
  return draft;
}
export function applyFoodDraft(state: Workspace, choices: FoodChoice[], date: string, meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack', planned: boolean, name: string, makeId: () => string): Workspace {
  if (!choices.length) throw new Error('Choose at least one food.');
  const foods = [...state.foods];
  const reviewed = choices.map(choice => {
    const food = foods.find(food => food.id === choice.food.id) ?? foodSchema.parse(choice.food);
    if (!foods.some(row => row.id === food.id)) foods.push(food);
    return { food, grams: choice.grams };
  });
  return workspaceSchema.parse({ ...state, foods,
    logs: planned ? state.logs : [...state.logs, ...reviewed.map(row => ({ id: makeId(), date, meal, ...row, food: structuredClone(row.food) }))],
    meals: planned ? [...state.meals, { id: makeId(), date, meal, name, ingredients: reviewed.map(row => ({ foodId: row.food.id, grams: row.grams })) }] : state.meals,
  });
}
export function suggestedPlan(plan: Plan, draft: AIDraft, makeId: () => string): Plan {
  draft = validateDraft(draft, { mode: 'workout', description: 'Reviewed suggestion', consent: true, facts: [] });
  if (!draft.exercises.length) throw new Error('No suggested exercises.');
  return { ...plan, exercises: draft.exercises.map(row => ({ ...presetExercise(row.presetId, makeId(), row.rounds), target: String(row.amount), restSeconds: row.restSeconds })) };
}
export function weeklyFacts(state: Workspace, workouts: WorkoutState, end: string) {
  const start = shiftDate(end, -6);
  const dates = [...new Set(state.logs.filter(row => row.date >= start && row.date <= end).map(row => row.date))];
  const energy = dates.reduce((sum, date) => sum + dayNutrition(state, date).calories, 0);
  const weights = state.weights.filter(row => row.date >= start && row.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  const sessions = workouts.history.filter(row => { const parts = new Intl.DateTimeFormat('en-GB', { timeZone: state.profile.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(row.finishedAt!)); const part = (type: string) => parts.find(row => row.type === type)!.value; const date = `${part('year')}-${part('month')}-${part('day')}`; return date >= start && date <= end; });
  return [
    { id: 'period', value: `${start} to ${end}` },
    { id: 'logged-days', value: `${dates.length} days with food entries; other days are unknown, not zero.` },
    { id: 'energy', value: dates.length ? `${Math.round(energy / dates.length)} kcal average across recorded days only; incomplete logging is possible.` : 'No food entries.' },
    { id: 'workouts', value: `${sessions.length} completed workouts.` },
    { id: 'weight', value: weights.length ? `${weights.length} measurements; first ${weights[0].kg} kg, last ${weights.at(-1)!.kg} kg. Short-term change is not necessarily fat change.` : 'No weight measurements.' },
  ];
}
export function exampleDraft(mode: AssistantMode): AIDraft {
  return { message: 'Example only — no AI request was made. Review and edit before saving.',
    foods: mode === 'food' || mode === 'meals' ? [{ query: 'banana raw', grams: 150, note: 'Example weighed portion, not inferred from your description.' }] : [],
    exercises: mode === 'workout' ? exerciseCatalogue.filter(row => row.body === 'upper').slice(0, 3).map(row => ({ presetId: row.id, rounds: 2, amount: 10, restSeconds: 90, reason: 'Example upper-body selection. Adjust to your equipment and ability.' })) : [],
    tips: [{ text: mode === 'review' ? 'Record a few consistent days before drawing conclusions. This example has not analysed your records.' : 'Check portion weights, food preparation, equipment and exercise technique.', factIds: [] }],
  };
}
