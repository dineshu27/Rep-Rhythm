import { NextResponse } from 'next/server';
import { accountClient, boundedJSON, completeBackupSchema, sameOrigin } from '@/lib/account';

export const dynamic = 'force-dynamic';
export async function GET() {
  const { client, user, response } = await accountClient(); if (response) return response;
  const { data, error } = await client.rpc('fitness_load');
  if (error) return NextResponse.json({ error: 'Account storage is not ready. Apply the reviewed fitness migration to the intended project.' }, { status: 503 });
  if (data?.backup && !completeBackupSchema.safeParse(data.backup).success) return NextResponse.json({ error: 'Account data could not be validated. Download an account export before making changes.' }, { status: 422 });
  return NextResponse.json({ email: user.email, revision: data?.revision ?? 0, backup: data?.backup ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { client, response } = await accountClient(); if (response) return response;
  try {
    const body = await boundedJSON(request); const backup = completeBackupSchema.parse(body.backup);
    if (!Number.isSafeInteger(body.revision) || body.revision < 0) throw new Error('Invalid revision.');
    const { data, error } = await client.rpc('fitness_save', { bundle: backup, expected_version: body.revision });
    if (error) return NextResponse.json({ error: error.code === '40001' ? 'Account records changed on another device. Refresh the account status before saving again.' : 'Account save failed. Your browser records are unchanged.' }, { status: error.code === '40001' ? 409 : 422 });
    return NextResponse.json({ revision: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Invalid backup or request size. No account records were changed.' }, { status: 400 }); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { client, response } = await accountClient(); if (response) return response;
  try { const body = await boundedJSON(request, 1024); if (body.confirmation !== 'DELETE ACCOUNT') throw new Error(); }
  catch { return NextResponse.json({ error: 'Type DELETE ACCOUNT to confirm.' }, { status: 400 }); }
  const { error } = await client.rpc('fitness_delete_account');
  if (error) return NextResponse.json({ error: 'Deletion failed. Sign in again to refresh your identity, then retry. Account deletion requires a sign-in within the last five minutes.' }, { status: 403 });
  await client.auth.signOut(); return NextResponse.json({ deleted: true });
}
