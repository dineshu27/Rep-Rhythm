import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initialWorkspace } from './workspace';
import { initialWorkouts, workoutReducer } from './workouts';
import { completeBackupSchema } from './backup-schema';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
function backup() {
  const workspace = initialWorkspace();
  workspace.foods = [{ id: 'food', name: 'Package oats', brand: 'Test', source: 'label', reference: 'Package', per100g: { calories: 200, protein: 10, fat: 5, carbs: 25 } }];
  workspace.logs = [{ id: 'food-log', date: '2026-11-04', meal: 'Breakfast', grams: 150, food: structuredClone(workspace.foods[0]) }];
  workspace.meals = [{ id: 'meal', name: 'Oats', date: '2026-11-04', meal: 'Breakfast', ingredients: [{ foodId: 'food', grams: 150 }] }];
  workspace.weights = [{ id: 'weight', date: '2026-11-04', kg: 73.2, waistCm: 85 }];
  workspace.metrics = [{ date: '2026-11-04', steps: 6000, waterMl: 2000, cardioMinutes: 20, notes: 'Walk' }];
  let workouts = workoutReducer(initialWorkouts(), { type: 'start', planId: 'lower-a', id: 'session', now: '2026-11-04T09:00:00.000Z' });
  workouts = workoutReducer(workouts, { type: 'save-set', sessionId: 'session', set: { id: 'set', exerciseId: workouts.active!.exercises[0].id, kind: 'reps', amount: 10, weightKg: 20 } });
  workouts = workoutReducer(workouts, { type: 'finish', now: '2026-11-04T10:00:00.000Z' });
  workouts = workoutReducer(workouts, { type: 'start', planId: 'upper-a', id: 'active', now: '2026-11-04T11:00:00.000Z' });
  return { version: 1 as const, workspace, workouts };
}
async function asUser(user: string, authenticated = true, recent = true) {
  await db.exec('reset role');
  const issued = Math.floor(Date.now() / 1000) - (recent ? 0 : 3600);
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [user, JSON.stringify({ sub: user, iat: Math.floor(Date.now() / 1000), amr: [{ method: 'otp', timestamp: issued }] })]);
  await db.exec(authenticated ? 'set role authenticated' : 'set role anon');
}
async function save(value: unknown = backup(), revision = 0) { return db.query('select public.fitness_save($1::jsonb,$2::bigint) revision', [JSON.stringify(value), revision]); }
async function load() { const result = await db.query<{ data: { revision: number; backup: unknown } }>('select public.fitness_load() data'); return result.rows[0].data; }

describe('normalized PostgreSQL storage and owner boundaries', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      grant usage on schema auth to anon,authenticated; grant usage on schema public to anon,authenticated;`);
    await db.exec(readFileSync(new URL('../supabase/migrations/202611040001_fitness.sql', import.meta.url), 'utf8'));
  }, 30000);
  beforeEach(async () => { await db.exec(`reset role; truncate auth.users cascade; insert into auth.users values ('${a}'),('${b}');`); await asUser(a); });
  afterAll(async () => { await db?.close(); });
  it('roundtrips every normalized collection, history snapshots, and active session', async () => {
    const input = backup(); await save(input); const result = await load();
    expect(Number(result.revision)).toBe(1); expect(completeBackupSchema.parse(result.backup)).toEqual(input);
  });
  it('prevents cross-user reads, edits, deletion, ownership changes, and foreign-key attachment', async () => {
    await save();
    const food = await db.query<{ id: string }>('select id from public.foods'); const meal = await db.query<{ id: string }>('select id from public.meal_plans');
    await asUser(b); expect((await load()).backup).toBeNull();
    for (const table of ['profiles','nutrition_targets','foods','food_logs','meal_plans','meal_ingredients','workout_plans','exercises','workout_plan_exercises','workout_logs','workout_log_exercises','exercise_sets','weight_logs','daily_metrics']) expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
    expect((await db.query("update public.foods set name='Tampered' returning id")).rows).toHaveLength(0);
    expect((await db.query('delete from public.profiles returning user_id')).rows).toHaveLength(0);
    await expect(db.query('insert into public.daily_metrics(user_id,date,steps,water_ml,cardio_minutes,notes,position) values($1,\'2026-11-04\',0,0,0,\'\',0)', [a])).rejects.toThrow();
    await save();
    await expect(db.query('insert into public.meal_ingredients(user_id,meal_id,food_id,grams,position) values($1,$2,$3,10,99)', [b, meal.rows[0].id, food.rows[0].id])).rejects.toThrow();
    await expect(db.query('update public.profiles set user_id=$1', [a])).rejects.toThrow();
    await asUser(a); expect((await db.query<{ name: string }>('select name from public.foods')).rows[0].name).toBe('Package oats');
  });
  it('keeps both users independent when replacing a complete account', async () => {
    await save(); await asUser(b); const other = backup(); other.workspace.profile.name = 'Other user'; await save(other);
    await asUser(a); const updated = backup(); updated.workspace.foods[0].name = 'Changed catalogue'; await save(updated, 1);
    const own = completeBackupSchema.parse((await load()).backup); expect(own.workspace.logs[0].food.name).toBe('Package oats');
    await asUser(b); expect(completeBackupSchema.parse((await load()).backup).workspace.profile.name).toBe('Other user');
  });
  it('rolls back a failed replacement and rejects stale revisions', async () => {
    await save(); const invalid = backup(); invalid.workspace.foods[0].per100g.protein = -1;
    await expect(save(invalid, 1)).rejects.toThrow(); expect(Number((await load()).revision)).toBe(1);
    expect(completeBackupSchema.parse((await load()).backup)).toEqual(backup());
    await expect(save(backup(), 0)).rejects.toThrow('Account changed');
  });
  it('denies anonymous table and RPC access', async () => {
    await save(); await asUser('', false);
    await expect(db.query('select * from public.profiles')).rejects.toThrow();
    await expect(load()).rejects.toThrow(); await expect(save()).rejects.toThrow();
    await expect(db.query('select public.fitness_delete_account()')).rejects.toThrow();
  });
  it('requires recent authentication rather than merely a recently refreshed JWT for account deletion', async () => {
    await save(); await asUser(a, true, false); await expect(db.query('select public.fitness_delete_account()')).rejects.toThrow('Recent sign-in');
    await asUser(b); await save(); await asUser(a); await db.query('select public.fitness_delete_account()');
    await db.exec('reset role'); expect((await db.query('select * from auth.users')).rows).toEqual([{ id: b }]);
    await asUser(b); expect(completeBackupSchema.parse((await load()).backup).workspace.foods).toHaveLength(1);
  });
});
