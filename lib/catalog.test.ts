import { describe, expect, it } from 'vitest';
import { exerciseCatalogue, presetExercise } from './exercise-catalog';
import { starterFoods } from './food-catalog';
import { nutritionFor } from './workspace';
import { initialWorkouts, sessionVolume, workoutReducer } from './workouts';

describe('food and exercise selection', () => {
  it('scales the referenced cooked rice nutrients by grams, including fiber', () => {
    const rice = starterFoods.find(food => food.id === 'usda-168878')!;
    const portion = nutritionFor(rice, 150);
    expect(portion.calories).toBe(195);
    expect(portion.protein).toBeCloseTo(4.035);
    expect(portion.fat).toBeCloseTo(0.42);
    expect(portion.carbs).toBeCloseTo(42.255);
    expect(portion.fiber).toBeCloseTo(0.6);
  });
  it('creates independent exercise selections for upper/lower training and timed holds', () => {
    expect(exerciseCatalogue.some(exercise => exercise.body === 'upper')).toBe(true);
    expect(exerciseCatalogue.some(exercise => exercise.body === 'lower')).toBe(true);
    const first = presetExercise('goblet-squat', 'one', 4);
    const second = presetExercise('goblet-squat', 'two');
    expect(first).toMatchObject({ id: 'one', name: 'Goblet squat', sets: 4, kind: 'reps' });
    expect(second.sets).toBe(3);
    expect(presetExercise('plank', 'hold')).toMatchObject({ kind: 'seconds', target: '30' });
    expect(() => presetExercise('missing', 'bad')).toThrow();
  });
  it('logs rounds atomically as individually editable sets and totals rep volume', () => {
    const state = workoutReducer(initialWorkouts(), { type: 'start', planId: 'upper-a', id: 'session', now: '2026-11-04T09:00:00.000Z' });
    const exerciseId = state.active!.exercises[0].id;
    const next = workoutReducer(state, { type: 'log-rounds', sessionId: 'session', exerciseId, amount: 12, weightKg: 20, ids: ['a', 'b', 'c'] });
    expect(next.active!.sets).toHaveLength(3); expect(sessionVolume(next.active!)).toBe(720); expect(state.active!.sets).toHaveLength(0);
    const edited = workoutReducer(next, { type: 'save-set', sessionId: 'session', set: { ...next.active!.sets[0], amount: 10 } });
    expect(sessionVolume(edited.active!)).toBe(680);
    for (const ids of [[], Array.from({ length: 11 }, (_, i) => String(i)), ['same', 'same']]) {
      expect(() => workoutReducer(state, { type: 'log-rounds', sessionId: 'session', exerciseId, amount: 12, weightKg: 20, ids })).toThrow();
    }
    expect(() => workoutReducer(state, { type: 'log-rounds', sessionId: 'session', exerciseId, amount: -1, weightKg: 20, ids: ['invalid'] })).toThrow();
    expect(state.active!.sets).toHaveLength(0);
  });
});
