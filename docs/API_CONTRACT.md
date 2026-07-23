# Global API Contract — Potassium Climb

**Status:** Schema-ready · mock server included · production backend optional  

Base URL (dev mock): `http://127.0.0.1:8787`  
Client env: `VITE_API_BASE=http://127.0.0.1:8787`

## Principles

1. **Offline-first** — game fully playable without network.
2. **Client is not authoritative** — server may reject impossible scores.
3. **No wallet / real BAN** in API.
4. **Daily cosmetics only** — no meta currency from daily claim endpoint (claim is client-side pride; server may record claim later).

## Endpoints

### `GET /health`
```json
{ "ok": true, "scores": 0 }
```

### `POST /v1/scores`
Body: `ScoreSubmitRequest` (`src/net/types.ts`)

Response:
```json
{ "ok": true, "accepted": true, "rank": 3, "boardSize": 42 }
```
Or `{ "ok": true, "accepted": false, "reason": "too_fast" }`

### `GET /v1/leaderboard?mode=world|endless|endless_daily|weekly&seed=&biomeId=&limit=20`

### `GET /v1/daily?date=YYYY-MM-DD`
Returns UTC daily seed + biome + cosmetic reward id.  
**Must match** offline `dailyEndlessChallenge(date)` seed format `daily-YYYY-MM-DD` when offline (biome may differ if server rotates — document if so).  
Mock server hashes date → biome; client local uses Content Bible rotation — **align before go-live**.

## Versioning

| Field | Current |
|-------|---------|
| clientVer | 1.0.0 |
| genVersion | 3.0.0 |
| feelVersion | 1.0.0 |

Partition leaderboards by `mode` + `seed` + optionally `genVersion`.

## Anti-cheat humility

- Sanity clamps only (height, rate, combo).
- No cryptographic proof in v1.
- No cash prizes on global board.

## Integration plan (if no backend at ship)

1. Ship with `NetClient` mode `mock` (default).
2. Local LB remains source of truth in save.
3. When backend ready: set `VITE_API_BASE`, deploy mock→real.
4. Optional: sync top-N display in hub LB tab (merge remote + local).

## Run mock

```bash
node mock-server/server.mjs
# or npm run mock-api
```
