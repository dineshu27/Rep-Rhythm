import { z } from 'zod';

const id = z.string().min(1).max(100);
const name = z.string().trim().min(1).max(100);
export const exerciseSchema = z.object({
  id, name, kind: z.enum(['reps', 'seconds']),
  sets: z.number().int().min(1).max(10),
  target: z.string().trim().min(1).max(40),
  restSeconds: z.number().int().min(0).max(600),
});
export const planSchema = z.object({ id, name, day: name, exercises: z.array(exerciseSchema).max(30) });
export const setSchema = z.object({
  id, exerciseId: id, kind: z.enum(['reps', 'seconds']),
  amount: z.number().int().min(1).max(36000),
  weightKg: z.number().finite().min(0).max(1000),
});
export const sessionSchema = z.object({
  id, planId: id, name, startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  exercises: z.array(exerciseSchema).min(1).max(30),
  sets: z.array(setSchema).max(1000),
  notes: z.string().max(2000),
}).superRefine((session, ctx) => {
  const exerciseIds = session.exercises.map(exercise => exercise.id);
  if (new Set(exerciseIds).size !== exerciseIds.length || new Set(session.sets.map(set => set.id)).size !== session.sets.length) {
    ctx.addIssue({ code: 'custom', message: 'Duplicate exercise or set identifiers.' });
  }
  for (const set of session.sets) {
    if (!session.exercises.some(exercise => exercise.id === set.exerciseId && exercise.kind === set.kind)) {
      ctx.addIssue({ code: 'custom', message: 'A set must belong to an exercise in its session.' });
    }
    if (set.kind === 'reps' && set.amount > 1000) ctx.addIssue({ code: 'custom', message: 'Reps must be 1–1,000.' });
  }
  if (session.finishedAt && Date.parse(session.finishedAt) < Date.parse(session.startedAt)) {
    ctx.addIssue({ code: 'custom', message: 'A session cannot finish before it starts.' });
  }
});
export const workoutStateSchema = z.object({
  version: z.literal(1), plans: z.array(planSchema).min(1).max(20),
  active: sessionSchema.nullable(), history: z.array(sessionSchema).max(1000),
  restUntil: z.number().finite().nonnegative().nullable(),
}).superRefine((state, ctx) => {
  if (new Set(state.plans.map(plan => plan.id)).size !== state.plans.length) ctx.addIssue({ code: 'custom', message: 'Duplicate plan identifiers.' });
  for (const plan of state.plans) {
    if (new Set(plan.exercises.map(exercise => exercise.id)).size !== plan.exercises.length) ctx.addIssue({ code: 'custom', message: 'Duplicate exercise identifiers.' });
  }
  if (state.active?.finishedAt || state.history.some(session => !session.finishedAt)) ctx.addIssue({ code: 'custom', message: 'Invalid session status.' });
  const sessionIds = [...state.history.map(session => session.id), ...(state.active ? [state.active.id] : [])];
  if (new Set(sessionIds).size !== sessionIds.length) ctx.addIssue({ code: 'custom', message: 'Duplicate session identifiers.' });
});

export type Exercise = z.infer<typeof exerciseSchema>;
export type Plan = z.infer<typeof planSchema>;
export type WorkoutSet = z.infer<typeof setSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type WorkoutState = z.infer<typeof workoutStateSchema>;
export const WORKOUT_STORAGE_KEY = 'fittrack-workouts-v1';

function exercises(prefix: string, names: string[]): Exercise[] {
  return names.map((name, index) => ({ id: `${prefix}-${index}`, name, kind: name === 'Plank' ? 'seconds' : 'reps',
    sets: name === 'Plank' ? 2 : 3, target: name === 'Plank' ? '30' : '8–12', restSeconds: 90 }));
}

// Editable product defaults, rather than a previously supplied exercise prescription.
export function initialWorkouts(): WorkoutState {
  return { version: 1, plans: [
    { id: 'upper-a', name: 'Upper A', day: 'Monday', exercises: exercises('ua', ['Dumbbell bench press', 'Seated cable row', 'Lat pulldown', 'Dumbbell shoulder press', 'Cable triceps pushdown', 'Dumbbell curl']) },
    { id: 'lower-a', name: 'Lower A', day: 'Tuesday', exercises: exercises('la', ['Goblet squat', 'Dumbbell Romanian deadlift', 'Leg curl', 'Standing calf raise', 'Plank']) },
    { id: 'upper-b', name: 'Upper B', day: 'Thursday', exercises: exercises('ub', ['Incline dumbbell press', 'Chest-supported row', 'Lat pulldown', 'Dumbbell lateral raise', 'Overhead triceps extension', 'Hammer curl']) },
    { id: 'lower-b', name: 'Lower B', day: 'Saturday', exercises: exercises('lb', ['Leg press', 'Hip thrust', 'Reverse lunge', 'Seated leg curl', 'Seated calf raise', 'Plank']) },
  ], active: null, history: [], restUntil: null };
}

export type WorkoutAction =
  | { type: 'save-plan'; plan: Plan }
  | { type: 'start'; planId: string; id: string; now: string }
  | { type: 'save-set'; sessionId: string; set: WorkoutSet }
  | { type: 'delete-set'; sessionId: string; setId: string }
  | { type: 'notes'; sessionId: string; notes: string }
  | { type: 'finish'; now: string }
  | { type: 'discard' }
  | { type: 'delete-session'; sessionId: string }
  | { type: 'rest'; until: number | null };

export function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  let next = state;
  function updateSession(update: (session: Session) => Session, sessionId: string) {
    if (!state.history.some(session => session.id === sessionId) && state.active?.id !== sessionId) throw new Error('Session no longer exists.');
    return { ...state, active: state.active?.id === sessionId ? update(state.active) : state.active,
      history: state.history.map(session => session.id === sessionId ? update(session) : session) };
  }
  switch (action.type) {
    case 'save-plan':
      if (!state.plans.some(plan => plan.id === action.plan.id)) throw new Error('Plan no longer exists.');
      next = { ...state, plans: state.plans.map(plan => plan.id === action.plan.id ? planSchema.parse(action.plan) : plan) }; break;
    case 'start': {
      if (state.active) throw new Error('Finish or discard your current session first.');
      const plan = state.plans.find(plan => plan.id === action.planId);
      if (!plan?.exercises.length) throw new Error('Add at least one exercise before starting.');
      next = { ...state, active: { id: action.id, planId: plan.id, name: plan.name, startedAt: action.now, finishedAt: null,
        exercises: plan.exercises.map(exercise => ({ ...exercise })), sets: [], notes: '' }, restUntil: null }; break;
    }
    case 'save-set': next = updateSession(session => ({ ...session, sets: session.sets.some(set => set.id === action.set.id)
      ? session.sets.map(set => set.id === action.set.id ? action.set : set) : [...session.sets, action.set] }), action.sessionId); break;
    case 'delete-set': next = updateSession(session => ({ ...session, sets: session.sets.filter(set => set.id !== action.setId) }), action.sessionId); break;
    case 'notes': next = updateSession(session => ({ ...session, notes: action.notes }), action.sessionId); break;
    case 'finish':
      if (state.history.length >= 1000) throw new Error('History is full. Export a backup and delete older sessions before finishing.');
      if (!state.active?.sets.length) throw new Error('Log at least one set to finish a workout.');
      next = { ...state, history: [{ ...state.active, finishedAt: action.now }, ...state.history], active: null, restUntil: null }; break;
    case 'discard': next = { ...state, active: null, restUntil: null }; break;
    case 'delete-session': next = { ...state, history: state.history.filter(session => session.id !== action.sessionId) }; break;
    case 'rest': next = { ...state, restUntil: action.until }; break;
  }
  return workoutStateSchema.parse(next);
}

export function remainingSeconds(until: number | null, now: number) { return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000)); }
export function sessionVolume(session: Session) { return session.sets.filter(set => set.kind === 'reps').reduce((total, set) => total + set.amount * set.weightKg, 0); }
export function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
