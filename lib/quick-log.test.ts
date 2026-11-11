import { expect, it } from 'vitest';
import { initialWorkspace } from './workspace';
import { starterFoods } from './food-catalog';
import { quickFood, copyMeal, recentFoods } from './quick-log';
it('logs from search in one atomic update and rejects an invalid portion',()=>{const state=initialWorkspace();const next=quickFood(state,starterFoods[0],150,'2026-11-11','Lunch','one');expect(state.logs).toHaveLength(0);expect(next.logs[0].grams).toBe(150);expect(next.foods.some(row=>row.id===starterFoods[0].id)).toBe(true);expect(()=>quickFood(state,starterFoods[0],0,'2026-11-11','Lunch','bad')).toThrow();});
it('repeats yesterday using original nutrition snapshots, new IDs and the selected meal',()=>{let state=quickFood(initialWorkspace(),starterFoods[0],150,'2026-11-10','Lunch','old');state={...state,foods:state.foods.map(row=>({...row,per100g:{...row.per100g,calories:999}}))};const next=copyMeal(state,'2026-11-10','2026-11-11','Lunch',()=> 'new');expect(next.logs[1].food.per100g.calories).toBe(state.logs[0].food.per100g.calories);expect(next.logs[1].id).toBe('new');expect(state.logs).toHaveLength(1);expect(recentFoods(next)).toHaveLength(1);});
