export type CosmeticSlot = 'hat' | 'trail' | 'land_fx' | 'death_fx' | 'banner' | 'title';

export interface CosmeticDef {
  id: string;
  slot: CosmeticSlot;
  name: string;
  /** Tint reuse for stubs (hex) */
  tint: number;
  unlock: {
    type: 'default' | 'clear' | 'height' | 'combo' | 'style' | 'deaths' | 'weekly' | 'daily' | 'stats';
    ref?: string;
    value?: number;
  };
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'trail_ice', slot: 'trail', name: 'Ice Spray', tint: 0xb8f0ff, unlock: { type: 'default' } },
  { id: 'land_default', slot: 'land_fx', name: 'Soft Dust', tint: 0xc5d0e8, unlock: { type: 'default' } },
  { id: 'death_slip', slot: 'death_fx', name: 'Comic Slip', tint: 0xffe14a, unlock: { type: 'default' } },
  { id: 'hat_leaf', slot: 'hat', name: 'Grove Leaf', tint: 0x3d9e5a, unlock: { type: 'clear', ref: 'frost_grove' } },
  { id: 'banner_grove', slot: 'banner', name: 'Grove Frame', tint: 0x5ec8e8, unlock: { type: 'clear', ref: 'frost_grove' } },
  { id: 'hat_peel', slot: 'hat', name: 'Peel Cap', tint: 0xffd84d, unlock: { type: 'clear', ref: 'peel_perch' } },
  { id: 'land_peel', slot: 'land_fx', name: 'Peel Confetti', tint: 0xffd84d, unlock: { type: 'clear', ref: 'peel_perch' } },
  { id: 'trail_storm', slot: 'trail', name: 'Monsoon Streak', tint: 0x4da3ff, unlock: { type: 'clear', ref: 'magnet_monsoon' } },
  { id: 'hat_siege', slot: 'hat', name: 'Siege Helm', tint: 0xa8c0d8, unlock: { type: 'clear', ref: 'snowball_siege' } },
  { id: 'hat_vine', slot: 'hat', name: 'Vine Crown', tint: 0x4cff9a, unlock: { type: 'clear', ref: 'wallvine_spire' } },
  { id: 'trail_vine', slot: 'trail', name: 'Vine Ribbon', tint: 0x4cff9a, unlock: { type: 'clear', ref: 'wallvine_spire' } },
  { id: 'banner_spire', slot: 'banner', name: 'Spire Frame', tint: 0x7b5cff, unlock: { type: 'clear', ref: 'wallvine_spire' } },
  { id: 'hat_aurora', slot: 'hat', name: 'Aurora Crest', tint: 0xff5cde, unlock: { type: 'clear', ref: 'potassium_aurora' } },
  { id: 'trail_aurora', slot: 'trail', name: 'Aurora Ribbon', tint: 0x5cffb0, unlock: { type: 'style', value: 8000 } },
  { id: 'hat_zenith', slot: 'hat', name: 'Zenith Halo', tint: 0xffe14a, unlock: { type: 'clear', ref: 'feeless_zenith' } },
  { id: 'title_feeless', slot: 'title', name: 'Feeless', tint: 0xffe14a, unlock: { type: 'clear', ref: 'feeless_zenith' } },
  { id: 'hat_miner', slot: 'hat', name: 'Fold Miner', tint: 0xc4a574, unlock: { type: 'height', value: 5000 } },
  { id: 'hat_combo_10', slot: 'hat', name: 'Stylish Beanie', tint: 0xff9f43, unlock: { type: 'combo', value: 10 } },
  { id: 'land_gold', slot: 'land_fx', name: 'Perfect Gold', tint: 0xffe14a, unlock: { type: 'stats', ref: 'perfects', value: 50 } },
  { id: 'death_freeze', slot: 'death_fx', name: 'Freeze Statue', tint: 0xa8e7ff, unlock: { type: 'deaths', value: 100 } },
  { id: 'death_poof', slot: 'death_fx', name: 'Potassium Poof', tint: 0xffe14a, unlock: { type: 'deaths', value: 250 } },
  { id: 'banner_gold', slot: 'banner', name: 'Gold Canopy', tint: 0xe6a800, unlock: { type: 'height', value: 10000 } },
  { id: 'title_slider', slot: 'title', name: 'Ice Slider', tint: 0x5ec8e8, unlock: { type: 'height', value: 3000 } },
  { id: 'title_wall', slot: 'title', name: 'Wall Poet', tint: 0xc9b6ff, unlock: { type: 'stats', ref: 'walls', value: 100 } },
  { id: 'hat_daily_rain', slot: 'hat', name: 'Rain Cap', tint: 0x7ad7ff, unlock: { type: 'daily' } },
  { id: 'trail_daily', slot: 'trail', name: 'Daily Comet', tint: 0xffe14a, unlock: { type: 'daily' } },
  { id: 'banner_daily', slot: 'banner', name: 'Daily Stamp', tint: 0x5ec8e8, unlock: { type: 'daily' } },
  { id: 'banner_weekly', slot: 'banner', name: 'Weekly Laurel', tint: 0xffe14a, unlock: { type: 'weekly' } },
  { id: 'land_aurora', slot: 'land_fx', name: 'Aurora Ring', tint: 0xff5cde, unlock: { type: 'weekly' } },
  { id: 'trail_ban', slot: 'trail', name: 'BAN Sparkle', tint: 0xffe14a, unlock: { type: 'stats', ref: 'bank', value: 200 } },
  { id: 'trail_speed', slot: 'trail', name: 'Afterimage', tint: 0xff9f43, unlock: { type: 'stats', ref: 'speed_uses', value: 25 } },
  { id: 'hat_scuff', slot: 'hat', name: 'Bandage Beanie', tint: 0xc4a574, unlock: { type: 'stats', ref: 'scuffs', value: 50 } },
];

export interface UnlockContext {
  cleared: string[];
  bestHeightPx: number;
  bestCombo: number;
  bestStyle: number;
  totalDeaths: number;
  perfects: number;
  scuffs: number;
  wallJumps: number;
  bankLifetime: number;
  speedUses: number;
  dailyClaims: number;
  weeklyDone: boolean;
}

export function isCosmeticUnlocked(c: CosmeticDef, ctx: UnlockContext): boolean {
  const u = c.unlock;
  switch (u.type) {
    case 'default':
      return true;
    case 'clear':
      return !!u.ref && ctx.cleared.includes(u.ref);
    case 'height':
      return ctx.bestHeightPx >= (u.value ?? 0);
    case 'combo':
      return ctx.bestCombo >= (u.value ?? 0);
    case 'style':
      return ctx.bestStyle >= (u.value ?? 0);
    case 'deaths':
      return ctx.totalDeaths >= (u.value ?? 0);
    case 'daily':
      return ctx.dailyClaims >= 1;
    case 'weekly':
      return ctx.weeklyDone;
    case 'stats':
      if (u.ref === 'perfects') return ctx.perfects >= (u.value ?? 0);
      if (u.ref === 'scuffs') return ctx.scuffs >= (u.value ?? 0);
      if (u.ref === 'walls') return ctx.wallJumps >= (u.value ?? 0);
      if (u.ref === 'bank') return ctx.bankLifetime >= (u.value ?? 0);
      if (u.ref === 'speed_uses') return ctx.speedUses >= (u.value ?? 0);
      return false;
    default:
      return false;
  }
}
