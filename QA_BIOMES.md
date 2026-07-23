# QA checklist per biome

Use default upgrades empty for fairness tests; re-test maxed soft.

Legend: **Teach** = set piece present · **Spikes** = first hazard fair · **Softlock** = always a reachable landable within ~220px vertical.

| Biome | Teach moment | Unfair spikes check | Softlock check | Notes |
|-------|--------------|---------------------|----------------|-------|
| **Frost Grove** | Slide runway, carry gap, wall kick, peel tease, spring, spike+shield | Spikes only after ~1300px + shield nearby | Spawn ice + dense early pads | Onboarding tips on |
| **Peel Perch** | Peel stairs (3), spring, spike pocket | Spike after peel literacy | Block rests between peels | Grade cap OK on peel |
| **Crumble Canopy** | Single crumble → chain → mover | Spikes mid, not on first pad | Block after first crumble | Arm ~350ms visible |
| **Magnet Monsoon** | Low safe vs high BAN + magnet | Spikes under greed path | Safe low path always | Higher coin density |
| **Snowball Siege** | Shield before corridor | Snowballs knock not always kill | Wide ice openers | Shield bias powers |
| **Wallvine Spire** | Forced wall L/R path | Spikes on ledges not mid-cling only | Alternating side ledges | Cling window scaled 0.85 |
| **Potassium Aurora** | Ice-heavy style corridor | Spikes present but not densest | Springs for recovery | Style ×2.0 |
| **Feeless Zenith** | Mixed exam after unlock chain | Full verb soup | Softlock guard in weights | Prestige unlock only |

## Mode QA

| Mode | Check |
|------|-------|
| World | Clear unlocks next; summit line from biome; clear bonus banks |
| Endless | No summit; tall tower; LB mode=endless |
| Daily | Seed stable for UTC date; cosmetic claim once/day; no extra BAN claim |
| Weekly | Rotates; modifiers apply; cosmetic reward on participation threshold |
| Lab | Unlocked biomes only; BAN +0; not on LB |

## Content validation

```js
window.__validate() // in browser console after load
```

Errors throw at boot via `assertContentValid()`.
