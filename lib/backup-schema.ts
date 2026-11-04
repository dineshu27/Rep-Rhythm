import { z } from 'zod';
import { workspaceSchema } from './workspace';
import { workoutStateSchema } from './workouts';
export const completeBackupSchema = z.object({ version: z.literal(1), workspace: workspaceSchema, workouts: workoutStateSchema });
