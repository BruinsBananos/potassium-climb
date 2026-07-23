import type { FeelParams } from './feelParams';

export interface UpgradeDef {
  id: string;
  name: string;
  maxLevel: number;
  costBase: number;
  costGrowth: number;
  flavor: string;
  apply: (feel: FeelParams, level: number) => void;
}

/** Full Content Bible table — soft caps, no late-game trivialization. */
export const UPGRADES: UpgradeDef[] = [
  {
    id: 'up_jump',
    name: 'Potassium Calves',
    maxLevel: 5,
    costBase: 25,
    costGrowth: 1.45,
    flavor: 'Calves forged in faucet rains.',
    apply: (feel, level) => {
      feel.jump.jump_speed_base = 680 + level * 12;
    },
  },
  {
    id: 'up_grip',
    name: 'Ice Whiskers',
    maxLevel: 5,
    costBase: 30,
    costGrowth: 1.5,
    flavor: 'Whiskers read the rime.',
    apply: (feel, level) => {
      feel.horizontal.accel_ice = 2600 + level * 80;
      feel.horizontal.peel_impulse = Math.max(120, 220 - level * 8);
    },
  },
  {
    id: 'up_coyote',
    name: 'Tail Forgiveness',
    maxLevel: 3,
    costBase: 40,
    costGrowth: 1.55,
    flavor: 'Tail still on the ledge. Barely.',
    apply: (feel, level) => {
      feel.jump.coyote_ms = 80 + level * 12;
    },
  },
  {
    id: 'up_buffer',
    name: 'Pre-Jump Instinct',
    maxLevel: 3,
    costBase: 40,
    costGrowth: 1.55,
    flavor: 'You pressed jump in the future.',
    apply: (feel, level) => {
      feel.jump.jump_buffer_ms = 100 + level * 15;
    },
  },
  {
    id: 'up_wall',
    name: 'Bark Kickers',
    maxLevel: 4,
    costBase: 35,
    costGrowth: 1.5,
    flavor: 'Bark that kicks back.',
    apply: (feel, level) => {
      feel.wall.wall_jump_vy = 600 + level * 25;
      feel.wall.wall_cling_ms = 180 + level * 15;
    },
  },
  {
    id: 'up_luck',
    name: 'Canopy Fortune',
    maxLevel: 5,
    costBase: 20,
    costGrowth: 1.4,
    flavor: 'The canopy likes your vibes.',
    apply: (_feel, _level) => {
      // applied in sim via meta on sim.luckMul — set on feel hack
    },
  },
  {
    id: 'up_shield_start',
    name: 'Peel Armor',
    maxLevel: 2,
    costBase: 80,
    costGrowth: 1.7,
    flavor: "One free 'nope' per run.",
    apply: (_feel, _level) => {
      /* handled at run start */
    },
  },
  {
    id: 'up_combo',
    name: 'Style Memory',
    maxLevel: 3,
    costBase: 45,
    costGrowth: 1.5,
    flavor: 'Style with a longer memory.',
    apply: (feel, level) => {
      feel.landing.combo_window_ms = 1800 + level * 150;
    },
  },
];

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  return Math.round(def.costBase * Math.pow(def.costGrowth, currentLevel));
}

export function applyAllUpgrades(feel: FeelParams, levels: Record<string, number>): void {
  for (const u of UPGRADES) {
    const lv = levels[u.id] ?? 0;
    if (lv > 0) u.apply(feel, Math.min(lv, u.maxLevel));
  }
}

export function luckCoinMul(levels: Record<string, number>): number {
  const lv = levels['up_luck'] ?? 0;
  return 1 + lv * 0.08;
}

export function startShieldCharges(levels: Record<string, number>): number {
  return Math.min(2, levels['up_shield_start'] ?? 0);
}

/** Total BAN to max all (Prompt 4 ~2187). */
export function totalBanToMax(): number {
  let t = 0;
  for (const u of UPGRADES) {
    for (let lv = 0; lv < u.maxLevel; lv++) t += upgradeCost(u, lv);
  }
  return t;
}
