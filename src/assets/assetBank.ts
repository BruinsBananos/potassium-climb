import type { Texture } from 'pixi.js';
import { loadKeyedTexture, loadPlainTexture } from './chromaKey';

export const ASSET_PATHS: Record<string, string> = {
  hero_idle: 'hero/H1_idle.jpg',
  hero_run: 'hero/H2_run.jpg',
  hero_jump: 'hero/H3_jump.jpg',
  hero_apex: 'hero/H4_apex.jpg',
  hero_fall: 'hero/H5_fall.jpg',
  hero_wall: 'hero/H6_wall_cling.jpg',
  hero_land: 'hero/H7_land_squash.jpg',
  hero_death: 'hero/H8_death_tumble.jpg',
  plat_ice: 'platforms/P_ice.jpg',
  plat_block: 'platforms/P_block.jpg',
  plat_peel: 'platforms/P_peel.jpg',
  plat_spring: 'platforms/P_spring.jpg',
  plat_spikes: 'platforms/P_spikes.jpg',
  coin: 'collectibles/C_ban_coin.jpg',
  coin_gold: 'collectibles/C_ban_gold.jpg',
  pw_jump: 'collectibles/PW_jump.jpg',
  pw_shield: 'collectibles/PW_shield.jpg',
  pw_float: 'collectibles/PW_float.jpg',
  pw_magnet: 'collectibles/PW_magnet.jpg',
  pw_speed: 'collectibles/PW_speed.jpg',
  hz_spike: 'hazards/HZ_spike_row.jpg',
  fx_perfect: 'vfx/FX_perfect_land_burst.jpg',
  fx_combo: 'vfx/FX_combo_ring.jpg',
  fx_death: 'vfx/FX_death_peel.jpg',
  bg_far: 'parallax/BG_far.jpg',
  bg_mid: 'parallax/BG_mid.jpg',
  bg_near: 'parallax/BG_near.jpg',
  fg_dust: 'parallax/FG_dust.jpg',
  frost_keyart: 'parallax/frost_keyart.jpg',
};

const CORE_IDS = [
  'hero_idle',
  'hero_run',
  'hero_jump',
  'hero_apex',
  'hero_fall',
  'hero_wall',
  'hero_land',
  'hero_death',
  'plat_ice',
  'plat_block',
  'plat_peel',
  'plat_spring',
  'plat_spikes',
  'coin',
  'coin_gold',
  'pw_jump',
  'pw_shield',
  'pw_float',
  'pw_magnet',
  'pw_speed',
  'hz_spike',
  'fx_perfect',
  'fx_combo',
  'fx_death',
  'bg_far',
  'bg_mid',
  'bg_near',
  'fg_dust',
  'frost_keyart',
];

/** Prestige pack can load extra keys later; currently shares core. */
const PRESTIGE_EXTRA: string[] = [];

export class AssetBank {
  textures = new Map<string, Texture>();
  ready = false;
  loadedPacks = new Set<string>();

  private async loadIds(ids: string[], onProgress?: (p: number) => void): Promise<void> {
    let i = 0;
    for (const id of ids) {
      if (this.textures.has(id)) {
        i += 1;
        onProgress?.(i / ids.length);
        continue;
      }
      const path = ASSET_PATHS[id];
      if (!path) {
        i += 1;
        continue;
      }
      const url = `./assets/${path}`;
      try {
        const isBg = id.startsWith('bg_') || id === 'frost_keyart' || id === 'fg_dust';
        const isSpring = id === 'plat_spring';
        const tex = isBg
          ? await loadPlainTexture(url)
          : await loadKeyedTexture(url, isSpring ? 'magenta' : 'green');
        this.textures.set(id, tex);
      } catch (e) {
        console.warn('Asset miss', id, e);
      }
      i += 1;
      onProgress?.(i / ids.length);
    }
  }

  /** Boot: core climb pack only. */
  async loadCore(onProgress?: (p: number) => void): Promise<void> {
    await this.loadIds(CORE_IDS, onProgress);
    this.loadedPacks.add('core');
    this.ready = true;
  }

  /** Per-biome pack (code-split hook). Prestige adds extras when available. */
  async loadBiomePack(pack: string, onProgress?: (p: number) => void): Promise<void> {
    if (this.loadedPacks.has(pack)) {
      onProgress?.(1);
      return;
    }
    if (pack === 'prestige') {
      await this.loadIds(PRESTIGE_EXTRA.length ? PRESTIGE_EXTRA : CORE_IDS.slice(0, 3), onProgress);
    } else {
      // core biomes share textures; ensure core loaded
      await this.loadCore(onProgress);
    }
    this.loadedPacks.add(pack);
  }

  async loadAll(onProgress?: (p: number) => void): Promise<void> {
    await this.loadCore(onProgress);
  }

  get(id: string): Texture | null {
    return this.textures.get(id) ?? null;
  }
}
