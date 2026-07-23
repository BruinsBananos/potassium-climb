# Phase 3 — Content Expansion

## Run

```bash
cd potassium-climb
npm install
npm run dev
```

Content validation runs at boot (`assertContentValid`). Console: `window.__validate()`.

## What shipped

| Feature | Detail |
|---------|--------|
| **8 biomes** | Content Bible defs in `src/content/biomes.ts` + unified `generateWorld` |
| **Verbs** | ice, block, peel, spring, crumble, move, spike, snowballs |
| **Full upgrades** | 8 soft upgrades (Prompt 4 table) |
| **Cosmetics** | 30+ tint stubs, unlock rules, equip |
| **Modes** | World campaign, Endless, Daily seed, Weekly (5 rotating), Practice Lab |
| **Local LB** | Height / Daily / Weekly boards + per-biome bests |
| **Perf** | `loadCore` at boot; `loadBiomePack(pack)` per climb |
| **Balance** | Clear bonuses, style mult, income-aligned costs — see BALANCE.md |

## QA checklist (per biome)

See **QA_BIOMES.md**.

## Deferred (Phase 4+)

- Real remote LB
- Unique prestige art packs (currently share core textures)
- Authored weekly designer tools
- Snowball kill-mode weeklies
- Full animation harvest
