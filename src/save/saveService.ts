export interface LeaderboardEntry {
  mode: string;
  biomeId: string;
  seed?: string;
  heightPx: number;
  style: number;
  comboMax: number;
  name: string;
  at: string;
}

export interface BiomeBest {
  heightPx: number;
  style: number;
  comboMax: number;
  clears: number;
}

export interface SaveV3 {
  v: 3;
  player: {
    displayName: string;
    createdAt: string;
    stats: {
      totalRuns: number;
      totalDeaths: number;
      bestHeightPx: number;
      bestStyle: number;
      bestCombo: number;
      perfects: number;
      scuffs: number;
      wallJumps: number;
      bankLifetime: number;
      speedUses: number;
      weeklyCompletions: number;
      dailyClaims: number;
    };
  };
  bank: { ban: number };
  progress: {
    worldsUnlocked: string[];
    worldsCleared: string[];
    upgrades: Record<string, number>;
    cosmeticsOwned: string[];
    cosmeticsEquipped: Record<string, string>;
    biomeBests: Record<string, BiomeBest>;
  };
  scores: { local: LeaderboardEntry[] };
  controls: { keyboard: Record<string, string>; gamepad: Record<string, number> };
  settings: {
    master: number;
    music: number;
    sfx: number;
    ui: number;
    reduceShake: boolean;
    reduceMotion: boolean;
    textScale: number;
    highContrast: boolean;
    screenReaderHints: boolean;
  };
  flags: {
    seenTutorial: boolean;
    firstUpgradeOffered: boolean;
    tipsSkipped: boolean;
  };
  daily: { lastDailyDate?: string; claimedCosmeticIds: string[]; lastWeeklyId?: string };
}

const KEY_V3 = 'bx-potassium-climb-v3';
const KEY_V2 = 'bx-potassium-climb-v2';

function defaultSave(): SaveV3 {
  return {
    v: 3,
    player: {
      displayName: 'MonKey',
      createdAt: new Date().toISOString(),
      stats: {
        totalRuns: 0,
        totalDeaths: 0,
        bestHeightPx: 0,
        bestStyle: 0,
        bestCombo: 0,
        perfects: 0,
        scuffs: 0,
        wallJumps: 0,
        bankLifetime: 0,
        speedUses: 0,
        weeklyCompletions: 0,
        dailyClaims: 0,
      },
    },
    bank: { ban: 0 },
    progress: {
      worldsUnlocked: ['frost_grove'],
      worldsCleared: [],
      upgrades: {},
      cosmeticsOwned: ['trail_ice', 'land_default', 'death_slip'],
      cosmeticsEquipped: {},
      biomeBests: {},
    },
    scores: { local: [] },
    controls: { keyboard: {}, gamepad: {} },
    settings: {
      master: 1,
      music: 0.7,
      sfx: 0.85,
      ui: 0.8,
      reduceShake: false,
      reduceMotion: false,
      textScale: 1,
      highContrast: false,
      screenReaderHints: true,
    },
    flags: {
      seenTutorial: false,
      firstUpgradeOffered: false,
      tipsSkipped: false,
    },
    daily: { claimedCosmeticIds: [] },
  };
}

function migrateV2(raw: unknown): SaveV3 {
  const s = defaultSave();
  if (!raw || typeof raw !== 'object') return s;
  const o = raw as Record<string, unknown>;
  const bank = Number(o.ban ?? o.bank ?? o.coins ?? 0);
  if (!Number.isNaN(bank)) s.bank.ban = Math.max(0, Math.floor(bank));
  const bestH = Number(o.bestHeight ?? o.best_height ?? o.height ?? 0);
  if (!Number.isNaN(bestH)) s.player.stats.bestHeightPx = bestH > 500 ? bestH : bestH * 48;
  const bestScore = Number(o.bestScore ?? o.best_score ?? o.score ?? 0);
  if (!Number.isNaN(bestScore)) s.player.stats.bestStyle = Math.floor(bestScore);
  if (o.upgrades && typeof o.upgrades === 'object') {
    s.progress.upgrades = { ...(o.upgrades as Record<string, number>) };
  }
  if (typeof o.name === 'string') s.player.displayName = o.name.slice(0, 16);
  return s;
}

function mergeSave(parsed: Partial<SaveV3>): SaveV3 {
  const d = defaultSave();
  return {
    ...d,
    ...parsed,
    v: 3,
    player: {
      ...d.player,
      ...parsed.player,
      stats: { ...d.player.stats, ...parsed.player?.stats },
    },
    bank: { ...d.bank, ...parsed.bank },
    progress: {
      ...d.progress,
      ...parsed.progress,
      biomeBests: { ...d.progress.biomeBests, ...parsed.progress?.biomeBests },
      cosmeticsOwned: parsed.progress?.cosmeticsOwned ?? d.progress.cosmeticsOwned,
    },
    scores: { local: parsed.scores?.local ?? [] },
    settings: { ...d.settings, ...parsed.settings },
    flags: { ...d.flags, ...parsed.flags },
    daily: { ...d.daily, ...parsed.daily },
  };
}

export function loadSave(): SaveV3 {
  try {
    const v3 = localStorage.getItem(KEY_V3);
    if (v3) {
      const parsed = JSON.parse(v3) as SaveV3;
      if (parsed?.v === 3) return mergeSave(parsed);
    }
    const v2 = localStorage.getItem(KEY_V2);
    if (v2) {
      const migrated = migrateV2(JSON.parse(v2));
      saveSave(migrated);
      return migrated;
    }
  } catch (e) {
    console.warn('save load failed', e);
  }
  return defaultSave();
}

export function saveSave(data: SaveV3): void {
  localStorage.setItem(KEY_V3, JSON.stringify(data));
}

export function exportSave(data: SaveV3): string {
  return JSON.stringify(data, null, 2);
}

export function importSaveJson(text: string): SaveV3 {
  const parsed = JSON.parse(text);
  if (parsed?.v === 3) {
    const s = mergeSave(parsed);
    saveSave(s);
    return s;
  }
  if (parsed?.v === 2 || !parsed?.v) {
    const s = migrateV2(parsed);
    saveSave(s);
    return s;
  }
  throw new Error('invalid save');
}

export function pushLeaderboard(save: SaveV3, entry: LeaderboardEntry, max = 25): void {
  const board = save.scores.local.filter(
    (e) => !(e.mode === entry.mode && e.biomeId === entry.biomeId && e.seed === entry.seed && e.name === entry.name),
  );
  board.push(entry);
  board.sort((a, b) => b.heightPx - a.heightPx || b.style - a.style);
  save.scores.local = board.slice(0, max * 8); // multi-board store
}

export function boardFor(
  save: SaveV3,
  mode: string,
  biomeId?: string,
  limit = 10,
): LeaderboardEntry[] {
  return save.scores.local
    .filter((e) => e.mode === mode && (!biomeId || e.biomeId === biomeId))
    .sort((a, b) => b.heightPx - a.heightPx || b.style - a.style)
    .slice(0, limit);
}

export function updateBiomeBest(save: SaveV3, biomeId: string, heightPx: number, style: number, combo: number, cleared: boolean): void {
  const cur = save.progress.biomeBests[biomeId] ?? { heightPx: 0, style: 0, comboMax: 0, clears: 0 };
  cur.heightPx = Math.max(cur.heightPx, heightPx);
  cur.style = Math.max(cur.style, style);
  cur.comboMax = Math.max(cur.comboMax, combo);
  if (cleared) cur.clears += 1;
  save.progress.biomeBests[biomeId] = cur;
}

export { KEY_V3, KEY_V2 };
