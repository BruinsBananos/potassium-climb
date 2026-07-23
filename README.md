# Potassium Climb — Phase 3 Content Expansion

Full content plan: **8 biomes**, modes (world / daily / weekly / lab), full upgrades, cosmetics stubs, local LB + per-biome bests, per-pack asset load.

**Stack:** TypeScript · Vite · PixiJS v8 · custom fixed-timestep physics (Feel Document)

- **PHASE2.md** — vertical slice baseline  
- **PHASE3.md** — expansion summary  
- **PHASE4.md** — social, polish, trailer  
- **BALANCE.md** — what changed and why  
- **QA_BIOMES.md** — per-biome teach / spikes / softlock checklist  
- **docs/API_CONTRACT.md** · **docs/TRAILER.md** · **docs/SITE_COPY.md** · **docs/SHIP_CHECKLIST.md**

### Optional global mock API

```bash
npm run mock-api
# VITE_API_BASE=http://127.0.0.1:8787 npm run dev
```

## Run

```bash
cd potassium-climb
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). First load processes art chromakey.

```bash
npm run build    # production build
npm run preview  # serve build
```

## Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Left / Right | A D · ← → | L / R buttons |
| Jump (hold for height) | Space · W · ↑ | JUMP |
| Pause | P · Esc | — |
| Reset run | R | — |
| Toggle debug | F1 | — |

## Tunables

All feel numbers live in **`src/content/feelParams.ts`** (Feel Document defaults).

At runtime after load:

```js
// browser console
window.__FEEL.jump.jump_speed_base = 720
window.__FEEL.horizontal.friction_ice = 200
```

Hot-reload the file while `npm run dev` is running for full refresh.

Inspect sim: `window.__SIM`

## Module map

```
src/
  main.ts                 # loop, pause, HUD
  content/feelParams.ts   # tunables
  core/physics/sim.ts     # movement, jump, wall, grades, combo
  core/physics/types.ts
  core/math/aabb.ts
  worldgen/debugBiome.ts  # ice + peel + spring + block + walls
  render/gameView.ts      # Pixi draw + camera
  ui/input.ts             # keyboard + touch
```

## Debug biome

- Seeded tower (~3200px height)
- Platforms: **ice**, **block**, **peel**, **spring** only
- Full-height side walls for wall jump practice
- Gold summit line

## Golden feel tests (Prompt 2 checklist)

Use default tunables, no cheats. Mark pass/fail after play:

| # | Test | Pass criteria |
|---|------|----------------|
| 1 | Stand gap | From standstill on block/ice, full hold jump clears ~72px gap; fails ~110px |
| 2 | Max speed jump height | Ice at ≥95% max run → apex ~145–175px above takeoff |
| 3 | Momentum distance | Full ice run-up clears ~160px gap; standstill cannot |
| 4 | Perfect land | Soft fall onto wide pad, centered feet → Perfect often |
| 5 | Scuff toe | Narrow pad, edge land → Scuff or OK, not Perfect |
| 6 | Peel denial | Land on peel never Perfect/Great |
| 7 | Coyote | Walk off, jump &lt;80ms still jumps; &gt;150ms no ground jump |
| 8 | Wall save | Fall beside wall, cling + jump recovers to nearby ledge |
| 9 | No wall stall | Cannot infinite-climb one wall (regrab lock) |
| 10 | Spring grade floor | Spring land ≥ Great; launches hard upward |
| 11 | Speed tax | Scuff then jump lower apex than Perfect then jump |
| 12 | Touch parity | 3-button completes basic climb without keyboard |
| 14 | Combo window | Perfect → wait 1s → Perfect keeps chain; wait 2.5s resets |
| 15 | (movers) | N/A Phase 1 — no movers yet |

## What should feel better than old play.js

1. **Ice is fuel, not soap** — long coast with readable accel; L+R does not super-brake.
2. **Carry → height** — quadratic speed→jump; full run jumps clearly higher.
3. **Landing grades** — Perfect/Great/OK/Scuff with speed tax + combo rules (not “any land +1”).
4. **Peel is betrayal** — grade capped OK + lateral impulse.
5. **Spring floor Great** — heroic bounce without punishing grade.
6. **Wall windows** — short cling, grace, regrab lock (saves, no stall).
7. **Coyote + buffer** — touch-friendly, identical on keyboard.
8. **Fixed 120Hz physics** — stable feel vs variable dt.
9. **Debug overlay** — tune without guesswork (F1).

## Performance

Target: stable **60fps** desktop. Physics at **120Hz** fixed step, max 4 steps/frame. Procedural graphics only (no atlases).

## Out of scope (Phase 1)

Full art, upgrades, cosmetics, 8 biomes, leaderboards, audio beds, save migration.

## Known issues

See in-repo notes after first play pass; tracked in dev session:

- Jump press only sampled first physics substep per frame (buffer still works).
- No moving platforms / spikes / snowballs yet.
- Camera is simple lerp (not full Feel camera modes).
- Grade toast can feel short; juice budget not fully ported.
- World is placeholder rectangles (art comes later).

## License / product

Working title: **Potassium Climb** — feel prototype for Banano X site integration.
