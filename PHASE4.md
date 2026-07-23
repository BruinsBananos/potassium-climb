# Phase 4 — Social + Polish + Trailer

## Run

```bash
npm run dev
npm run mock-api   # optional global mock on :8787
# VITE_API_BASE=http://127.0.0.1:8787 npm run dev
```

## Delivered

| Item | Location |
|------|----------|
| LB + daily API contract | `docs/API_CONTRACT.md`, `src/net/types.ts` |
| Client (remote/mock) | `src/net/client.ts` |
| Mock server | `mock-server/server.mjs` |
| Juice polish | grade pop CSS, trauma shake, summit cam, new-best |
| A11y complete | text scale, contrast, motion/shake, SR live region |
| Trailer package | `docs/TRAILER.md` |
| Site/OG copy | `docs/SITE_COPY.md` |
| Ship checklist | `docs/SHIP_CHECKLIST.md` |

## Known limitations

- Mock/global LB is best-effort; no real anti-cheat beyond clamps
- Daily biome offline vs mock hash may differ until server aligns with Content Bible
- Audio still procedural
- Prestige art shares core pack
- image_to_video may need non-ZDR env / upload_url
- Ghosts / friends not in 1.0

## Post-1.0 roadmap

1. **Ghosts** — async PB replay silhouettes on daily seed  
2. **Friends** — optional display-name follows / shared codes  
3. **Seasonal biomes** — limited-time weights + cosmetics  
4. **Real audio beds** — per-biome OGG  
5. **True remote LB** — hardened API + rate limits  
6. **Animation harvest** — run cycle from 6C videos  
7. **Unique prestige art packs**  
8. **Controller rebind UI polish**  

## Integration plan (no backend at ship)

Default `NetClient` mode = **mock** (in-memory + local save LB).  
When ready: deploy API matching contract, set `VITE_API_BASE`, no client rewrite.
