'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MalaysiaFlag from '@/components/MalaysiaFlag';

const avatars = ['🧑‍💼', '🏍️', '🍜', '🦎', '🐯', '🧋', '🧑‍🎓', '🦜'];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(avatars[0]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [pendingRoom, setPendingRoom] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [sharedScreen, setSharedScreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(kind: 'create' | 'join' | 'public' | 'hostPublic') {
    setBusy(true); setError('');
    try {
      const endpoint = kind === 'create' || kind === 'hostPublic' ? '/api/rooms' : kind === 'join' ? '/api/rooms/join' : '/api/matchmaking';
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, avatar, code: code.trim().toUpperCase(), public: kind === 'hostPublic', shared: sharedScreen, password: kind === 'create' || kind === 'join' ? password : undefined }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not join right now.');
      if (result.recoveryCode) {
        try {
          window.localStorage.setItem(`kc_recovery_${result.code}`, result.recoveryCode);
        } catch {
          setPendingRoom(result.code);
          setRecoveryCode(result.recoveryCode);
          setError('Your room is ready, but this browser could not save the recovery code. Copy it before continuing.');
          return;
        }
      }
      router.push(`/room/${result.code}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  async function copyRecoveryCode() {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setRecoveryMessage('Recovery code copied.');
    } catch {
      setRecoveryMessage('Copy is unavailable here. Select and save the code shown above.');
    }
  }

  return <main className="page"><div className="shell">
    <header className="topbar"><a href="/" className="brand brand-lockup"><MalaysiaFlag className="malaysia-flag brand-flag" />KAYA <span>CAPITAL</span></a><span className="pill">A MALAYSIAN PARTY GAME</span></header>
    <section className="hero">
      <MalaysiaFlag className="malaysia-flag hero-flag" />
      <div className="eyebrow">🎲 &nbsp; GATHER YOUR GENG</div>
      <h1>Build your <span>kampung,</span><br />kacau your kawan.</h1>
      <p>Buy iconic places, make questionable deals and ride out the chaos. Highest net worth after 20 rounds becomes Tauke Besar.</p>
    </section>
    <section className="lobby-form card">
      <div><label className="label" htmlFor="nickname">YOUR NICKNAME</label><input id="nickname" className="input" maxLength={18} placeholder="e.g. Teh Tarik Tycoon" value={name} onChange={event => setName(event.target.value)} /></div>
      <div><label className="label" htmlFor="room-password">PRIVATE ROOM PASSWORD</label><input id="room-password" className="input" type="password" autoComplete="new-password" maxLength={72} placeholder="At least 8 characters to create a private room" value={password} onChange={event => setPassword(event.target.value)} /><small className="muted">Required to create or join private rooms. Public games do not use it.</small></div>
      <div><span className="label">PICK YOUR AVATAR</span><div className="avatars">{avatars.map(item => <button type="button" aria-label={`Choose ${item}`} aria-pressed={avatar === item} className={`avatar ${avatar === item ? 'selected' : ''}`} onClick={() => setAvatar(item)} key={item}>{item}</button>)}</div></div>
      <label className="shared-choice"><input type="checkbox" checked={sharedScreen} onChange={event => setSharedScreen(event.target.checked)} /><span><b>Play together on this screen</b><small>Pass one device around; the host can take each turn.</small></span></label>
      <div className="room-actions">
        <button className="btn primary" disabled={!name.trim() || password.trim().length < 8 || busy} onClick={() => submit('create')}>{busy ? 'ONE SEC…' : '＋ CREATE PRIVATE ROOM'}</button>
        <button className="btn secondary" disabled={!name.trim() || busy} onClick={() => submit('hostPublic')}>🌐 &nbsp; HOST A PUBLIC MATCH</button>
        <div className="join-row"><input className="input" aria-label="Room code" maxLength={6} placeholder="ROOM CODE" value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /><button className="btn secondary" disabled={!name.trim() || code.length < 4 || busy} onClick={() => submit('join')}>JOIN ROOM</button></div>
        <button className="btn secondary" disabled={!name.trim() || busy} onClick={() => submit('public')}>🌐 &nbsp; FIND A PUBLIC GAME</button>
      </div>
      {error && <div role="alert" className="error">{error}</div>}
      {pendingRoom && recoveryCode && <div className="recovery-callout"><b>Your recovery code</b><code>{recoveryCode}</code><button className="btn secondary" onClick={() => void copyRecoveryCode()}>COPY CODE</button>{recoveryMessage && <small aria-live="polite">{recoveryMessage}</small>}<button className="btn primary" onClick={() => router.push(`/room/${pendingRoom}`)}>CONTINUE TO ROOM</button></div>}
      <p className="fine-print">2–8 players · Invite your friends · No real money, just bragging rights</p>
    </section>
    <section className="grid features">
      <article className="card feature"><div className="feature-icon"><MalaysiaFlag className="malaysia-flag feature-flag" /></div><h3>From pasar malam to KLCC</h3><p className="muted">A fresh board inspired by the places, food and everyday surprises of Malaysia.</p></article>
      <article className="card feature"><div className="feature-icon">⚡</div><h3>Twenty rounds. Big decisions.</h3><p className="muted">Quick turns, shifting fortunes and a proper finish. No endless board-game night.</p></article>
      <article className="card feature"><div className="feature-icon">🤝</div><h3>Negotiate. Then kacau.</h3><p className="muted">Swap property, make deals and see who comes out on top.</p></article>
    </section>
    <footer className="footer">Produced by <a href="https://github.com/garethltm" target="_blank" rel="noopener noreferrer">@garethltm</a> · Built for phones around a table and big screens across the room.</footer>
  </div></main>;
}
