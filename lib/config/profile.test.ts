import { describe, it, expect } from 'vitest';
import { startingTargets, targetSchema } from './profile';
import { hasSupabaseConfiguration } from './environment';
import { vi, afterEach } from 'vitest';
afterEach(() => vi.unstubAllEnvs());
describe('starting configuration', () => {
  it('retains supplied targets independently', () => { expect(startingTargets).toEqual({calories:1900,protein:130,fat:60,carbs:210}); expect(startingTargets.protein * 4 + startingTargets.fat * 9 + startingTargets.carbs * 4).toBe(1900); });
  it('rejects invalid target values', () => { expect(targetSchema.safeParse({...startingTargets,calories:-1}).success).toBe(false); expect(targetSchema.safeParse({...startingTargets,protein:Infinity}).success).toBe(false); });
  it('handles incomplete and malformed Supabase configuration', () => { vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',''); expect(hasSupabaseConfiguration()).toBe(false); vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','public-test-key'); expect(hasSupabaseConfiguration()).toBe(true); vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','invalid'); expect(hasSupabaseConfiguration()).toBe(false); });
});
