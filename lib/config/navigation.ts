export const navigation = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/food', label: 'Food diary', icon: 'food' },
  { href: '/meals', label: 'Meal planner', icon: 'meals' },
  { href: '/workouts', label: 'Workouts', icon: 'workouts' },
  { href: '/workouts/active', label: 'Active workout', icon: 'active' },
  { href: '/progress', label: 'Progress', icon: 'progress' },
  { href: '/assistant', label: 'Chat', icon: 'assistant' },
  { href: '/connections', label: 'Watch & steps', icon: 'watch' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
] as const;
export function isActiveRoute(pathname: string, href: string) { return pathname === href; }
export function pageLabel(pathname: string) { return navigation.find(item => isActiveRoute(pathname, item.href))?.label ?? (pathname === '/onboarding' ? 'Onboarding' : 'Sign in'); }
export const mobileNavigation = navigation.filter(item => ['/', '/food', '/workouts', '/assistant', '/settings'].includes(item.href));
