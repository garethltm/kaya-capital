import { adminClient } from '@/lib/server/supabase';
export async function GET() {
  try {
    const { error } = await adminClient().from('rooms').select('id').limit(1);
    if (error) throw error;
    return Response.json({ status: 'ok' });
  } catch {
    return Response.json({ status: 'unavailable', message: 'Database is not configured or reachable.' }, { status: 503 });
  }
}
