/** Content Bible biomes — production defs for Phase 3. */

export type PlatformWeightKey = 'ice' | 'block' | 'peel' | 'spring' | 'crumble' | 'move' | 'spike';

export interface BiomeDef {
  id: string;
  name: string;
  tagline: string;
  order: number;
  shipPhase: 'v1' | 'prestige';
  goalHeightPx: number;
  styleMult: number;
  clearBonus: number;
  unlockAfter: string | null; // previous biome id
  /** Relative platform weights (normalized at gen) */
  weights: Record<PlatformWeightKey, number>;
  /** Weights scale toward late by height01 */
  weightsLate: Partial<Record<PlatformWeightKey, number>>;
  powerBias: Partial<Record<string, number>>;
  snowballRate: number; // 0–1 chance per band late
  wallClingScale: number; // 1 = default, <1 tighter
  crumbleArmScale: number;
  peelImpulseScale: number;
  coinDensity: number;
  teachNotes: string[];
  summitLine: string;
  accent: string;
  /** Asset pack key for code-split load */
  pack: string;
}

export const BIOMES: BiomeDef[] = [
  {
    id: 'frost_grove',
    name: 'Frost Grove',
    tagline: 'Gentle ice. Wide ledges. Learn the slide.',
    order: 1,
    shipPhase: 'v1',
    goalHeightPx: 2400,
    styleMult: 1.0,
    clearBonus: 30,
    unlockAfter: null,
    weights: { ice: 55, block: 40, peel: 5, spring: 0, crumble: 0, move: 0, spike: 0 },
    weightsLate: { ice: 50, block: 30, peel: 12, spring: 8, spike: 5 },
    powerBias: { super_jump: 35, shield: 15, float: 10, magnet: 25, speed: 15 },
    snowballRate: 0,
    wallClingScale: 1,
    crumbleArmScale: 1,
    peelImpulseScale: 1,
    coinDensity: 0.45,
    teachNotes: ['slide', 'carry jump', 'wall save'],
    summitLine: 'Grove cleared. The peels whisper higher.',
    accent: '#7DFFC8',
    pack: 'core',
  },
  {
    id: 'peel_perch',
    name: 'Peel Perch',
    tagline: 'Yellow betrayal. Watch your footing.',
    order: 2,
    shipPhase: 'v1',
    goalHeightPx: 3200,
    styleMult: 1.15,
    clearBonus: 40,
    unlockAfter: 'frost_grove',
    weights: { ice: 40, block: 25, peel: 25, spring: 10, crumble: 0, move: 0, spike: 8 },
    weightsLate: { ice: 35, block: 18, peel: 30, spring: 12, crumble: 5, spike: 18 },
    powerBias: { super_jump: 25, shield: 25, float: 10, magnet: 25, speed: 15 },
    snowballRate: 0.05,
    wallClingScale: 1,
    crumbleArmScale: 1,
    peelImpulseScale: 1.1,
    coinDensity: 0.5,
    teachNotes: ['peel stairs', 'spike garden', 'spring zigzag'],
    summitLine: 'Perch conquered. Don’t slip on the glory.',
    accent: '#FFE14A',
    pack: 'core',
  },
  {
    id: 'crumble_canopy',
    name: 'Crumble Canopy',
    tagline: 'The ice remembers. It doesn’t wait.',
    order: 3,
    shipPhase: 'v1',
    goalHeightPx: 4000,
    styleMult: 1.3,
    clearBonus: 55,
    unlockAfter: 'peel_perch',
    weights: { ice: 35, block: 20, peel: 10, spring: 10, crumble: 25, move: 0, spike: 12 },
    weightsLate: { ice: 30, block: 12, peel: 12, spring: 10, crumble: 28, move: 8, spike: 22 },
    powerBias: { super_jump: 20, shield: 30, float: 20, magnet: 15, speed: 15 },
    snowballRate: 0.08,
    wallClingScale: 1,
    crumbleArmScale: 1,
    peelImpulseScale: 1,
    coinDensity: 0.48,
    teachNotes: ['single crumble', 'crumble chain', 'mover intro'],
    summitLine: 'Canopy held. Barely. Beautifully.',
    accent: '#D4894A',
    pack: 'core',
  },
  {
    id: 'magnet_monsoon',
    name: 'Magnet Monsoon',
    tagline: 'Greed is a gap. BAN is a storm.',
    order: 4,
    shipPhase: 'v1',
    goalHeightPx: 4800,
    styleMult: 1.45,
    clearBonus: 70,
    unlockAfter: 'crumble_canopy',
    weights: { ice: 38, block: 18, peel: 14, spring: 12, crumble: 10, move: 8, spike: 15 },
    weightsLate: { ice: 32, block: 12, peel: 16, spring: 12, crumble: 12, move: 16, spike: 25 },
    powerBias: { super_jump: 15, shield: 20, float: 15, magnet: 35, speed: 15 },
    snowballRate: 0.12,
    wallClingScale: 1,
    crumbleArmScale: 1,
    peelImpulseScale: 1,
    coinDensity: 0.7,
    teachNotes: ['safe vs greed path', 'magnet spiral', 'storm corridor'],
    summitLine: 'Monsoon paid out. Feeless and loud.',
    accent: '#4DA3FF',
    pack: 'core',
  },
  {
    id: 'snowball_siege',
    name: 'Snowball Siege',
    tagline: 'The tower throws back.',
    order: 5,
    shipPhase: 'v1',
    goalHeightPx: 5600,
    styleMult: 1.6,
    clearBonus: 85,
    unlockAfter: 'magnet_monsoon',
    weights: { ice: 36, block: 20, peel: 12, spring: 12, crumble: 10, move: 10, spike: 18 },
    weightsLate: { ice: 30, block: 14, peel: 14, spring: 12, crumble: 12, move: 18, spike: 28 },
    powerBias: { super_jump: 15, shield: 35, float: 15, magnet: 15, speed: 20 },
    snowballRate: 0.35,
    wallClingScale: 1,
    crumbleArmScale: 1,
    peelImpulseScale: 1,
    coinDensity: 0.5,
    teachNotes: ['volley rhythm', 'shield before dense', 'siege multi-hazard'],
    summitLine: 'Siege broken. The MonKey stands.',
    accent: '#E8F6FF',
    pack: 'core',
  },
  {
    id: 'wallvine_spire',
    name: 'Wallvine Spire',
    tagline: 'Cling poetry. No floor required.',
    order: 6,
    shipPhase: 'v1',
    goalHeightPx: 6400,
    styleMult: 1.8,
    clearBonus: 100,
    unlockAfter: 'snowball_siege',
    weights: { ice: 34, block: 16, peel: 12, spring: 10, crumble: 10, move: 18, spike: 20 },
    weightsLate: { ice: 28, block: 10, peel: 14, spring: 10, crumble: 12, move: 26, spike: 30 },
    powerBias: { super_jump: 20, shield: 20, float: 25, magnet: 15, speed: 20 },
    snowballRate: 0.15,
    wallClingScale: 0.85,
    crumbleArmScale: 1,
    peelImpulseScale: 1,
    coinDensity: 0.42,
    teachNotes: ['forced wall path', 'double zipper', 'micro ledges'],
    summitLine: 'Spire claimed. Feeless height.',
    accent: '#4CFF9A',
    pack: 'core',
  },
  {
    id: 'potassium_aurora',
    name: 'Potassium Aurora',
    tagline: 'Style is the summit.',
    order: 7,
    shipPhase: 'prestige',
    goalHeightPx: 7200,
    styleMult: 2.0,
    clearBonus: 120,
    unlockAfter: 'wallvine_spire',
    weights: { ice: 45, block: 12, peel: 10, spring: 15, crumble: 8, move: 10, spike: 15 },
    weightsLate: { ice: 42, block: 8, peel: 12, spring: 16, crumble: 10, move: 12, spike: 22 },
    powerBias: { super_jump: 15, shield: 15, float: 30, magnet: 20, speed: 20 },
    snowballRate: 0.1,
    wallClingScale: 0.9,
    crumbleArmScale: 1,
    peelImpulseScale: 1,
    coinDensity: 0.55,
    teachNotes: ['perfect-gate style', 'float corridor', 'mixed exam'],
    summitLine: 'The sky tastes like BAN.',
    accent: '#FF5CDE',
    pack: 'prestige',
  },
  {
    id: 'feeless_zenith',
    name: 'Feeless Zenith',
    tagline: 'Mythic canopy. No fees. No mercy.',
    order: 8,
    shipPhase: 'prestige',
    goalHeightPx: 8000,
    styleMult: 2.25,
    clearBonus: 150,
    unlockAfter: 'potassium_aurora',
    weights: { ice: 32, block: 12, peel: 14, spring: 12, crumble: 14, move: 16, spike: 22 },
    weightsLate: { ice: 28, block: 8, peel: 16, spring: 12, crumble: 16, move: 20, spike: 32 },
    powerBias: { super_jump: 20, shield: 20, float: 20, magnet: 20, speed: 20 },
    snowballRate: 0.22,
    wallClingScale: 0.8,
    crumbleArmScale: 0.9,
    peelImpulseScale: 1.05,
    coinDensity: 0.5,
    teachNotes: ['memory lane', 'zenith gauntlet', 'ice cathedral'],
    summitLine: 'Zenith. Feeless. Forever climb.',
    accent: '#FFE14A',
    pack: 'prestige',
  },
];

export function getBiome(id: string): BiomeDef | undefined {
  return BIOMES.find((b) => b.id === id);
}

export function biomesInOrder(): BiomeDef[] {
  return [...BIOMES].sort((a, b) => a.order - b.order);
}

export function isBiomeUnlocked(id: string, cleared: string[], unlocked: string[]): boolean {
  if (unlocked.includes(id)) return true;
  const b = getBiome(id);
  if (!b) return false;
  if (!b.unlockAfter) return true;
  return cleared.includes(b.unlockAfter);
}

export function nextUnlockAfterClear(clearedId: string): string | null {
  const b = BIOMES.find((x) => x.unlockAfter === clearedId);
  return b?.id ?? null;
}
