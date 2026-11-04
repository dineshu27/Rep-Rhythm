import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
let db: PGlite;
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
async function asUser(id = user) { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec('set role authenticated'); }
const reserve = (id = crypto.randomUUID()) => db.query('select public.fitness_reserve_ai_request($1,$2)', [id, 'food']);
beforeAll(async () => { db = new PGlite(); await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,raw_app_meta_data jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated;`); await db.exec(readFileSync(new URL('../supabase/migrations/202611040003_ai_usage.sql', import.meta.url), 'utf8')); }, 30000);
beforeEach(async () => { await db.exec(`reset role; truncate public.ai_usage,auth.users cascade; insert into auth.users values('${user}','{"ai_access":true}'),('${other}','{}');`); await asUser(); });
afterAll(async () => { await db?.close(); });
it('requires owner-granted access and denies anonymous reservations', async () => { await asUser(other); await expect(reserve()).rejects.toThrow('AI access denied'); await db.exec('reset role; set role anon'); await expect(reserve()).rejects.toThrow(); });
it('limits each user to five attempts per UTC day including failures', async () => { for (let i=0;i<5;i++) await reserve(); await expect(reserve()).rejects.toThrow('exhausted'); const result = await db.query<{ q: {dailyRemaining:number} }>('select public.fitness_ai_quota() q'); expect(result.rows[0].q.dailyRemaining).toBe(0); });
it('prevents duplicate IDs and direct ledger tampering', async () => { const id = crypto.randomUUID(); await reserve(id); await expect(reserve(id)).rejects.toThrow(); await expect(db.exec('delete from public.ai_usage')).rejects.toThrow(); await expect(db.exec("update public.ai_usage set created_at=now()-interval '1 month'")).rejects.toThrow(); await asUser(other); expect((await db.query('select * from public.ai_usage')).rows).toHaveLength(0); });
it('enforces the global monthly cap even after an account is deleted', async () => { await db.exec('reset role'); await db.query("insert into public.ai_usage select gen_random_uuid(),$1,'food',now()-interval '1 minute' from generate_series(1,50)", [other]); await db.query('delete from auth.users where id=$1',[other]); expect((await db.query('select * from public.ai_usage where user_id is null')).rows).toHaveLength(50); await asUser(); await expect(reserve()).rejects.toThrow('exhausted'); });
