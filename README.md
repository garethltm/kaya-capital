# 🇲🇾 Kaya Capital

**Produced by [@garethltm](https://github.com/garethltm).** **Build your kampung, kacau your kawan.** A Malaysia-themed online party property game for 2–8 players. Play from individual phones or enable shared-screen mode to pass one device around. Original game rules, locations and events; no real-money wagering.

## Run locally

1. Install Node.js 20+ and a Supabase project.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Keep the service-role key server-only; never use a `NEXT_PUBLIC_` prefix for it.
3. Run `supabase/schema.sql` in the Supabase SQL editor as project owner. The schema enables RLS, grants no direct client table access, and exposes only validated RPCs to the server's service role. Re-run the updated schema after backend changes to apply password protection, seat recovery, concession and host end-game support.
4. Run `npm install` then `npm run dev`, and open `http://localhost:3000`.

The Supabase anon key is not used by the current server-mediated API; it remains in `.env.example` for future client-side Realtime integration. Room state is refreshed through the authenticated same-origin API. A room session token is HttpOnly, stored as a SHA-256 digest in the database, and all trusted game actions execute in database transactions.

## Game flow

Create a password-protected private room and share its invite link/QR or code, or host/join a public lobby. Save the player recovery code shown in the room so you can restore the same seat if your session is lost. The host starts with at least two players. On each turn, the server rolls the die, updates movement, resolves event spaces/rent and allows a property purchase. Players can offer cash/property trades or concede; the host can end the match early. The match ends after 20 rounds and ranks active players by cash plus owned property values.

## Security notes

- Never put `SUPABASE_SERVICE_ROLE_KEY` in browser code or deploy it as a public environment variable.
- RLS is enabled on all game tables and anon/authenticated direct access is revoked. API reads require a room session; RPCs validate room membership, host authority, turn order, available cash, ownership and game phase.
- Private-room passwords and player recovery codes are never stored in plaintext in the database. Treat the recovery code like a password; anyone with it, the player nickname and the room password (for private rooms) can restore that seat.
- The database RPCs are the sole authority for dice, movement, balances, property ownership, round advancement and winner selection.

## Deploy

Deploy the Next.js app to Vercel and configure the two required server environment values. Apply schema changes before shipping the app. No Azure resources are required.
