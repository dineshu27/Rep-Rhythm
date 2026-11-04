import { describe, expect, it } from 'vitest';
import { dateSchema, dayNutrition, initialWorkspace, logPlannedMeal, mondayOf, nutritionFor, sevenDayWeight, shiftDate, todayInZone, workspaceSchema, type FoodRecord } from './workspace';
const food: FoodRecord = { id: 'food', name: 'Test package', brand: '', per100g: { calories: 200, protein: 10, carbs: 20, fat: 5 }, source: 'label', reference: 'Test label' };
describe('workspace records and calculations', () => {
  it('validates real calendar dates and handles month/leap-year boundaries', () => {
    expect(dateSchema.safeParse('2026-02-30').success).toBe(false); expect(dateSchema.safeParse('2024-02-29').success).toBe(true);
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01'); expect(mondayOf('2026-11-08')).toBe('2026-11-02');
  });
  it('uses the selected user timezone at midnight and DST transitions', () => {
    const instant = new Date('2026-07-01T23:30:00Z'); expect(todayInZone('Europe/London', instant)).toBe('2026-07-02'); expect(todayInZone('America/New_York', instant)).toBe('2026-07-01');
  });
  it('calculates gram portions without rounding away small amounts', () => {
    expect(nutritionFor(food, 150)).toEqual({ calories: 300, protein: 15, carbs: 30, fat: 7.5 });
    expect(nutritionFor(food, 0.5).calories).toBe(1);
  });
  it('keeps diary snapshots when library foods change or are deleted', () => {
    const state = initialWorkspace(); state.foods = [food]; state.logs = [{ id: 'log', date: '2026-11-04', meal: 'Lunch', grams: 150, food: structuredClone(food) }];
    state.foods = [{ ...food, per100g: { ...food.per100g, calories: 500 } }];
    expect(dayNutrition(state, '2026-11-04').calories).toBe(300); state.foods = [];
    expect(workspaceSchema.safeParse(state).success).toBe(true); expect(dayNutrition(state, '2026-11-04').calories).toBe(300);
  });
  it('logs each planned ingredient with independent immutable snapshots', () => {
    const state = initialWorkspace(); state.foods = [food]; state.meals = [{ id: 'meal', date: '2026-11-04', meal: 'Dinner', name: 'Test meal', ingredients: [{ foodId: 'food', grams: 200 }] }];
    const next = logPlannedMeal(state, 'meal', () => 'new-log'); expect(dayNutrition(next, '2026-11-04').calories).toBe(400); expect(state.logs).toHaveLength(0);
    next.foods[0].name = 'Changed'; expect(next.logs[0].food.name).toBe('Test package');
  });
  it('rejects orphaned meal ingredients, duplicate records, and invalid nutrition', () => {
    const state = initialWorkspace(); state.meals = [{ id: 'meal', date: '2026-11-04', meal: 'Dinner', name: 'Test', ingredients: [{ foodId: 'missing', grams: 10 }] }];
    expect(workspaceSchema.safeParse(state).success).toBe(false); state.meals = []; state.foods = [food, food]; expect(workspaceSchema.safeParse(state).success).toBe(false);
    state.foods = [{ ...food, per100g: { ...food.per100g, protein: -1 } }]; expect(workspaceSchema.safeParse(state).success).toBe(false);
  });
  it('excludes missing days and dates outside the selected seven-day window from weight averages', () => {
    const weights = [{ id: 'a', date: '2026-10-28', kg: 100, waistCm: null }, { id: 'b', date: '2026-10-29', kg: 72, waistCm: null }, { id: 'c', date: '2026-11-04', kg: 70, waistCm: null }];
    expect(sevenDayWeight(weights, '2026-11-04')).toBe(71); expect(sevenDayWeight([], '2026-11-04')).toBeNull();
  });
  it('preserves independent target preferences and distinguishes unlogged days from recorded zero activity', () => {
    const state = initialWorkspace(); state.profile.calories = 2100;
    expect(workspaceSchema.parse(state).profile.protein).toBe(130); expect(state.metrics).toHaveLength(0);
    state.metrics = [{ date: '2026-11-04', steps: 0, waterMl: 0, cardioMinutes: 0, notes: '' }]; expect(workspaceSchema.parse(state).metrics[0].steps).toBe(0);
  });
});
