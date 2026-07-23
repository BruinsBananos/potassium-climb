import type { Platform } from '../core/physics/types';

export interface DebugWorld {
  platforms: Platform[];
  walls: Platform[];
  spawnX: number;
  spawnY: number;
  summitY: number;
  killY: number;
  designW: number;
  designH: number;
}

/** Deterministic-ish debug tower: ice + peel + spring only. */
export function generateDebugBiome(seed = 42): DebugWorld {
  const designW = 720;
  const designH = 1280;
  const platforms: Platform[] = [];
  let id = 1;

  const rng = mulberry32(seed);
  const margin = 80;
  const playW = designW - margin * 2;

  // spawn pad (block-feel ice-wide)
  const spawnY = 120;
  platforms.push({
    id: id++,
    x: designW / 2 - 90,
    y: spawnY - 16,
    w: 180,
    h: 16,
    kind: 'ice',
  });

  let y = spawnY + 90;
  const summitY = spawnY + 3200;

  while (y < summitY - 80) {
    const roll = rng();
    let kind: Platform['kind'] = 'ice';
    if (roll > 0.82) kind = 'spring';
    else if (roll > 0.62) kind = 'peel';
    else if (roll > 0.45) kind = 'block';
    else kind = 'ice';

    const w =
      kind === 'spring'
        ? 70 + rng() * 30
        : kind === 'peel'
          ? 80 + rng() * 40
          : 90 + rng() * 70;

    const maxX = designW - margin - w;
    const x = margin + rng() * Math.max(8, maxX - margin);

    // gap control: previous height already set
    platforms.push({
      id: id++,
      x,
      y: y - 14,
      w,
      h: 14,
      kind,
    });

    // occasional second platform for wall play lanes
    if (rng() > 0.7) {
      const w2 = 70 + rng() * 50;
      const x2 = clamp(x + (rng() > 0.5 ? 1 : -1) * (120 + rng() * 80), margin, designW - margin - w2);
      platforms.push({
        id: id++,
        x: x2,
        y: y + 40,
        w: w2,
        h: 14,
        kind: rng() > 0.5 ? 'ice' : 'block',
      });
    }

    y += 70 + rng() * 55;
  }

  // summit platform
  platforms.push({
    id: id++,
    x: designW / 2 - 100,
    y: summitY - 20,
    w: 200,
    h: 20,
    kind: 'block',
  });

  // side walls full height
  const wallH = summitY + 400;
  const walls: Platform[] = [
    { id: id++, x: 0, y: 0, w: 36, h: wallH, kind: 'block', solidWall: true },
    { id: id++, x: designW - 36, y: 0, w: 36, h: wallH, kind: 'block', solidWall: true },
  ];

  return {
    platforms,
    walls,
    spawnX: designW / 2,
    spawnY: spawnY + 1,
    summitY,
    killY: spawnY - 400,
    designW,
    designH,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
