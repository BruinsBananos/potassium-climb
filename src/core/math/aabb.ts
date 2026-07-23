export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function horizontalOverlapRatio(feet: AABB, plat: AABB): number {
  const left = Math.max(feet.x, plat.x);
  const right = Math.min(feet.x + feet.w, plat.x + plat.w);
  const overlap = Math.max(0, right - left);
  return feet.w > 0 ? overlap / feet.w : 0;
}

export function approach(v: number, target: number, maxDelta: number): number {
  if (v < target) return Math.min(v + maxDelta, target);
  if (v > target) return Math.max(v - maxDelta, target);
  return target;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
