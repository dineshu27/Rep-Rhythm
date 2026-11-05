'use client';

import Link from 'next/link';
import { TrainingSchedule } from './training-schedule';
import { muscleGroups, exerciseMuscle } from '@/lib/muscles';
import { PageSignature } from './page-signature';
import { exerciseCatalogue, presetExercise } from '@/lib/exercise-catalog';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronUp, Dumbbell, Plus, Timer, Trash2 } from 'lucide-react';
import { dispatchWorkout, exportWorkouts, replaceWorkouts, useWorkouts } from '@/lib/workout-store';
import { exerciseSchema, formatTime, initialWorkouts, planSchema, remainingSeconds, sessionVolume, type Exercise, type Plan, type Session, type WorkoutSet, type WorkoutState } from '@/lib/workouts';

function uid() { return crypto.randomUUID(); }
function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(interval); }, []);
  return now;
}
function dateLabel(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }

export function WorkoutWorkspace({ active = false }: { active?: boolean }) {
  const { data, error, raw } = useWorkouts();
  const [importError, setImportError] = useState('');
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('Choose a workout backup smaller than 5 MB.');
      const backup: unknown = JSON.parse(await file.text());
      // Validate before asking to replace any existing records.
      const { workoutStateSchema } = await import('@/lib/workouts');
      workoutStateSchema.parse(backup);
      if (!window.confirm('Replace all workout plans, history, and the active session in this browser with this backup? Export your current data first if you need to keep it.')) return;
      if (replaceWorkouts(backup)) setImportError('');
    } catch (err) { setImportError(err instanceof SyntaxError || (err instanceof Error && err.name === 'ZodError') ? 'Invalid workout backup. Your existing data is unchanged.' : err instanceof Error ? err.message : 'Unable to import this backup.'); }
  }
  return <div className="workout-workspace" data-page={active ? 'active' : 'workouts'}>
    <div className="shell-page-heading"><div><span className="shell-overline">BUILD YOUR RHYTHM</span><h1>{active ? 'Active workout' : 'Workout planner'}</h1><p>{active ? 'One set at a time. Your session saves as you go.' : 'Build your own muscle pairings, training days and weekly split.'}</p></div><span className="shell-badge">Saved in this browser</span></div>
    <PageSignature kind={active ? 'active' : 'workouts'}/><p className="workout-storage-note">Workouts stay on this device and browser. They are not synced or backed up to an account. Export a copy to keep them safe.</p>
    {(error || importError) && <div className="workout-notice" role="alert">{importError || error}</div>}
    {!data ? <section className="workout-panel"><p>{error ? 'Your existing saved data has been preserved.' : 'Loading your workouts…'}</p>{error && <div className="workout-actions">{raw && <button className="shell-button shell-button-secondary" onClick={() => exportWorkouts(raw)}>Export recovery copy</button>}<button className="shell-button shell-button-secondary" onClick={() => { if (window.confirm('Reset all workout data in this browser? Export a recovery copy first.')) replaceWorkouts(initialWorkouts()); }}>Reset workout data</button></div>}</section> : <>
      {active ? <ActiveWorkout state={data}/> : <Planner state={data}/>}
      {!active && <History sessions={data.history}/>}
    </>}
    <div className="workout-backup"><button disabled={!data} className="shell-button shell-button-secondary" onClick={() => exportWorkouts()}>Export workout backup</button><label className="shell-button shell-button-secondary workout-import">Import backup<input type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void importBackup(file); }}/></label></div>
  </div>;
}

function Planner({ state }: { state: WorkoutState }) {
  const router = useRouter();
  const [savedPlan, setSavedPlan] = useState<{ id: string; day: string } | null>(null);
  return <>
    <TrainingSchedule state={state}/>
    {state.active && <section className="workout-resume"><div><span className="shell-overline">SESSION IN PROGRESS</span><h2>{state.active.name}</h2><p>{state.active.sets.length} sets logged · Started {dateLabel(state.active.startedAt)}</p></div><Link href="/workouts/active" className="shell-button">Resume workout <ArrowRight size={16}/></Link></section>}
    <div className="workout-plan-grid">{state.plans.map(plan => <section className="workout-panel workout-plan-card" data-body={plan.id.startsWith('lower') ? 'lower' : 'upper'} key={plan.id}>
      <div className="workout-card-heading"><span className="shell-overline">{plan.day}</span><Dumbbell size={20} aria-hidden="true"/></div><h2>{plan.name}</h2><p className="workout-muted">{plan.exercises.length} exercises · {plan.exercises.reduce((total, exercise) => total + exercise.sets, 0)} planned sets</p>
      <ol className="workout-exercise-preview">{plan.exercises.map(exercise => <li key={exercise.id}><span>{exercise.name}</span><small>{exercise.sets} × {exercise.target} {exercise.kind === 'seconds' ? 'sec' : 'reps'}</small></li>)}</ol>
      {!plan.exercises.length && <p className="workout-muted">Add an exercise to start this plan.</p>}
      <div className="workout-actions"><button className="shell-button" disabled={!!state.active || !plan.exercises.length} onClick={() => {
        if (dispatchWorkout({ type: 'start', planId: plan.id, id: uid(), now: new Date().toISOString() })) router.push('/workouts/active');
      }}>Start {plan.name} <ArrowRight size={15}/></button></div>
      <button className="shell-text-link remove-plan" disabled={state.plans.length <= 1 || state.active?.planId === plan.id} onClick={() => { if (confirm(`Remove ${plan.name} from your weekly plans? Completed history stays available.`)) dispatchWorkout({ type: 'delete-plan', planId: plan.id }); }}>Remove training day</button><details className="workout-plan-editor"><summary>Edit plan</summary><PlanEditor key={JSON.stringify(plan)} plan={plan} onSaved={saved => setSavedPlan({ id: saved.id, day: saved.day })}/></details>{savedPlan?.id === plan.id && savedPlan.day === plan.day && <p role="status" className="workout-muted">Plan saved for {plan.day}. Existing sessions keep their original exercise details.</p>}
    </section>)}</div>
    <section className="workout-panel workout-recovery"><span className="shell-overline">BETWEEN GYM DAYS</span><h2>Room to recover</h2><p>Between training days, make room for rest, an easy walk, or optional cardio. Your plan is a starting point: adjust exercises, sets, targets, and rest to suit you.</p><p>Warm up before lifting and choose a load you can control. For exercises using two dumbbells, log their combined weight consistently. Enter 0 kg for unweighted sets.</p><a className="shell-text-link" href="https://www.nhs.uk/live-well/exercise/how-to-improve-strength-flexibility/" target="_blank" rel="noreferrer">NHS strength and flexibility guidance ↗</a></section>
  </>;
}

function PlanEditor({ plan, onSaved }: { plan: Plan; onSaved: (plan: Plan) => void }) {
  const [draft, setDraft] = useState<Plan>(() => structuredClone(plan));
  const [message, setMessage] = useState('');
  const prefix = useId();
  const [selectedMuscles, setSelectedMuscles] = useState(() => [...new Set(plan.exercises.map(row => exerciseMuscle(row.name)).filter((row): row is typeof muscleGroups[number] => row !== null))]);
  const [chosenPreset, setChosenPreset] = useState(exerciseCatalogue.find(exercise => selectedMuscles.includes(exercise.muscle))?.id ?? exerciseCatalogue[0].id);
  function updateExercise(index: number, update: Partial<Exercise>) { setDraft(previous => ({ ...previous, exercises: previous.exercises.map((exercise, i) => i === index ? { ...exercise, ...update } : exercise) })); }
  function move(index: number, offset: number) {
    setDraft(previous => { const exercises = [...previous.exercises]; [exercises[index], exercises[index + offset]] = [exercises[index + offset], exercises[index]]; return { ...previous, exercises }; });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = planSchema.safeParse({ ...draft, day: new FormData(form).get("day") });
    if (!result.success) { setMessage(result.error.issues[0]?.message ?? 'Check the plan values.'); return; }
    if (dispatchWorkout({ type: 'save-plan', plan: result.data })) {
      onSaved(result.data);
      const details = form.closest('details');
      if (details) details.open = false;
    } else setMessage('Plan was not saved. Check the storage message above and try again.');
  }
  return <form onSubmit={submit} onInvalidCapture={() => setMessage("Plan was not saved. Check the highlighted fields, then save again.")} className="workout-form">
    <div className="muscle-picker" role="group" aria-label="Muscles to train together"><strong>Muscles to train together</strong><div>{muscleGroups.map(muscle => <label key={muscle}><input type="checkbox" checked={selectedMuscles.includes(muscle)} onChange={event => setSelectedMuscles(current => event.target.checked ? [...current, muscle] : current.filter(item => item !== muscle))}/>{muscle}</label>)}</div><button type="button" className="shell-button shell-button-secondary" disabled={!selectedMuscles.length} onClick={() => setDraft({ ...draft, exercises: selectedMuscles.map(muscle => presetExercise(exerciseCatalogue.find(row => row.muscle === muscle)!.id, uid())) })}>Fill selected muscles</button><p className="workout-muted">Replaces this draft with one starter exercise per selected muscle. Review and save the plan below.</p></div><label>Plan name<input required maxLength={100} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
    <label>Training day<select name="day" aria-label="Training day" value={draft.day} onChange={event => setDraft({ ...draft, day: event.target.value })}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day}>{day}</option>)}</select></label>
    {draft.exercises.map((exercise, index) => <fieldset key={exercise.id}><legend>Exercise {index + 1}</legend>
      <label>Choose predefined exercise<select aria-label={`Choose predefined exercise ${index + 1}`} value={exerciseCatalogue.find(preset => preset.name === exercise.name)?.id ?? "custom"} onChange={event => { if (event.target.value !== "custom") { const chosen = presetExercise(event.target.value, exercise.id, exercise.sets); updateExercise(index, chosen); } else updateExercise(index, { name: "Custom exercise" }); }}><option value="custom">Custom / type a name below</option>{muscleGroups.map(group => <optgroup key={group} label={group}>{exerciseCatalogue.filter(preset => preset.muscle === group).map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</optgroup>)}</select></label><label htmlFor={`${prefix}-${exercise.id}`}>Exercise name</label><input id={`${prefix}-${exercise.id}`} required maxLength={100} value={exercise.name} onChange={event => updateExercise(index, { name: event.target.value })}/>
      <div className="workout-fields"><label>Track<select value={exercise.kind} onChange={event => updateExercise(index, { kind: event.target.value as Exercise['kind'], target: event.target.value === 'seconds' ? '30' : '8–12' })}><option value="reps">Repetitions</option><option value="seconds">Timed hold (seconds)</option></select></label><label>Rounds (sets)<input type="number" min={1} max={10} step={1} required value={Number.isNaN(exercise.sets) ? '' : exercise.sets} onChange={event => updateExercise(index, { sets: event.target.valueAsNumber })}/></label></div>
      <div className="workout-fields"><label>{exercise.kind === 'seconds' ? 'Target seconds' : 'Target reps / range'}<input required maxLength={40} value={exercise.target} onChange={event => updateExercise(index, { target: event.target.value })}/></label><label>Rest (seconds)<input type="number" min={0} max={600} step={1} required value={Number.isNaN(exercise.restSeconds) ? '' : exercise.restSeconds} onChange={event => updateExercise(index, { restSeconds: event.target.valueAsNumber })}/></label></div>
      <div className="workout-actions"><button type="button" className="shell-icon" aria-label={`Move exercise ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ChevronUp size={16}/></button><button type="button" className="shell-icon" aria-label={`Move exercise ${index + 1} down`} disabled={index === draft.exercises.length - 1} onClick={() => move(index, 1)}><ChevronDown size={16}/></button><button type="button" className="shell-button shell-button-secondary" onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter(item => item.id !== exercise.id) })}><Trash2 size={14}/> Remove exercise {index + 1}</button></div>
    </fieldset>)}
    <div className="exercise-picker"><label>Add predefined exercise<select aria-label="Add predefined exercise" value={chosenPreset} onChange={event => setChosenPreset(event.target.value)}>{muscleGroups.map(group => <optgroup key={group} label={group}>{exerciseCatalogue.filter(preset => preset.muscle === group).map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</optgroup>)}</select></label><button type="button" className="shell-button shell-button-secondary" disabled={draft.exercises.length >= 30} onClick={() => setDraft({ ...draft, exercises: [...draft.exercises, presetExercise(chosenPreset, uid())] })}><Plus size={15}/> Add chosen exercise</button></div><p className="workout-muted">One round is one set of the chosen reps or seconds. Set rounds and targets separately for each exercise.</p>
    <div className="workout-actions"><button type="button" className="shell-button shell-button-secondary" disabled={draft.exercises.length >= 30} onClick={() => setDraft({ ...draft, exercises: [...draft.exercises, exerciseSchema.parse({ id: uid(), name: 'New exercise', kind: 'reps', sets: 3, target: '8–12', restSeconds: 90 })] })}><Plus size={15}/> Add exercise</button><button className="shell-button" type="submit">Save plan</button></div><p role="status">{message}</p>
  </form>;
}

function ActiveWorkout({ state }: { state: WorkoutState }) {
  const router = useRouter();
  const session = state.active;
  if (!session) return <section className="workout-panel workout-empty"><Dumbbell size={32}/><h2>Ready for your next session?</h2><p>Choose a plan to start logging. Completed sessions are in your workout history.</p><Link href="/workouts" className="shell-button">Choose a workout <ArrowRight size={16}/></Link></section>;
  const planned = session.exercises.reduce((total, exercise) => total + exercise.sets, 0);
  const completed = session.exercises.reduce((total, exercise) => total + Math.min(exercise.sets, session.sets.filter(set => set.exerciseId === exercise.id).length), 0);
  return <>
    <section className="workout-resume"><div><span className="shell-overline">STARTED {dateLabel(session.startedAt)}</span><h2>{session.name}</h2><p>{completed} / {planned} planned sets · {sessionVolume(session).toLocaleString()} kg rep volume</p></div><Link href="/workouts" className="shell-button shell-button-secondary">Back to planner</Link><progress aria-label="Planned sets completed" max={planned} value={completed}/></section>
    <RestTimer until={state.restUntil}/>
    <div className="workout-session-grid"><SessionExercises session={session} active/></div>
    <Notes key={session.id} session={session}/>
    <section className="workout-panel"><h2>Wrap up your session</h2><p className="workout-muted">You can finish with fewer sets than planned. Only the sets you logged will be saved.</p><div className="workout-actions"><button className="shell-button" disabled={!session.sets.length} onClick={() => { if (window.confirm('Finish this workout and save it to your history?') && dispatchWorkout({ type: 'finish', now: new Date().toISOString() })) router.push('/workouts#workout-history'); }}><Check size={16}/> Finish workout</button><button className="shell-button shell-button-secondary" onClick={() => { if (window.confirm('Discard this active session and all its logged sets? Your plans and completed history will stay.')) dispatchWorkout({ type: 'discard' }); }}>Discard session</button></div></section>
  </>;
}

function RestTimer({ until }: { until: number | null }) {
  const now = useClock();
  const [duration, setDuration] = useState(90);
  const remaining = remainingSeconds(until, now);
  return <section className="workout-timer" aria-label="Rest timer"><Timer size={22} aria-hidden="true"/><div><span className="shell-overline">REST TIMER</span><strong>{formatTime(remaining)}</strong></div><span role="status">{until !== null && remaining === 0 ? 'Rest complete' : remaining > 0 ? 'Take a breath.' : 'Starts after logging a set.'}</span><div className="workout-actions"><label className="workout-rest-select">Rest duration<select aria-label="Rest duration" value={duration} onChange={event => setDuration(Number(event.target.value))}>{[30, 60, 90, 120, 180].map(seconds => <option key={seconds} value={seconds}>{seconds} sec</option>)}</select></label><button className="shell-button shell-button-secondary" onClick={() => dispatchWorkout({ type: 'rest', until: Date.now() + duration * 1000 })}>{remaining ? 'Restart' : 'Start'}</button>{remaining > 0 && <><button className="shell-button shell-button-secondary" onClick={() => dispatchWorkout({ type: 'rest', until: Math.max(until ?? 0, Date.now()) + 30000 })}>+30 sec</button><button className="shell-button shell-button-secondary" onClick={() => dispatchWorkout({ type: 'rest', until: null })}>Skip rest</button></>}</div></section>;
}

function SessionExercises({ session, active = false }: { session: Session; active?: boolean }) {
  return <>{session.exercises.map((exercise, index) => {
    const sets = session.sets.filter(set => set.exerciseId === exercise.id);
    return <section key={exercise.id} className="workout-panel"><span className="shell-overline">EXERCISE {index + 1} OF {session.exercises.length}</span><h2>{exercise.name}</h2><p className="workout-muted">{exercise.sets} × {exercise.target} {exercise.kind === 'seconds' ? 'seconds' : 'reps'} · Rest {exercise.restSeconds} sec</p>
      <ul className="workout-set-list">{sets.map((set, i) => <li key={set.id}><SetRow session={session} exercise={exercise} set={set} index={i}/></li>)}</ul>
      {!sets.length && <p className="workout-muted workout-no-sets">No sets logged.</p>}
      {active && <SetForm key={`${exercise.id}-${sets.length}`} session={session} exercise={exercise}/>}
    </section>;
  })}</>;
}

function SetRow({ session, exercise, set, index }: { session: Session; exercise: Exercise; set: WorkoutSet; index: number }) {
  const [editing, setEditing] = useState(false);
  return <><div className="workout-set"><span className="workout-set-number">{index + 1}</span><strong>{set.amount} {set.kind === 'seconds' ? 'sec' : 'reps'} <span>× {set.weightKg} kg</span></strong><div className="workout-actions"><button className="shell-button shell-button-secondary" aria-label={`Edit set ${index + 1} of ${exercise.name}`} onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button><button className="shell-icon" aria-label={`Delete set ${index + 1} of ${exercise.name}`} onClick={() => { if (window.confirm(`Delete set ${index + 1} of ${exercise.name}?`)) dispatchWorkout({ type: 'delete-set', sessionId: session.id, setId: set.id }); }}><Trash2 size={16}/></button></div></div>{editing && <SetForm key={JSON.stringify(set)} session={session} exercise={exercise} existing={set} onSaved={() => setEditing(false)}/>}</>;
}

function SetForm({ session, exercise, existing, onSaved }: { session: Session; exercise: Exercise; existing?: WorkoutSet; onSaved?: () => void }) {
  const previous = session.sets.filter(set => set.exerciseId === exercise.id).at(-1);
  const [amount, setAmount] = useState(String(existing?.amount ?? previous?.amount ?? ''));
  const [weight, setWeight] = useState(String(existing?.weightKg ?? previous?.weightKg ?? 0));
  const [started, setStarted] = useState<number | null>(null);
  const [rounds, setRounds] = useState('1');
  const now = useClock();
  const holdSeconds = started === null ? 0 : Math.max(0, Math.floor((now - started) / 1000));
  const prefix = useId();
  function submit(event: FormEvent) {
    event.preventDefault();
    if (started !== null) return;
    const count = Number(rounds);
    if (!Number.isInteger(count) || count < 1 || count > 10) return;
    const success = existing
      ? dispatchWorkout({ type: 'save-set', sessionId: session.id, set: { ...existing, amount: amount.trim() ? Number(amount) : NaN, weightKg: weight.trim() ? Number(weight) : NaN } })
      : dispatchWorkout({ type: 'log-rounds', sessionId: session.id, exerciseId: exercise.id, amount: amount.trim() ? Number(amount) : NaN, weightKg: weight.trim() ? Number(weight) : NaN, ids: Array.from({ length: count }, () => uid()) });
    if (success) {
      if (!existing && exercise.restSeconds > 0) dispatchWorkout({ type: 'rest', until: Date.now() + exercise.restSeconds * 1000 });
      onSaved?.();
    }
  }
  return <form onSubmit={submit} className="workout-form workout-log-form" aria-label={`${existing ? 'Edit' : 'Log'} set for ${exercise.name}`}>
    <div className="workout-fields"><label htmlFor={`${prefix}-amount`}>{exercise.kind === 'seconds' ? 'Seconds' : 'Reps'}</label><label htmlFor={`${prefix}-weight`}>Weight (kg)</label><input id={`${prefix}-amount`} aria-label={`${exercise.name} ${exercise.kind === 'seconds' ? 'seconds' : 'reps'}`} type="number" min={1} max={exercise.kind === 'seconds' ? 36000 : 1000} step={1} required disabled={started !== null} value={amount} onChange={event => setAmount(event.target.value)}/><input id={`${prefix}-weight`} aria-label={`${exercise.name} weight in kg`} type="number" min={0} max={1000} step="any" required value={weight} onChange={event => setWeight(event.target.value)}/></div>
    {!existing && <label>Completed rounds<input aria-label={`${exercise.name} completed rounds`} type="number" min={1} max={10} step={1} required value={rounds} onChange={event => setRounds(event.target.value)}/></label>}
    {Number(amount) > 0 && Number.isFinite(Number(amount)) && Number.isFinite(Number(weight)) && Number(rounds) >= 1 && Number(rounds) <= 10 && <p className="workout-muted" role="status">{exercise.kind === 'reps' ? `${Number(amount) * (existing ? 1 : Number(rounds))} total reps · ${Math.round(Number(amount) * (existing ? 1 : Number(rounds)) * Number(weight) * 100) / 100} kg rep volume` : `${Number(amount) * (existing ? 1 : Number(rounds))} total hold seconds`}{!existing && Number(rounds) > 1 ? ' · Same values will be logged for each completed round.' : ''}</p>}
    {exercise.kind === 'seconds' && !existing && <div className="workout-actions"><button type="button" className="shell-button shell-button-secondary" onClick={() => {
      if (started === null) setStarted(Date.now());
      else { setAmount(String(Math.max(1, Math.floor((Date.now() - started) / 1000)))); setStarted(null); }
    }}><Timer size={15}/>{started === null ? 'Start hold timer' : `Stop hold · ${formatTime(holdSeconds)}`}</button></div>}
    <button type="submit" className="shell-button" disabled={started !== null}><Check size={15}/>{existing ? 'Save set changes' : Number(rounds) > 1 ? `Log ${rounds} rounds` : 'Log set'}</button>
  </form>;
}

function Notes({ session }: { session: Session }) {
  const [notes, setNotes] = useState(session.notes);
  const notesId = useId();
  const [message, setMessage] = useState('');
  return <form className="workout-panel workout-form" onSubmit={event => { event.preventDefault(); if (dispatchWorkout({ type: 'notes', sessionId: session.id, notes })) setMessage('Notes saved.'); }}><label htmlFor={notesId}>Session notes</label><textarea id={notesId} maxLength={2000} rows={3} value={notes} onChange={event => { setNotes(event.target.value); setMessage(''); }} onBlur={() => { if (notes !== session.notes && dispatchWorkout({ type: 'notes', sessionId: session.id, notes })) setMessage('Notes saved.'); }} placeholder="How did it feel? Optional cardio or recovery notes…"/><button className="shell-button shell-button-secondary" type="submit">Save notes</button><p role="status">{message}</p></form>;
}

function History({ sessions }: { sessions: Session[] }) {
  return <section id="workout-history" className="workout-history"><div className="shell-section-heading"><h2>Session history</h2><span>{sessions.length} completed</span></div>{!sessions.length ? <div className="workout-panel"><h2>Your first session starts here.</h2><p className="workout-muted">Finish a workout to see your logged sets and notes here.</p></div> : sessions.map(session => <details className="workout-panel" key={session.id}><summary><strong>{session.name}</strong><span>{dateLabel(session.finishedAt!)} · {session.sets.length} sets · {sessionVolume(session).toLocaleString()} kg rep volume</span></summary><div className="workout-session-grid"><SessionExercises session={session}/></div><Notes key={`${session.id}-${session.notes}`} session={session}/><div className="workout-actions"><button className="shell-button shell-button-secondary" onClick={() => { if (window.confirm(`Permanently delete ${session.name} from ${dateLabel(session.startedAt)}?`)) dispatchWorkout({ type: 'delete-session', sessionId: session.id }); }}><Trash2 size={15}/> Delete session</button></div></details>)}</section>;
}
