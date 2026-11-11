'use client';
import Link from 'next/link';
import { useState } from 'react';
import { changeWorkspace } from '@/lib/workspace-store';
import { todayInZone, type Workspace } from '@/lib/workspace';
export function QuickToday({data}:{data:Workspace}){
 const date=todayInZone(data.profile.timeZone);const [notice,setNotice]=useState('');
 const [open,setOpen]=useState(false);const [kg,setKg]=useState('');
 return <section className="workout-panel today-actions" aria-label="Quick daily logging"><div><h2>What would you like to log?</h2><p className="workout-muted">Food, a workout or a quick check-in.</p></div><div className="today-action-grid"><Link className="shell-button" href="/food">+ Log food</Link><Link className="shell-button shell-button-secondary" href="/workouts">+ Log exercise</Link><Link className="shell-button shell-button-secondary" href="/progress">Log water & steps</Link><button className="shell-button shell-button-secondary" onClick={()=>setOpen(!open)}>Log weight</button></div>{open&&<form className="quick-weight-form" onSubmit={e=>{e.preventDefault();if(changeWorkspace(state=>{const previous=state.weights.find(row=>row.date===date);return {...state,weights:[...state.weights.filter(row=>row.date!==date),{id:previous?.id??crypto.randomUUID(),date,kg:Number(kg),waistCm:previous?.waistCm??null}]};})){setNotice(`Weight saved for ${date}.`);setOpen(false);}}}><label>Today’s weight (kg)<input aria-label="Today’s weight (kg)" type="number" required min={20} max={500} step="any" value={kg} onChange={e=>setKg(e.target.value)}/></label><button className="shell-button">Save weight</button></form>}<p role="status">{notice}</p></section>;
}
