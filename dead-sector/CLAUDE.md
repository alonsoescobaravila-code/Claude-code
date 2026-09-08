# DEAD SECTOR — Roblox project

## What this is
Cooperative zombie survival. Players level up, level up weapons, and unlock
sectors. Sectors open when the WHOLE SERVER reaches a shared kill threshold.

## Stack
- Luau. Roblox Studio + Script Sync. Source of truth is the files on disk.
- ServerScriptService / ReplicatedStorage / StarterPlayerScripts

## Layout
Top-level folders are named after the Studio services because Script Sync pairs
by name. `ReplicatedStorage/Config/` is this project's `src/shared/Config/`.
`default.project.json` maps the same tree for Rojo if Script Sync is unavailable.

- `ServerScriptService/Bootstrap.server.luau` — the only server entry point.
- `ServerScriptService/Systems/` — one module per system, server-authoritative.
- `ReplicatedStorage/Config/` — every tunable number. Frozen at require time.
- `ReplicatedStorage/Types.luau` — shared types. `Remotes.luau` — the wire contract.
- `StarterPlayerScripts/` — client bootstrap and controllers. Display and input only.

## Non-negotiable rules
1. ALL damage, XP, scrap, weapon levels and breach increments are computed on the
   SERVER, from server-validated kills. The client sends intent only, never results.
2. The breach counter can ONLY be incremented by a kill the server itself validated.
3. Every RemoteEvent handler validates: identity, rate limit, argument types, and
   whether the action is legal in the current game state.
4. NO PvP. Never add player-versus-player code paths.
5. Hitscan weapons only. No simulated projectiles.
6. Hard cap on live zombies per server, read from Config. Never exceed it.
7. One fixed-step loop for all zombie AI. Never one script per zombie.
8. No gameplay number outside `ReplicatedStorage/Config/`.
9. Mobile first, 60 FPS on a low-end phone. Pool GuiObjects, never create or
   destroy them during gameplay.
10. Unrealistic blood only (green or black, geometric particles). The target
    content rating is Mild 9+ and it is a business requirement, not a preference.

## Config discipline
- A number marked `TUNE` is a starting guess, not a measurement. Do not quote it
  back to me as if it were validated. Replace it with a measured value and move
  the comment.
- A number marked `SOURCE: informe` comes from the design document. Changing it
  is a design decision — say so out loud before you do it.
- Asset ids set to 0 are placeholders. Never invent a Roblox asset id.

## MCP rules
- Use script_read before multi_edit. Never overwrite a script you have not read.
- Use execute_luau only in the Edit datamodel unless I explicitly ask otherwise.
  Always state which datamodel you are targeting.

## Before you say you are done
- Report any error from the build.
- If the change touches damage, currency, the breach counter or DataStore code,
  say so explicitly and list what a malicious client could try to send.

## Corrections log
(One line here every time I correct you, so the mistake does not repeat.)
- 2026-09-08 — Prompt 0 asked for `src/server`, `src/shared`, `src/client`. Script
  Sync pairs folders by service name, so the tree uses `ServerScriptService/`,
  `ReplicatedStorage/` and `StarterPlayerScripts/` instead. Rule 8 points at the
  real path. Do not rename these folders back.
- 2026-09-08 — Type-check errors from `luau-lsp analyze` go to STDERR. A run
  piped with `2>/dev/null` looked clean while three real errors were sitting
  there. Always `2>&1`, or check the exit code.
