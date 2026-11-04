'use client';

import Link from 'next/link';
import { FoodSearch } from './food-search';
import { NutritionValues as NutritionText } from './nutrition-values';
import { starterFoods } from '@/lib/food-catalog';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Download, Plus, Trash2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { changeWorkspace, downloadJSON, replaceWorkspace, useWorkspace } from '@/lib/workspace-store';
import { useWorkouts, replaceWorkouts } from '@/lib/workout-store';
import { initialWorkouts, WORKOUT_STORAGE_KEY, workoutStateSchema } from '@/lib/workouts';
import { WORKSPACE_KEY, dateSchema, addNutrition, dayNutrition, foodLogSchema, foodSchema, initialWorkspace, logPlannedMeal, mealCategory, mealNutrition, mealPlanSchema, metricSchema, mondayOf, nutritionFor, profileSchema, sevenDayWeight, shiftDate, todayInZone, upsertById, weightSchema, workspaceSchema, zeroNutrition, type FoodLog, type FoodRecord, type PlannedMeal, type Profile, type Workspace } from '@/lib/workspace';

function id() { return crypto.randomUUID(); }
function round(value: number) { return Math.round(value * 10) / 10; }
function values(event: FormEvent<HTMLFormElement>) { event.preventDefault(); return new FormData(event.currentTarget); }
function number(data: FormData, key: string) { const value = data.get(key); return typeof value === 'string' && value.trim() ? Number(value) : NaN; }
function text(data: FormData, key: string) { return String(data.get(key) ?? ''); }
function ConfirmDelete({ label, onDelete }: { label: string; onDelete: () => void }) { return <button className="shell-icon" aria-label={`Delete ${label}`} onClick={() => { if (confirm(`Delete ${label}?`)) onDelete(); }}><Trash2 size={16}/></button>; }
function Heading({ title, description }: { title: string; description: string }) { return <div className="shell-page-heading"><div><span className="shell-overline">YOUR FITNESS WORKSPACE</span><h1>{title}</h1><p>{description}</p></div><span className="shell-badge">Browser storage</span></div>; }
export function WorkspacePage({ view }: { view: 'dashboard' | 'profile' | 'onboarding' | 'food' | 'meals' | 'progress' }) {
  const { data, error } = useWorkspace();
  const headings = { dashboard: ['Your space to make progress.', 'Real records. One day at a time.'], profile: ['Your profile & settings', 'Your preferences, goals, and data controls.'], onboarding: ['Your starting point', 'Make the workspace yours. You can change these preferences later.'], food: ['Food diary', 'Log your portions and keep a clear nutrition history.'], meals: ['Meal planner', 'Plan seven days around foods you actually use.'], progress: ['Progress', 'Your measurements, daily habits, and weekly trends.'] };
  return <div className="feature-page"><Heading title={headings[view][0]} description={headings[view][1]}/>{['food', 'meals', 'progress', 'dashboard'].includes(view) && <Link className="shell-text-link" href={`/assistant?mode=${view === 'meals' ? 'meals' : view === 'progress' ? 'review' : 'food'}`}>Open AI assistant →</Link>}{error && <div className="workout-notice" role="alert">{error}</div>}{!data ? <section className="workout-panel"><p>{error ? 'Open Settings for data recovery.' : 'Loading your workspace…'}</p>{view === 'profile' && <DataControls data={null}/>}</section> : <>
    {view === 'dashboard' && <Dashboard data={data}/>}
    {(view === 'profile' || view === 'onboarding') && <><ProfileEditor key={JSON.stringify(data.profile)} profile={data.profile} onboarding={view === 'onboarding'}/>{view === 'profile' && <DataControls data={data}/>}</>}
    {view === 'food' && <FoodDiary data={data}/>}
    {view === 'meals' && <MealPlanner data={data}/>}
    {view === 'progress' && <Progress data={data}/>}
  </>}</div>;
}

function Dashboard({ data }: { data: Workspace }) {
  const { data: workouts } = useWorkouts();
  const today = todayInZone(data.profile.timeZone);
  const totals = dayNutrition(data, today);
  const logged = data.logs.some(log => log.date === today);
  const metric = data.metrics.find(metric => metric.date === today);
  const week = mondayOf(today);
  const sessions = workouts?.history.filter(session => { const date = todayInZone(data.profile.timeZone, new Date(session.finishedAt!)); return date >= week && date <= today; }) ?? [];
  const latest = [...data.weights].filter(row => row.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0];
  return <>
    {!data.profile.onboarded && <section className="workout-resume"><div><h2>Start with your preferences.</h2><p>Review your profile, timezone, and nutrition targets before tracking.</p></div><Link className="shell-button" href="/onboarding">Set up your profile <ArrowRight size={16}/></Link></section>}
    {workouts?.active && <section className="workout-resume"><div><span className="shell-overline">SESSION IN PROGRESS</span><h2>{workouts.active.name}</h2><p>{workouts.active.sets.length} sets logged</p></div><Link className="shell-button" href="/workouts/active">Resume workout <ArrowRight size={16}/></Link></section>}
    <div className="feature-section-heading"><h2>Today’s nutrition</h2><span>{today} · {data.profile.timeZone}</span></div>
    <div className="shell-target-grid nutrition-grid">{(['calories', 'protein', 'fat', 'carbs'] as const).map(key => <section key={key} className="workout-panel feature-stat"><span>{key === 'calories' ? 'Calories' : key[0].toUpperCase() + key.slice(1)}</span><strong>{logged ? round(totals[key]).toLocaleString() : '—'} <small>{key === 'calories' ? 'kcal' : 'g'}</small></strong><p>{logged ? `of ${data.profile[key]} ${key === 'calories' ? 'kcal' : 'g'} target` : `Not logged · target ${data.profile[key]}`}</p><progress aria-label={`${key} target progress`} value={Math.min(totals[key], data.profile[key])} max={data.profile[key] || 1}/></section>)}<section className="workout-panel feature-stat"><span>Fiber</span><strong>{!logged ? "—" : totals.fiber === null ? "Not recorded" : round(totals.fiber)} {logged && totals.fiber !== null && <small>g</small>}</strong><p>{logged && totals.fiber === null ? "One or more foods have no fiber value" : "From logged food portions"}</p></section></div>
    <p className="workout-muted">{logged ? `${round(Math.abs(data.profile.calories - totals.calories))} kcal ${totals.calories > data.profile.calories ? 'over' : 'remaining against'} your target.` : 'Your diary is empty for today.'} Workout energy does not change food targets.</p>
    <div className="feature-grid"><section className="workout-panel"><h2>Your daily rhythm</h2><dl className="feature-summary"><div><dt>Steps</dt><dd>{metric ? metric.steps.toLocaleString() : 'Not logged'}{data.profile.stepGoal ? ` / ${data.profile.stepGoal.toLocaleString()}` : ''}</dd></div><div><dt>Water</dt><dd>{metric ? `${metric.waterMl} ml` : 'Not logged'}{data.profile.waterGoalMl ? ` / ${data.profile.waterGoalMl} ml` : ''}</dd></div><div><dt>Latest weight</dt><dd>{latest ? `${latest.kg} kg · ${latest.date}` : 'Not logged'}</dd></div><div><dt>Gym days this week</dt><dd>{new Set(sessions.map(session => todayInZone(data.profile.timeZone, new Date(session.finishedAt!)))).size} / {data.profile.gymDays} days</dd></div></dl><Link className="shell-text-link" href="/progress">Log daily activity and measurements →</Link></section><section className="workout-panel"><h2>Make room for the next step.</h2><div className="feature-link-list"><Link href="/food">Log a meal <ArrowRight size={16}/></Link><Link href="/meals">Plan your week <ArrowRight size={16}/></Link><Link href="/workouts">Start a workout <ArrowRight size={16}/></Link><Link href="/settings">Edit your targets <ArrowRight size={16}/></Link></div></section></div>
  </>;
}

function Field({ label, name, value, type = 'number', min, max, step = 'any', required = true }: { label: string; name: string; value?: string | number; type?: string; min?: number; max?: number; step?: string; required?: boolean }) { return <label>{label}<input name={name} type={type} defaultValue={value} min={min} max={max} step={step} required={required}/></label>; }
function ProfileEditor({ profile, onboarding }: { profile: Profile; onboarding: boolean }) {
  const router = useRouter(); const [error, setError] = useState('');
  function save(event: FormEvent<HTMLFormElement>) {
    const data = values(event);
    const parsed = profileSchema.safeParse({ ...profile, name: text(data, 'name'), sex: text(data, 'sex'), activity: text(data, 'activity'), diet: text(data, 'diet'), restrictions: text(data, 'restrictions'), timeZone: text(data, 'timeZone'),
      ...Object.fromEntries(['age', 'heightCm', 'startWeightKg', 'goalWeightKg', 'gymDays', 'calories', 'protein', 'fat', 'carbs'].map(key => [key, number(data, key)])),
      waterGoalMl: text(data, 'waterGoalMl').trim() ? number(data, 'waterGoalMl') : null, stepGoal: text(data, 'stepGoal').trim() ? number(data, 'stepGoal') : null, onboarded: true });
    if (!parsed.success) { setError(parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' ')); return; }
    if (changeWorkspace(state => ({ ...state, profile: parsed.data }))) { if (onboarding) router.push('/'); else router.refresh(); }
  }
  return <form className="workout-panel workout-form" onSubmit={save}><h2>{onboarding ? 'Your starting profile' : 'Edit profile and targets'}</h2><div className="feature-form-grid">
    <Field label="Profile name" name="name" value={profile.name} type="text"/>
    <label>Sex<select aria-label="Sex" name="sex" defaultValue={profile.sex}>{['Male', 'Female', 'Other', 'Prefer not to say'].map(value => <option key={value}>{value}</option>)}</select></label>
    <Field label="Age (years)" name="age" value={profile.age} min={18} max={120} step="1"/>
    <Field label="Height (cm)" name="heightCm" value={profile.heightCm} min={80} max={250}/>
    <Field label="Starting weight (kg)" name="startWeightKg" value={profile.startWeightKg} min={20} max={500}/>
    <Field label="Goal weight (kg)" name="goalWeightKg" value={profile.goalWeightKg} min={20} max={500}/>
    <Field label="Activity level" name="activity" value={profile.activity} type="text"/>
    <Field label="Gym days per week" name="gymDays" value={profile.gymDays} min={0} max={7} step="1"/>
    <Field label="Diet preference" name="diet" value={profile.diet} type="text"/>
    <Field label="Restrictions / allergies" name="restrictions" value={profile.restrictions} type="text" required={false}/>
    <Field label="Timezone" name="timeZone" value={profile.timeZone} type="text"/>
  </div><h2>Daily targets</h2><p className="workout-muted">Set each target independently. These are your preferences; the app does not calculate a calorie prescription.</p><div className="feature-form-grid">
    <Field label="Calories (kcal)" name="calories" value={profile.calories} min={1} max={10000} step="1"/>
    <Field label="Protein (g)" name="protein" value={profile.protein} min={0} max={1000}/>
    <Field label="Fat (g)" name="fat" value={profile.fat} min={0} max={1000}/>
    <Field label="Carbohydrates (g)" name="carbs" value={profile.carbs} min={0} max={2000}/>
    <Field label="Water goal (ml, optional)" name="waterGoalMl" value={profile.waterGoalMl ?? ''} min={1} max={15000} step="1" required={false}/>
    <Field label="Step goal (optional)" name="stepGoal" value={profile.stepGoal ?? ''} min={1} max={100000} step="1" required={false}/>
  </div><p className="workout-muted">Current macro targets imply {round(profile.protein * 4 + profile.fat * 9 + profile.carbs * 4)} kcal. Your calorie target is {profile.calories} kcal.</p>{error && <p role="alert">{error}</p>}<button className="shell-button" type="submit">{onboarding ? 'Save and start tracking' : 'Save profile and targets'}</button></form>;
}

function FoodEditor({ food, onDone }: { food?: FoodRecord; onDone: () => void }) {
  const [error, setError] = useState('');
  function save(event: FormEvent<HTMLFormElement>) {
    const data = values(event); const parsed = foodSchema.safeParse({ id: food?.id ?? id(), name: text(data, 'name'), brand: text(data, 'brand'), source: text(data, 'source'), reference: text(data, 'reference'), per100g: Object.fromEntries(['calories', 'protein', 'fat', 'carbs', 'fiber'].map(key => [key, key === 'fiber' && !text(data, key).trim() ? null : number(data, key)])) });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    if (changeWorkspace(state => ({ ...state, foods: upsertById(state.foods, parsed.data) }))) onDone();
  }
  return <form onSubmit={save} className="workout-form" aria-label={food ? 'Edit food' : 'Add food'}><h2>{food ? 'Edit saved food' : 'Add a food to your library'}</h2><div className="feature-form-grid"><Field label="Food name" name="name" type="text" value={food?.name}/><Field label="Brand (optional)" name="brand" type="text" value={food?.brand} required={false}/></div><p className="workout-muted">Enter nutrition per 100 g from packaging or a reference. Leave fiber blank if it is not reported; enter 0 only when the source specifies zero. Label-based means you entered values from a label; the app does not independently verify them.</p><div className="feature-form-grid">{(['calories', 'protein', 'fat', 'carbs', 'fiber'] as const).map(key => <Field key={key} label={`${key === 'calories' ? 'Energy (kcal)' : key[0].toUpperCase() + key.slice(1) + ' (g)'} per 100 g`} name={key} min={0} max={key === 'calories' ? 1000 : 100} value={food?.per100g[key] ?? ''} required={key !== 'fiber'}/>)}</div><label>Nutrition source<select aria-label="Nutrition source" name="source" defaultValue={food?.source ?? 'estimated'}><option value="estimated">Estimated / reference</option><option value="label">Entered from packaging</option></select></label><Field label="Source or package description" name="reference" type="text" value={food?.reference}/>{error && <p role="alert">{error}</p>}<div className="workout-actions"><button className="shell-button" type="submit">Save food</button><button className="shell-button shell-button-secondary" type="button" onClick={onDone}>Cancel</button></div></form>;
}

function FoodDiary({ data }: { data: Workspace }) {
  const [date, setDate] = useState(() => todayInZone(data.profile.timeZone));
  const [search, setSearch] = useState(''); const [starter, setStarter] = useState(starterFoods[0].id); const [editor, setEditor] = useState<FoodRecord | 'new' | null>(null);
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const entryPanel = useRef<HTMLElement>(null);
  function chooseFood(food: FoodRecord) {
    const exists = data.foods.some(saved => saved.id === food.id);
    if (!exists && !changeWorkspace(state => ({ ...state, foods: state.foods.some(saved => saved.id === food.id) ? state.foods : [...state.foods, food] }))) return false;
    setEditingLog(null); setSelectedFoodId(food.id); setSelectionRevision(revision => revision + 1);
    requestAnimationFrame(() => entryPanel.current?.scrollIntoView({ block: 'start' }));
    return true;
  }
  const foods = data.foods.filter(food => `${food.name} ${food.brand}`.toLowerCase().includes(search.trim().toLowerCase()));
  const rows = data.logs.filter(log => log.date === date);
  return <><div className="workout-panel workout-form"><label>Diary date<input type="date" required value={date} onChange={event => { if (dateSchema.safeParse(event.target.value).success) setDate(event.target.value); }}/></label><div className="feature-totals"><NutritionText value={dayNutrition(data, date)}/><span>{rows.length} food entries</span></div></div>
    <FoodSearch savedIds={data.foods.map(food => food.id)} onChoose={chooseFood}/>
    <div className="feature-grid"><section ref={entryPanel} className="workout-panel"><h2>{editingLog ? 'Edit food entry' : 'Log a portion'}</h2>{data.foods.length || editingLog ? <FoodLogEditor key={editingLog?.id ?? `new-${date}-${selectedFoodId}-${selectionRevision}`} foods={data.foods} preferredFoodId={selectedFoodId} date={date} log={editingLog ?? undefined} onDone={() => setEditingLog(null)}/> : <p className="workout-muted">Search for a food above, or add your own label values in the library, then enter its portion in grams.</p>}</section><section className="workout-panel"><h2>Your food library</h2><div className="workout-form"><label>Starter food<select aria-label="Starter food" value={starter} onChange={event => setStarter(event.target.value)}>{starterFoods.map(food => <option key={food.id} value={food.id}>{food.name}</option>)}</select></label><button className="shell-button shell-button-secondary" disabled={data.foods.some(food => food.id === starter)} onClick={() => { const food = starterFoods.find(food => food.id === starter); if (food) changeWorkspace(state => ({ ...state, foods: state.foods.some(row => row.id === food.id) ? state.foods : [...state.foods, structuredClone(food)] })); }}>Add selected starter food</button><p className="workout-muted">USDA reference estimates. Choose the matching raw, dry, or cooked preparation, then weigh that food in grams.</p></div><div className="workout-form"><label>Search saved foods<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search food or brand"/></label><button className="shell-button" onClick={() => setEditor('new')}><Plus size={16}/> Add food</button></div>{editor && <FoodEditor key={editor === 'new' ? 'new' : editor.id} food={editor === 'new' ? undefined : editor} onDone={() => setEditor(null)}/>}<ul className="feature-records">{foods.map(food => <li key={food.id}><div><strong>{food.name}</strong><small>{food.brand || 'No brand'} · {food.source === 'label' ? 'Label-based' : 'Estimated'} · per 100 g</small><NutritionText value={food.per100g}/><small>{food.reference}</small></div><div className="workout-actions"><button className="shell-button shell-button-secondary" onClick={() => setEditor(food)}>Edit food</button><ConfirmDelete label={food.name} onDelete={() => changeWorkspace(state => { if (state.meals.some(meal => meal.ingredients.some(ingredient => ingredient.foodId === food.id))) throw new Error('Remove this food from planned meals before deleting it. Past diary snapshots will be kept.'); return { ...state, foods: state.foods.filter(row => row.id !== food.id) }; })}/></div></li>)}</ul>{!foods.length && <p className="workout-muted">{data.foods.length ? 'No foods match your search.' : 'No saved foods yet. Use your actual package or reference values to start.'}</p>}</section></div>
    <section className="workout-panel"><h2>Diary entries</h2>{mealCategory.options.map(meal => <div key={meal} className="feature-meal-group"><h3>{meal}</h3>{!rows.some(row => row.meal === meal) && <p className="workout-muted">Nothing logged.</p>}<ul className="feature-records">{rows.filter(row => row.meal === meal).map(row => <li key={row.id}><div><strong>{row.food.name} · {row.grams} g</strong><small>{row.food.source === 'label' ? 'Label-based' : 'Estimated'} · Snapshot at time of logging</small><NutritionText value={nutritionFor(row.food, row.grams)}/></div><div className="workout-actions"><button className="shell-button shell-button-secondary" onClick={() => setEditingLog(row)}>Edit entry</button><ConfirmDelete label={`${row.food.name} entry`} onDelete={() => changeWorkspace(state => ({ ...state, logs: state.logs.filter(log => log.id !== row.id) }))}/></div></li>)}</ul></div>)}</section>
  </>;
}

function FoodLogEditor({ foods, date, log, onDone, preferredFoodId }: { foods: FoodRecord[]; date: string; log?: FoodLog; onDone: () => void; preferredFoodId?: string | null }) {
  const [foodId, setFoodId] = useState(log ? 'snapshot' : foods.some(food => food.id === preferredFoodId) ? preferredFoodId! : foods[0]?.id ?? ''); const [error, setError] = useState('');
  const [grams, setGrams] = useState(String(log?.grams ?? 100));
  const selected = foodId === 'snapshot' ? log?.food : foods.find(food => food.id === foodId);
  const portion = Number(grams);
  const preview = selected && grams.trim() && Number.isFinite(portion) && portion > 0 && portion <= 10000 ? nutritionFor(selected, portion) : null;
  function save(event: FormEvent<HTMLFormElement>) {
    const form = values(event); const food = foodId === 'snapshot' ? log?.food : foods.find(food => food.id === foodId);
    const parsed = foodLogSchema.safeParse({ id: log?.id ?? id(), date: text(form, 'date'), meal: text(form, 'meal'), grams: number(form, 'grams'), food });
    if (!parsed.success) { setError('Select a food, valid date, and portion of 0–10,000 g (above zero).'); return; }
    if (changeWorkspace(state => ({ ...state, logs: upsertById(state.logs, parsed.data) }))) { setError(log ? '' : 'Portion logged.'); onDone(); }
  }
  return <form onSubmit={save} className="workout-form" aria-label="Food entry"><label>Food<select aria-label="Food" required value={foodId} onChange={event => setFoodId(event.target.value)}>{log && <option value="snapshot">{log.food.name} (original snapshot)</option>}{foods.map(food => <option key={food.id} value={food.id}>{food.name}{food.brand ? ` · ${food.brand}` : ''}</option>)}</select></label><div className="feature-form-grid"><Field label="Entry date" name="date" value={log?.date ?? date} type="date"/><label>Meal<select name="meal" defaultValue={log?.meal ?? 'Breakfast'}>{mealCategory.options.map(meal => <option key={meal}>{meal}</option>)}</select></label><label>Portion (g)<input aria-label="Portion (g)" name="grams" type="number" min={0.1} max={10000} step="any" required value={grams} onChange={event => setGrams(event.target.value)}/></label></div><div className="portion-preview" role="status" aria-label="Calculated portion nutrition" aria-live="polite">{preview ? <><strong>For {grams} g of {selected?.name}</strong><NutritionText value={preview}/></> : <p>Enter a valid food portion to calculate nutrition.</p>}</div><button className="shell-button" type="submit">{log ? 'Save entry changes' : 'Log food'}</button>{log && <button className="shell-button shell-button-secondary" type="button" onClick={onDone}>Cancel edit</button>}<p role="status">{error}</p></form>;
}

function MealPlanner({ data }: { data: Workspace }) {
  const [week, setWeek] = useState(() => mondayOf(todayInZone(data.profile.timeZone)));
  const [editing, setEditing] = useState<PlannedMeal | 'new' | null>(null);
  const [notice, setNotice] = useState('');
  return <><section className="workout-panel"><div className="feature-section-heading"><h2>Week of {week}</h2><div className="workout-actions"><button className="shell-button shell-button-secondary" onClick={() => setWeek(shiftDate(week, -7))}>Previous week</button><button className="shell-button shell-button-secondary" onClick={() => setWeek(shiftDate(week, 7))}>Next week</button></div></div><button className="shell-button" disabled={!data.foods.length} onClick={() => setEditing('new')}><Plus size={16}/> Plan a meal</button>{!data.foods.length && <p className="workout-muted">Add foods in your <Link className="shell-text-link" href="/food">food library</Link> to plan meals from real ingredient records.</p>}{editing && <MealEditor key={editing === 'new' ? `new-${week}` : editing.id} data={data} defaultDate={week} meal={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)}/>}<p role="status">{notice}</p></section>
    <div className="feature-week">{Array.from({ length: 7 }, (_, index) => shiftDate(week, index)).map(date => {
      const meals = data.meals.filter(meal => meal.date === date); const nutrition = meals.reduce((total, meal) => addNutrition(total, mealNutrition(meal, data.foods)), zeroNutrition());
      return <section key={date} className="workout-panel"><span className="shell-overline">{new Intl.DateTimeFormat(undefined, { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))}</span><h2>{date}</h2>{meals.length ? <NutritionText value={nutrition}/> : <p className="workout-muted">No meals planned.</p>}<ul className="feature-records">{meals.map(meal => <li key={meal.id}><div><small>{meal.meal}</small><strong>{meal.name}</strong><ul>{meal.ingredients.map((ingredient, i) => <li key={i}>{data.foods.find(food => food.id === ingredient.foodId)?.name} · {ingredient.grams} g</li>)}</ul><NutritionText value={mealNutrition(meal, data.foods)}/><div className="workout-actions"><button className="shell-button shell-button-secondary" onClick={() => setEditing(meal)}>Edit meal</button><button className="shell-button" onClick={() => { if (confirm(`Log all ingredients of ${meal.name} to ${meal.date}? This adds new diary entries each time.`) && changeWorkspace(state => logPlannedMeal(state, meal.id, id))) setNotice(`${meal.name} logged to ${meal.date}.`); }}>Log ingredients</button><ConfirmDelete label={meal.name} onDelete={() => changeWorkspace(state => ({ ...state, meals: state.meals.filter(row => row.id !== meal.id) }))}/></div></div></li>)}</ul></section>;
    })}</div>
  </>;
}

function MealEditor({ data, defaultDate, meal, onDone }: { data: Workspace; defaultDate: string; meal?: PlannedMeal; onDone: () => void }) {
  const [ingredients, setIngredients] = useState(meal?.ingredients ?? [{ foodId: data.foods[0].id, grams: 100 }]); const [error, setError] = useState('');
  function save(event: FormEvent<HTMLFormElement>) {
    const form = values(event); const parsed = mealPlanSchema.safeParse({ id: meal?.id ?? id(), name: text(form, 'name'), date: text(form, 'date'), meal: text(form, 'meal'), ingredients });
    if (!parsed.success) { setError('Choose a name, date, and at least one ingredient with a positive portion.'); return; }
    if (changeWorkspace(state => ({ ...state, meals: upsertById(state.meals, parsed.data) }))) onDone();
  }
  return <form className="workout-form" onSubmit={save} aria-label="Meal plan"><div className="feature-form-grid"><Field label="Meal name" name="name" value={meal?.name} type="text"/><Field label="Planned date" name="date" value={meal?.date ?? defaultDate} type="date"/><label>Meal category<select name="meal" defaultValue={meal?.meal ?? 'Lunch'}>{mealCategory.options.map(value => <option key={value}>{value}</option>)}</select></label></div>{ingredients.map((ingredient, index) => <fieldset key={index}><legend>Ingredient {index + 1}</legend><div className="feature-form-grid"><label>Ingredient food<select aria-label="Ingredient food" value={ingredient.foodId} onChange={event => setIngredients(ingredients.map((row, i) => i === index ? { ...row, foodId: event.target.value } : row))}>{data.foods.map(food => <option key={food.id} value={food.id}>{food.name}</option>)}</select></label><label>Ingredient grams<input type="number" required min="0.1" max={10000} step="any" value={Number.isNaN(ingredient.grams) ? '' : ingredient.grams} onChange={event => setIngredients(ingredients.map((row, i) => i === index ? { ...row, grams: event.target.valueAsNumber } : row))}/></label></div><button className="shell-button shell-button-secondary" type="button" onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}>Remove ingredient {index + 1}</button></fieldset>)}<div className="workout-actions"><button className="shell-button shell-button-secondary" disabled={ingredients.length >= 50} type="button" onClick={() => setIngredients([...ingredients, { foodId: data.foods[0].id, grams: 100 }])}>Add ingredient</button><button className="shell-button" type="submit">Save planned meal</button><button className="shell-button shell-button-secondary" type="button" onClick={onDone}>Cancel</button></div>{error && <p role="alert">{error}</p>}</form>;
}

function Progress({ data }: { data: Workspace }) {
  const { data: workouts } = useWorkouts();
  const [date, setDate] = useState(() => todayInZone(data.profile.timeZone));
  const [error, setError] = useState('');
  const weights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
  const average = sevenDayWeight(weights, date);
  const weekly = data.metrics.filter(row => row.date >= shiftDate(date, -6) && row.date <= date);
  const weeklyFood = data.logs.filter(row => row.date >= shiftDate(date, -6) && row.date <= date);
  const loggedDays = new Set(weeklyFood.map(row => row.date));
  const calorieAverage = loggedDays.size ? weeklyFood.reduce((sum, log) => sum + nutritionFor(log.food, log.grams).calories, 0) / loggedDays.size : null;
  const sessions = workouts?.history.filter(session => { const day = todayInZone(data.profile.timeZone, new Date(session.finishedAt!)); return day >= shiftDate(date, -6) && day <= date; }) ?? [];
  function saveWeight(event: FormEvent<HTMLFormElement>) {
    const form = values(event); const existing = data.weights.find(row => row.date === date); const parsed = weightSchema.safeParse({ id: existing?.id ?? id(), date, kg: number(form, 'kg'), waistCm: text(form, 'waist').trim() ? number(form, 'waist') : null });
    if (!parsed.success) { setError('Enter a weight of 20–500 kg and an optional waist of 20–300 cm.'); return; }
    if (changeWorkspace(state => ({ ...state, weights: [...state.weights.filter(row => row.date !== date), parsed.data] }))) setError('Measurement saved.');
  }
  return <><section className="workout-panel workout-form"><label>Summary end date<input type="date" value={date} required onChange={event => { if (dateSchema.safeParse(event.target.value).success) setDate(event.target.value); }}/></label></section><div className="shell-target-grid"><Stat label="7-day weight average" value={average === null ? 'Not logged' : `${round(average)} kg`} detail={`${weights.filter(row => row.date >= shiftDate(date, -6) && row.date <= date).length} measured days`}/><Stat label="Average food calories" value={calorieAverage === null ? 'Not logged' : `${round(calorieAverage)} kcal`} detail={`${loggedDays.size} logged days; empty days excluded`}/><Stat label="Steps in seven days" value={weekly.length ? weekly.reduce((sum, row) => sum + row.steps, 0).toLocaleString() : 'Not logged'} detail={`${weekly.length} recorded days`}/><Stat label="Completed workouts" value={String(sessions.length)} detail="In the selected seven days"/></div>
    <section className="workout-panel"><h2>Weight over time</h2>{weights.length ? <><div className="feature-chart" role="img" aria-label="Weight measurements over time"><ResponsiveContainer width="100%" height={280}><LineChart data={weights}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/><XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10}/><YAxis domain={['auto', 'auto']} stroke="var(--muted-foreground)" fontSize={10} unit=" kg"/><Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}/><Line type="linear" dataKey="kg" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div><p className="workout-muted">Only your measured dates are plotted; the line connects those observations. Goal: {data.profile.goalWeightKg} kg.</p></> : <p className="workout-muted">Add your first measurement to start the chart. No progress is estimated or invented.</p>}</section>
    <div className="feature-grid"><section className="workout-panel"><h2>Log a measurement</h2><form onSubmit={saveWeight} className="workout-form" key={date + JSON.stringify(data.weights.find(row => row.date === date))}><p className="workout-muted">For {date}. Saving replaces an existing measurement for this date.</p><Field label="Weight (kg)" name="kg" value={data.weights.find(row => row.date === date)?.kg} min={20} max={500}/><Field label="Waist (cm, optional)" name="waist" value={data.weights.find(row => row.date === date)?.waistCm ?? ''} min={20} max={300} required={false}/><button className="shell-button" type="submit">Save measurement</button><p role="status">{error}</p></form></section><section className="workout-panel"><h2>Daily activity</h2><MetricsEditor key={date + JSON.stringify(data.metrics.find(row => row.date === date))} data={data} date={date}/></section></div>
    <section className="workout-panel"><h2>Measurements</h2>{!weights.length && <p className="workout-muted">No measurements yet.</p>}<ul className="feature-records">{[...weights].reverse().map(row => <li key={row.id}><div><strong>{row.date} · {row.kg} kg</strong><small>{row.waistCm === null ? 'Waist not recorded' : `Waist ${row.waistCm} cm`}</small></div><div className="workout-actions"><button className="shell-button shell-button-secondary" onClick={() => setDate(row.date)}>Edit measurement</button><ConfirmDelete label={`measurement for ${row.date}`} onDelete={() => changeWorkspace(state => ({ ...state, weights: state.weights.filter(weight => weight.id !== row.id) }))}/></div></li>)}</ul></section>
  </>;
}
function Stat({ label, value, detail }: { label: string; value: string; detail: string }) { return <section className="workout-panel feature-stat"><span>{label}</span><strong>{value}</strong><p>{detail}</p></section>; }
function MetricsEditor({ data, date }: { data: Workspace; date: string }) {
  const metric = data.metrics.find(row => row.date === date); const [notice, setNotice] = useState('');
  function save(event: FormEvent<HTMLFormElement>) {
    const form = values(event); const parsed = metricSchema.safeParse({ date, steps: number(form, 'steps'), waterMl: number(form, 'waterMl'), cardioMinutes: number(form, 'cardioMinutes'), notes: text(form, 'notes') });
    if (!parsed.success) { setNotice('Check steps, water, and cardio: use whole numbers of zero or above within the displayed limits.'); return; }
    if (changeWorkspace(state => ({ ...state, metrics: [...state.metrics.filter(row => row.date !== date), parsed.data] }))) setNotice('Daily activity saved.');
  }
  return <form onSubmit={save} className="workout-form"><p className="workout-muted">Daily totals for {date}. Enter 0 for a recorded zero; an untouched day stays unlogged.</p><div className="feature-form-grid"><Field label="Daily steps" name="steps" min={0} max={100000} step="1" value={metric?.steps ?? 0}/><Field label="Water (ml)" name="waterMl" min={0} max={15000} step="1" value={metric?.waterMl ?? 0}/><Field label="Cardio / recovery (minutes)" name="cardioMinutes" min={0} max={1440} step="1" value={metric?.cardioMinutes ?? 0}/></div><label>Activity notes<textarea aria-label="Activity notes" name="notes" maxLength={2000} defaultValue={metric?.notes} rows={3}/></label><button type="submit" className="shell-button">Save daily activity</button>{metric && <button type="button" className="shell-button shell-button-secondary" onClick={() => { if (confirm(`Delete daily activity for ${date}?`)) changeWorkspace(state => ({ ...state, metrics: state.metrics.filter(row => row.date !== date) })); }}>Delete daily activity</button>}<p role="status">{notice}</p></form>;
}

function DataControls({ data }: { data: Workspace | null }) {
  const { data: workouts, raw: workoutRaw } = useWorkouts(); const { raw } = useWorkspace(); const [notice, setNotice] = useState('');
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Choose a backup smaller than 5 MB.');
      const input = JSON.parse(await file.text()); const workspace = workspaceSchema.parse(input.workspace); const workout = workoutStateSchema.parse(input.workouts);
      if (input.version !== 1) throw new Error('Unsupported backup version.');
      if (!confirm('Replace this browser’s profile, foods, meals, measurements, workout plans, active session, and history? Export a backup first.')) return;
      const oldWorkspace = localStorage.getItem(WORKSPACE_KEY); const oldWorkout = localStorage.getItem(WORKOUT_STORAGE_KEY);
      // Stage both writes with rollback before refreshing the in-memory stores.
      try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace)); localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(workout)); }
      catch (error) { if (oldWorkspace === null) localStorage.removeItem(WORKSPACE_KEY); else localStorage.setItem(WORKSPACE_KEY, oldWorkspace); if (oldWorkout === null) localStorage.removeItem(WORKOUT_STORAGE_KEY); else localStorage.setItem(WORKOUT_STORAGE_KEY, oldWorkout); throw error; }
      replaceWorkspace(workspace); replaceWorkouts(workout); setNotice('Backup imported.');
    } catch { setNotice('Import failed. Choose a valid complete FitTrack backup and ensure browser storage has room.'); }
  }
  return <section className="workout-panel"><h2>Your data</h2><p className="workout-muted">Records are saved in this browser, on this address. They are accessible to anyone using this browser profile. Export before clearing storage or switching devices. The legacy prototype has separate data controls.</p><div className="workout-actions"><button className="shell-button" disabled={!data || !workouts} onClick={() => downloadJSON({ version: 1, workspace: data, workouts })}><Download size={16}/> Export all data</button><label className="shell-button shell-button-secondary workout-import">Import all data<input type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void importBackup(file); }}/></label>{!data && raw && <button className="shell-button shell-button-secondary" onClick={() => downloadJSON(raw, 'fittrack-workspace-recovery')}>Export workspace recovery copy</button>}{!workouts && workoutRaw && <button className="shell-button shell-button-secondary" onClick={() => downloadJSON(workoutRaw, 'fittrack-workout-recovery')}>Export workout recovery copy</button>}<button className="shell-button shell-button-secondary" onClick={() => { if (confirm('Delete all workspace data in this browser? This clears your profile, foods, meal plans, measurements and daily activity. Export a backup first.')) replaceWorkspace(initialWorkspace()); }}>Delete workspace data</button><button className="shell-button shell-button-secondary" onClick={() => { if (confirm('Delete all workout plans, active session, and history in this browser? Export a backup first.')) replaceWorkouts(initialWorkouts()); }}>Delete workout data</button></div><p role="status">{notice}</p><p className="shell-fine-print"><Link className="shell-text-link" href="/auth">Account and cloud connection →</Link></p><Link className="shell-text-link" href="/prototype">Legacy prototype data controls →</Link></section>;
}
