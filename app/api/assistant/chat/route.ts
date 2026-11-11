import { NextResponse } from 'next/server';
import { sameOrigin,boundedJSON } from '@/lib/account';
import { chatRequestSchema,chatDraftSchema,extractedChatSchema } from '@/lib/chat-tracking';
import { parseTracking,enrichTracking } from '@/lib/chat-parser';
import { personalSession } from '@/lib/personal-ai';
import { extractWithProvider } from '@/lib/chat-provider';
export const runtime='nodejs';
export async function POST(request:Request){
 const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!sameOrigin(request))return json({error:'Request origin was not accepted.'},403);
 const parsed=chatRequestSchema.safeParse(await boundedJSON(request,24576).catch(()=>null));if(!parsed.success)return json({error:'Check your message and selected day.'},400);const input=parsed.data;
 if([input.text,input.pendingText??'',...input.history.map(row=>row.content)].some(text=>/sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/.test(text)))return json({error:'Enter API keys only in the secure connection panel.'},400);
 let basic;
 try{basic=extractedChatSchema.parse(parseTracking(input));}catch{return json({error:'Check quantities: use up to 10 sets, positive reps/time, and kg between 0 and 1,000.'},400);}
 let extracted=basic;
 if(input.provider!=='basic'){
  if(!input.consent||!input.billingConsent)return json({error:'Confirm sharing and provider charges before sending.'},400);
  const key=personalSession(request)?.keys[input.provider];if(!key)return json({error:'Connect your selected provider key again; the connection may have expired.'},401);
  try{extracted=await extractWithProvider(input,key,fetch,request.signal);}catch{return json({error:'The provider could not return a valid reply. Nothing was logged. Check your key access and billing; sent requests may incur provider charges.'},502);}
 }
 try{const draft=enrichTracking(extracted,input);const baseline=enrichTracking(basic,input);
  if(basic.intent==='question'){draft.intent='question';draft.autoEligible=false;}
  if(input.provider!=='basic'&&(JSON.stringify(extracted.foods.map(row=>row.grams))!==JSON.stringify(basic.foods.map(row=>row.grams))||JSON.stringify(extracted.exercises.map(row=>[row.sets,row.amount,row.weightKg,row.kind]))!==JSON.stringify(basic.exercises.map(row=>[row.sets,row.amount,row.weightKg,row.kind]))||JSON.stringify(draft.foods.map(row=>row.food?.id))!==JSON.stringify(baseline.foods.map(row=>row.food?.id))||JSON.stringify(draft.exercises.map(row=>row.presetId))!==JSON.stringify(baseline.exercises.map(row=>row.presetId))||!baseline.autoEligible||extracted.steps!==basic.steps)){draft.autoEligible=false;if(draft.intent==='log')draft.issues.unshift('Please review the interpreted details before logging.');}
  return json(chatDraftSchema.parse(draft));
 }catch{return json({error:'Some details could not be read. Include food names and grams, or exercise names, sets, reps and kg.'},400);}
}
