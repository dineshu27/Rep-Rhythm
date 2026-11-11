-- Dedicated FitAi backend only. No service-role key and no changes to manual fitness records.
begin;
create table public.fitai_health_devices (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 80), time_zone text not null check(length(time_zone) between 1 and 80),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'), created_at timestamptz not null default now(),
 last_sync_at timestamptz, last_generated_at timestamptz, revoked boolean not null default false, unique(user_id,id)
);
create unique index fitai_one_active_iphone on public.fitai_health_devices(user_id) where not revoked;
create table public.fitai_health_pairings (
 user_id uuid primary key references auth.users(id) on delete cascade, code_hash text not null unique check(code_hash ~ '^[a-f0-9]{64}$'),
 time_zone text not null, expires_at timestamptz not null, replace_device boolean not null
);
create table public.fitai_health_steps (
 user_id uuid not null references auth.users(id) on delete cascade, date date not null, steps integer not null check(steps between 0 and 100000),
 time_zone text not null, device_id uuid not null, updated_at timestamptz not null default now(), primary key(user_id,date),
 foreign key(user_id,device_id) references public.fitai_health_devices(user_id,id)
);
create table public.fitai_health_workouts (
 user_id uuid not null references auth.users(id) on delete cascade, id uuid not null, name text not null check(length(name) between 1 and 100),
 activity_code integer not null check(activity_code between 0 and 10000), started_at timestamptz not null, finished_at timestamptz not null,
 duration_seconds double precision not null check(duration_seconds between 0 and 172800), source text not null check(length(source) between 1 and 200),
 device_id uuid not null, primary key(user_id,id), foreign key(user_id,device_id) references public.fitai_health_devices(user_id,id),
 check(finished_at>=started_at and duration_seconds<=extract(epoch from finished_at-started_at)+1)
);
alter table public.fitai_health_devices enable row level security;
alter table public.fitai_health_pairings enable row level security;
alter table public.fitai_health_steps enable row level security;
alter table public.fitai_health_workouts enable row level security;
-- Tables have no direct grants. RPCs expose selected fields, never pairing or device token hashes.
revoke all on public.fitai_health_devices,public.fitai_health_pairings,public.fitai_health_steps,public.fitai_health_workouts from public,anon,authenticated;

create function public.fitai_health_pair(code_hash text,zone text,replace_device boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); expires timestamptz:=now()+interval '5 minutes';
begin
 if u is null then raise exception 'Sign in' using errcode='28000'; end if;
 if code_hash !~ '^[a-f0-9]{64}$' or not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Invalid pairing' using errcode='22023'; end if;
 if not replace_device and exists(select 1 from public.fitai_health_devices where user_id=u and not revoked) then raise exception 'Confirm replacement' using errcode='22023'; end if;
 insert into public.fitai_health_pairings values(u,code_hash,zone,expires,replace_device)
 on conflict(user_id) do update set code_hash=excluded.code_hash,time_zone=excluded.time_zone,expires_at=excluded.expires_at,replace_device=excluded.replace_device;
 return jsonb_build_object('expiresAt',expires);
end; $$;

create function public.fitai_health_redeem(pairing_code text,device_token text,device_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.fitai_health_pairings; d uuid; label text;
begin
 if pairing_code is null or device_token is null or pairing_code !~ '^[A-Za-z0-9_-]{43}$' or device_token !~ '^[A-Za-z0-9_-]{43}$' or device_name is null or length(device_name) not between 1 and 80 then raise exception 'Invalid pairing' using errcode='28000'; end if;
 delete from public.fitai_health_pairings h where h.code_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pairing_code,'UTF8')),'hex') and h.expires_at>now() returning * into p;
 if p.user_id is null then raise exception 'Expired pairing' using errcode='28000'; end if;
 -- Serializes two newly issued codes for the same owner, including a pairing created mid-redemption.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p.user_id::text,0));
 if exists(select 1 from public.fitai_health_devices where user_id=p.user_id and not revoked) and not p.replace_device then raise exception 'Confirm replacement' using errcode='22023'; end if;
 if p.replace_device then update public.fitai_health_devices set revoked=true where user_id=p.user_id and not revoked; end if;
 insert into public.fitai_health_devices(user_id,name,time_zone,token_hash) values(p.user_id,device_name,p.time_zone,pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(device_token,'UTF8')),'hex')) returning id into d;
 -- Keep at most 20 device identities; never discard records during pairing. Ask for management if history is full.
 if (select count(*) from public.fitai_health_devices where user_id=p.user_id)>20 then raise exception 'Device history full' using errcode='22023'; end if;
 select email into label from auth.users where id=p.user_id;
 return jsonb_build_object('deviceId',d,'timeZone',p.time_zone,'accountLabel',coalesce(label,'Your FitAi account'),'pairedAt',now());
end; $$;

create function public.fitai_health_ingest(device_token text,batch jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.fitai_health_devices; generated timestamptz; today date; first_day date; item jsonb; started timestamptz; ended timestamptz; seconds double precision;
begin
 if device_token is null or device_token !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'Invalid device' using errcode='28000'; end if;
 select * into d from public.fitai_health_devices h where h.token_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(device_token,'UTF8')),'hex') and not h.revoked for update;
 if d.id is null then raise exception 'Revoked device' using errcode='28000'; end if;
 if coalesce(jsonb_typeof(batch),'')<>'object' or batch->'version' is distinct from '1'::jsonb or batch->>'timeZone' is distinct from d.time_zone or coalesce(jsonb_typeof(batch->'steps'),'')<>'array' or coalesce(jsonb_typeof(batch->'workouts'),'')<>'array' or coalesce(jsonb_typeof(batch->'deletedWorkoutIds'),'')<>'array' or not (batch ?& array['version','timeZone','generatedAt','steps','workouts','deletedWorkoutIds']) then raise exception 'Invalid batch' using errcode='22023'; end if;
 if jsonb_array_length(batch->'steps')>31 or jsonb_array_length(batch->'workouts')>200 or jsonb_array_length(batch->'deletedWorkoutIds')>200 then raise exception 'Batch too large' using errcode='22023'; end if;
 generated:=(batch->>'generatedAt')::timestamptz; today:=(now() at time zone d.time_zone)::date; first_day:=today-30;
 if generated is null or abs(extract(epoch from generated-now()))>86400 then raise exception 'Invalid clock' using errcode='22023'; end if;
 if generated<d.last_generated_at then raise exception 'Stale batch' using errcode='40001'; end if;
 if (select count(*)<>count(distinct x->>'date') from jsonb_array_elements(batch->'steps') x) or (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(batch->'workouts') x) or (select count(*)<>count(distinct x) from jsonb_array_elements_text(batch->'deletedWorkoutIds') x) then raise exception 'Duplicate records' using errcode='22023'; end if;
 for item in select * from jsonb_array_elements(batch->'steps') loop
  if not (item ?& array['date','steps']) or item->>'date' !~ '^\d{4}-\d{2}-\d{2}$' or (item->>'date')::date not between first_day and today or jsonb_typeof(item->'steps')<>'number' or (item->>'steps')::numeric<>trunc((item->>'steps')::numeric) then raise exception 'Invalid step day' using errcode='22023'; end if;
  insert into public.fitai_health_steps values(d.user_id,(item->>'date')::date,(item->>'steps')::int,d.time_zone,d.id,now())
  on conflict(user_id,date) do update set steps=excluded.steps,time_zone=excluded.time_zone,device_id=excluded.device_id,updated_at=excluded.updated_at;
 end loop;
 for item in select * from jsonb_array_elements(batch->'workouts') loop
  if not (item ?& array['id','name','activityCode','startedAt','finishedAt','durationSeconds','source']) or exists(select 1 from jsonb_array_elements_text(batch->'deletedWorkoutIds') x where x::uuid=(item->>'id')::uuid) then raise exception 'Invalid workout' using errcode='22023'; end if;
  started:=(item->>'startedAt')::timestamptz; ended:=(item->>'finishedAt')::timestamptz; seconds:=(item->>'durationSeconds')::double precision;
  if (started at time zone d.time_zone)::date<first_day or ended>now()+interval '5 minutes' or started>ended or seconds<0 or seconds>172800 or seconds>extract(epoch from ended-started)+1 or (item->>'activityCode')::numeric<>trunc((item->>'activityCode')::numeric) then raise exception 'Invalid workout time' using errcode='22023'; end if;
  insert into public.fitai_health_workouts values(d.user_id,(item->>'id')::uuid,item->>'name',(item->>'activityCode')::int,started,ended,seconds,item->>'source',d.id)
  on conflict(user_id,id) do update set name=excluded.name,activity_code=excluded.activity_code,started_at=excluded.started_at,finished_at=excluded.finished_at,duration_seconds=excluded.duration_seconds,source=excluded.source,device_id=excluded.device_id;
 end loop;
 delete from public.fitai_health_workouts w where w.user_id=d.user_id and w.id in(select x::uuid from jsonb_array_elements_text(batch->'deletedWorkoutIds') x);
 update public.fitai_health_devices set last_sync_at=now(),last_generated_at=generated where id=d.id;
 return jsonb_build_object('receivedAt',now());
end; $$;

create function public.fitai_health_load() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'Sign in' using errcode='28000'; end if;
 select jsonb_build_object('ownerId',u,'devices',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'timeZone',time_zone,'createdAt',created_at,'lastSyncAt',last_sync_at,'revoked',revoked) order by created_at desc) from public.fitai_health_devices where user_id=u),'[]'::jsonb),'steps',coalesce((select jsonb_agg(jsonb_build_object('date',date,'steps',steps,'timeZone',time_zone,'updatedAt',updated_at) order by date desc) from (select * from public.fitai_health_steps where user_id=u and date>=current_date-100 order by date desc limit 3100) s),'[]'::jsonb),'workouts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'activityCode',activity_code,'startedAt',started_at,'finishedAt',finished_at,'durationSeconds',duration_seconds,'source',source) order by started_at desc) from (select * from public.fitai_health_workouts where user_id=u and started_at>=now()-interval '31 days' order by started_at desc limit 2000) w),'[]'::jsonb)) into result;
 return result;
end; $$;
create function public.fitai_health_revoke(device_id uuid,erase_records boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Sign in' using errcode='28000'; end if;
 update public.fitai_health_devices d set revoked=true where d.user_id=u and d.id=device_id;
 if not found then raise exception 'Not your device' using errcode='28000'; end if;
 delete from public.fitai_health_pairings where user_id=u;
 if erase_records then delete from public.fitai_health_steps where user_id=u and fitai_health_steps.device_id=fitai_health_revoke.device_id; delete from public.fitai_health_workouts where user_id=u and fitai_health_workouts.device_id=fitai_health_revoke.device_id; end if;
end; $$;
create function public.fitai_health_disconnect(device_token text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.fitai_health_devices d set revoked=true where d.token_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(device_token,'UTF8')),'hex') and not revoked;
 if not found then raise exception 'Revoked device' using errcode='28000'; end if;
end; $$;
revoke all on function public.fitai_health_pair(text,text,boolean),public.fitai_health_redeem(text,text,text),public.fitai_health_ingest(text,jsonb),public.fitai_health_load(),public.fitai_health_revoke(uuid,boolean),public.fitai_health_disconnect(text) from public,anon,authenticated;
grant execute on function public.fitai_health_pair(text,text,boolean),public.fitai_health_load(),public.fitai_health_revoke(uuid,boolean) to authenticated;
grant execute on function public.fitai_health_redeem(text,text,text),public.fitai_health_ingest(text,jsonb),public.fitai_health_disconnect(text) to anon;
commit;
