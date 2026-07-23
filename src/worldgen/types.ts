import type { Platform } from '../core/physics/types';

export type PickupKind = 'coin' | 'coin_gold' | 'super_jump' | 'shield' | 'float' | 'magnet' | 'speed';

export interface Pickup {
  id: number;
  x: number;
  y: number;
  kind: PickupKind;
  r: number;
  taken: boolean;
}

export interface Snowball {
  id: number;
  x: number;
  y: number;
  vx: number;
  r: number;
  alive: boolean;
}

export interface WorldSpec {
  platforms: Platform[];
  walls: Platform[];
  pickups: Pickup[];
  snowballs: Snowball[];
  spawnX: number;
  spawnY: number;
  summitY: number;
  killY: number;
  designW: number;
  designH: number;
  biomeId: string;
  biomeName: string;
  clearBonus: number;
  endless: boolean;
  styleMult: number;
  mode: 'world' | 'endless' | 'daily' | 'weekly' | 'lab';
  seed: string;
  noPowers?: boolean;
  freeShield?: boolean;
  lab?: boolean;
}
