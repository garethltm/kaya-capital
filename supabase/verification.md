# Manual game-flow verification

Apply `schema.sql` to a disposable Supabase project, configure the local server env values, then:

1. Start two separate browser profiles. Create a private room in one; join the other by code or the QR/invite link. Confirm the lobby displays both players and rejects an additional ninth player. Also create a shared-screen room and confirm the host can take each turn for the active player.
2. Confirm a non-host cannot start; host can start with two or more players; all clients show the same current turn and round.
3. On the active browser, roll once. Confirm a second roll and an out-of-turn roll are rejected. Buy or skip an unowned location; confirm cash/property and event/rent logs synchronize on the other client.
4. Propose a cash/property exchange, accept it from the other browser, and verify both sides transfer once. Try an unaffordable or unowned offer and confirm no state changes.
5. Advance turns through 20 rounds; confirm completion and winner match the cash + owned-property standings. Confirm the UI scales down to phone width and shared-screen width.
6. With anon/authenticated credentials, verify direct reads and writes to game tables are denied. Confirm protected API calls without a room cookie return 401.

The SQL database flow requires a configured Supabase project; it is not exercised by the static app build.
