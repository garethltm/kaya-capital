import { NextRequest } from 'next/server';
import { adminClient, apiError, sessionCookie } from '@/lib/server/supabase';
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const token = request.cookies.get(sessionCookie(code))?.value;
    if (!token) return Response.json({ error: 'Join this room first.' }, { status: 401 });
    const { action } = await request.json();
    if (!['roll', 'buy', 'skip', 'end_turn'].includes(action)) return Response.json({ error: 'Unknown action.' }, { status: 400 });
    const { error } = await adminClient().rpc('kc_action', { p_code: code, p_token: token, p_action: action });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) { return apiError(error, 'Action failed'); }
}
