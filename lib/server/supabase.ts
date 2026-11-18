import { createClient } from '@supabase/supabase-js';

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function sessionCookie(code: string) {
  return `kc_session_${code.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
}

export function apiError(error: unknown, fallback = 'Something went wrong') {
  const message = error instanceof Error ? error.message : fallback;
  const status = /not found|no open room/i.test(message) ? 404
    : /full|at least two|nickname|password between/i.test(message) ? 400
      : /turn|host|invalid|already|not enough|available|buy or skip|in progress|own|offered|incorrect room password|recovery details|not active/i.test(message) ? 403 : 500;
  return Response.json({ error: message || fallback }, { status });
}
