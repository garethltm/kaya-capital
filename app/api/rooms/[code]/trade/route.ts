import { NextRequest } from 'next/server';
import { adminClient, apiError, sessionCookie } from '@/lib/server/supabase';
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const token = request.cookies.get(sessionCookie(code))?.value;
    if (!token) return Response.json({ error: 'Join this room first.' }, { status: 401 });
    const body = await request.json();
    const { error } = await adminClient().rpc('kc_trade', {
      p_code: code, p_token: token, p_target: body.target, p_offer: body.offer ?? {}, p_accept: Boolean(body.accept),
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, 'Trade failed'); }
}
