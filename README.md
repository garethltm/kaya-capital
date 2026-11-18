# 🇲🇾 Kaya Capital

A Malaysian-themed digital party board game inspired by the room/lobby model of outLIAR. This repository is a **general game-layout starter**: it contains the UI direction, board model, room route, Supabase schema and project structure so the game engine can be built on top.

## Stack
- Next.js + React + TypeScript
- Supabase (planned realtime game state/database)
- Vercel deployment

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Deploy to GitHub / Vercel
1. Create a new GitHub repository.
2. Upload/push this folder.
3. Import the repository into Vercel.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Run `supabase/schema.sql` in the Supabase SQL editor.

## Planned game flow
Create room → Lobby → QR/code join → Host starts → Turn → Roll → Resolve space → Buy/pay/event/trade → Next player → Round 20 → Final wealth calculation.

## Important next implementation
The demo currently uses local React state for the dice/board. Replace this with server-authoritative Supabase game actions before multiplayer release. The client should never be allowed to directly decide cash, property ownership, turn order or game results.
