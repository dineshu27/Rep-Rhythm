'use client';
import Link from 'next/link';
import { PageSignature } from './page-signature';
import { useEffect, useRef, useState } from 'react';
import { assistantModes, matchedDraftSchema, applyFoodDraft, suggestedPlan, weeklyFacts, type AssistantMode, type MatchedDraft } from '@/lib/assistant';
import { useWorkspace, changeWorkspace } from '@/lib/workspace-store';
import { useWorkouts, dispatchWorkout } from '@/lib/workout-store';
import { exerciseCatalogue } from '@/lib/exercise-catalog';
import { todayInZone, nutritionFor, type FoodRecord } from '@/lib/workspace';
import { NutritionValues } from './nutrition-values';

const titles = { food: 'Describe a meal', workout: 'Suggest a workout', meals: 'Create a meal idea', review: 'Review my week' };
const prompts = { food: 'For example: 150 g cooked rice, 100 g grilled chicken and 10 g olive oil. Include weighed grams and preparation.', workout: 'Tell me upper or lower body, equipment, experience, time available and any limitations.', meals: 'List available ingredients, diet, allergies and meal preferences. Suggested portions are editable.', review: 'Ask about consistency, food tracking or training. The seven-day summary below is shared only when you generate.' };
export function Assistant({ mode }: { mode: AssistantMode }) {
  const workspace = useWorkspace(); const workouts = useWorkouts();
  const [status, setStatus] = useState<{ ready: boolean; reason: string; quota?: { dailyRemaining: number; monthlyRemaining: number } }>({ ready: false, reason: 'Checking AI availability…' });
  const [description, setDescription] = useState(''); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [draft, setDraft] = useState<MatchedDraft | null>(null); const [example, setExample] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [rows, setRows] = useState<{ food: FoodRecord | null; grams: string; include: boolean }[]>([]);
  const [date, setDate] = useState(''); const [meal, setMeal] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Lunch');
  const [mealName, setMealName] = useState('Meal idea'); const [planId, setPlanId] = useState('');
  useEffect(() => { let cancelled = false; fetch('/api/ai', { cache: 'no-store' }).then(response => response.json()).then(value => { if (!cancelled) setStatus(value); }).catch(() => { if (!cancelled) setStatus({ ready: false, reason: 'Could not check AI availability. Connect and retry.' }); }); return () => { cancelled = true; }; }, []);
  const today = workspace.data ? todayInZone(workspace.data.profile.timeZone) : '';
  const facts = workspace.data && workouts.data && mode === 'review' ? weeklyFacts(workspace.data, workouts.data, date || today) : [];
  async function generate(isExample: boolean) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setMessage(''); setDraft(null);
    try {
      const response = await fetch(isExample ? `/api/ai?example=${mode}` : '/api/ai', isExample ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, description, consent, facts }) });
      const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Could not generate a draft.');
      const next = matchedDraftSchema.parse(value);
      setDraft(next); setExample(isExample); setRows(next.foods.map((row, index) => ({ food: next.matches[index]?.[0] ?? null, grams: row.grams === null ? '' : String(row.grams), include: true })));
    } catch (error) { setError(error instanceof Error && !error.message.startsWith('[') ? error.message : 'The draft could not be read. Nothing was saved.'); }
    finally { setBusy(false); busyRef.current = false; }
  }
  function saveFood() {
    if (!draft) return;
    const included = rows.filter(row => row.include);
    if (!included.length || included.some(row => !row.food || !row.grams.trim() || !(Number(row.grams) > 0) || Number(row.grams) > 10000)) { setError('Choose a matching food and enter grams (above 0, at most 10,000) for every included item.'); return; }
    const saved = changeWorkspace(state => applyFoodDraft(state, included.map(row => ({ food: row.food!, grams: Number(row.grams) })), date || today, meal, mode === 'meals', mealName, () => crypto.randomUUID()));
    if (saved) { setDraft(null); setMessage(mode === 'meals' ? 'Reviewed meal saved to your planner. Nothing was logged as eaten.' : 'Reviewed foods saved to your diary.'); setError(''); }
  }
  function saveWorkout() {
    if (!draft || !workouts.data) return;
    const plan = workouts.data.plans.find(plan => plan.id === (planId || workouts.data!.plans[0].id)); if (!plan) return;
    if (!confirm(`Replace the exercises in ${plan.name} with this reviewed suggestion? Your workout history is preserved.`)) return;
    try { if (dispatchWorkout({ type: 'save-plan', plan: suggestedPlan(plan, draft, () => crypto.randomUUID()) })) { setDraft(null); setMessage('Reviewed exercises saved to your plan.'); } } catch { setError('Check the exercise values before saving.'); }
  }
  return <div className="feature-page" data-page="assistant"><div className="shell-page-heading"><div><span className="shell-overline">DRAFT · REVIEW · SAVE</span><h1>Your AI assistant</h1><p>Turn everyday descriptions into records and practical next steps.</p></div></div>
    <PageSignature kind="assistant"/><nav className="assistant-tabs" aria-label="Assistant tools">{assistantModes.map(item => <Link className={item === mode ? 'shell-button' : 'shell-text-link'} aria-current={item === mode ? 'page' : undefined} href={`/assistant?mode=${item}`} key={item}>{titles[item]}</Link>)}</nav>
    <section className="workout-panel"><h2>{titles[mode]}</h2><p role="status">{status.reason}</p>{status.quota && <p>{status.quota.dailyRemaining} attempts left today · {status.quota.monthlyRemaining} left this month across the app</p>}<p>{prompts[mode]}</p>
      <form className="assistant-form" onSubmit={event => { event.preventDefault(); void generate(false); }}>
        <label>Your request<textarea required minLength={3} maxLength={2000} rows={4} value={description} onChange={event => setDescription(event.target.value)}/></label>
        {mode === 'review' && <><label>Week ending<input type="date" required value={date || today} onChange={event => { setDate(event.target.value); setDraft(null); }}/></label><details><summary>Review the summary that will be shared</summary><dl>{facts.map(fact => <div key={fact.id}><dt>{fact.id}</dt><dd>{fact.value}</dd></div>)}</dl></details></>}
        <label className="assistant-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/> Send this request{mode === 'review' ? ' and the displayed weekly summary' : ''} to OpenAI. It may contain health information. Only include details you want to share.</label>
        <p className="workout-muted">Drafts are not saved automatically. No photos, account details or saved private notes are uploaded automatically. AI can make mistakes; review food preparation, portions and exercise suitability.</p>
        <div className="assistant-actions"><button className="shell-button" type="submit" disabled={!status.ready || !consent || busy || !workspace.data || !workouts.data}>{busy ? 'Preparing draft…' : 'Generate draft'}</button><button className="shell-text-link" type="button" disabled={busy} onClick={() => void generate(true)}>Try example (no AI call)</button></div>
      </form>
    </section>
    {(error || workspace.error || workouts.error) && <p className="workout-notice" role="alert">{error || workspace.error || workouts.error}</p>}{message && <p className="workout-notice" role="status">{message}</p>}
    {draft && <section className="workout-panel assistant-review" aria-label="Review draft"><h2>{example ? 'Review example' : 'Review your draft'}</h2><p>{draft.message}</p>
      {draft.foods.length > 0 && <><p>Matches are suggestions. Confirm cooked/raw preparation and ingredients. Nutrition uses the selected food record; your saved edits take priority.</p><div className="assistant-form"><label>{mode === 'meals' ? 'Planned date' : 'Diary date'}<input type="date" value={date || today} onChange={event => setDate(event.target.value)}/></label><label>Meal<select value={meal} onChange={event => setMeal(event.target.value as typeof meal)}>{['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(value => <option key={value}>{value}</option>)}</select></label>{mode === 'meals' && <label>Meal name<input maxLength={150} value={mealName} onChange={event => setMealName(event.target.value)}/></label>}</div>
      {draft.foods.map((item, index) => { const row = rows[index]; const selected = row.food && (workspace.data?.foods.find(food => food.id === row.food!.id) ?? row.food); return <fieldset key={index} className="assistant-food"><legend>{item.query}</legend><p>{item.note}</p><label className="assistant-consent"><input type="checkbox" checked={row.include} onChange={event => setRows(rows.map((row, i) => i === index ? { ...row, include: event.target.checked } : row))}/> Include this item</label><label>Food match<select value={row.food?.id ?? ''} onChange={event => setRows(rows.map((row, i) => i === index ? { ...row, food: [...(draft.matches[index] ?? []), ...(workspace.data?.foods ?? [])].find(food => food.id === event.target.value) ?? null } : row))}><option value="">Choose a match</option>{[...new Map([...(workspace.data?.foods ?? []), ...(draft.matches[index] ?? [])].map(food => [food.id, food])).values()].map(food => <option key={food.id} value={food.id}>{food.name}</option>)}</select></label><label>Grams for {item.query}<input type="number" min="0.1" max="10000" step="any" value={row.grams} onChange={event => setRows(rows.map((row, i) => i === index ? { ...row, grams: event.target.value } : row))}/></label>{selected && Number(row.grams) > 0 && <><NutritionValues value={nutritionFor(selected, Number(row.grams))}/><p className="workout-muted">{selected.reference}</p></>}<Link href="/food">Find another food or add a package label</Link></fieldset>; })}
      <button className="shell-button" onClick={saveFood}>{mode === 'meals' ? 'Save reviewed meal to planner' : 'Save reviewed foods to diary'}</button></>}
      {draft.exercises.length > 0 && <><p>Choose manageable resistance. Targets use reps or seconds as shown. Saving replaces the selected plan’s exercises after confirmation.</p><label>Plan to update<select value={planId || workouts.data?.plans[0].id || ''} onChange={event => setPlanId(event.target.value)}>{workouts.data?.plans.map(plan => <option value={plan.id} key={plan.id}>{plan.name} · {plan.day}</option>)}</select></label>{draft.exercises.map((item, index) => { const preset = exerciseCatalogue.find(row => row.id === item.presetId); return <fieldset className="assistant-food" key={index}><legend>{preset?.name ?? 'Unknown exercise'}</legend><p>{item.reason}</p><div className="assistant-actions">{(['rounds', 'amount', 'restSeconds'] as const).map(key => <label key={key}>{key === 'rounds' ? 'Rounds' : key === 'amount' ? preset?.kind === 'seconds' ? 'Seconds' : 'Reps' : 'Rest seconds'}<input type="number" min={key === 'restSeconds' ? 0 : 1} max={key === 'rounds' ? 5 : key === 'amount' ? preset?.kind === 'seconds' ? 120 : 30 : 300} value={item[key]} onChange={event => setDraft({ ...draft, exercises: draft.exercises.map((row, i) => i === index ? { ...row, [key]: Number(event.target.value) } : row) })}/></label>)}</div><button className="shell-text-link" onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((_, i) => i !== index) })}>Remove {preset?.name}</button></fieldset>; })}<button className="shell-button" onClick={saveWorkout}>Save reviewed exercises to plan</button></>}
      {draft.tips.map((tip, index) => <p key={index}>{tip.text}{tip.factIds.length > 0 && <small> · Based on: {tip.factIds.join(', ')}</small>}</p>)}<button className="shell-text-link" onClick={() => setDraft(null)}>Discard draft</button>
    </section>}
    <div className="assistant-actions"><Link className="shell-text-link" href="/food">Food diary</Link><Link className="shell-text-link" href="/workouts">Workout planner</Link><Link className="shell-text-link" href="/progress">Progress</Link></div>
  </div>;
}
