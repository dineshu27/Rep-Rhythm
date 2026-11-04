import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowUpRight, CalendarDays, Dumbbell, Plus } from 'lucide-react';

export function DailyBrief({ date, calories, target, logged, activeWorkout }: { date: string; calories: number; target: number; logged: boolean; activeWorkout: boolean }) {
  const progress = Math.max(0, Math.min(100, calories / target * 100));
  const label = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  return <section className="daily-brief" aria-label="Your daily brief">
    <div><span className="shell-overline">A LITTLE BETTER, EVERY DAY</span><h2>Small steps.<br/><span>Stronger days.</span></h2><p>Your food, your training, your rhythm. Make space for one good choice today.</p><div className="daily-brief-actions"><Link className="shell-button" href="/food"><Plus size={15} aria-hidden="true"/> Log a meal</Link><Link className="shell-button shell-button-secondary" href={activeWorkout ? '/workouts/active' : '/workouts'}><Dumbbell size={15} aria-hidden="true"/>{activeWorkout ? 'Resume workout' : 'View workouts'}<ArrowUpRight size={14} aria-hidden="true"/></Link></div><span className="brief-date"><CalendarDays size={13} aria-hidden="true"/>{label}</span></div>
    <div className="brief-energy"><div className="energy-ring" style={{ '--energy-progress': `${logged ? progress : 0}%` } as CSSProperties} aria-hidden="true"><div className="energy-ring-inner"><strong>{logged ? Math.round(calories).toLocaleString() : '—'}</strong><small>{logged ? 'kcal logged' : 'Not logged'}</small></div></div><div className="brief-energy-copy"><strong>{logged ? 'Today, so far' : 'A fresh start'}</strong><p>{logged ? `${Math.round(calories).toLocaleString()} of ${target.toLocaleString()} kcal logged.` : 'Your diary is ready when you are.'}</p><span className="brief-date">{logged ? 'Every entry adds up.' : 'Start with your first meal.'}</span></div></div>
  </section>;
}
