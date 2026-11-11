import { afterEach,expect,it,vi } from 'vitest';
import { POST } from '../app/api/assistant/basic/route';
const origin='https://fit.test';
const request=(body:unknown,from=origin)=>new Request(origin+'/api/assistant/basic',{method:'POST',headers:{origin:from,'content-type':'application/json'},body:JSON.stringify(body)});
afterEach(()=>vi.unstubAllGlobals());
it('supports useful logging without a key or any outbound AI request',async()=>{const outbound=vi.fn();vi.stubGlobal('fetch',outbound);const response=await POST(request({mode:'food',description:'150g cooked rice',consent:true,facts:[]}));expect(response.status).toBe(200);const value=await response.json();expect(value.foods[0].grams).toBe(150);expect(value.matches[0].length).toBeGreaterThan(0);expect(response.headers.get('cache-control')).toContain('no-store');expect(outbound).not.toHaveBeenCalled();});
it('rejects foreign origins, oversized inputs and key-looking text before processing',async()=>{expect((await POST(request({},'https://other.test'))).status).toBe(403);expect((await POST(request({mode:'food',description:'a'.repeat(25000),consent:true,facts:[]}))).status).toBe(400);expect((await POST(request({mode:'food',description:'sk-proj-abcdefghijklmnopqrstuvwxyz12345',consent:true,facts:[]}))).status).toBe(400);});
