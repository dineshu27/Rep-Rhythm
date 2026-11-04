import { describe, expect, it } from 'vitest';
import { initialWorkouts, remainingSeconds, sessionVolume, workoutReducer, workoutStateSchema, type WorkoutState } from './workouts';

const now = '2026-11-04T10:00:00.000Z';
function started() { return workoutReducer(initialWorkouts(), { type: 'start', planId: 'lower-a', id: 'session-1', now }); }
function logged(state: WorkoutState = started()) {
  return workoutReducer(state, { type: 'save-set', sessionId: 'session-1', set: { id: 'set-1', exerciseId: state.active!.exercises[0].id, kind: 'reps', amount: 10, weightKg: 20 } });
}
describe('workout lifecycle', () => {
  it('snapshots the plan so edits cannot rewrite a running or historical session', () => {
    const state = started(); const plan = state.plans.find(plan => plan.id === 'lower-a')!;
    const updated = workoutReducer(state, { type: 'save-plan', plan: { ...plan, name: 'Changed', exercises: [{ ...plan.exercises[0], name: 'Changed exercise' }] } });
    expect(updated.active!.name).toBe('Lower A');
    expect(updated.active!.exercises[0].name).toBe('Goblet squat');
    expect(state.plans.find(plan => plan.id === 'lower-a')!.name).toBe('Lower A');
  });
  it('prevents replacing an active session and refuses empty workouts', () => {
    expect(() => workoutReducer(started(), { type: 'start', planId: 'upper-a', id: 'another', now })).toThrow('current session');
    expect(() => workoutReducer(started(), { type: 'finish', now })).toThrow('at least one set');
    const state = initialWorkouts(); state.plans[0].exercises = [];
    expect(() => workoutReducer(state, { type: 'start', planId: 'upper-a', id: 'empty', now })).toThrow('Add at least one');
  });
  it('edits, finishes and deletes recorded sets without duplicating or fabricating history', () => {
    const state = logged();
    const updated = workoutReducer(state, { type: 'save-set', sessionId: 'session-1', set: { ...state.active!.sets[0], amount: 12 } });
    expect(updated.active!.sets).toHaveLength(1);
    expect(sessionVolume(updated.active!)).toBe(240);
    const completed = workoutReducer(updated, { type: 'finish', now: '2026-11-04T11:00:00.000Z' });
    expect(completed.active).toBeNull(); expect(completed.restUntil).toBeNull(); expect(completed.history).toHaveLength(1);
    const edited = workoutReducer(completed, { type: 'save-set', sessionId: 'session-1', set: { ...completed.history[0].sets[0], weightKg: 25 } });
    expect(sessionVolume(edited.history[0])).toBe(300);
    const deleted = workoutReducer(edited, { type: 'delete-set', sessionId: 'session-1', setId: 'set-1' });
    expect(deleted.history[0].sets).toHaveLength(0);
    expect(workoutReducer(deleted, { type: 'delete-session', sessionId: 'session-1' }).history).toHaveLength(0);
  });
  it('supports timed planks and excludes hold seconds from rep volume', () => {
    const state = logged(); const plank = state.active!.exercises.find(exercise => exercise.kind === 'seconds')!;
    const next = workoutReducer(state, { type: 'save-set', sessionId: 'session-1', set: { id: 'hold', exerciseId: plank.id, kind: 'seconds', amount: 45, weightKg: 0 } });
    expect(sessionVolume(next.active!)).toBe(200); expect(next.active!.sets[1].amount).toBe(45);
  });
  it.each([0, -1, 1.5, 1001, NaN, Infinity])('rejects invalid reps %s', amount => {
    const state = started(); expect(() => workoutReducer(state, { type: 'save-set', sessionId: 'session-1', set: { id: 'invalid', exerciseId: state.active!.exercises[0].id, kind: 'reps', amount, weightKg: 0 } })).toThrow();
  });
  it('rejects orphaned sets, mismatched units, negative loads and invalid session chronology', () => {
    const state = logged(); const set = state.active!.sets[0];
    for (const invalid of [{ ...set, exerciseId: 'missing' }, { ...set, kind: 'seconds' as const }, { ...set, weightKg: -1 }]) {
      expect(() => workoutReducer(state, { type: 'save-set', sessionId: 'session-1', set: invalid })).toThrow();
    }
    expect(() => workoutReducer(state, { type: 'finish', now: '2026-11-03T10:00:00.000Z' })).toThrow();
  });
  it('roundtrips an active session and deadline through a validated backup', () => {
    const state = workoutReducer(logged(), { type: 'rest', until: Date.parse(now) + 90000 });
    expect(workoutStateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(remainingSeconds(state.restUntil, Date.parse(now) + 30001)).toBe(60);
    expect(remainingSeconds(state.restUntil, Date.parse(now) + 120000)).toBe(0);
    expect(remainingSeconds(null, Date.parse(now))).toBe(0);
  });
  it('rejects unsupported or corrupt backups and duplicate identifiers', () => {
    expect(workoutStateSchema.safeParse({ ...initialWorkouts(), version: 2 }).success).toBe(false);
    const state = logged(); state.active!.sets.push(state.active!.sets[0]);
    expect(workoutStateSchema.safeParse(state).success).toBe(false);
    expect(workoutStateSchema.safeParse({ ...initialWorkouts(), plans: [] }).success).toBe(false);
  });
  it('discards only the running session and timer', () => {
    const state = logged(); const next = workoutReducer({ ...state, restUntil: 100 }, { type: 'discard' });
    expect(next.active).toBeNull(); expect(next.restUntil).toBeNull(); expect(next.plans).toEqual(state.plans);
  });
});
