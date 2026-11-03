import Link from 'next/link';
import { PhasePlaceholder } from '@/components/features/phase-placeholder';
export default function Page() { return <><PhasePlaceholder title="Workout planner" description="Four gym days. A sustainable weekly rhythm." phase="Phase 4" features={['Monday upper A and Tuesday lower A','Thursday upper B and Saturday lower B','Optional cardio and active recovery']}/><Link href="/workouts/active" className="shell-button shell-button-secondary">Preview active workout screen →</Link></>; }
