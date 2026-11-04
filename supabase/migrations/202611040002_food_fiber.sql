-- Fiber was not collected in the original release. NULL means not recorded,
-- so legacy foods and snapshots are not silently treated as zero-fiber foods.
begin;
alter table public.foods add column fiber numeric(12,6) check (fiber between 0 and 100);
alter table public.food_logs add column fiber numeric(12,6) check (fiber between 0 and 100);
create or replace function public.fitness_save(bundle jsonb, expected_version bigint) returns bigint
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
    insert into public.foods(id,user_id,client_id,name,brand,calories,protein,fat,carbs,fiber,source,reference) values(public.fitness_id(who,'food/'||(row->>'id')),who,row->>'id',row->>'name',row->>'brand',(row->'per100g'->>'calories')::numeric,(row->'per100g'->>'protein')::numeric,(row->'per100g'->>'fat')::numeric,(row->'per100g'->>'carbs')::numeric,(row->'per100g'->>'fiber')::numeric,row->>'source',row->>'reference');
  end loop;
  pos:=0; for row in select value from jsonb_array_elements(ws->'logs') loop
    child:=row->'food'; insert into public.food_logs(id,user_id,client_id,date,meal,grams,snapshot_food_id,snapshot_name,snapshot_brand,calories,protein,fat,carbs,fiber,source,reference,position)
    values(public.fitness_id(who,'food-log/'||(row->>'id')),who,row->>'id',(row->>'date')::date,row->>'meal',(row->>'grams')::numeric,child->>'id',child->>'name',child->>'brand',(child->'per100g'->>'calories')::numeric,(child->'per100g'->>'protein')::numeric,(child->'per100g'->>'fat')::numeric,(child->'per100g'->>'carbs')::numeric,(child->'per100g'->>'fiber')::numeric,child->>'source',child->>'reference',pos); pos:=pos+1;
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

create or replace function public.fitness_load() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare who uuid:=auth.uid(); p public.profiles; t public.nutrition_targets; ws jsonb; wo jsonb;
begin
  if who is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into p from public.profiles where user_id=who;
  if p.user_id is null then return jsonb_build_object('revision',0,'backup',null); end if;
  select * into t from public.nutrition_targets where user_id=who;
  ws:=jsonb_build_object('version',1,'profile',jsonb_build_object('name',p.name,'sex',p.sex,'age',p.age,'heightCm',p.height_cm,'startWeightKg',p.start_weight_kg,'goalWeightKg',p.goal_weight_kg,'activity',p.activity,'gymDays',p.gym_days,'diet',p.diet,'restrictions',p.restrictions,'timeZone',p.time_zone,'onboarded',p.onboarded,'calories',t.calories,'protein',t.protein,'fat',t.fat,'carbs',t.carbs,'waterGoalMl',t.water_goal_ml,'stepGoal',t.step_goal),
    'foods',coalesce((select jsonb_agg(jsonb_build_object('id',f.client_id,'name',f.name,'brand',f.brand,'source',f.source,'reference',f.reference,'per100g',jsonb_build_object('calories',f.calories,'protein',f.protein,'fat',f.fat,'carbs',f.carbs,'fiber',f.fiber)) order by f.client_id) from public.foods f where f.user_id=who),'[]'::jsonb),
    'logs',coalesce((select jsonb_agg(jsonb_build_object('id',f.client_id,'date',f.date,'meal',f.meal,'grams',f.grams,'food',jsonb_build_object('id',f.snapshot_food_id,'name',f.snapshot_name,'brand',f.snapshot_brand,'source',f.source,'reference',f.reference,'per100g',jsonb_build_object('calories',f.calories,'protein',f.protein,'fat',f.fat,'carbs',f.carbs,'fiber',f.fiber))) order by f.position) from public.food_logs f where f.user_id=who),'[]'::jsonb),
    'meals',coalesce((select jsonb_agg(jsonb_build_object('id',m.client_id,'date',m.date,'name',m.name,'meal',m.meal,'ingredients',coalesce((select jsonb_agg(jsonb_build_object('foodId',f.client_id,'grams',i.grams) order by i.position) from public.meal_ingredients i join public.foods f on f.id=i.food_id and f.user_id=i.user_id where i.meal_id=m.id and i.user_id=who),'[]'::jsonb)) order by m.position) from public.meal_plans m where m.user_id=who),'[]'::jsonb),
    'weights',coalesce((select jsonb_agg(jsonb_build_object('id',w.client_id,'date',w.date,'kg',w.kg,'waistCm',w.waist_cm) order by w.position) from public.weight_logs w where w.user_id=who),'[]'::jsonb),
    'metrics',coalesce((select jsonb_agg(jsonb_build_object('date',m.date,'steps',m.steps,'waterMl',m.water_ml,'cardioMinutes',m.cardio_minutes,'notes',m.notes) order by m.position) from public.daily_metrics m where m.user_id=who),'[]'::jsonb));
  wo:=jsonb_build_object('version',1,'restUntil',p.rest_until,
    'plans',coalesce((select jsonb_agg(jsonb_build_object('id',w.client_id,'name',w.name,'day',w.day,'exercises',coalesce((select jsonb_agg(jsonb_build_object('id',e.client_id,'name',e.name,'kind',e.kind,'sets',x.sets,'target',x.target,'restSeconds',x.rest_seconds) order by x.position) from public.workout_plan_exercises x join public.exercises e on e.id=x.exercise_id and e.user_id=x.user_id where x.plan_id=w.id and x.user_id=who),'[]'::jsonb)) order by w.position) from public.workout_plans w where w.user_id=who),'[]'::jsonb),
    'active',(select public.fitness_session(w) from public.workout_logs w where w.user_id=who and w.finished_at is null),
    'history',coalesce((select jsonb_agg(public.fitness_session(w) order by w.position) from public.workout_logs w where w.user_id=who and w.finished_at is not null),'[]'::jsonb));
  return jsonb_build_object('revision',p.sync_version,'backup',jsonb_build_object('version',1,'workspace',ws,'workouts',wo));
end $$;
commit;
