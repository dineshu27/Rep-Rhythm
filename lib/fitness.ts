export const profile = { age: 37, sex: 'Male', height: 165, startWeight: 74, targetWeight: 64, calories: 1900, protein: 130, workouts: 4 };
export type Food = { id: string; date: string; name: string; meal: string; calories: number; protein: number };
export type Workout = { id: string; date: string; name: string; minutes: number; notes: string };
export type Weight = { id: string; date: string; kg: number };
export type Data = { foods: Food[]; workouts: Workout[]; weights: Weight[] };
export const emptyData: Data = { foods: [], workouts: [], weights: [] };
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function weekStart(date: string) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return localDate(d); }
export function weeklyCount(workouts: Workout[], date: string) { const start = weekStart(date); return new Set(workouts.filter(w => w.date >= start && w.date <= date).map(w => w.date)).size; }
export function totals(foods: Food[], date: string) { return foods.filter(f => f.date === date).reduce((a, f) => ({ calories: a.calories + f.calories, protein: a.protein + f.protein }), { calories: 0, protein: 0 }); }
const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00`)) && localDate(new Date(`${v}T12:00:00`)) === v;
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 500;
const number = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max;
export function isData(value: unknown): value is Data {
  if (!value || typeof value !== 'object') return false;
  const d = value as Data;
  return Array.isArray(d.foods) && Array.isArray(d.workouts) && Array.isArray(d.weights)
    && d.foods.every(f => f && text(f.id) && validDate(f.date) && text(f.name) && ['Breakfast','Lunch','Dinner','Snack'].includes(f.meal) && number(f.calories, 20000) && typeof f.protein === 'number' && Number.isFinite(f.protein) && f.protein >= 0 && f.protein <= 2000)
    && d.workouts.every(w => w && text(w.id) && validDate(w.date) && text(w.name) && number(w.minutes, 1440) && typeof w.notes === 'string' && w.notes.length <= 500)
    && d.weights.every(w => w && text(w.id) && validDate(w.date) && number(w.kg, 500))
    && new Set(d.weights.map(w => w.date)).size === d.weights.length
    && [d.foods, d.workouts, d.weights].every(entries => new Set(entries.map(entry => entry.id)).size === entries.length);
}
