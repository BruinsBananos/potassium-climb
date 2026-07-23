import type { BiomeDef } from './biomes';
import { BIOMES, getBiome } from './biomes';

export interface ModifierDef {
  id: string;
  /** Patches applied to gen / feel loosely */
  peelWeightMul?: number;
  noPowers?: boolean;
  snowballMul?: number;
  crumbleArmMul?: number;
  widthMul?: number;
  gapMul?: number;
  styleMul?: number;
  freeShield?: boolean;
  iceOnly?: boolean;
}

export interface ChallengeDef {
  id: string;
  name: string;
  mode: 'weekly' | 'daily_endless';
  biomeId: string;
  seed: string;
  modifiers: ModifierDef[];
  description: string;
  rewardCosmeticId?: string;
}

/** Stable hash for daily seed */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function dailyEndlessChallenge(date = utcDateString()): ChallengeDef {
  const h = hashSeed(`daily-${date}`);
  const v1 = BIOMES.filter((b) => b.shipPhase === 'v1');
  const biome = v1[h % v1.length];
  return {
    id: `daily_${date}`,
    name: `Daily Endless · ${date}`,
    mode: 'daily_endless',
    biomeId: biome.id,
    seed: `daily-${date}`,
    modifiers: [{ id: 'daily', styleMul: 1.05 }],
    description: `${biome.name} — cosmetic pride only. No meta BAN from daily claim.`,
    rewardCosmeticId: h % 2 === 0 ? 'hat_daily_rain' : 'trail_daily',
  };
}

/** 5 live weekly-style definitions (rotate by week index). */
export const WEEKLY_POOL: ChallengeDef[] = [
  {
    id: 'wk_peel_only',
    name: 'Peel Protocol',
    mode: 'weekly',
    biomeId: 'peel_perch',
    seed: 'weekly-peel-protocol',
    modifiers: [{ id: 'peel', peelWeightMul: 2.2, styleMul: 1.2 }],
    description: 'Peel density up. Style ×1.2. Watch the yellow.',
    rewardCosmeticId: 'land_peel',
  },
  {
    id: 'wk_no_power',
    name: 'Dry Canopy',
    mode: 'weekly',
    biomeId: 'crumble_canopy',
    seed: 'weekly-dry-canopy',
    modifiers: [{ id: 'nopow', noPowers: true, styleMul: 1.1 }],
    description: 'No power-ups. Pure reads.',
    rewardCosmeticId: 'banner_weekly',
  },
  {
    id: 'wk_shield_siege',
    name: 'Hold the Line',
    mode: 'weekly',
    biomeId: 'snowball_siege',
    seed: 'weekly-hold-line',
    modifiers: [{ id: 'siege', snowballMul: 1.4, freeShield: true }],
    description: 'Extra snowballs. Start with a shield.',
    rewardCosmeticId: 'hat_siege',
  },
  {
    id: 'wk_tiny_tops',
    name: 'Micro Perch',
    mode: 'weekly',
    biomeId: 'frost_grove',
    seed: 'weekly-micro',
    modifiers: [{ id: 'tiny', widthMul: 0.75, gapMul: 1.05, styleMul: 1.15 }],
    description: 'Narrower tops. Perfect pays more.',
    rewardCosmeticId: 'hat_combo_10',
  },
  {
    id: 'wk_crumble_rush',
    name: "Don't Look Down",
    mode: 'weekly',
    biomeId: 'crumble_canopy',
    seed: 'weekly-crumble-rush',
    modifiers: [{ id: 'rush', crumbleArmMul: 0.7, iceOnly: false }],
    description: 'Crumble arms faster. Keep moving.',
    rewardCosmeticId: 'land_aurora',
  },
];

export function activeWeekly(d = new Date()): ChallengeDef {
  // ISO week-ish index
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.floor((d.getTime() - start.getTime()) / (7 * 86400000));
  const base = WEEKLY_POOL[week % WEEKLY_POOL.length];
  return {
    ...base,
    id: `${base.id}_${d.getUTCFullYear()}w${week}`,
    seed: `${base.seed}-${d.getUTCFullYear()}-w${week}`,
  };
}

export function resolveChallengeBiome(ch: ChallengeDef): BiomeDef {
  return getBiome(ch.biomeId) ?? BIOMES[0];
}
