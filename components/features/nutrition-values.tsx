import type { Nutrition } from '@/lib/workspace';
const round = (value: number) => Math.round(value * 10) / 10;
export function NutritionValues({ value }: { value: Nutrition }) {
  return <span className="nutrition-values"><span>{round(value.calories)} kcal</span><span>Protein {round(value.protein)} g</span><span>Fat {round(value.fat)} g</span><span>Carbs {round(value.carbs)} g</span><span>Fiber {value.fiber === null ? 'not recorded' : `${round(value.fiber)} g`}</span></span>;
}
