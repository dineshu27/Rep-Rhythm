import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), configured: true }));
vi.mock('@/lib/supabase/server', () => ({ serverSupabase: async () => mock.configured ? { auth: { getUser: mock.getUser }, rpc: mock.rpc } : null }));
import { GET as auth } from '@/app/api/auth/route';
import { GET as health } from '@/app/api/health/route';
const snapshot = { ownerId: '22222222-2222-4222-8222-222222222222', devices: [], steps: [], workouts: [] };
beforeEach(() => { mock.configured = true; mock.getUser.mockReset(); mock.rpc.mockReset().mockResolvedValue({ data: snapshot, error: null }); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());
it('uses the same verified identity check for account status and Health access', async () => {
 mock.getUser.mockResolvedValue({ data: { user: { id: snapshot.ownerId, email: 'test@example.test' } }, error: null });
 expect(await (await auth()).json()).toMatchObject({ email: 'test@example.test' });
 expect(await (await health()).json()).toEqual(snapshot);
 expect(mock.rpc).toHaveBeenCalledWith('fitai_health_load');
});
it('rejects even a returned user if identity verification also reports an error', async () => {
 mock.getUser.mockResolvedValue({ data: { user: { email: 'test@example.test' } }, error: { name: 'AuthApiError', status: 401 } });
 expect(await (await auth()).json()).toMatchObject({ email: null, code: 'session_invalid' });
 expect((await health()).status).toBe(401); expect(mock.rpc).not.toHaveBeenCalled();
});
it('distinguishes missing sessions without exposing credential or provider details', async () => {
 mock.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400, message: 'private-detail' } });
 const response = await health(); expect(response.status).toBe(401);
 expect(await response.json()).toEqual({ error: 'Sign in to access your account.', code: 'session_missing' });
 expect(response.headers.get('cache-control')).toBe('private, no-store');
 expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('private-detail');
});
it.each([429, 500, 503, 0])('does not report a service failure (%s) as signed out', async status => {
 mock.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthApiError', status } });
 for (const handler of [auth, health]) { const response = await handler(); expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ code: 'auth_unavailable' }); }
 expect(mock.rpc).not.toHaveBeenCalled();
});
it('keeps unconfigured browser tracking available', async () => {
 mock.configured = false;
 expect(await (await auth()).json()).toEqual({ configured: false, email: null });
 expect((await health()).status).toBe(503);
});
