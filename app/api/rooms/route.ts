import { NextRequest, NextResponse } from 'next/server';
import { adminClient, apiError, sessionCookie } from '@/lib/server/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const avatar = String(body.avatar ?? '🧑‍💼').slice(0, 12);
    const isPublic = Boolean(body.public);
    const db = adminClient();
    const { data, error } = await db.rpc('kc_create_room', {
      p_name: name, p_avatar: avatar, p_public: isPublic, p_shared: Boolean(body.shared), p_password: body.password ?? null,
    });
    if (error) throw error;
    const result = NextResponse.json({ code: data.code, playerId: data.playerId, recoveryCode: data.recoveryCode });
    result.cookies.set(sessionCookie(data.code), data.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 });
    return result;
  } catch (error) { return apiError(error, 'Could not create room'); }
}
