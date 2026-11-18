import { NextRequest, NextResponse } from 'next/server';
import { adminClient, apiError, sessionCookie } from '@/lib/server/supabase';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await adminClient().rpc('kc_join_room', {
      p_code: '', p_name: String(body.name ?? '').trim(), p_avatar: String(body.avatar ?? '🧑‍💼').slice(0, 12), p_public_only: true,
    });
    if (error) throw error;
    const response = NextResponse.json({ code: data.code, recoveryCode: data.recoveryCode });
    response.cookies.set(sessionCookie(data.code), data.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 });
    return response;
  } catch (error) { return apiError(error, 'No public match is available yet. Try again shortly.'); }
}
