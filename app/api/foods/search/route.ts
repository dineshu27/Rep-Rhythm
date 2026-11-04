import { NextResponse } from 'next/server';
import { foodSearchQuery, searchFoods } from '@/lib/food-search';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = foodSearchQuery.safeParse(url.searchParams.get('q') ?? '');
  const page = Number(url.searchParams.get('page') ?? '1');
  if (!query.success || !Number.isSafeInteger(page) || page < 1 || page > 1000) {
    return NextResponse.json({ error: 'Enter a food name of 2–100 characters and a valid results page.' }, { status: 400 });
  }
  return NextResponse.json(searchFoods(query.data, page), { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' } });
}
