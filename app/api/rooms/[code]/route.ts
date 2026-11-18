import { NextRequest } from 'next/server';
import { adminClient, apiError, sessionCookie } from '@/lib/server/supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: raw } = await params;
    const code = raw.toUpperCase();
    const token = request.cookies.get(sessionCookie(code))?.value;
    if (!token) return Response.json({ error: 'Join this room to see its game state.' }, { status: 401 });
    const db = adminClient();
    const { data: room, error: roomError } = await db.from('rooms').select('id,code,status,is_public,shared_screen,host_player_id,current_player_id,pending_board_index,turn_rolled,round,winner_player_id').eq('code', code).single();
    if (roomError) throw roomError;
    const { data: player, error: playerError } = await db.from('players').select('id,name,avatar,is_host,status').eq('room_id', room.id).eq('session_hash', await hashToken(token)).maybeSingle();
    if (playerError) throw playerError;
    if (!player) return Response.json({ error: 'Your room session expired. Rejoin using the room code.' }, { status: 401 });
    const [players, properties, events, trades] = await Promise.all([
      db.from('players').select('id,name,avatar,cash,position,is_host,ready,status').eq('room_id', room.id).order('joined_at'),
      db.from('properties').select('board_index,owner_id,price,group_name').eq('room_id', room.id),
      db.from('game_events').select('id,player_id,event_type,payload,created_at').eq('room_id', room.id).order('created_at', { ascending: false }).limit(24),
      db.from('trades').select('id,from_player,to_player,offer,status').eq('room_id', room.id).eq('status', 'pending'),
    ]);
    for (const result of [players, properties, events, trades]) if (result.error) throw result.error;
    return Response.json({ room, me: player, players: players.data, properties: properties.data, events: events.data, trades: trades.data });
  } catch (error) { return apiError(error, 'Could not load room'); }
}

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
