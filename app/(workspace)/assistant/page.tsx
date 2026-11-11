import { Assistant } from '@/components/features/assistant';
import { dateSchema, mealCategory } from '@/lib/workspace';
import { assistantModes, type AssistantMode } from '@/lib/assistant';
export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ mode?: string; date?: string; meal?: string }> }) {
  const { mode, date, meal } = await searchParams;
  const selected = assistantModes.includes(mode as AssistantMode) ? mode as AssistantMode : 'food';
  return <Assistant key={selected} mode={selected} initialDate={dateSchema.safeParse(date).success ? date : ''} initialMeal={mealCategory.safeParse(meal).success ? meal as 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' : 'Lunch'}/>;
}
