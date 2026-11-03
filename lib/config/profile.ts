import { z } from 'zod';
export const targetSchema = z.object({ calories: z.number().int().positive().max(10000), protein: z.number().nonnegative().max(1000), fat: z.number().nonnegative().max(1000), carbs: z.number().nonnegative().max(2000) });
export const startingTargets = targetSchema.parse({ calories: 1900, protein: 130, fat: 60, carbs: 210 });
export const startingProfile = { sex: 'Male', age: 37, heightCm: 165, startWeightKg: 74, goalWeightKg: 64, activity: 'Moderate', gymDays: 4, diet: 'Non-vegetarian', restrictions: 'None stated' } as const;
// Targets are independent user preferences: the supplied macro split totals 1,900 kcal.
