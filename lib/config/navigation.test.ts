import { describe, it, expect } from 'vitest';
import { isActiveRoute, navigation, mobileNavigation, pageLabel } from './navigation';
describe('route navigation', () => {
  it('does not highlight both workout routes during an active workout', () => { expect(isActiveRoute('/workouts/active','/workouts')).toBe(false); expect(isActiveRoute('/workouts/active','/workouts/active')).toBe(true); });
  it('keeps routes unique and mobile links within the desktop navigation', () => { expect(new Set(navigation.map(item => item.href)).size).toBe(navigation.length); expect(mobileNavigation).toHaveLength(5); expect(mobileNavigation.every(item => navigation.some(route => route.href === item.href))).toBe(true); });
  it('provides readable labels for auth and onboarding', () => { expect(pageLabel('/auth')).toBe('Sign in'); expect(pageLabel('/onboarding')).toBe('Onboarding'); });
});
