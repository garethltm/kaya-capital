# Kaya Capital — Approved Project Plan

## Product

Build a Malaysia-themed online party board game for friends. The working product name remains **Kaya Capital**; the description/tagline is **“Build your kampung, kacau your kawan.”**

Use the linked outLIAR project as inspiration for room creation, lobbies, invite links/codes, and synchronized multiplayer state. Create original board-game rules, artwork, location names, events, and interface copy rather than reproducing outLIAR or Monopoly content.

## Approved MVP requirements

- Responsive browser experience that works well on phones and can also be displayed on a shared screen. Players can use individual devices or play in shared-screen mode.
- Online rooms for 2–8 players, with private rooms joined by invite link/code or QR and public matchmaking.
- Players can join with a nickname and avatar, see the lobby/player list, and start when the room is ready.
- Turn-based Malaysian property-trading gameplay: roll dice, move around an original board, buy available locations, pay fees/rent, resolve event spaces, and trade or use playful actions to kacau other players.
- A match lasts up to 20 rounds. At the end, calculate net worth and declare the player with the highest net worth the winner.
- A clear game log, current-turn indicator, standings, and end-of-game results.
- Malaysian themes and humour should be welcoming and understandable without requiring local cultural knowledge.

## Existing workspace and implementation direction

Extend the existing Kaya Capital prototype rather than replacing it. The workspace already contains a Next.js/React/TypeScript UI, a Malaysian-themed board model, room route, Supabase schema draft, and layout notes.

- Preserve the current Next.js + React + TypeScript stack and use Supabase for persistence and realtime room/game state.
- Keep room membership and game state synchronized across devices.
- Make game transitions server-authoritative. Validate turns, dice/movement, cash, property ownership, trades, matchmaking, and match completion on the server; clients must not directly write trusted game outcomes.
- Define and enable appropriate Supabase row-level security and use narrowly scoped server-side operations for privileged actions. Do not expose service-role credentials to the client.
- Provide clear loading, empty, invalid-code, room-full, disconnected/rejoined, and completed-game states.
- Keep deployment compatible with the existing Vercel-oriented setup.

## Acceptance criteria

1. A player can create a private room and another can join it using its code or invite link; the room supports up to eight players.
2. Players can find or join a public match and see the same lobby and game state on their devices.
3. A valid host can start a room and turns advance in order. Illegal, stale, or out-of-turn actions do not alter authoritative game state.
4. Dice movement, property purchase/payment, event resolution, trading, and the 20-round completion/winner calculation work end-to-end.
5. A game can be played from a phone-sized browser and from a shared-screen layout without losing access to player controls.
6. Supabase security rules prevent clients from directly changing trusted balances, ownership, turn order, or final results.
7. The project builds successfully and the core room/game flows have focused tests or documented verification.

## Out of scope for the first version

- Native iOS/Android applications.
- Real-money wagering, purchases, or prizes.
- Reproducing proprietary Monopoly branding, board layout, wording, or assets.
- Persistent cross-match progression or ranked seasons.
