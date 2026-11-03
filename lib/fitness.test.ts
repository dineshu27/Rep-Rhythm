import { test } from 'vitest';
import assert from 'node:assert/strict';
import { totals, weeklyCount, weekStart, isData, type Workout } from './fitness';
test('daily nutrition excludes other dates', () => {
  assert.deepEqual(totals([{ id: '1', date: '2026-11-03', meal: 'Lunch', name: 'Lunch', calories: 500, protein: 40 }, { id: '2', date: '2026-11-02', meal: 'Lunch', name: 'Lunch', calories: 900, protein: 50 }], '2026-11-03'), { calories: 500, protein: 40 });
});
test('gym goal counts unique days in the selected Monday-based week, excluding future sessions', () => {
  const workouts = ['2026-11-01', '2026-11-02', '2026-11-02', '2026-11-03', '2026-11-04'].map((date, i): Workout => ({ id: String(i), date, name: 'Gym', minutes: 45, notes: '' }));
  assert.equal(weekStart('2026-11-03'), '2026-11-02');
  assert.equal(weekStart('2027-01-01'), '2026-12-28');
  assert.equal(weeklyCount(workouts, '2026-11-03'), 2);
});
test('import validation rejects malformed, impossible-date and negative entries', () => {
  assert.equal(isData({ foods: [], weights: [], workouts: [] }), true);
  assert.equal(isData({ foods: [null], weights: [], workouts: [] }), false);
  assert.equal(isData({ foods: [], weights: [{ id: '1', date: '2026-02-30', kg: 74 }], workouts: [] }), false);
  assert.equal(isData({ foods: [], weights: [{ id: '1', date: '2026-11-03', kg: -74 }], workouts: [] }), false);
  assert.equal(isData({ foods: [], weights: [{ id: '1', date: '2026-11-03', kg: 73.5 }], workouts: [] }), true);
});
