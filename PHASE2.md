# Phase 2 — Frost Grove Vertical Slice

## Run

```bash
cd potassium-climb
npm install
npm run dev
```

Open the local URL. First load chromakeys art (few seconds).

## Acceptance checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Full climb loop Biome 1 (summit goal) | ✅ Frost Grove worldgen + summit + results |
| 2 | Endless flag optional | ✅ Hub Endless button |
| 3 | Imagine art integrated | ✅ hero/platforms/pickups/vfx/parallax via AssetBank |
| 4 | Landing grade juice + combo | ✅ toast, SFX, FX sprites, combo callouts |
| 5 | Power-ups subset | ✅ super jump, shield, float, magnet, speed |
| 6 | Hazards taught fairly | ✅ spikes after teach; shield pickup nearby |
| 7 | Hub: play, how-to, settings, results, retry | ✅ |
| 8 | Save v3 + migrate v2 | ✅ `save/saveService.ts` |
| 9 | BAN bank + 2–3 upgrades | ✅ Calves, Whiskers, Tail Forgiveness |
| 10 | Audio placeholders | ✅ WebAudio beeps + soft drone bed |
| 11 | Mobile portrait + touch | ✅ 3-button touch + CSS safe areas |
| 12 | Share card code text | ✅ canvas draw exact strings |
| 13 | No pay/wallet | ✅ |
| 14 | Onboarding tips first run | ✅ height-gated tips |
| 15 | Asset manifest used | ✅ `public/assets/manifest.json` + `ASSET_PATHS` |

## Asset manifest (used)

See `public/assets/manifest.json` and `src/assets/assetBank.ts` (`ASSET_PATHS`).

Keyed with `#00FF00` (spring `#FF00FF`).

## Deferred to Phase 3

- Biomes 2–6 full content + music beds
- Crumble / move platforms
- Snowballs
- Cosmetics equip track
- Practice Lab + Weekly challenges
- Local leaderboard UI polish
- Real audio loops (not beeps)
- Animation frame harvest (run cycle video)
- Global LB
- Prestige biomes 7–8
- Peel/block style cleanup pass
- Full juice budget (hitstop cam, particles pools)

## Known issues

- Procedural audio only (no OGG loops yet)
- Green-key edges may leave fringe on some assets
- Desktop keyboard primary; touch shows on coarse pointer
- Summit endless continue is separate button after clear
