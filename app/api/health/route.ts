import {z} from 'zod';
import {accountClient,boundedJSON,sameOrigin} from '@/lib/account';
import {healthJSON,healthFailure} from '@/lib/health-server';
import {healthSnapshotSchema} from '@/lib/health';
export const dynamic='force-dynamic';
export async function GET(){const {client,response}=await accountClient();if(response)return response;const {data,error}=await client.rpc('fitai_health_load');if(error)return healthFailure(error);const parsed=healthSnapshotSchema.safeParse(data);return parsed.success?healthJSON(parsed.data):healthJSON({error:'Health records could not be validated.'},502);}
export async function DELETE(request:Request){if(!sameOrigin(request))return healthJSON({error:'Invalid request origin.'},403);const {client,response}=await accountClient();if(response)return response;const parsed=z.object({deviceId:z.uuid(),erase:z.boolean().default(false)}).strict().safeParse(await boundedJSON(request,1024).catch(()=>null));if(!parsed.success)return healthJSON({error:'Choose a connected iPhone.'},400);const {error}=await client.rpc('fitai_health_revoke',{device_id:parsed.data.deviceId,erase_records:parsed.data.erase});return error?healthFailure(error):healthJSON({revoked:true});}
