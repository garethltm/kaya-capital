'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { BOARD } from '@/lib/board';
import MalaysiaFlag from '@/components/MalaysiaFlag';

type Player = { id: string; name: string; avatar: string; cash: number; position: number; is_host: boolean };
type RoomState = {
  room: { id: string; code: string; status: 'lobby' | 'playing' | 'completed'; shared_screen: boolean; host_player_id: string; current_player_id: string | null; pending_board_index: number | null; turn_rolled: boolean; round: number; winner_player_id: string | null };
  me: { id: string; name: string; avatar: string; is_host: boolean };
  players: Player[];
  properties: { board_index: number; owner_id: string | null; price: number }[];
  events: { id: number | string; player_id: string | null; event_type: string; payload: { message?: string; name?: string }; created_at: string }[];
  trades: { id: string; from_player: string; to_player: string; offer: { cash?: number; propertyIndex?: number; requestCash?: number; requestPropertyIndex?: number } }[];
};
const order = [0,1,2,3,4,9,14,19,24,23,22,21,20,15,10,5,6,7,8,13,18,17,16,11,12];

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code || '').toUpperCase();
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [needsJoin, setNeedsJoin] = useState(false);
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);
  const [working, setWorking] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [tradeTarget, setTradeTarget] = useState('');
  const [tradeCash, setTradeCash] = useState('0');
  const [tradeProperty, setTradeProperty] = useState('-1');
  const [requestCash, setRequestCash] = useState('0');
  const [requestProperty, setRequestProperty] = useState('-1');
  const [origin, setOrigin] = useState('');

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const response = await fetch(`/api/rooms/${code}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          setNeedsJoin(true);
          setError('');
          return;
        }
        throw new Error(data.error || 'Could not load this room.');
      }
      setNeedsJoin(false); setState(data); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Connection interrupted. Retrying…'); }
  }, [code]);

  useEffect(() => {
    setOrigin(window.location.origin);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1800);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function post(url: string, body: object = {}) {
    setWorking(true); setError('');
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action failed.');
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Action failed.'); }
    finally { setWorking(false); }
  }

  async function joinRoom() {
    setJoining(true); setError('');
    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: nickname.trim(), avatar: '🧑‍💼' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not join this room.');
      setNeedsJoin(false);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not join this room.'); }
    finally { setJoining(false); }
  }

  async function shareInvite() {
    const url = `${window.location.origin}/room/${code}`;
    try { await navigator.clipboard.writeText(url); setShareMessage('Invite link copied!'); }
    catch { setShareMessage(url); }
    window.setTimeout(() => setShareMessage(''), 3500);
  }

  const tiles = useMemo(() => {
    const byPosition = new Map<number, (typeof BOARD)[number]>();
    BOARD.forEach((space, index) => byPosition.set(index, space));
    return order.map((boardIndex, gridIndex) => ({ boardIndex, gridIndex, space: byPosition.get(boardIndex)! }));
  }, []);

  if (!state) return <main className="page"><div className="shell"><header className="topbar"><a href="/" className="brand brand-lockup"><MalaysiaFlag className="malaysia-flag brand-flag" />KAYA <span>CAPITAL</span></a><span className="pill">ROOM {code}</span></header>{needsJoin ? <div className="card loading"><div className="eyebrow">JOIN YOUR GENG</div><h2>Room {code}</h2><p className="muted">Pick a nickname to join this table.</p><label className="label" htmlFor="room-nickname">YOUR NICKNAME</label><input id="room-nickname" className="input" maxLength={18} autoComplete="nickname" value={nickname} onChange={event => setNickname(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && nickname.trim() && !joining) void joinRoom(); }} /><button className="btn primary" disabled={!nickname.trim() || joining} onClick={() => void joinRoom()}>{joining ? 'JOINING…' : 'JOIN ROOM'}</button>{error && <div role="alert" className="error">{error}</div>}</div> : <div className="card loading"><div className="spinner" /><h2>{error ? 'Room connection' : 'Finding your table…'}</h2><p className="muted">{error || 'Connecting securely to the game.'}</p>{error && <a className="btn secondary" href="/">Back to lobby</a>}</div>}</div></main>;

  const { room, me, players, properties, events, trades } = state;
  const activePlayer = players.find(player => player.id === room.current_player_id);
  const isTurn = room.current_player_id === me.id;
  const sharedHost = room.shared_screen && me.is_host;
  const tradingPlayerId = sharedHost ? (activePlayer?.id ?? me.id) : me.id;
  const actingPlayer = sharedHost ? activePlayer : players.find(player => player.id === me.id);
  const canAct = room.status === 'playing' && (isTurn || sharedHost) && !working;
  const pendingProperty = properties.find(property => property.board_index === room.pending_board_index);
  const winner = players.find(player => player.id === room.winner_player_id);
  const netWorth = (player: Player) => player.cash + properties.filter(property => property.owner_id === player.id).reduce((sum, property) => sum + property.price, 0);

  return <main className="page"><div className="shell">
    <header className="topbar"><a href="/" className="brand brand-lockup"><MalaysiaFlag className="malaysia-flag brand-flag" />KAYA <span>CAPITAL</span></a><div className="room-heading"><span className="pill">ROOM {room.code}</span>{room.status !== 'lobby' && <span className="pill">ROUND {Math.min(room.round,20)} / 20</span>}</div></header>
    {room.status === 'completed' && <section className="winner-banner"><div className="winner-crown">🏆</div><div><div className="eyebrow">TAUKE BESAR</div><h1>{winner?.avatar} {winner?.name}</h1><p>Final net worth RM {winner ? netWorth(winner).toLocaleString() : 0}</p></div></section>}
    {room.status === 'lobby' && <section className="lobby-banner card"><div><div className="eyebrow">YOUR TABLE IS READY</div><h1>Room <span>{room.code}</span></h1><p className="muted">Share the invite link or scan the code to bring your geng together.</p>{room.shared_screen && <span className="shared-badge">🖥 Shared-screen play enabled · pass the host device</span>}</div><div className="invite-tools"><div className="qr-card"><QRCodeSVG value={`${origin}/room/${room.code}`} size={104} /></div><button onClick={shareInvite} className="btn secondary">🔗 COPY INVITE LINK</button>{shareMessage && <span className="fine-print">{shareMessage}</span>}</div></section>}
    {room.status === 'lobby' && <section className="card lobby-players"><div className="section-title"><h2>Players</h2><span className="pill">{players.length} / 8</span></div><div className="player-grid">{players.map(player => <div className="lobby-player" key={player.id}><span className="player-avatar">{player.avatar}</span><span>{player.name}{player.id === me.id ? ' (you)' : ''}</span>{player.is_host && <span className="host-label">HOST</span>}</div>)}</div><div className="lobby-footer"><p className="muted">{players.length < 2 ? 'Waiting for one more player to start.' : 'Everyone in? The host can start the game.'}</p>{me.is_host && <button className="btn primary" disabled={players.length < 2 || working} onClick={() => post(`/api/rooms/${code}/start`)}>🎲 START GAME</button>}</div></section>}

    {room.status !== 'lobby' && <div className="game">
      <section className="board" aria-label="Kaya Capital game board">
        {tiles.map(({ boardIndex, gridIndex, space }) => {
          const property = properties.find(item => item.board_index === boardIndex);
          const owner = players.find(player => player.id === property?.owner_id);
          const tokens = players.filter(player => player.position === boardIndex);
          const corner = [0,4,8,12,16,20,24].includes(boardIndex);
          return <div key={boardIndex} className={`space ${corner ? 'corner' : ''} type-${space.type} ${room.pending_board_index === boardIndex ? 'pending-space' : ''}`} style={{ gridArea: `${Math.floor(gridIndex/5)+1} / ${gridIndex%5+1}` }}>
            <div className="space-name">{space.name}</div>
            <div className="price">{space.price ? `RM ${space.price}` : space.type === 'event' ? '🎴 EVENT' : ''}</div>
            {owner && <div className="owner-dot" title={`Owned by ${owner.name}`}>{owner.avatar}</div>}
            <div className="tokens">{tokens.map(player => <span title={player.name} key={player.id}>{player.avatar}</span>)}</div>
          </div>;
        })}
        <div className="center"><div><MalaysiaFlag className="malaysia-flag board-flag" /><div className="eyebrow">MALAYSIA • MONEY • MAYHEM</div><h2>KAYA <span>CAPITAL</span></h2><p className="muted">Build your kampung,<br />kacau your kawan.</p><div className="center-round">ROUND {Math.min(room.round,20)} / 20</div></div></div>
      </section>
      <aside className="sidebar">
        <section className="card turn-card"><div className="section-title"><span className="eyebrow">{room.status === 'completed' ? 'MATCH COMPLETE' : 'CURRENT TURN'}</span><span className="turn-dot" /></div><h2>{activePlayer ? `${activePlayer.avatar} ${activePlayer.name}` : 'Final standings'}</h2>{activePlayer && <p className="muted">{isTurn ? 'Your turn — make it count.' : 'Taking their turn…'}</p>}
          {canAct && <div className="controls">
            {room.pending_board_index !== null ? <><div className="pending-callout">Available: <b>{BOARD[room.pending_board_index]?.name}</b> · RM {pendingProperty?.price}</div><button className="btn primary" disabled={working || !pendingProperty || (actingPlayer?.cash ?? 0) < pendingProperty.price} onClick={() => post(`/api/rooms/${code}/action`, { action: 'buy' })}>🏠 BUY PROPERTY</button><button className="btn secondary" disabled={working} onClick={() => post(`/api/rooms/${code}/action`, { action: 'skip' })}>PASS</button></>
              : room.turn_rolled ? <button className="btn secondary" disabled={working} onClick={() => post(`/api/rooms/${code}/action`, { action: 'end_turn' })}>END TURN</button>
                : <button className="btn primary roll" disabled={working} onClick={() => post(`/api/rooms/${code}/action`, { action: 'roll' })}>🎲 ROLL DICE</button>}
          </div>}
          {room.status === 'playing' && !isTurn && <div className="mobile-hint">Open this room on your phone to follow along or share this screen with everyone.</div>}
        </section>
        <section className="card"><div className="section-title"><h3>Standings</h3><span className="muted">NET WORTH</span></div>{players.map(player => <div className={`player ${player.id === room.current_player_id ? 'active-player' : ''}`} key={player.id}><span>{player.avatar} {player.name}{player.id === me.id ? ' · you' : ''}</span><span className="cash">RM {room.status === 'completed' ? netWorth(player).toLocaleString() : player.cash.toLocaleString()}</span></div>)}</section>
        {room.status === 'playing' && <section className="card"><h3>Make a deal</h3><p className="muted small">Offer and request cash or a location from another player.</p><div className="trade-form"><select aria-label="Trade partner" className="input" value={tradeTarget} onChange={event => { setTradeTarget(event.target.value); setRequestProperty('-1'); }}><option value="">Choose player</option>{players.filter(player => player.id !== tradingPlayerId).map(player => <option key={player.id} value={player.id}>{player.avatar} {player.name}</option>)}</select><input aria-label="Cash to offer in RM" className="input" type="number" min="0" placeholder="Cash you offer (RM)" value={tradeCash} onChange={event => setTradeCash(event.target.value)} /><select aria-label="Property to offer" className="input" value={tradeProperty} onChange={event => setTradeProperty(event.target.value)}><option value="-1">No property offered</option>{properties.filter(property => property.owner_id === tradingPlayerId).map(property => <option key={property.board_index} value={property.board_index}>{BOARD[property.board_index].name}</option>)}</select><input aria-label="Cash to request in RM" className="input" type="number" min="0" placeholder="Cash you request (RM)" value={requestCash} onChange={event => setRequestCash(event.target.value)} /><select aria-label="Property to request" className="input" value={requestProperty} onChange={event => setRequestProperty(event.target.value)}><option value="-1">No property requested</option>{properties.filter(property => property.owner_id === tradeTarget).map(property => <option key={property.board_index} value={property.board_index}>{BOARD[property.board_index].name}</option>)}</select><button className="btn secondary" disabled={!tradeTarget || working || (!isTurn && !sharedHost)} onClick={() => post(`/api/rooms/${code}/trade`, { target: tradeTarget, offer: { cash: Number(tradeCash || 0), propertyIndex: Number(tradeProperty), requestCash: Number(requestCash || 0), requestPropertyIndex: Number(requestProperty) } })}>OFFER TRADE</button></div>
          {trades.filter(trade => trade.to_player === tradingPlayerId).map(trade => { const from = players.find(player => player.id === trade.from_player); return <div className="trade-inbox" key={trade.id}><span>{from?.name} offers RM {trade.offer.cash ?? 0}{trade.offer.propertyIndex !== undefined && trade.offer.propertyIndex >= 0 ? ` + ${BOARD[trade.offer.propertyIndex].name}` : ''} for RM {trade.offer.requestCash ?? 0}{trade.offer.requestPropertyIndex !== undefined && trade.offer.requestPropertyIndex >= 0 ? ` + ${BOARD[trade.offer.requestPropertyIndex].name}` : ''}</span><button className="btn primary mini" disabled={working} onClick={() => post(`/api/rooms/${code}/trade`, { target: trade.from_player, accept: true, offer: { tradeId: trade.id } })}>ACCEPT</button></div>; })}
        </section>}
        <section className="card"><div className="section-title"><h3>Game log</h3><span className="live-label">● LIVE</span></div><div className="log">{events.length ? events.map(event => <div className="log-entry" key={event.id}>{event.payload.message || (event.event_type === 'joined' ? `${event.payload.name} joined the room.` : event.event_type === 'bought' ? 'A player bought a property.' : event.event_type === 'started' ? 'The game is on!' : event.event_type === 'completed' ? 'The game has ended!' : event.event_type === 'trade_offer' ? 'A trade offer was sent.' : 'A turn ended.')}</div>) : <div className="muted">Waiting for the first move…</div>}</div></section>
      </aside>
    </div>}
    {error && <div role="alert" className="toast-error">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    <footer className="footer">Produced by <a href="https://github.com/garethltm" target="_blank" rel="noopener noreferrer">@garethltm</a></footer>
  </div></main>;
}
