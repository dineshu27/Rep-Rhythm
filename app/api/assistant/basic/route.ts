import { NextResponse } from 'next/server';
import { sameOrigin, boundedJSON } from '@/lib/account';
import { aiRequestSchema } from '@/lib/assistant';
import { basicDraft } from '@/lib/basic-assistant';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const json = (body:unknown,status=200) => NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
  if (!sameOrigin(request)) return json({error:'Request origin was not accepted.'},403);
  let input;
  try { input = aiRequestSchema.parse(await boundedJSON(request,24576)); } catch { return json({error:'Enter a short description to use the basic helper.'},400); }
  try { return json(basicDraft(input)); } catch { return json({error:'Check the food description. Enter keys only in the secure connection form.'},400); }
}
