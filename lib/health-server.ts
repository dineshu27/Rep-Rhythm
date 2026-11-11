import {createClient} from '@supabase/supabase-js';
import {createHash,randomBytes} from 'node:crypto';
import {hasSupabaseConfiguration} from './config/environment';
export const healthJSON=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export function healthPublicClient(){if(!hasSupabaseConfiguration())return null;return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export const healthSecret=()=>randomBytes(32).toString('base64url');
export const secretHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function bearerToken(request:Request){const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];return token??null;}
export function healthFailure(error:{code?:string}){return error.code==='28000'?healthJSON({error:'This iPhone connection expired or was revoked. Pair again.'},401):error.code==='40001'?healthJSON({error:'A newer sync was already received. Refresh and try again.'},409):error.code==='22023'||error.code==='23514'?healthJSON({error:'Check the sync records and connection timezone.'},400):healthJSON({error:'Apple Health storage is not ready. Complete the dedicated FitAi backend setup.'},503);}
