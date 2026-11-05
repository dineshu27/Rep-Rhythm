import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({generate:vi.fn()}));
vi.mock('@/lib/ai-provider',()=>({aiConfigured:()=>false,generateDraft:mocks.generate}));
import { GET, POST } from '../app/api/ai/route';
import { sealPersonalKeys, personalCookie } from './personal-ai';
import { exampleDraft } from './assistant';
const origin='https://app.test';const key='test-provider-key-not-real-123456789';
const input={mode:'food',description:'150g banana',consent:true,provider:'anthropic',usePersonalKey:true,billingConsent:true,facts:[]};
function request(body:unknown,cookie=true){return new Request(`${origin}/api/ai`,{method:'POST',headers:{origin,'Content-Type':'application/json',...(cookie?{cookie:`${personalCookie}=${sealPersonalKeys({anthropic:key},origin)}`}:{})},body:JSON.stringify(body)});}
beforeEach(()=>{vi.stubEnv('PERSONAL_AI_ENABLED','true');vi.stubEnv('AI_KEY_ENCRYPTION_KEY',Buffer.alloc(32,5).toString('base64'));mocks.generate.mockReset();mocks.generate.mockResolvedValue(exampleDraft('food'));});afterEach(()=>vi.unstubAllEnvs());
it('uses only the selected encrypted personal key and does not require cloud sign-in',async()=>{const response=await POST(request(input));expect(response.status).toBe(200);expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining(input),fetch,{provider:'anthropic',key},expect.any(AbortSignal));expect(JSON.stringify(await response.json())).not.toContain(key);});
it('requires explicit consent to charges and an unexpired key before a provider call',async()=>{expect((await POST(request({...input,billingConsent:false}))).status).toBe(400);expect((await POST(request(input,false))).status).toBe(401);expect((await POST(request({...input,provider:'openai'}))).status).toBe(401);expect(mocks.generate).not.toHaveBeenCalled();});
it('rejects secret-looking content in chat instead of forwarding it',async()=>{expect((await POST(request({...input,description:'my key is sk-proj-abcdefghijklmnopqrstuvwxyz12345'}))).status).toBe(400);expect(mocks.generate).not.toHaveBeenCalled();});
it('returns provider status without returning the key',async()=>{const request=new Request(`${origin}/api/ai`,{headers:{cookie:`${personalCookie}=${sealPersonalKeys({anthropic:key},origin)}`}});const status=await(await GET(request)).json();expect(status.personal).toBe(true);expect(status.providers).toEqual({openai:false,anthropic:true});expect(JSON.stringify(status)).not.toContain(key);});
it('does not leak provider errors and never silently falls back to a different key',async()=>{mocks.generate.mockRejectedValue(new Error('raw error '+key));const response=await POST(request(input));expect(response.status).toBe(502);expect(JSON.stringify(await response.json())).not.toContain(key);expect(mocks.generate).toHaveBeenCalledTimes(1);});
