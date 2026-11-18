import { NextRequest, NextResponse } from 'next/server';
import { adminClient, apiError, sessionCookie } from '@/lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code ?? '').trim();
    const db = adminClient();
    const { data, error } = await db.rpc('kc_join_room', {
      p_code: code, p_name: String(body.name ?? '').trim(), p_avatar: String(body.avatar ?? '🧑‍💼').slice(0, 12), p_public_only: Boolean(body.publicOnly),
    });
    if (error) throw error;
    const result = NextResponse.json({ code: data.code, playerId: data.playerId });
    result.cookies.set(sessionCookie(data.code), data.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 });
    return result;
  } catch (error) { return apiError(error, 'Could not join room'); }
}
