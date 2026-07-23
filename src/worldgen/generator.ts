import type { BiomeDef, PlatformWeightKey } from '../content/biomes';
import { getBiome } from '../content/biomes';
import type { ModifierDef } from '../content/challenges';
import type { Platform } from '../core/physics/types';
import type { Pickup, PickupKind, Snowball, WorldSpec } from './types';

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickWeighted(
  rng: () => number,
  weights: Record<string, number>,
): PlatformWeightKey {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k as PlatformWeightKey;
  }
  return 'ice';
}

function blendWeights(
  early: Record<PlatformWeightKey, number>,
  late: Partial<Record<PlatformWeightKey, number>>,
  t: number,
): Record<string, number> {
  const keys = new Set([...Object.keys(early), ...Object.keys(late)]);
  const out: Record<string, number> = {};
  for (const k of keys) {
    const a = early[k as PlatformWeightKey] ?? 0;
    const b = late[k as PlatformWeightKey] ?? a;
    out[k] = a + (b - a) * t;
  }
  return out;
}

export interface GenOpts {
  biomeId: string;
  endless?: boolean;
  seed?: string;
  mode?: WorldSpec['mode'];
  modifiers?: ModifierDef[];
  lab?: boolean;
}

export function generateWorld(opts: GenOpts): WorldSpec {
  const biome = getBiome(opts.biomeId) ?? getBiome('frost_grove')!;
  const mods = opts.modifiers ?? [];
  const endless =
    opts.endless ?? (opts.mode === 'endless' || opts.mode === 'daily' || !!opts.lab);
  const seedStr = opts.seed ?? `${biome.id}-default`;
  const rng = mulberry32(hashSeed(seedStr));

  let widthMul = 1;
  let gapMul = 1;
  let peelMul = 1;
  let crumbleArmMul = 1;
  let snowMul = 1;
  let noPowers = false;
  let freeShield = false;
  let styleMul = biome.styleMult;
  let coinDensity = biome.coinDensity;

  for (const m of mods) {
    if (m.widthMul) widthMul *= m.widthMul;
    if (m.gapMul) gapMul *= m.gapMul;
    if (m.peelWeightMul) peelMul *= m.peelWeightMul;
    if (m.crumbleArmMul) crumbleArmMul *= m.crumbleArmMul;
    if (m.snowballMul) snowMul *= m.snowballMul;
    if (m.noPowers) noPowers = true;
    if (m.freeShield) freeShield = true;
    if (m.styleMul) styleMul *= m.styleMul;
  }

  const designW = 720;
  const designH = 1280;
  const margin = 70;
  const platforms: Platform[] = [];
  const pickups: Pickup[] = [];
  const snowballs: Snowball[] = [];
  let id = 1;
  let pid = 1;
  let sid = 1;

  const spawnY = 140;
  const goal = biome.goalHeightPx;
  const summitY = endless ? spawnY + Math.max(goal * 3, 10000) : spawnY + goal;

  // spawn pad
  platforms.push({
    id: id++,
    x: designW / 2 - 100 * widthMul,
    y: spawnY - 18,
    w: 200 * widthMul,
    h: 18,
    kind: 'ice',
  });

  // set pieces by biome order / teach notes
  addSetPieces(biome, platforms, pickups, () => id++, () => pid++, spawnY, designW, rng);

  let y = spawnY + 900;
  // if set pieces went higher, start after
  for (const p of platforms) y = Math.max(y, p.y + p.h + 80);

  while (y < summitY - 100) {
    const h01 = Math.min(1, (y - spawnY) / (summitY - spawnY));
    let weights = blendWeights(biome.weights, biome.weightsLate, h01);
    if (peelMul !== 1) weights.peel = (weights.peel ?? 0) * peelMul;
    // softlock guard: never all spikes
    weights.spike = Math.min(weights.spike ?? 0, 35);
    if ((weights.ice ?? 0) + (weights.block ?? 0) < 15) {
      weights.ice = (weights.ice ?? 0) + 20;
      weights.block = (weights.block ?? 0) + 10;
    }

    let kind = pickWeighted(rng, weights) as Platform['kind'];
    // lab assist: fewer spikes early
    if (opts.lab && h01 < 0.3 && kind === 'spike') kind = 'ice';

    const baseW =
      kind === 'spike' ? 56 + rng() * 24 : kind === 'spring' ? 70 + rng() * 24 : 88 + rng() * (70 - h01 * 22);
    const w = Math.max(48, baseW * widthMul);
    const x = margin + rng() * Math.max(8, designW - margin * 2 - w);

    const plat: Platform = {
      id: id++,
      x,
      y: y - 14,
      w,
      h: kind === 'spike' ? 14 : 16,
      kind,
    };
    if (kind === 'crumble') {
      plat.crumbleArmMs = 350 * biome.crumbleArmScale * crumbleArmMul;
      plat.crumbleFallMs = 280;
    }
    if (kind === 'move') {
      plat.moveAmp = 40 + rng() * 50;
      plat.movePeriod = 2.2 + rng() * 1.5;
      plat.movePhase = rng() * Math.PI * 2;
      plat.baseX = x;
      plat.baseY = plat.y;
    }
    platforms.push(plat);

    // pickups
    if (!noPowers && kind !== 'spike' && rng() < coinDensity) {
      const pk = pickPower(rng, biome);
      pickups.push({
        id: pid++,
        x: x + w / 2,
        y: y + 28,
        kind: pk,
        r: pk.startsWith('coin') ? 14 : 18,
        taken: false,
      });
    } else if (kind !== 'spike' && rng() < coinDensity * 0.5) {
      pickups.push({
        id: pid++,
        x: x + w / 2,
        y: y + 28,
        kind: rng() > 0.7 ? 'coin_gold' : 'coin',
        r: 14,
        taken: false,
      });
    }

    // snowballs
    const snowChance = biome.snowballRate * snowMul * (0.3 + h01);
    if (rng() < snowChance) {
      snowballs.push({
        id: sid++,
        x: rng() > 0.5 ? 60 : designW - 60,
        y: y + 40 + rng() * 30,
        vx: rng() > 0.5 ? 120 + rng() * 80 : -(120 + rng() * 80),
        r: 14,
        alive: true,
      });
    }

    // Keep vertical steps climbable: max ~150px (full-run jump ~158), denser early
    const step = (55 + rng() * 40 + h01 * 30) * gapMul;
    y += Math.min(step, 145 * Math.max(0.85, gapMul));
  }

  // summit
  platforms.push({
    id: id++,
    x: designW / 2 - 110,
    y: summitY - 22,
    w: 220,
    h: 22,
    kind: 'block',
  });

  // Gap repair after summit so path to goal is climbable
  repairVerticalGaps(platforms, () => id++, designW, margin, widthMul);

  const wallH = summitY + 600;
  const walls: Platform[] = [
    { id: id++, x: 0, y: 0, w: 32, h: wallH, kind: 'block', solidWall: true },
    { id: id++, x: designW - 32, y: 0, w: 32, h: wallH, kind: 'block', solidWall: true },
  ];

  // wallvine: extra mid walls for zipper feel
  if (biome.id === 'wallvine_spire') {
    walls.push({
      id: id++,
      x: designW / 2 - 16,
      y: spawnY + 2000,
      w: 32,
      h: 1800,
      kind: 'block',
      solidWall: true,
    });
  }

  return {
    platforms,
    walls,
    pickups,
    snowballs,
    spawnX: designW / 2,
    spawnY: spawnY + 2,
    summitY,
    killY: spawnY - 360,
    designW,
    designH,
    biomeId: biome.id,
    biomeName: biome.name,
    clearBonus: biome.clearBonus,
    endless: !!endless,
    styleMult: styleMul,
    mode: opts.mode ?? (endless ? 'endless' : 'world'),
    seed: seedStr,
    noPowers,
    freeShield,
    lab: opts.lab,
  };
}

function pickPower(rng: () => number, biome: BiomeDef): PickupKind {
  const bias = biome.powerBias;
  const entries: [PickupKind, number][] = [
    ['coin', 40],
    ['coin_gold', 15],
    ['super_jump', bias.super_jump ?? 20],
    ['shield', bias.shield ?? 20],
    ['float', bias.float ?? 15],
    ['magnet', bias.magnet ?? 15],
    ['speed', bias.speed ?? 15],
  ];
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return 'coin';
}

function addSetPieces(
  biome: BiomeDef,
  platforms: Platform[],
  pickups: Pickup[],
  nextId: () => number,
  nextPid: () => number,
  spawnY: number,
  designW: number,
  rng: () => number,
): void {
  const push = (p: Omit<Platform, 'id'>) => platforms.push({ ...p, id: nextId() });
  const coin = (x: number, y: number, gold = false) =>
    pickups.push({
      id: nextPid(),
      x,
      y,
      kind: gold ? 'coin_gold' : 'coin',
      r: gold ? 18 : 14,
      taken: false,
    });

  // shared early runway
  push({ x: 120, y: spawnY + 100, w: 160, h: 16, kind: 'ice' });
  push({ x: 400, y: spawnY + 180, w: 140, h: 16, kind: 'block' });
  coin(470, spawnY + 210);

  if (biome.id === 'frost_grove' || biome.order === 1) {
    push({ x: 200, y: spawnY + 320, w: 120, h: 16, kind: 'ice' });
    push({ x: 400, y: spawnY + 400, w: 100, h: 16, kind: 'ice' });
    push({ x: 80, y: spawnY + 520, w: 90, h: 16, kind: 'block' });
    push({ x: 280, y: spawnY + 620, w: 100, h: 16, kind: 'ice' });
    pickups.push({
      id: nextPid(),
      x: 120,
      y: spawnY + 560,
      kind: 'super_jump',
      r: 18,
      taken: false,
    });
    push({ x: 360, y: spawnY + 740, w: 100, h: 16, kind: 'peel' });
    push({ x: 180, y: spawnY + 840, w: 110, h: 16, kind: 'block' });
    push({ x: 420, y: spawnY + 960, w: 80, h: 16, kind: 'spring' });
    push({ x: 200, y: spawnY + 1180, w: 120, h: 16, kind: 'ice' });
    push({ x: 300, y: spawnY + 1320, w: 100, h: 16, kind: 'ice' });
    push({ x: 480, y: spawnY + 1400, w: 70, h: 14, kind: 'spike' });
    push({ x: 140, y: spawnY + 1500, w: 110, h: 16, kind: 'ice' });
    pickups.push({
      id: nextPid(),
      x: 190,
      y: spawnY + 1540,
      kind: 'shield',
      r: 18,
      taken: false,
    });
    return;
  }

  if (biome.id === 'peel_perch') {
    for (let i = 0; i < 4; i++) {
      push({
        x: 150 + (i % 2) * 200,
        y: spawnY + 300 + i * 90,
        w: 90,
        h: 16,
        kind: i < 3 ? 'peel' : 'block',
      });
    }
    push({ x: 400, y: spawnY + 700, w: 80, h: 16, kind: 'spring' });
    push({ x: 200, y: spawnY + 850, w: 70, h: 14, kind: 'spike' });
    push({ x: 320, y: spawnY + 920, w: 100, h: 16, kind: 'ice' });
    return;
  }

  if (biome.id === 'crumble_canopy') {
    push({ x: 300, y: spawnY + 320, w: 120, h: 16, kind: 'crumble', crumbleArmMs: 350, crumbleFallMs: 280 });
    push({ x: 180, y: spawnY + 450, w: 100, h: 16, kind: 'block' });
    for (let i = 0; i < 4; i++) {
      push({
        x: 120 + i * 30,
        y: spawnY + 580 + i * 70,
        w: 100,
        h: 16,
        kind: 'crumble',
        crumbleArmMs: 320,
        crumbleFallMs: 260,
      });
    }
    push({
      x: 400,
      y: spawnY + 900,
      w: 110,
      h: 16,
      kind: 'move',
      moveAmp: 60,
      movePeriod: 2.5,
      movePhase: 0,
      baseX: 400,
      baseY: spawnY + 900 - 14,
    });
    return;
  }

  if (biome.id === 'magnet_monsoon') {
    push({ x: 100, y: spawnY + 350, w: 100, h: 16, kind: 'block' });
    push({ x: 420, y: spawnY + 420, w: 90, h: 16, kind: 'ice' });
    coin(460, spawnY + 460, true);
    coin(480, spawnY + 500, true);
    pickups.push({
      id: nextPid(),
      x: 450,
      y: spawnY + 380,
      kind: 'magnet',
      r: 18,
      taken: false,
    });
    push({ x: 200, y: spawnY + 600, w: 70, h: 14, kind: 'spike' });
    return;
  }

  if (biome.id === 'snowball_siege') {
    push({ x: 200, y: spawnY + 320, w: 130, h: 16, kind: 'ice' });
    pickups.push({
      id: nextPid(),
      x: 260,
      y: spawnY + 360,
      kind: 'shield',
      r: 18,
      taken: false,
    });
    push({ x: 400, y: spawnY + 500, w: 100, h: 16, kind: 'block' });
    return;
  }

  if (biome.id === 'wallvine_spire') {
    push({ x: 80, y: spawnY + 300, w: 80, h: 16, kind: 'block' });
    push({ x: 520, y: spawnY + 420, w: 80, h: 16, kind: 'ice' });
    push({ x: 100, y: spawnY + 560, w: 70, h: 16, kind: 'ice' });
    push({ x: 500, y: spawnY + 700, w: 70, h: 16, kind: 'block' });
    return;
  }

  // prestige default set pieces
  push({ x: 200, y: spawnY + 320, w: 110, h: 16, kind: 'ice' });
  push({ x: 400, y: spawnY + 420, w: 90, h: 16, kind: 'spring' });
  push({ x: 180, y: spawnY + 600, w: 100, h: 16, kind: 'ice' });
  void rng;
}

/** Insert ice rescue pads when consecutive landable tops exceed maxGap. */
function repairVerticalGaps(
  platforms: Platform[],
  nextId: () => number,
  designW: number,
  margin: number,
  widthMul: number,
  maxGap = 150,
): void {
  const landable = () =>
    platforms
      .filter((p) => p.kind !== 'spike' && !p.solidWall && !p.gone)
      .sort((a, b) => a.y + a.h - (b.y + b.h));

  let guard = 0;
  while (guard++ < 80) {
    const sorted = landable();
    let fixed = false;
    for (let i = 1; i < sorted.length; i++) {
      const prevTop = sorted[i - 1].y + sorted[i - 1].h;
      const nextTop = sorted[i].y + sorted[i].h;
      const gap = nextTop - prevTop;
      if (gap <= maxGap) continue;
      const midY = prevTop + Math.min(maxGap - 8, gap / 2);
      const w = Math.max(70, 100 * widthMul);
      const x = Math.min(
        designW - margin - w,
        Math.max(margin, (sorted[i - 1].x + sorted[i].x) / 2),
      );
      platforms.push({
        id: nextId(),
        x,
        y: midY - 16,
        w,
        h: 16,
        kind: 'ice',
      });
      fixed = true;
      break;
    }
    if (!fixed) break;
  }
}

/** Softlock / fairness precheck for QA */
export function validateWorld(world: WorldSpec): string[] {
  const issues: string[] = [];
  const landable = world.platforms.filter((p) => p.kind !== 'spike' && !p.solidWall);
  if (landable.length < 8) issues.push('too few landable platforms');
  const sorted = [...landable].sort((a, b) => a.y + a.h - (b.y + b.h));
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].y + sorted[i].h - (sorted[i - 1].y + sorted[i - 1].h);
    if (gap > 160) issues.push(`large vertical gap ~${gap.toFixed(0)}px near y=${sorted[i].y}`);
  }
  const nearSpawn = landable.some((p) => Math.abs(p.y + p.h - world.spawnY) < 40);
  if (!nearSpawn) issues.push('no platform near spawn');
  return issues;
}
