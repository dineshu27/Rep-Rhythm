import { Assistant } from '@/components/features/assistant';
import { assistantModes, type AssistantMode } from '@/lib/assistant';
export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const selected = assistantModes.includes(mode as AssistantMode) ? mode as AssistantMode : 'food';
  return <Assistant key={selected} mode={selected}/>;
}
