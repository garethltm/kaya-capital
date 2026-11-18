import { NextRequest, NextResponse } from 'next/server';
import { adminClient, apiError, sessionCookie } from '@/lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code ?? '').trim().toUpperCase();
    const { data, error } = await adminClient().rpc('kc_recover_player', {
      p_code: code,
      p_name: String(body.name ?? '').trim(),
      p_password: body.password ?? null,
      p_recovery_code: String(body.recoveryCode ?? '').trim(),
    });
    if (error) throw error;
    const response = NextResponse.json({ code: data.code, playerId: data.playerId, recoveryCode: data.recoveryCode });
    response.cookies.set(sessionCookie(data.code), data.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch (error) {
    return apiError(error, 'Could not restore your player seat');
  }
}
