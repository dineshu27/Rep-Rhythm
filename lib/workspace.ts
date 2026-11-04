import { z } from 'zod';
import { startingProfile, startingTargets } from './config/profile';

const identifier = z.string().trim().min(1).max(100);
const text = z.string().trim().min(1).max(150);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Choose a valid calendar date.');
export const timeZoneSchema = z.string().max(80).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; } catch { return false; }
}, 'Use a valid timezone, for example Europe/London.');
const nutrient = z.number().finite().min(0).max(100);
export const nutritionSchema = z.object({ calories: z.number().finite().min(0).max(1000), protein: nutrient, fat: nutrient, carbs: nutrient, fiber: nutrient.nullable().default(null) });
export const foodSchema = z.object({
  id: identifier, name: text, brand: z.string().trim().max(100),
  per100g: nutritionSchema, source: z.enum(['estimated', 'label']),
  reference: z.string().trim().min(1).max(500),
});
export const mealCategory = z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
export const foodLogSchema = z.object({
  id: identifier, date: dateSchema, meal: mealCategory,
  grams: z.number().finite().positive().max(10000),
  food: foodSchema, // Intentionally immutable: later food edits do not change a past log.
});
export const mealPlanSchema = z.object({
  id: identifier, date: dateSchema, meal: mealCategory, name: text,
  ingredients: z.array(z.object({ foodId: identifier, grams: z.number().finite().positive().max(10000) })).min(1).max(50),
});
export const weightSchema = z.object({ id: identifier, date: dateSchema, kg: z.number().finite().min(20).max(500), waistCm: z.number().finite().min(20).max(300).nullable() });
export const metricSchema = z.object({ date: dateSchema, steps: z.number().int().min(0).max(100000), waterMl: z.number().int().min(0).max(15000), cardioMinutes: z.number().int().min(0).max(1440), notes: z.string().max(2000) });
export const profileSchema = z.object({
  name: text, sex: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']),
  age: z.number().int().min(18).max(120), heightCm: z.number().finite().min(80).max(250),
  startWeightKg: z.number().finite().min(20).max(500), goalWeightKg: z.number().finite().min(20).max(500),
  activity: text, gymDays: z.number().int().min(0).max(7), diet: text,
  restrictions: z.string().trim().max(1000), timeZone: timeZoneSchema,
  calories: z.number().int().min(1).max(10000), protein: z.number().finite().min(0).max(1000),
  fat: z.number().finite().min(0).max(1000), carbs: z.number().finite().min(0).max(2000),
  waterGoalMl: z.number().int().min(1).max(15000).nullable(), stepGoal: z.number().int().min(1).max(100000).nullable(),
  onboarded: z.boolean(),
});
export const workspaceSchema = z.object({
  version: z.literal(1), profile: profileSchema,
  foods: z.array(foodSchema).max(5000), logs: z.array(foodLogSchema).max(50000),
  meals: z.array(mealPlanSchema).max(5000), weights: z.array(weightSchema).max(10000), metrics: z.array(metricSchema).max(10000),
}).superRefine((state, ctx) => {
  for (const collection of [state.foods, state.logs, state.meals, state.weights]) {
    if (new Set(collection.map(row => row.id)).size !== collection.length) ctx.addIssue({ code: 'custom', message: 'Duplicate record identifiers.' });
  }
  for (const collection of [state.weights, state.metrics]) {
    if (new Set(collection.map(row => row.date)).size !== collection.length) ctx.addIssue({ code: 'custom', message: 'Only one measurement entry is allowed per date.' });
  }
  const foods = new Set(state.foods.map(food => food.id));
  if (state.meals.some(meal => meal.ingredients.some(ingredient => !foods.has(ingredient.foodId)))) ctx.addIssue({ code: 'custom', message: 'Meal ingredients must refer to existing foods.' });
});

export type Profile = z.infer<typeof profileSchema>;
export type FoodRecord = z.infer<typeof foodSchema>;
export type FoodLog = z.infer<typeof foodLogSchema>;
export type PlannedMeal = z.infer<typeof mealPlanSchema>;
export type WeightRecord = z.infer<typeof weightSchema>;
export type DailyMetric = z.infer<typeof metricSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Nutrition = z.infer<typeof nutritionSchema>;
export const WORKSPACE_KEY = 'fittrack-workspace-v1';
export const zeroNutrition = (): Nutrition => ({ calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });

// Deliberately empty catalogue. Users enter actual packaging or reference values;
// the app does not invent verified food composition or call an external food API.
export function initialWorkspace(): Workspace {
  return { version: 1, profile: { ...startingProfile, ...startingTargets, name: 'My profile', timeZone: 'Europe/London', waterGoalMl: null, stepGoal: null, onboarded: false }, foods: [], logs: [], meals: [], weights: [], metrics: [] };
}
export function todayInZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(part => part.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDate(date: string, days: number) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
export function mondayOf(date: string) { const day = new Date(`${date}T12:00:00Z`).getUTCDay(); return shiftDate(date, -((day + 6) % 7)); }
export function nutritionFor(food: FoodRecord, grams: number): Nutrition {
  return Object.fromEntries(Object.entries(food.per100g).map(([key, value]) => [key, value === null ? null : value * grams / 100])) as Nutrition;
}
export function addNutrition(total: Nutrition, row: Nutrition): Nutrition { return { calories: total.calories + row.calories, protein: total.protein + row.protein, fat: total.fat + row.fat, carbs: total.carbs + row.carbs, fiber: total.fiber === null || row.fiber === null ? null : total.fiber + row.fiber }; }
export function dayNutrition(state: Workspace, date: string) { return state.logs.filter(log => log.date === date).reduce((total, log) => addNutrition(total, nutritionFor(log.food, log.grams)), zeroNutrition()); }
export function mealNutrition(meal: PlannedMeal, foods: FoodRecord[]) { return meal.ingredients.reduce((total, ingredient) => { const food = foods.find(food => food.id === ingredient.foodId); return food ? addNutrition(total, nutritionFor(food, ingredient.grams)) : total; }, zeroNutrition()); }
export function sevenDayWeight(weights: WeightRecord[], end: string) {
  const rows = weights.filter(row => row.date >= shiftDate(end, -6) && row.date <= end);
  return rows.length ? rows.reduce((total, row) => total + row.kg, 0) / rows.length : null;
}
export function upsertById<T extends { id: string }>(rows: T[], item: T) { return rows.some(row => row.id === item.id) ? rows.map(row => row.id === item.id ? item : row) : [...rows, item]; }
export function logPlannedMeal(state: Workspace, id: string, makeId: () => string): Workspace {
  const meal = state.meals.find(meal => meal.id === id);
  if (!meal) throw new Error('This meal plan no longer exists.');
  const logs = meal.ingredients.map(ingredient => {
    const food = state.foods.find(food => food.id === ingredient.foodId);
    if (!food) throw new Error('An ingredient is missing. Edit the planned meal first.');
    return { id: makeId(), date: meal.date, meal: meal.meal, grams: ingredient.grams, food: structuredClone(food) };
  });
  return workspaceSchema.parse({ ...state, logs: [...state.logs, ...logs] });
}
