import { applyFoodDraft } from './assistant';
import { workspaceSchema, type Workspace, type FoodRecord, type FoodLog } from './workspace';
export function quickFood(state: Workspace, food: FoodRecord, grams: number, date: string, meal: FoodLog['meal'], id: string) {
  return applyFoodDraft(state, [{ food, grams }], date, meal, false, '', () => id);
}
export function recentFoods(state: Workspace, limit = 8) {
  const seen = new Set<string>();
  return state.logs.map((log, index) => ({ log, index })).sort((a,b) => b.log.date.localeCompare(a.log.date) || b.index-a.index).flatMap(({log}) => {
    if (seen.has(log.food.id)) return []; seen.add(log.food.id);
    return [{ food: state.foods.find(food => food.id === log.food.id) ?? log.food, grams: log.grams }];
  }).slice(0, limit);
}
export function copyMeal(state: Workspace, from: string, to: string, meal: FoodLog['meal'], makeId: () => string) {
  const entries = state.logs.filter(log => log.date === from && log.meal === meal);
  if (!entries.length) throw new Error('No entries to repeat for that meal.');
  return workspaceSchema.parse({ ...state, logs: [...state.logs, ...entries.map(log => ({ ...structuredClone(log), id: makeId(), date: to }))] });
}
