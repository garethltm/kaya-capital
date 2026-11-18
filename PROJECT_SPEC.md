# Kaya Capital — General Game Layout

## Screens
1. Landing — Create Room / Join Room
2. Host Room — room code + QR + player lobby
3. Player Lobby — nickname/avatar + ready state
4. Main Game — perimeter-style board for shared-screen or phone play, animated dice, standings and property portfolios
5. Property Modal — buy / decline / inspect
6. Event Modal — Malaysia Problems / Kacau card
7. Trade Modal — offer cash + properties
8. Round Summary — transactions, events and standings
9. Final Results — Tauke Besar reveal

## Core entities
- Room
- Player
- Board Space
- Property
- Turn
- Game Event
- Trade
- Game Log

## Design principles
- Mobile-first player controls
- Shared-screen board for parties
- 20-round target
- Fast animations and short decisions
- Clear property ownership portfolios alongside the board
- Server-authoritative multiplayer state
- Password-protected private rooms and player recovery codes for reconnecting
- Player concession returns assets to the bank; the host can end a match early
- Malaysian humour without requiring cultural knowledge to understand rules
