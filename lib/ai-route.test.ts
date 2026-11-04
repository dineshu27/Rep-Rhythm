import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ account: vi.fn(), configured: vi.fn(), generate: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/account', async () => { const { sameOrigin, boundedJSON } = await import('./account'); return { sameOrigin, boundedJSON, accountClient: mocks.account }; });
vi.mock('@/lib/ai-provider', () => ({ aiConfigured: mocks.configured, generateDraft: mocks.generate }));
import { GET, POST } from '../app/api/ai/route';
import { exampleDraft } from './assistant';
const post = (body: unknown, origin = 'http://localhost') => POST(new Request('http://localhost/api/ai', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
const input = { mode: 'food', description: '150g banana', consent: true, facts: [] };
beforeEach(() => { vi.clearAllMocks(); mocks.configured.mockReturnValue(true); mocks.rpc.mockResolvedValue({ data: { dailyRemaining: 4, monthlyRemaining: 49 }, error: null }); mocks.account.mockResolvedValue({ client: { rpc: mocks.rpc }, user: { app_metadata: { ai_access: true } }, response: null }); mocks.generate.mockResolvedValue(exampleDraft('food')); });
it('disabled AI and foreign origins never reach a model', async () => { expect((await post(input, 'https://attacker.example')).status).toBe(403); mocks.configured.mockReturnValue(false); expect((await post(input)).status).toBe(503); expect(mocks.generate).not.toHaveBeenCalled(); expect(mocks.account).not.toHaveBeenCalled(); });
it('rejects missing consent and oversized descriptions before reserving usage', async () => { expect((await post({ ...input, consent: false })).status).toBe(400); expect((await post({ ...input, description: 'x'.repeat(17000) })).status).toBe(400); expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled(); });
it('requires authoritative sign-in and administrative access', async () => { mocks.account.mockResolvedValueOnce({ client: null, user: null, response: Response.json({ error: 'Sign in' }, { status: 401 }) }); expect((await post(input)).status).toBe(401); mocks.account.mockResolvedValueOnce({ client: { rpc: mocks.rpc }, user: { app_metadata: {}, user_metadata: { ai_access: true } }, response: null }); expect((await post(input)).status).toBe(403); expect(mocks.generate).not.toHaveBeenCalled(); });
it('fails closed when durable usage controls fail', async () => { mocks.rpc.mockResolvedValue({ error: { message: 'quota' } }); expect((await post(input)).status).toBe(429); expect(mocks.generate).not.toHaveBeenCalled(); });
it('reserves before a single provider call and uses real food record matches', async () => { const response = await post(input); expect(response.status).toBe(200); expect(mocks.rpc).toHaveBeenCalledWith('fitness_reserve_ai_request', { request_id: expect.any(String), request_kind: 'food' }); expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.generate.mock.invocationCallOrder[0]); const draft = await response.json(); expect(draft.matches[0][0].per100g.calories).toBe(97); expect(response.headers.get('Cache-Control')).toContain('no-store'); });
it('provider failures reveal no raw errors or secrets', async () => { mocks.generate.mockRejectedValue(new Error('private-provider-error')); const response = await post(input); expect(response.status).toBe(502); expect(JSON.stringify(await response.json())).not.toContain('private-provider-error'); expect(mocks.generate).toHaveBeenCalledTimes(1); });
it('examples require neither authentication nor provider requests', async () => { mocks.configured.mockReturnValue(false); expect((await GET(new Request('http://localhost/api/ai?example=workout'))).status).toBe(200); expect(mocks.account).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled(); });

it('accepts the browser-facing Host when Next normalizes its internal URL, but rejects forwarded-host spoofing', async () => {
  mocks.configured.mockReturnValue(false);
  const req = (origin: string, headers: Record<string,string>) => new Request('http://localhost/api/ai', { method: 'POST', headers: { origin, ...headers }, body: JSON.stringify(input) });
  expect((await POST(req('http://127.0.0.1:3104', { host: '127.0.0.1:3104' }))).status).toBe(503);
  expect((await POST(req('https://foreign.example', { host: 'app.aifittraining.uk', 'x-forwarded-host': 'foreign.example' }))).status).toBe(403);
});
