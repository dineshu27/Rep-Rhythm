'use client';
import { completeBackupSchema } from './backup-schema';
import { replaceWorkspace } from './workspace-store';
import { replaceWorkouts } from './workout-store';
import { WORKSPACE_KEY } from './workspace';
import { WORKOUT_STORAGE_KEY } from './workouts';
export function restoreCompleteBackup(input: unknown) {
  const backup = completeBackupSchema.parse(input);
  const previousWorkspace = localStorage.getItem(WORKSPACE_KEY); const previousWorkouts = localStorage.getItem(WORKOUT_STORAGE_KEY);
  try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(backup.workspace)); localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(backup.workouts)); }
  catch (error) {
    if (previousWorkspace === null) localStorage.removeItem(WORKSPACE_KEY); else localStorage.setItem(WORKSPACE_KEY, previousWorkspace);
    if (previousWorkouts === null) localStorage.removeItem(WORKOUT_STORAGE_KEY); else localStorage.setItem(WORKOUT_STORAGE_KEY, previousWorkouts);
    throw error;
  }
  replaceWorkspace(backup.workspace); replaceWorkouts(backup.workouts);
}
