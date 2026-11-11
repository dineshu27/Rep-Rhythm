'use client';
import { completeBackupSchema } from './backup-schema';
import { workspaceSnapshot,refreshWorkspace } from './workspace-store';
import { workoutSnapshot,refreshWorkouts } from './workout-store';
import { WORKSPACE_KEY,type Workspace } from './workspace';
import { WORKOUT_STORAGE_KEY,type WorkoutState } from './workouts';
export function trackerTransaction(update:(workspace:Workspace,workouts:WorkoutState)=>{workspace:Workspace;workouts:WorkoutState}){
 const workspace=workspaceSnapshot(),workouts=workoutSnapshot();if(!workspace.data||!workouts.data)throw Error('Load your saved records before logging.');
 const rawWorkspace=localStorage.getItem(WORKSPACE_KEY),rawWorkouts=localStorage.getItem(WORKOUT_STORAGE_KEY);
 if(rawWorkspace!==workspace.raw||rawWorkouts!==workouts.raw){refreshWorkspace();refreshWorkouts();throw Error('Another tab changed your records. Review the latest data and try again.');}
 const next=update(workspace.data,workouts.data);completeBackupSchema.parse({version:1,...next});let firstWritten=false;
 try{localStorage.setItem(WORKSPACE_KEY,JSON.stringify(next.workspace));firstWritten=true;localStorage.setItem(WORKOUT_STORAGE_KEY,JSON.stringify(next.workouts));}
 catch{if(firstWritten){try{if(rawWorkspace===null)localStorage.removeItem(WORKSPACE_KEY);else localStorage.setItem(WORKSPACE_KEY,rawWorkspace);if(rawWorkouts===null)localStorage.removeItem(WORKOUT_STORAGE_KEY);else localStorage.setItem(WORKOUT_STORAGE_KEY,rawWorkouts);}catch{refreshWorkspace();refreshWorkouts();throw Error('Storage could not be restored. Export a recovery backup from Settings before continuing.');}}refreshWorkspace();refreshWorkouts();throw Error('Could not save to browser storage. No completed log was confirmed.');}
 refreshWorkspace();refreshWorkouts();return next;
}
