-- Rep-Rhythm normalized records. Apply to the intended new backend only.
-- Browser records are uploaded only by an explicit account save operation.
begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 150),
  sex text not null check (sex in ('Male','Female','Other','Prefer not to say')),
  age integer not null check (age between 18 and 120),
  height_cm numeric(6,2) not null check (height_cm between 80 and 250),
  start_weight_kg numeric(7,3) not null check (start_weight_kg between 20 and 500),
  goal_weight_kg numeric(7,3) not null check (goal_weight_kg between 20 and 500),
  activity text not null check (char_length(activity) between 1 and 150),
  gym_days integer not null check (gym_days between 0 and 7),
  diet text not null check (char_length(diet) between 1 and 150),
  restrictions text not null default '' check (char_length(restrictions)<=1000),
  time_zone text not null check (char_length(time_zone) between 1 and 80),
  onboarded boolean not null default false,
  rest_until double precision check (rest_until between 0 and 8640000000000000),
  sync_version bigint not null default 0 check (sync_version>=0),
  updated_at timestamptz not null default now()
);
create table public.nutrition_targets (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  calories integer not null check (calories between 1 and 10000),
  protein numeric(9,4) not null check (protein between 0 and 1000),
  fat numeric(9,4) not null check (fat between 0 and 1000),
  carbs numeric(9,4) not null check (carbs between 0 and 2000),
  water_goal_ml integer check (water_goal_ml between 1 and 15000),
  step_goal integer check (step_goal between 1 and 100000)
);
create table public.foods (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 100),
  name text not null check (char_length(name) between 1 and 150), brand text not null default '' check (char_length(brand)<=100),
  calories numeric(12,6) not null check (calories between 0 and 1000),
  protein numeric(12,6) not null check (protein between 0 and 100), fat numeric(12,6) not null check (fat between 0 and 100), carbs numeric(12,6) not null check (carbs between 0 and 100),
  source text not null check (source in ('estimated','label')), reference text not null check (char_length(reference) between 1 and 500),
  unique(user_id,id), unique(user_id,client_id)
);
create table public.food_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 100), date date not null,
  meal text not null check (meal in ('Breakfast','Lunch','Dinner','Snack')), grams numeric(14,6) not null check (grams>0 and grams<=10000),
  snapshot_food_id text not null, snapshot_name text not null check (char_length(snapshot_name) between 1 and 150), snapshot_brand text not null check (char_length(snapshot_brand)<=100),
  calories numeric(12,6) not null check (calories between 0 and 1000), protein numeric(12,6) not null check (protein between 0 and 100), fat numeric(12,6) not null check (fat between 0 and 100), carbs numeric(12,6) not null check (carbs between 0 and 100),
  source text not null check (source in ('estimated','label')), reference text not null check (char_length(reference) between 1 and 500),
  position integer not null check (position>=0), unique(user_id,client_id)
);
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 100), date date not null, name text not null check (char_length(name) between 1 and 150),
  meal text not null check (meal in ('Breakfast','Lunch','Dinner','Snack')), position integer not null check (position>=0), unique(user_id,id), unique(user_id,client_id)
);
create table public.meal_ingredients (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  meal_id uuid not null, food_id uuid not null, grams numeric(14,6) not null check (grams>0 and grams<=10000), position integer not null check (position>=0),
  foreign key(user_id,meal_id) references public.meal_plans(user_id,id) on delete cascade,
  foreign key(user_id,food_id) references public.foods(user_id,id), unique(meal_id,position)
);
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 100), name text not null check (char_length(name) between 1 and 100),
  day text not null check (char_length(day) between 1 and 150), position integer not null check (position>=0), unique(user_id,id), unique(user_id,client_id)
);
create table public.exercises (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 100), name text not null check (char_length(name) between 1 and 100),
  kind text not null check(kind in ('reps','seconds')), unique(user_id,id)
);
create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  plan_id uuid not null, exercise_id uuid not null, sets integer not null check(sets between 1 and 10), target text not null check(char_length(target) between 1 and 40),
  rest_seconds integer not null check(rest_seconds between 0 and 600), position integer not null check(position>=0),
  foreign key(user_id,plan_id) references public.workout_plans(user_id,id) on delete cascade,
  foreign key(user_id,exercise_id) references public.exercises(user_id,id), unique(plan_id,position)
);
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  client_id text not null check(char_length(client_id) between 1 and 100), plan_client_id text not null,
  name text not null check(char_length(name) between 1 and 100), started_at timestamptz not null, finished_at timestamptz,
  notes text not null default '' check(char_length(notes)<=2000), position integer not null check(position>=0),
  check(finished_at is null or finished_at>=started_at), unique(user_id,id), unique(user_id,client_id)
);
create unique index one_active_workout_per_user on public.workout_logs(user_id) where finished_at is null;
create table public.workout_log_exercises (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  log_id uuid not null, client_id text not null check(char_length(client_id) between 1 and 100), name text not null check(char_length(name) between 1 and 100),
  kind text not null check(kind in ('reps','seconds')), sets integer not null check(sets between 1 and 10),
  target text not null check(char_length(target) between 1 and 40), rest_seconds integer not null check(rest_seconds between 0 and 600), position integer not null check(position>=0),
  foreign key(user_id,log_id) references public.workout_logs(user_id,id) on delete cascade,
  unique(user_id,log_id,client_id,kind), unique(log_id,position)
);
create table public.exercise_sets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  log_id uuid not null, client_id text not null check(char_length(client_id) between 1 and 100), exercise_client_id text not null,
  kind text not null check(kind in ('reps','seconds')), amount integer not null check(amount>=1 and amount<=case when kind='reps' then 1000 else 36000 end),
  weight_kg numeric(12,6) not null check(weight_kg between 0 and 1000), position integer not null check(position>=0),
  foreign key(user_id,log_id,exercise_client_id,kind) references public.workout_log_exercises(user_id,log_id,client_id,kind) on delete cascade,
  unique(log_id,client_id), unique(log_id,position)
);
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  client_id text not null check(char_length(client_id) between 1 and 100), date date not null, kg numeric(12,6) not null check(kg between 20 and 500),
  waist_cm numeric(12,6) check(waist_cm between 20 and 300), position integer not null check(position>=0), unique(user_id,date), unique(user_id,client_id)
);
create table public.daily_metrics (
  user_id uuid not null references public.profiles(user_id) on delete cascade, date date not null,
  steps integer not null check(steps between 0 and 100000), water_ml integer not null check(water_ml between 0 and 15000),
  cardio_minutes integer not null check(cardio_minutes between 0 and 1440), notes text not null default '' check(char_length(notes)<=2000),
  position integer not null check(position>=0), primary key(user_id,date)
);

-- All relationships carry the owner as part of the FK. A valid identifier from
-- another user's records cannot be used to attach or infer their records.
do $$ declare tab text; begin
  foreach tab in array array['profiles','nutrition_targets','foods','food_logs','meal_plans','meal_ingredients','workout_plans','exercises','workout_plan_exercises','workout_logs','workout_log_exercises','exercise_sets','weight_logs','daily_metrics'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('create policy owner_records on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',tab);
    execute format('revoke all on public.%I from anon',tab);
    execute format('grant select, insert, update, delete on public.%I to authenticated',tab);
    if tab not in ('profiles','nutrition_targets','daily_metrics') then execute format('create index on public.%I(user_id)',tab); end if;
  end loop;
end $$;
create index food_logs_user_date on public.food_logs(user_id,date);
create index meal_plans_user_date on public.meal_plans(user_id,date);
create index workout_logs_user_finished on public.workout_logs(user_id,finished_at);

create function public.fitness_id(owner_id uuid, client_key text) returns uuid
language sql immutable strict set search_path='' as $$ select md5(owner_id::text||'/'||client_key)::uuid $$;
revoke all on function public.fitness_id(uuid,text) from public;
grant execute on function public.fitness_id(uuid,text) to authenticated;

-- Atomic account replacement with a revision check. These invoker functions
-- retain RLS; they never accept an owner id from the caller.
create function public.fitness_save(bundle jsonb, expected_version bigint) returns bigint
language plpgsql security invoker set search_path='' as $$
declare
  who uuid := auth.uid(); ws jsonb := bundle->'workspace'; wo jsonb := bundle->'workouts'; p jsonb := bundle->'workspace'->'profile';
  row jsonb; child jsonb; entry jsonb; pos integer; childpos integer; setpos integer; parent uuid; exercise uuid; current_version bigint;
begin
  if who is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if bundle->>'version'<>'1' or ws->>'version'<>'1' or wo->>'version'<>'1' then raise exception 'Unsupported backup'; end if;
  perform pg_advisory_xact_lock(hashtextextended(who::text,0));
  select sync_version into current_version from public.profiles where user_id=who for update;
  if coalesce(current_version,0)<>expected_version then raise exception 'Account changed' using errcode='40001'; end if;
  if not exists(select 1 from pg_timezone_names where name=p->>'timeZone') then raise exception 'Invalid timezone'; end if;
  -- Cascades delete this owner's old normalized records only; any error below
  -- rolls back the entire operation, including this deletion.
  delete from public.profiles where user_id=who;
  insert into public.profiles(user_id,name,sex,age,height_cm,start_weight_kg,goal_weight_kg,activity,gym_days,diet,restrictions,time_zone,onboarded,rest_until,sync_version)
  values(who,p->>'name',p->>'sex',(p->>'age')::int,(p->>'heightCm')::numeric,(p->>'startWeightKg')::numeric,(p->>'goalWeightKg')::numeric,p->>'activity',(p->>'gymDays')::int,p->>'diet',p->>'restrictions',p->>'timeZone',(p->>'onboarded')::boolean,(wo->>'restUntil')::double precision,expected_version+1);
  insert into public.nutrition_targets values(who,(p->>'calories')::int,(p->>'protein')::numeric,(p->>'fat')::numeric,(p->>'carbs')::numeric,(p->>'waterGoalMl')::int,(p->>'stepGoal')::int);
  for row in select value from jsonb_array_elements(ws->'foods') loop
    insert into public.foods(id,user_id,client_id,name,brand,calories,protein,fat,carbs,source,reference) values(public.fitness_id(who,'food/'||(row->>'id')),who,row->>'id',row->>'name',row->>'brand',(row->'per100g'->>'calories')::numeric,(row->'per100g'->>'protein')::numeric,(row->'per100g'->>'fat')::numeric,(row->'per100g'->>'carbs')::numeric,row->>'source',row->>'reference');
  end loop;
  pos:=0; for row in select value from jsonb_array_elements(ws->'logs') loop
    child:=row->'food'; insert into public.food_logs(id,user_id,client_id,date,meal,grams,snapshot_food_id,snapshot_name,snapshot_brand,calories,protein,fat,carbs,source,reference,position)
    values(public.fitness_id(who,'food-log/'||(row->>'id')),who,row->>'id',(row->>'date')::date,row->>'meal',(row->>'grams')::numeric,child->>'id',child->>'name',child->>'brand',(child->'per100g'->>'calories')::numeric,(child->'per100g'->>'protein')::numeric,(child->'per100g'->>'fat')::numeric,(child->'per100g'->>'carbs')::numeric,child->>'source',child->>'reference',pos); pos:=pos+1;
  end loop;
  pos:=0; for row in select value from jsonb_array_elements(ws->'meals') loop
    parent:=public.fitness_id(who,'meal/'||(row->>'id')); insert into public.meal_plans values(parent,who,row->>'id',(row->>'date')::date,row->>'name',row->>'meal',pos);
    childpos:=0; for child in select value from jsonb_array_elements(row->'ingredients') loop
      insert into public.meal_ingredients(user_id,meal_id,food_id,grams,position) values(who,parent,public.fitness_id(who,'food/'||(child->>'foodId')),(child->>'grams')::numeric,childpos); childpos:=childpos+1;
    end loop; pos:=pos+1;
  end loop;
  pos:=0; for row in select value from jsonb_array_elements(ws->'weights') loop
    insert into public.weight_logs values(public.fitness_id(who,'weight/'||(row->>'id')),who,row->>'id',(row->>'date')::date,(row->>'kg')::numeric,(row->>'waistCm')::numeric,pos); pos:=pos+1;
  end loop;
  pos:=0; for row in select value from jsonb_array_elements(ws->'metrics') loop
    insert into public.daily_metrics values(who,(row->>'date')::date,(row->>'steps')::int,(row->>'waterMl')::int,(row->>'cardioMinutes')::int,row->>'notes',pos); pos:=pos+1;
  end loop;
  pos:=0; for row in select value from jsonb_array_elements(wo->'plans') loop
    parent:=public.fitness_id(who,'plan/'||(row->>'id')); insert into public.workout_plans values(parent,who,row->>'id',row->>'name',row->>'day',pos);
    childpos:=0; for child in select value from jsonb_array_elements(row->'exercises') loop
      exercise:=public.fitness_id(who,'exercise/'||(row->>'id')||'/'||(child->>'id')); insert into public.exercises values(exercise,who,child->>'id',child->>'name',child->>'kind');
      insert into public.workout_plan_exercises(user_id,plan_id,exercise_id,sets,target,rest_seconds,position) values(who,parent,exercise,(child->>'sets')::int,child->>'target',(child->>'restSeconds')::int,childpos); childpos:=childpos+1;
    end loop; pos:=pos+1;
  end loop;
  pos:=0; for row in select value from jsonb_array_elements((case when wo->'active'='null'::jsonb then '[]'::jsonb else jsonb_build_array(wo->'active') end)||(wo->'history')) loop
    parent:=public.fitness_id(who,'session/'||(row->>'id')); insert into public.workout_logs values(parent,who,row->>'id',row->>'planId',row->>'name',(row->>'startedAt')::timestamptz,(row->>'finishedAt')::timestamptz,row->>'notes',pos);
    childpos:=0; for child in select value from jsonb_array_elements(row->'exercises') loop
      insert into public.workout_log_exercises(user_id,log_id,client_id,name,kind,sets,target,rest_seconds,position) values(who,parent,child->>'id',child->>'name',child->>'kind',(child->>'sets')::int,child->>'target',(child->>'restSeconds')::int,childpos); childpos:=childpos+1;
    end loop;
    setpos:=0; for entry in select value from jsonb_array_elements(row->'sets') loop
      insert into public.exercise_sets(user_id,log_id,client_id,exercise_client_id,kind,amount,weight_kg,position) values(who,parent,entry->>'id',entry->>'exerciseId',entry->>'kind',(entry->>'amount')::int,(entry->>'weightKg')::numeric,setpos); setpos:=setpos+1;
    end loop; pos:=pos+1;
  end loop;
  return expected_version+1;
end $$;

create function public.fitness_session(log public.workout_logs) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',log.client_id,'planId',log.plan_client_id,'name',log.name,'startedAt',to_char(log.started_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'finishedAt',case when log.finished_at is null then null else to_char(log.finished_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,'notes',log.notes,
    'exercises',coalesce((select jsonb_agg(jsonb_build_object('id',e.client_id,'name',e.name,'kind',e.kind,'sets',e.sets,'target',e.target,'restSeconds',e.rest_seconds) order by e.position) from public.workout_log_exercises e where e.log_id=log.id and e.user_id=auth.uid()),'[]'::jsonb),
    'sets',coalesce((select jsonb_agg(jsonb_build_object('id',s.client_id,'exerciseId',s.exercise_client_id,'kind',s.kind,'amount',s.amount,'weightKg',s.weight_kg) order by s.position) from public.exercise_sets s where s.log_id=log.id and s.user_id=auth.uid()),'[]'::jsonb))
$$;

create function public.fitness_load() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare who uuid:=auth.uid(); p public.profiles; t public.nutrition_targets; ws jsonb; wo jsonb;
begin
  if who is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into p from public.profiles where user_id=who;
  if p.user_id is null then return jsonb_build_object('revision',0,'backup',null); end if;
  select * into t from public.nutrition_targets where user_id=who;
  ws:=jsonb_build_object('version',1,'profile',jsonb_build_object('name',p.name,'sex',p.sex,'age',p.age,'heightCm',p.height_cm,'startWeightKg',p.start_weight_kg,'goalWeightKg',p.goal_weight_kg,'activity',p.activity,'gymDays',p.gym_days,'diet',p.diet,'restrictions',p.restrictions,'timeZone',p.time_zone,'onboarded',p.onboarded,'calories',t.calories,'protein',t.protein,'fat',t.fat,'carbs',t.carbs,'waterGoalMl',t.water_goal_ml,'stepGoal',t.step_goal),
    'foods',coalesce((select jsonb_agg(jsonb_build_object('id',f.client_id,'name',f.name,'brand',f.brand,'source',f.source,'reference',f.reference,'per100g',jsonb_build_object('calories',f.calories,'protein',f.protein,'fat',f.fat,'carbs',f.carbs)) order by f.client_id) from public.foods f where f.user_id=who),'[]'::jsonb),
    'logs',coalesce((select jsonb_agg(jsonb_build_object('id',f.client_id,'date',f.date,'meal',f.meal,'grams',f.grams,'food',jsonb_build_object('id',f.snapshot_food_id,'name',f.snapshot_name,'brand',f.snapshot_brand,'source',f.source,'reference',f.reference,'per100g',jsonb_build_object('calories',f.calories,'protein',f.protein,'fat',f.fat,'carbs',f.carbs))) order by f.position) from public.food_logs f where f.user_id=who),'[]'::jsonb),
    'meals',coalesce((select jsonb_agg(jsonb_build_object('id',m.client_id,'date',m.date,'name',m.name,'meal',m.meal,'ingredients',coalesce((select jsonb_agg(jsonb_build_object('foodId',f.client_id,'grams',i.grams) order by i.position) from public.meal_ingredients i join public.foods f on f.id=i.food_id and f.user_id=i.user_id where i.meal_id=m.id and i.user_id=who),'[]'::jsonb)) order by m.position) from public.meal_plans m where m.user_id=who),'[]'::jsonb),
    'weights',coalesce((select jsonb_agg(jsonb_build_object('id',w.client_id,'date',w.date,'kg',w.kg,'waistCm',w.waist_cm) order by w.position) from public.weight_logs w where w.user_id=who),'[]'::jsonb),
    'metrics',coalesce((select jsonb_agg(jsonb_build_object('date',m.date,'steps',m.steps,'waterMl',m.water_ml,'cardioMinutes',m.cardio_minutes,'notes',m.notes) order by m.position) from public.daily_metrics m where m.user_id=who),'[]'::jsonb));
  wo:=jsonb_build_object('version',1,'restUntil',p.rest_until,
    'plans',coalesce((select jsonb_agg(jsonb_build_object('id',w.client_id,'name',w.name,'day',w.day,'exercises',coalesce((select jsonb_agg(jsonb_build_object('id',e.client_id,'name',e.name,'kind',e.kind,'sets',x.sets,'target',x.target,'restSeconds',x.rest_seconds) order by x.position) from public.workout_plan_exercises x join public.exercises e on e.id=x.exercise_id and e.user_id=x.user_id where x.plan_id=w.id and x.user_id=who),'[]'::jsonb)) order by w.position) from public.workout_plans w where w.user_id=who),'[]'::jsonb),
    'active',(select public.fitness_session(w) from public.workout_logs w where w.user_id=who and w.finished_at is null),
    'history',coalesce((select jsonb_agg(public.fitness_session(w) order by w.position) from public.workout_logs w where w.user_id=who and w.finished_at is not null),'[]'::jsonb));
  return jsonb_build_object('revision',p.sync_version,'backup',jsonb_build_object('version',1,'workspace',ws,'workouts',wo));
end $$;

create function public.fitness_delete_account() returns void
language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); issued bigint:=(select max((entry->>'timestamp')::bigint) from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) entry where entry->>'method' in ('otp','password','magiclink','oauth'));
begin
  if who is null or issued is null or issued<extract(epoch from now())-300 or issued>extract(epoch from now())+60 then raise exception 'Recent sign-in required' using errcode='42501'; end if;
  delete from auth.users where id=who;
end $$;
revoke all on function public.fitness_save(jsonb,bigint),public.fitness_load(),public.fitness_session(public.workout_logs),public.fitness_delete_account() from public;
grant execute on function public.fitness_save(jsonb,bigint),public.fitness_load(),public.fitness_session(public.workout_logs),public.fitness_delete_account() to authenticated;
commit;
