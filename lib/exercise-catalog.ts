import { exerciseSchema, initialWorkouts, type Exercise } from './workouts';

export type BodyGroup = 'upper' | 'lower' | 'core';
export type ExercisePreset = Exercise & { body: BodyGroup };
const presets = new Map<string, ExercisePreset>();
for (const plan of initialWorkouts().plans) {
  for (const exercise of plan.exercises) {
    const key = exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!presets.has(key)) presets.set(key, { ...exercise, id: key, body: exercise.kind === 'seconds' ? 'core' : plan.id.startsWith('upper') ? 'upper' : 'lower' });
  }
}
export const exerciseCatalogue = [...presets.values()];
export function presetExercise(presetId: string, instanceId: string, rounds?: number): Exercise {
  const preset = exerciseCatalogue.find(exercise => exercise.id === presetId);
  if (!preset) throw new Error('Choose an exercise from the library.');
  return exerciseSchema.parse({ ...preset, id: instanceId, sets: rounds ?? preset.sets });
}
