import {z} from 'zod';
import {accountClient,boundedJSON,sameOrigin} from '@/lib/account';
import {timeZoneSchema} from '@/lib/workspace';
import {healthJSON,healthSecret,secretHash,healthFailure} from '@/lib/health-server';
export async function POST(request:Request){if(!sameOrigin(request))return healthJSON({error:'Invalid request origin.'},403);const {client,response}=await accountClient();if(response)return response;const parsed=z.object({timeZone:timeZoneSchema,replace:z.boolean().default(false),consent:z.literal(true)}).strict().safeParse(await boundedJSON(request,2048).catch(()=>null));if(!parsed.success)return healthJSON({error:'Confirm the Apple Health sync consent and timezone.'},400);const code=healthSecret();const {data,error}=await client.rpc('fitai_health_pair',{code_hash:secretHash(code),zone:parsed.data.timeZone,replace_device:parsed.data.replace});return error?healthFailure(error):healthJSON({code,expiresAt:data.expiresAt,url:`fitai://pair?code=${code}`});}
