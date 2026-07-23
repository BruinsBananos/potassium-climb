# Balance notes — Phase 3

## Philosophy (Prompt 4)

- Early upgrades feel great; maxed loadout still dies to greed on late biomes.
- Daily rewards = **cosmetics only** (no meta BAN claim).
- Practice Lab = **zero bank**, **zero LB**.
- Style mult scales pride score, not jump height.

## What changed vs Phase 2

| Area | Before (P2) | After (P3) | Why |
|------|-------------|------------|-----|
| Biomes | Frost Grove only | 8 biomes with weights/set pieces | Content Bible plan |
| Clear bonus | +30 only | 30→150 by biome | Reward climb commitment without P2W |
| Style mult | 1.0 flat | 1.0→2.25 | Late biomes reward clean play |
| Upgrades | 3 | 8 full table | Soft comfort; costs match P4 curves |
| Coin density | flat | per-biome (`coinDensity`) | Monsoon greed vs Spire purity |
| Peel impulse | fixed | biome `peelImpulseScale` | Perch slightly meaner peels |
| Wall cling | fixed | `wallClingScale` (Spire 0.85, Zenith 0.8) | Mechanical identity |
| Crumble arm | n/a | 350ms × biome/mod scales | Fair telegraph |
| Luck upgrade | n/a | +8% coin value/level | Soft economy, not required |
| Peel Armor | n/a | run-start shield charges 1–2 | High cost rare safety |
| Daily | endless free | seeded daily + cosmetic claim | Social not grind-optimal |
| Weekly | none | 5 rotating modifiers | Variety without new art |
| Softlock guard | none | gen forces ice/block floor weights | Unfair all-spike bags |
| Max vertical gap QA | none | warn >220px in validateWorld | Softlock detection hook |

## Income vs costs (sanity)

- Total to max all upgrades ≈ **~2,187 BAN** (same cost formula as Prompt 4).
- Frost clear + mid run ≈ 50–80 BAN high skill → Calves+ early hook in 1–3 runs.
- Spire clear +100 BAN keeps late upgrades attainable without trivializing physics.

## Intentional non-changes

- Jump carry curve / grade thresholds (Feel Doc) unchanged.
- Real BAN never purchases power.
- No wallet gates.
