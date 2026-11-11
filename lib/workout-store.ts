'use client';

import { useSyncExternalStore } from 'react';
import { initialWorkouts, WORKOUT_STORAGE_KEY, workoutReducer, workoutStateSchema, type WorkoutAction, type WorkoutState } from './workouts';

type Snapshot = { data: WorkoutState | null; error: string; raw: string | null };
const serverSnapshot: Snapshot = { data: null, error: '', raw: null };
let snapshot: Snapshot = serverSnapshot;
let loaded = false;
const listeners = new Set<() => void>();

function read(): Snapshot {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(WORKOUT_STORAGE_KEY);
    if (!raw) return { data: initialWorkouts(), error: '', raw };
    const result = workoutStateSchema.safeParse(JSON.parse(raw));
    if (!result.success) return { data: null, error: 'Your saved workout data could not be read. Export a recovery copy before resetting or importing a backup.', raw };
    return { data: result.data, error: '', raw };
  } catch {
    return { data: null, error: 'Browser storage is unavailable or saved data is damaged. Allow storage to save workouts. You can export a recovery copy if one is available.', raw };
  }
}
function getSnapshot() {
  if (!loaded && typeof window !== 'undefined') { snapshot = read(); loaded = true; }
  return snapshot;
}
function emit() { listeners.forEach(listener => listener()); }
function onStorage(event: StorageEvent) {
  if (event.key === WORKOUT_STORAGE_KEY || event.key === null) { snapshot = read(); emit(); }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener('storage', onStorage);
    // Refresh changes made while no workout screen was mounted.
    const latest = read();
    if (latest.raw !== snapshot.raw) { snapshot = latest; emit(); }
  }
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', onStorage); };
}
function save(data: WorkoutState): boolean {
  try {
    const raw = JSON.stringify(workoutStateSchema.parse(data));
    localStorage.setItem(WORKOUT_STORAGE_KEY, raw);
    snapshot = { data, error: '', raw }; emit(); return true;
  } catch {
    snapshot = { ...snapshot, error: 'Could not save. Browser storage may be full or blocked. Your previous saved data is unchanged. Export a backup before trying again.' };
    emit(); return false;
  }
}
export function dispatchWorkout(action: WorkoutAction): boolean {
  try {
    const currentRaw = localStorage.getItem(WORKOUT_STORAGE_KEY);
    if (currentRaw !== snapshot.raw) {
      snapshot = { ...read(), error: 'Another tab changed your workouts. Review the latest data and try again.' }; emit(); return false;
    }
    if (!snapshot.data) return false;
    return save(workoutReducer(snapshot.data, action));
  } catch (error) {
    snapshot = { ...snapshot, error: error instanceof Error && !error.message.startsWith('[') ? error.message : 'Check the entered values. Reps must be 1–1,000, seconds 1–36,000, and weight 0–1,000 kg.' };
    emit(); return false;
  }
}
export function replaceWorkouts(data: unknown) {
  const parsed = workoutStateSchema.safeParse(data);
  if (!parsed.success) throw new Error('This file is not a valid version 1 workout backup. No data was changed.');
  return save(parsed.data);
}
export function exportWorkouts(raw?: string | null) {
  const content = raw ?? JSON.stringify(snapshot.data, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `fittrack-workouts-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function useWorkouts() { return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot); }

export function workoutSnapshot() { return getSnapshot(); }
export function refreshWorkouts() { snapshot=read();loaded=true;emit(); }
