import { expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server',()=>({serverSupabase:async()=>({auth:{signOut:async()=>({error:null})}})}));
import { POST } from '../app/api/auth/route';
import { personalCookie } from './personal-ai';
it('successful cloud sign-out also clears the personal provider credential cookie',async()=>{const response=await POST(new Request('https://app.test/api/auth',{method:'POST',headers:{origin:'https://app.test'},body:JSON.stringify({action:'signout'})}));expect(response.status).toBe(200);expect(response.headers.get('set-cookie')).toContain(personalCookie+'=');expect(response.headers.get('set-cookie')).toContain('Max-Age=0');});
