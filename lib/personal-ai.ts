import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
export const personalCookie = 'fittrack-personal-ai';
export const providerSchema = z.enum(['openai', 'anthropic']);
export type AIProvider = z.infer<typeof providerSchema>;
export const apiKeySchema = z.string().min(20).max(512).regex(/^[A-Za-z0-9_.-]+$/);
const secretsSchema = z.object({ openai: apiKeySchema.optional(), anthropic: apiKeySchema.optional() }).strict();
const envelopeSchema = z.object({ version: z.literal(1), expires: z.number().int().positive(), keys: secretsSchema }).strict();
export type PersonalSecrets = z.infer<typeof secretsSchema>;
function encryptionKey() { const key = Buffer.from(process.env.AI_KEY_ENCRYPTION_KEY ?? '', 'base64'); if (key.length !== 32) throw new Error('Personal AI storage is not configured.'); return key; }
export function personalAIAvailable() { return process.env.PERSONAL_AI_ENABLED === 'true' && Buffer.from(process.env.AI_KEY_ENCRYPTION_KEY ?? '', 'base64').length === 32; }
export function sealPersonalKeys(keys: PersonalSecrets, origin: string, now = Date.now(), originalExpiry?: number) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv); cipher.setAAD(Buffer.from(origin));
  const value = envelopeSchema.parse({ version: 1, expires: Math.min(now + 8 * 60 * 60 * 1000, originalExpiry ?? Infinity), keys });
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}
export function openPersonalKeys(value: string | undefined, origin: string, now = Date.now()) {
  if (!value || value.length > 3000) return null;
  try { const raw = Buffer.from(value, 'base64url'); if (raw.length < 29) return null; const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), raw.subarray(0, 12)); decipher.setAAD(Buffer.from(origin)); decipher.setAuthTag(raw.subarray(12, 28)); const plain = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]); const envelope = envelopeSchema.parse(JSON.parse(plain.toString('utf8'))); return envelope.expires > now ? envelope : null; } catch { return null; }
}
export function requestOrigin(request: Request) { const url = new URL(request.url); return `${url.protocol}//${request.headers.get('host') || url.host}`; }
export function personalSession(request: Request) {
  const raw = request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(`${personalCookie}=`))?.slice(personalCookie.length + 1);
  return personalAIAvailable() ? openPersonalKeys(raw, requestOrigin(request)) : null;
}
