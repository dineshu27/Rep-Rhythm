'use client';
import { useSyncExternalStore } from 'react';
import { initialWorkspace, WORKSPACE_KEY, workspaceSchema, type Workspace } from './workspace';

type Snapshot = { data: Workspace | null; error: string; raw: string | null };
const server: Snapshot = { data: null, error: '', raw: null };
let current = server;
let loaded = false;
const listeners = new Set<() => void>();
function read(): Snapshot {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(WORKSPACE_KEY);
    return { data: raw ? workspaceSchema.parse(JSON.parse(raw)) : initialWorkspace(), error: '', raw };
  } catch { return { data: null, error: 'Saved workspace data could not be read. Export a recovery copy from Settings before resetting it. Browser storage must be enabled.', raw }; }
}
function emit() { listeners.forEach(listener => listener()); }
function getSnapshot() { if (!loaded && typeof window !== 'undefined') { current = read(); loaded = true; } return current; }
function refresh(event: StorageEvent) { if (event.key === WORKSPACE_KEY || event.key === null) { current = read(); emit(); } }
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) { window.addEventListener('storage', refresh); const latest = read(); if (latest.raw !== current.raw) { current = latest; emit(); } }
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', refresh); };
}
export function changeWorkspace(update: (state: Workspace) => Workspace): boolean {
  try {
    getSnapshot();
    if (localStorage.getItem(WORKSPACE_KEY) !== current.raw) { current = { ...read(), error: 'Another tab changed these records. Review them and try again.' }; emit(); return false; }
    if (!current.data) throw new Error('Recover or reset the saved workspace in Settings first.');
    return replaceWorkspace(update(current.data));
  } catch (error) { current = { ...current, error: error instanceof Error && error.name !== 'ZodError' ? error.message : 'Check the entered values. Your saved data has not changed.' }; emit(); return false; }
}
export function replaceWorkspace(input: unknown): boolean {
  try {
    const data = workspaceSchema.parse(input); const raw = JSON.stringify(data);
    localStorage.setItem(WORKSPACE_KEY, raw); current = { data, raw, error: '' }; emit(); return true;
  } catch { current = { ...current, error: 'Unable to save. Check the data and available browser storage. Previous saved records are unchanged.' }; emit(); return false; }
}
export function workspaceSnapshot() { return getSnapshot(); }
export function useWorkspace() { return useSyncExternalStore(subscribe, getSnapshot, () => server); }
export function downloadJSON(data: unknown, name = 'fittrack-backup') {
  const url = URL.createObjectURL(new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function refreshWorkspace() { current=read();loaded=true;emit(); }
