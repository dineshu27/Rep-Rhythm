import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Check, Dumbbell, Fingerprint, Leaf, LockKeyhole, Play, ScanLine, ShieldCheck, Sparkles, Target, TrendingUp, Utensils } from 'lucide-react';

type Kind = 'food' | 'meals' | 'workouts' | 'active' | 'progress' | 'profile' | 'onboarding' | 'assistant' | 'auth';
const content = {
  food: { eyebrow: 'THE NUTRITION JOURNAL', title: 'Good food. Clearer choices.', description: 'Find your food, weigh your portion, and let the details add up.', tags: ['Weighed in grams', 'Five nutrients', 'Your food library'], icon: Utensils },
  meals: { eyebrow: 'THE WEEKLY TABLE', title: 'A little planning. A better week.', description: 'Build your days around ingredients you enjoy. Leave room for real life.', tags: ['Choose ingredients', 'Plan portions', 'Make it yours'], icon: CalendarDays },
  workouts: { eyebrow: 'THE TRAINING STUDIO', title: 'Show up. Find your strength.', description: 'Your exercises, your rounds, your rhythm. Build the session that suits you.', tags: ['Upper body', 'Lower body', 'Room to recover'], icon: Dumbbell },
  active: { eyebrow: 'IN YOUR FOCUS ZONE', title: 'One set. Full focus.', description: 'Log the work, take your rest, and make the next round count.', tags: ['Reps', 'Rounds', 'Rest'], icon: Play },
  progress: { eyebrow: 'THE LONG VIEW', title: 'Your story, one day at a time.', description: 'Look for your rhythm in real measurements and the habits you record.', tags: ['Measurements', 'Movement', 'Consistency'], icon: TrendingUp },
  profile: { eyebrow: 'YOUR PERSONAL BLUEPRINT', title: 'Built around you.', description: 'Set your own targets, shape your preferences, and keep your records in your hands.', tags: ['Your preferences', 'Your targets', 'Your data'], icon: Fingerprint },
  onboarding: { eyebrow: 'A NEW CHAPTER', title: 'Make this space your own.', description: 'A few personal preferences. A clear starting point. A rhythm you can build on.', tags: ['01 · Personalise', '02 · Set targets', '03 · Start tracking'], icon: Target },
  assistant: { eyebrow: 'A LITTLE EXTRA PERSPECTIVE', title: 'Ideas with you in control.', description: 'Describe, explore, and review. You always choose what becomes part of your day.', tags: ['Food', 'Training', 'Meal ideas', 'Weekly reflection'], icon: Sparkles },
  auth: { eyebrow: 'YOUR PRIVATE CORNER', title: 'A space that belongs to you.', description: 'Track in this browser. Connect your account when cloud storage is available.', tags: ['Browser tracking', 'Manual cloud saves', 'Your choice'], icon: LockKeyhole },
};
function SignatureArt({ kind }: { kind: Kind }) {
  if (kind === 'food') return <div className="signature-plate"><div className="plate-inner"><Leaf size={48}/><span>KNOW YOUR PORTION</span></div><i className="plate-dot plate-dot-one"/><i className="plate-dot plate-dot-two"/></div>;
  if (kind === 'meals') return <div className="signature-calendar"><span>ROOM FOR GOOD FOOD</span><div>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <i key={i} className={i === 2 || i === 5 ? 'calendar-highlight' : ''}>{day}<b>{i === 2 || i === 5 ? <Leaf size={16}/> : <span/>}</b></i>)}</div></div>;
  if (kind === 'workouts' || kind === 'active') return <div className="signature-strength"><Dumbbell size={88} strokeWidth={1.2}/><div><span>TRAIN WITH INTENTION</span><div className="strength-bars">{[40, 58, 76, 96, 76, 58, 40].map((height, i) => <i key={i} style={{ height }}/>)}</div></div></div>;
  if (kind === 'progress') return <div className="signature-rings"><i/><i/><i/><Target size={34}/><span>YOUR PACE. YOUR PROGRESS.</span></div>;
  if (kind === 'assistant') return <div className="signature-orbit"><i/><Sparkles size={46}/><span className="orbit-note orbit-note-one"><Utensils size={14}/>Food</span><span className="orbit-note orbit-note-two"><Dumbbell size={14}/>Training</span><span className="orbit-note orbit-note-three"><Sparkles size={14}/>Ideas</span></div>;
  return <div className="signature-pass"><div><ShieldCheck size={20}/><span>PERSONAL WORKSPACE</span></div><Fingerprint size={55} strokeWidth={1.2}/><span>MADE FOR YOUR EVERYDAY</span><i/><ScanLine size={22}/></div>;
}
export function PageSignature({ kind }: { kind: Kind }) {
  const item = content[kind]; const Icon = item.icon;
  return <section className={`page-signature signature-${kind}`} aria-label={item.eyebrow}><div className="signature-copy"><span className="signature-eyebrow"><Icon size={13} aria-hidden="true"/>{item.eyebrow}</span><h2>{item.title}</h2><p>{item.description}</p><ul className="signature-tags">{item.tags.map(tag => <li key={tag}><Check size={11} aria-hidden="true"/>{tag}</li>)}</ul>{kind === 'food' && <Link className="signature-link" href="#food-search">Find a food <ArrowUpRight size={14}/></Link>}</div><div className="signature-art" aria-hidden="true"><SignatureArt kind={kind}/></div></section>;
}
