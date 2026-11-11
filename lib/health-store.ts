'use client';
import {useSyncExternalStore} from 'react';
import {healthSnapshotSchema,type HealthSnapshot} from './health';
type HealthState={data:HealthSnapshot|null;status:'idle'|'loading'|'ready'|'unavailable'|'signedout'|'error';error:string};
const initial:HealthState={data:null,status:'idle',error:''};let state=initial;const listeners=new Set<()=>void>();let generation=0;
function emit(){listeners.forEach(listener=>listener());}
export function clearHealthData(){generation++;state=initial;emit();}
export function enableHealthSync(){try{localStorage.setItem('fitai-health-auto','true');}catch{}window.dispatchEvent(new Event('fitai-health-refresh'));}
export async function refreshHealth(){const current=++generation;try{const response=await fetch('/api/health',{cache:'no-store'});const value=await response.json();if(current!==generation)return;if(!response.ok){state={data:null,status:response.status===401?'signedout':response.status===503?'unavailable':'error',error:value.error??'Health sync unavailable.'};emit();return;}const data=healthSnapshotSchema.parse(value);state={data,status:'ready',error:''};if(data.devices.length){try{localStorage.setItem('fitai-health-auto','true');}catch{}}emit();}catch{if(current===generation){state={...state,error:'Could not refresh Apple Health. Displaying the last received data.',status:state.data?'ready':'error'};emit();}}}
export function useHealthData(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},()=>state,()=>initial);}
