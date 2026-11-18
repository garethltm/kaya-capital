'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { BOARD } from '@/lib/board';
import MalaysiaFlag from '@/components/MalaysiaFlag';

type Player = { id: string; name: string; avatar: string; cash: number; position: number; is_host: boolean; status: 'active' | 'conceded' };
type RoomState = {
  room: { id: string; code: string; status: 'lobby' | 'playing' | 'completed'; shared_screen: boolean; host_player_id: string; current_player_id: string | null; pending_board_index: number | null; turn_rolled: boolean; round: number; winner_player_id: string | null };
  me: { id: string; name: string; avatar: string; is_host: boolean; status: 'active' | 'conceded' };
  players: Player[];
  properties: { board_index: number; owner_id: string | null; price: number; group_name: string }[];
  events: { id: number | string; player_id: string | null; event_type: string; payload: { message?: string; name?: string; roll?: number }; created_at: string }[];
  trades: { id: string; from_player: string; to_player: string; offer: { cash?: number; propertyIndex?: number; requestCash?: number; requestPropertyIndex?: number } }[];
};

type BoardSlot = { row: number; column: number; side: 'top' | 'right' | 'bottom' | 'left'; rowSpan?: number; columnSpan?: number; corner?: boolean };

const boardSlots: BoardSlot[] = [
  { row: 7, column: 8, side: 'bottom', corner: true },
  { row: 7, column: 7, side: 'bottom' },
  { row: 7, column: 6, side: 'bottom' },
  { row: 7, column: 5, side: 'bottom' },
  { row: 7, column: 4, side: 'bottom' },
  { row: 7, column: 3, side: 'bottom' },
  { row: 7, column: 2, side: 'bottom' },
  { row: 7, column: 1, side: 'bottom', corner: true },
  { row: 6, column: 1, side: 'left' },
  { row: 5, column: 1, side: 'left' },
  { row: 4, column: 1, side: 'left' },
  { row: 3, column: 1, side: 'left' },
  { row: 2, column: 1, side: 'left' },
  { row: 1, column: 1, side: 'top', corner: true },
  { row: 1, column: 2, side: 'top' },
  { row: 1, column: 3, side: 'top' },
  { row: 1, column: 4, side: 'top' },
  { row: 1, column: 5, side: 'top' },
  { row: 1, column: 6, side: 'top' },
  { row: 1, column: 7, side: 'top' },
  { row: 1, column: 8, side: 'top', corner: true },
  { row: 2, column: 8, side: 'right' },
  { row: 3, column: 8, side: 'right' },
  { row: 4, column: 8, side: 'right', rowSpan: 2 },
  { row: 6, column: 8, side: 'right' },
];

const groupColors: Record<string, string> = {
  Local: '#4f9d8b',
  KL: '#dc765f',
  North: '#658fc1',
  Melaka: '#bf8a51',
  Islands: '#50a6a0',
  Sabah: '#9775bd',
  Icons: '#d1a936',
  Sarawak: '#71985b',
};

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code || '').toUpperCase();
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [needsJoin, setNeedsJoin] = useState(false);
  const [nickname, setNickname] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [joining, setJoining] = useState(false);
  const [working, setWorking] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
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
          setState(null);
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
    try {
      setRecoveryCode(window.localStorage.getItem(`kc_recovery_${code}`) ?? '');
    } catch {
      setError('This browser blocked local storage. Keep your recovery code somewhere safe.');
    }
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

  function rollDice() {
    setDiceRolling(true);
    window.setTimeout(() => setDiceRolling(false), 1000);
    void post(`/api/rooms/${code}/action`, { action: 'roll' });
  }

  async function joinRoom() {
    setJoining(true); setError('');
    try {
      const restoring = Boolean(recoveryInput.trim());
      const response = await fetch(restoring ? '/api/rooms/recover' : '/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: nickname.trim(), avatar: '🧑‍💼', password: roomPassword, recoveryCode: recoveryInput.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (restoring ? 'Could not restore your player seat.' : 'Could not join this room.'));
      setRecoveryCode(data.recoveryCode ?? '');
      if (data.recoveryCode) {
        try {
          window.localStorage.setItem(`kc_recovery_${code}`, data.recoveryCode);
        } catch {
          setRecoveryMessage('Copy the recovery code below; this browser could not save it.');
        }
      }
      setNeedsJoin(false);
      setRecoveryInput('');
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not join this room.'); }
    finally { setJoining(false); }
  }

  async function copyRecoveryCode() {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setRecoveryMessage('Recovery code copied.');
    } catch {
      setRecoveryMessage('Copy is unavailable here. Select and save the code shown above.');
    }
    window.setTimeout(() => setRecoveryMessage(''), 3500);
  }

  async function shareInvite() {
    const url = `${window.location.origin}/room/${code}`;
    try { await navigator.clipboard.writeText(url); setShareMessage('Invite link copied!'); }
    catch { setShareMessage(url); }
    window.setTimeout(() => setShareMessage(''), 3500);
  }

  const tiles = useMemo(() => {
    return BOARD.map((space, boardIndex) => ({ boardIndex, space, slot: boardSlots[boardIndex] }));
  }, []);

  if (!state) return <main className="page"><div className="shell"><header className="topbar"><a href="/" className="brand brand-lockup"><MalaysiaFlag className="malaysia-flag brand-flag" />KAYA <span>CAPITAL</span></a><span className="pill">ROOM {code}</span></header>{needsJoin ? <div className="card loading"><div className="eyebrow">JOIN YOUR GENG</div><h2>Room {code}</h2><p className="muted">Join the lobby, or restore your old seat if you were disconnected. Private rooms need their room password.</p><label className="label" htmlFor="room-nickname">YOUR NICKNAME</label><input id="room-nickname" className="input" maxLength={18} autoComplete="nickname" value={nickname} onChange={event => setNickname(event.target.value)} /><label className="label" htmlFor="room-password">ROOM PASSWORD</label><input id="room-password" className="input" type="password" autoComplete="current-password" maxLength={72} value={roomPassword} onChange={event => setRoomPassword(event.target.value)} /><label className="label" htmlFor="recovery-code">PLAYER RECOVERY CODE <span className="muted">(to restore an existing seat)</span></label><input id="recovery-code" className="input" autoComplete="off" value={recoveryInput} onChange={event => setRecoveryInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && nickname.trim() && !joining) void joinRoom(); }} /><button className="btn primary" disabled={!nickname.trim() || joining} onClick={() => void joinRoom()}>{joining ? 'CONNECTING…' : recoveryInput.trim() ? 'RESTORE MY SEAT' : 'JOIN ROOM'}</button>{error && <div role="alert" className="error">{error}</div>}</div> : <div className="card loading"><div className="spinner" /><h2>{error ? 'Room connection' : 'Finding your table…'}</h2><p className="muted">{error || 'Connecting securely to the game.'}</p>{error && <a className="btn secondary" href="/">Back to lobby</a>}</div>}</div></main>;

  const { room, me, players, properties, events, trades } = state;
  const activePlayer = players.find(player => player.id === room.current_player_id && player.status === 'active');
  const isTurn = room.current_player_id === me.id && me.status === 'active';
  const sharedHost = room.shared_screen && me.is_host;
  const tradingPlayerId = sharedHost ? (activePlayer?.id ?? me.id) : me.id;
  const actingPlayer = sharedHost ? activePlayer : players.find(player => player.id === me.id);
  const canAct = room.status === 'playing' && Boolean(activePlayer) && (isTurn || sharedHost) && !working;
  const canConcede = room.status === 'playing' && (me.status === 'active' || sharedHost);
  const pendingProperty = properties.find(property => property.board_index === room.pending_board_index);
  const winner = players.find(player => player.id === room.winner_player_id);
  const netWorth = (player: Player) => player.cash + properties.filter(property => property.owner_id === player.id).reduce((sum, property) => sum + property.price, 0);
  const latestRoll = events.find(event => event.event_type === 'roll');
  const lastRollValue = typeof latestRoll?.payload.roll === 'number' ? latestRoll.payload.roll : null;
  const lastRoller = players.find(player => player.id === latestRoll?.player_id);
  const portfolios = players.map(player => {
    const holdings = properties.filter(property => property.owner_id === player.id).sort((a, b) => a.board_index - b.board_index);
    const propertyValue = holdings.reduce((sum, property) => sum + property.price, 0);
    return { player, holdings, propertyValue, netWorth: player.cash + propertyValue };
  });

  return <main className="page"><div className="shell">
    <header className="topbar"><a href="/" className="brand brand-lockup"><MalaysiaFlag className="malaysia-flag brand-flag" />KAYA <span>CAPITAL</span></a><div className="room-heading"><span className="pill">ROOM {room.code}</span>{room.status !== 'lobby' && <span className="pill">ROUND {Math.min(room.round,20)} / 20</span>}</div></header>
    {room.status === 'completed' && <section className="winner-banner"><div className="winner-crown">🏆</div><div><div className="eyebrow">TAUKE BESAR</div><h1>{winner ? `${winner.avatar} ${winner.name}` : 'No winner'}</h1><p>{winner ? `Final net worth RM ${netWorth(winner).toLocaleString()}` : 'Everyone conceded the match.'}</p></div></section>}
    {room.status === 'lobby' && <section className="lobby-banner card"><div><div className="eyebrow">YOUR TABLE IS READY</div><h1>Room <span>{room.code}</span></h1><p className="muted">Share the invite link or scan the code to bring your geng together.</p>{room.shared_screen && <span className="shared-badge">🖥 Shared-screen play enabled · pass the host device</span>}</div><div className="invite-tools"><div className="qr-card"><QRCodeSVG value={`${origin}/room/${room.code}`} size={104} /></div><button onClick={shareInvite} className="btn secondary">🔗 COPY INVITE LINK</button>{shareMessage && <span className="fine-print">{shareMessage}</span>}</div></section>}
    {recoveryCode && <section className="recovery-bar"><div><b>Player recovery code</b><span>Save this to restore your seat on another device.</span></div><code>{recoveryCode}</code><button className="btn secondary" onClick={() => void copyRecoveryCode()}>COPY CODE</button>{recoveryMessage && <small aria-live="polite">{recoveryMessage}</small>}</section>}
    {room.status === 'lobby' && <section className="card lobby-players"><div className="section-title"><h2>Players</h2><span className="pill">{players.length} / 8</span></div><div className="player-grid">{players.map(player => <div className="lobby-player" key={player.id}><span className="player-avatar">{player.avatar}</span><span>{player.name}{player.id === me.id ? ' (you)' : ''}</span>{player.is_host && <span className="host-label">HOST</span>}</div>)}</div><div className="lobby-footer"><p className="muted">{players.length < 2 ? 'Waiting for one more player to start.' : 'Everyone in? The host can start the game.'}</p>{me.is_host && <button className="btn primary" disabled={players.filter(player => player.status === 'active').length < 2 || working} onClick={() => post(`/api/rooms/${code}/start`)}>🎲 START GAME</button>}</div></section>}

    {room.status !== 'lobby' && <div className="game">
      <section className="game-board" aria-label="Kaya Capital game board">
        {tiles.map(({ boardIndex, space, slot }) => {
          const property = properties.find(item => item.board_index === boardIndex);
          const owner = players.find(player => player.id === property?.owner_id);
          const tokens = players.filter(player => player.position === boardIndex);
          const icon = space.type === 'start' ? '🏁'
            : space.type === 'event' ? '🎴'
              : space.name === 'Balai' ? '🏛️'
                : space.name === 'Roadblock' ? '🚧'
                  : space.name === 'Tutup Kedai' ? '🛍️' : '';
          return <div
            key={boardIndex}
            className={`board-space side-${slot.side} type-${space.type} ${slot.corner ? 'is-corner' : ''} ${room.pending_board_index === boardIndex ? 'is-pending' : ''}`}
            style={{
              gridRow: `${slot.row} / span ${slot.rowSpan ?? 1}`,
              gridColumn: `${slot.column} / span ${slot.columnSpan ?? 1}`,
            }}
          >
            {space.type === 'property' && <div className="property-band" style={{ backgroundColor: groupColors[space.group ?? ''] ?? '#86928b' }} />}
            <div className="board-space-content">
              <div className="tile-kicker">{space.type === 'property' ? space.group : space.type === 'event' ? 'EVENT' : space.type === 'special' ? 'KACAU' : 'START'}</div>
              {icon && <div className="tile-icon" aria-hidden="true">{icon}</div>}
              <div className="space-name">{space.name}</div>
              {space.price && <div className="price">RM {space.price}</div>}
              {owner && <div className="tile-owner">{owner.avatar} {owner.name}</div>}
              <div className="tokens">{tokens.map(player => <span title={player.name} key={player.id}>{player.avatar}</span>)}</div>
            </div>
          </div>;
        })}
        <div className="board-center" style={{ gridArea: '2 / 2 / 7 / 8' }}>
          <div className="board-center-brand">
            <MalaysiaFlag className="malaysia-flag board-flag" />
            <div className="eyebrow">MALAYSIA • MONEY • MAYHEM</div>
            <h2>KAYA <span>CAPITAL</span></h2>
            <p>Build your kampung, kacau your kawan.</p>
          </div>
          <div className={`dice-display ${diceRolling ? 'is-rolling' : ''}`}>
            <div className="die-face" role="img" aria-label={lastRollValue ? `Last dice roll: ${lastRollValue}` : 'Dice have not been rolled yet'}>
              <span>{lastRollValue ?? '🎲'}</span>
            </div>
            <div className="dice-copy" aria-live="polite">{diceRolling ? 'The dice are tumbling…' : lastRollValue ? `${lastRoller?.name ?? 'A player'} rolled ${lastRollValue}` : 'Roll the die to start'}</div>
          </div>
          <div className="board-center-meta">
            <div><small>ROUND</small><strong>{Math.min(room.round,20)} / 20</strong></div>
            <div><small>UP NEXT</small><strong>{activePlayer?.name ?? 'Match complete'}</strong></div>
          </div>
        </div>
      </section>
      <aside className="sidebar">
        <section className="card turn-card"><div className="section-title"><span className="eyebrow">{room.status === 'completed' ? 'MATCH COMPLETE' : 'CURRENT TURN'}</span><span className="turn-dot" /></div><h2>{activePlayer ? `${activePlayer.avatar} ${activePlayer.name}` : 'Final standings'}</h2>{activePlayer && <p className="muted">{isTurn ? 'Your turn — make it count.' : 'Taking their turn…'}</p>}
          {canAct && <div className="controls">
            {room.pending_board_index !== null ? <><div className="pending-callout">Available: <b>{BOARD[room.pending_board_index]?.name}</b> · RM {pendingProperty?.price}</div><button className="btn primary" disabled={working || !pendingProperty || (actingPlayer?.cash ?? 0) < pendingProperty.price} onClick={() => post(`/api/rooms/${code}/action`, { action: 'buy' })}>🏠 BUY PROPERTY</button><button className="btn secondary" disabled={working} onClick={() => post(`/api/rooms/${code}/action`, { action: 'skip' })}>PASS</button></>
              : room.turn_rolled ? <button className="btn secondary" disabled={working} onClick={() => post(`/api/rooms/${code}/action`, { action: 'end_turn' })}>END TURN</button>
                : <button className="btn primary roll" disabled={working} onClick={rollDice}>🎲 ROLL DICE</button>}
          </div>}
          {room.status === 'playing' && !isTurn && <div className="mobile-hint">Open this room on your phone to follow along or share this screen with everyone.</div>}
        </section>
        <section className="card"><div className="section-title"><h3>Standings</h3><span className="muted">NET WORTH</span></div>{players.map(player => <div className={`player ${player.id === room.current_player_id ? 'active-player' : ''} ${player.status === 'conceded' ? 'conceded-player' : ''}`} key={player.id}><span>{player.avatar} {player.name}{player.id === me.id ? ' · you' : ''}{player.status === 'conceded' ? ' · CONCEDED' : ''}</span><span className="cash">RM {netWorth(player).toLocaleString()}</span></div>)}</section>
        <section className="card portfolio-card">
          <div className="section-title"><h3>Property portfolios</h3><span className="muted">{properties.filter(property => property.owner_id).length} owned</span></div>
          <div className="portfolio-list">
            {portfolios.map(({ player, holdings, propertyValue, netWorth: totalWorth }) => (
              <article className={`portfolio-player ${player.id === room.current_player_id ? 'portfolio-active' : ''}`} key={player.id}>
                <div className="portfolio-heading">
                  <div className="portfolio-owner"><span className="portfolio-avatar">{player.avatar}</span><div><strong>{player.name}</strong><small>{holdings.length} {holdings.length === 1 ? 'property' : 'properties'}</small></div></div>
                  <strong className="portfolio-total">RM {totalWorth.toLocaleString()}</strong>
                </div>
                <div className="portfolio-breakdown"><span>Cash <b>RM {player.cash.toLocaleString()}</b></span><span>Land <b>RM {propertyValue.toLocaleString()}</b></span></div>
                {player.status === 'conceded' && <span className="conceded-label">CONCEDED</span>}
                {holdings.length ? <div className="portfolio-properties">{holdings.map(property => (
                  <div className="portfolio-property" key={property.board_index}>
                    <span className="portfolio-swatch" style={{ backgroundColor: groupColors[property.group_name] ?? '#86928b' }} />
                    <span>{BOARD[property.board_index]?.name ?? 'Unknown property'}</span>
                    <b>RM {property.price.toLocaleString()}</b>
                  </div>
                ))}</div> : <p className="portfolio-empty">No properties held yet.</p>}
              </article>
            ))}
          </div>
        </section>
        {room.status === 'playing' && <section className="card"><h3>Make a deal</h3><p className="muted small">Offer and request cash or a location from another player.</p><div className="trade-form"><select aria-label="Trade partner" className="input" value={tradeTarget} onChange={event => { setTradeTarget(event.target.value); setRequestProperty('-1'); }}><option value="">Choose player</option>{players.filter(player => player.id !== tradingPlayerId).map(player => <option key={player.id} value={player.id}>{player.avatar} {player.name}</option>)}</select><input aria-label="Cash to offer in RM" className="input" type="number" min="0" placeholder="Cash you offer (RM)" value={tradeCash} onChange={event => setTradeCash(event.target.value)} /><select aria-label="Property to offer" className="input" value={tradeProperty} onChange={event => setTradeProperty(event.target.value)}><option value="-1">No property offered</option>{properties.filter(property => property.owner_id === tradingPlayerId).map(property => <option key={property.board_index} value={property.board_index}>{BOARD[property.board_index].name}</option>)}</select><input aria-label="Cash to request in RM" className="input" type="number" min="0" placeholder="Cash you request (RM)" value={requestCash} onChange={event => setRequestCash(event.target.value)} /><select aria-label="Property to request" className="input" value={requestProperty} onChange={event => setRequestProperty(event.target.value)}><option value="-1">No property requested</option>{properties.filter(property => property.owner_id === tradeTarget).map(property => <option key={property.board_index} value={property.board_index}>{BOARD[property.board_index].name}</option>)}</select><button className="btn secondary" disabled={!tradeTarget || working || (!isTurn && !sharedHost)} onClick={() => post(`/api/rooms/${code}/trade`, { target: tradeTarget, offer: { cash: Number(tradeCash || 0), propertyIndex: Number(tradeProperty), requestCash: Number(requestCash || 0), requestPropertyIndex: Number(requestProperty) } })}>OFFER TRADE</button></div>
          {trades.filter(trade => trade.to_player === tradingPlayerId).map(trade => { const from = players.find(player => player.id === trade.from_player); return <div className="trade-inbox" key={trade.id}><span>{from?.name} offers RM {trade.offer.cash ?? 0}{trade.offer.propertyIndex !== undefined && trade.offer.propertyIndex >= 0 ? ` + ${BOARD[trade.offer.propertyIndex].name}` : ''} for RM {trade.offer.requestCash ?? 0}{trade.offer.requestPropertyIndex !== undefined && trade.offer.requestPropertyIndex >= 0 ? ` + ${BOARD[trade.offer.requestPropertyIndex].name}` : ''}</span><button className="btn primary mini" disabled={working} onClick={() => post(`/api/rooms/${code}/trade`, { target: trade.from_player, accept: true, offer: { tradeId: trade.id } })}>ACCEPT</button></div>; })}
        </section>}
        {room.status === 'playing' && (canConcede || me.is_host) && <section className="card match-controls"><h3>Match controls</h3>{canConcede && <button className="btn secondary" disabled={working} onClick={() => { if (window.confirm(sharedHost ? 'Concede the current player seat? Their cash and properties will return to the bank.' : 'Concede this match? Your cash and properties will return to the bank.')) void post(`/api/rooms/${code}/concede`); }}>{sharedHost ? 'CONCEDE CURRENT SEAT' : 'CONCEDE THIS MATCH'}</button>}{me.is_host && <button className="btn danger" disabled={working} onClick={() => { if (window.confirm('End the match now? The active player with the highest net worth will win.')) void post(`/api/rooms/${code}/end`); }}>END GAME NOW</button>}<p className="muted small">{sharedHost ? 'Concede applies to the seat currently taking its turn.' : 'Conceding returns your properties to the bank and removes you from the match.'} The host can end the match early.</p></section>}
        <section className="card"><div className="section-title"><h3>Game log</h3><span className="live-label">● LIVE</span></div><div className="log">{events.length ? events.map(event => <div className="log-entry" key={event.id}>{event.payload.message || (event.event_type === 'joined' ? `${event.payload.name} joined the room.` : event.event_type === 'bought' ? 'A player bought a property.' : event.event_type === 'started' ? 'The game is on!' : event.event_type === 'completed' ? 'The game has ended!' : event.event_type === 'trade_offer' ? 'A trade offer was sent.' : 'A turn ended.')}</div>) : <div className="muted">Waiting for the first move…</div>}</div></section>
      </aside>
    </div>}
    {error && <div role="alert" className="toast-error">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    <footer className="footer">Produced by <a href="https://github.com/garethltm" target="_blank" rel="noopener noreferrer">@garethltm</a></footer>
  </div></main>;
}
