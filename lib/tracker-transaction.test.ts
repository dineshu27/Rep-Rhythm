import {expect,it,vi} from 'vitest';
import {trackerTransaction} from './tracker-transaction';
import {refreshWorkspace} from './workspace-store';
import {refreshWorkouts} from './workout-store';
import {initialWorkspace,WORKSPACE_KEY} from './workspace';
import {initialWorkouts,WORKOUT_STORAGE_KEY} from './workouts';
it('rolls back both records if the second tracker write fails and detects intervening tab writes',()=>{const original=JSON.stringify(initialWorkspace()),training=JSON.stringify(initialWorkouts());const map=new Map([[WORKSPACE_KEY,original],[WORKOUT_STORAGE_KEY,training]]);let fail=true;vi.stubGlobal('localStorage',{getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{if(key===WORKOUT_STORAGE_KEY&&fail){fail=false;throw Error('quota');}map.set(key,value);},removeItem:(key:string)=>map.delete(key)});refreshWorkspace();refreshWorkouts();expect(()=>trackerTransaction((workspace,workouts)=>({workspace:{...workspace,profile:{...workspace.profile,name:'Changed'}},workouts}))).toThrow('No completed log');expect(map.get(WORKSPACE_KEY)).toBe(original);expect(map.get(WORKOUT_STORAGE_KEY)).toBe(training);map.set(WORKSPACE_KEY,JSON.stringify({...initialWorkspace(),profile:{...initialWorkspace().profile,name:'Other tab'}}));expect(()=>trackerTransaction((workspace,workouts)=>({workspace,workouts}))).toThrow('Another tab');vi.unstubAllGlobals();});
