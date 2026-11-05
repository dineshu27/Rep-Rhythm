import { exerciseCatalogue, presetExercise } from './exercise-catalog';
import type { Plan } from './workouts';
export const muscleGroups = ['Chest', 'Shoulders', 'Back', 'Legs', 'Biceps', 'Triceps', 'Core'] as const;
export type MuscleGroup = typeof muscleGroups[number];
export const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export function exerciseMuscle(name: string) { return exerciseCatalogue.find(row => row.name.toLowerCase() === name.trim().toLowerCase())?.muscle ?? null; }
export function weeklyCoverage(plans: Plan[]) {
  return muscleGroups.map(muscle => ({ muscle, days: weekDays.filter(day => plans.some(plan => plan.day === day && plan.exercises.some(exercise => exerciseMuscle(exercise.name) === muscle))) }));
}
export function unclassifiedExercises(plans: Plan[]) { return [...new Set(plans.flatMap(plan => plan.exercises.filter(row => !exerciseMuscle(row.name)).map(row => row.name)))]; }
export const splitTemplates = [
  { id: 'upper-lower', name: 'Upper / lower · 4 days', description: 'Upper body twice and lower body twice across the week.' },
  { id: 'mixed-pairs', name: 'Mixed muscle pairs · 4 days', description: 'Chest, shoulders and triceps paired; back, legs and biceps paired. Repeat both.' },
  { id: 'pair-repeat', name: 'Chest + shoulders / back + legs / arms · 6 days', description: 'Three pairings repeated twice, with Sunday left free.' },
] as const;
export function buildSplit(template: string, makeId: () => string): Plan[] {
  const pairs: [string, string, string[]][] = template === 'pair-repeat' ? [
    ['Chest + shoulders A', 'Monday', ['dumbbell-bench-press', 'incline-dumbbell-press', 'dumbbell-shoulder-press', 'dumbbell-lateral-raise']],
    ['Back + legs A', 'Tuesday', ['seated-cable-row', 'lat-pulldown', 'goblet-squat', 'dumbbell-romanian-deadlift', 'standing-calf-raise']],
    ['Biceps + triceps + core A', 'Wednesday', ['dumbbell-curl', 'hammer-curl', 'cable-triceps-pushdown', 'overhead-triceps-extension', 'plank']],
    ['Chest + shoulders B', 'Thursday', ['incline-dumbbell-press', 'chest-fly', 'dumbbell-lateral-raise', 'dumbbell-shoulder-press']],
    ['Back + legs B', 'Friday', ['chest-supported-row', 'lat-pulldown', 'leg-press', 'hip-thrust', 'seated-calf-raise']],
    ['Biceps + triceps + core B', 'Saturday', ['hammer-curl', 'cable-curl', 'overhead-triceps-extension', 'cable-triceps-pushdown', 'side-plank']],
  ] : template === 'mixed-pairs' ? [
    ['Chest + shoulders + triceps A', 'Monday', ['dumbbell-bench-press', 'dumbbell-shoulder-press', 'cable-triceps-pushdown', 'plank']],
    ['Back + legs + biceps A', 'Tuesday', ['seated-cable-row', 'lat-pulldown', 'goblet-squat', 'dumbbell-romanian-deadlift', 'dumbbell-curl']],
    ['Chest + shoulders + triceps B', 'Thursday', ['incline-dumbbell-press', 'dumbbell-lateral-raise', 'overhead-triceps-extension', 'side-plank']],
    ['Back + legs + biceps B', 'Saturday', ['chest-supported-row', 'leg-press', 'hip-thrust', 'seated-calf-raise', 'hammer-curl']],
  ] : template === 'upper-lower' ? [
    ['Upper A', 'Monday', ['dumbbell-bench-press', 'seated-cable-row', 'lat-pulldown', 'dumbbell-shoulder-press', 'cable-triceps-pushdown', 'dumbbell-curl']],
    ['Lower A', 'Tuesday', ['goblet-squat', 'dumbbell-romanian-deadlift', 'leg-curl', 'standing-calf-raise', 'plank']],
    ['Upper B', 'Thursday', ['incline-dumbbell-press', 'chest-supported-row', 'lat-pulldown', 'dumbbell-lateral-raise', 'overhead-triceps-extension', 'hammer-curl']],
    ['Lower B', 'Saturday', ['leg-press', 'hip-thrust', 'reverse-lunge', 'seated-leg-curl', 'seated-calf-raise', 'plank']],
  ] : [];
  if (!pairs.length) throw new Error('Choose a starter split.');
  return pairs.map(([name, day, presets]) => ({ id: makeId(), name, day, exercises: presets.map(id => presetExercise(id, makeId())) }));
}
