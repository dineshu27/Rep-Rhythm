import type { MuscleGroup } from './muscles';
import { exerciseSchema, initialWorkouts, type Exercise } from './workouts';

export type BodyGroup = 'upper' | 'lower' | 'core';
export type ExercisePreset = Exercise & { body: BodyGroup; muscle: MuscleGroup };
const classify = (name: string): MuscleGroup => /triceps|skull|dip/i.test(name) ? 'Triceps' : /curl/i.test(name) && !/leg/i.test(name) ? 'Biceps' : /shoulder|lateral|face pull|arnold|overhead press/i.test(name) ? 'Shoulders' : /row|pulldown|pull-up/i.test(name) ? 'Back' : /bench|incline|chest|push-up/i.test(name) ? 'Chest' : /plank|dead bug|leg raise/i.test(name) ? 'Core' : 'Legs';
const presets = new Map<string, ExercisePreset>();
for (const plan of initialWorkouts().plans) {
  for (const exercise of plan.exercises) {
    const key = exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!presets.has(key)) presets.set(key, { ...exercise, id: key, muscle: classify(exercise.name), body: exercise.kind === 'seconds' ? 'core' : plan.id.startsWith('upper') ? 'upper' : 'lower' });
  }
}
for (const name of ['Chest fly','Push-up','Machine chest press','Barbell bench press','Assisted pull-up','Single-arm dumbbell row','Bent-over barbell row','Face pull','Arnold press','Overhead press','Preacher curl','Cable curl','Concentration curl','Skull crusher','Triceps dip','Back squat','Bulgarian split squat','Leg extension','Side plank','Dead bug','Lying leg raise']) {
  const muscle = classify(name); const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); const timed = /plank|dead bug/i.test(name);
  presets.set(key, { id: key, name, muscle, body: muscle === 'Legs' ? 'lower' : muscle === 'Core' ? 'core' : 'upper', kind: timed ? 'seconds' : 'reps', sets: timed ? 2 : 3, target: timed ? '30' : '8–12', restSeconds: 90 });
}
export const exerciseCatalogue = [...presets.values()];
export function presetExercise(presetId: string, instanceId: string, rounds?: number): Exercise {
  const preset = exerciseCatalogue.find(exercise => exercise.id === presetId);
  if (!preset) throw new Error('Choose an exercise from the library.');
  return exerciseSchema.parse({ ...preset, id: instanceId, sets: rounds ?? preset.sets });
}
