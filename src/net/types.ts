/**
 * Global leaderboard + daily seed API contract (Phase 4).
 * Client is offline-first; remote is best-effort.
 */

export const CLIENT_VER = '1.0.0';
export const GEN_VERSION = '3.0.0';
export const FEEL_VERSION = '1.0.0';

export type RemoteMode = 'world' | 'endless' | 'endless_daily' | 'weekly';

/** POST /v1/scores */
export interface ScoreSubmitRequest {
  clientVer: string;
  genVersion: string;
  feelVersion: string;
  mode: RemoteMode;
  seed: string;
  biomeId: string;
  heightPx: number;
  style: number;
  comboMax: number;
  grades: { perfect: number; great: number; ok: number; scuff: number };
  durationMs: number;
  displayName: string;
  /** Optional opaque client id for anti-spam, not a wallet */
  playerId?: string;
}

export interface ScoreSubmitResponse {
  ok: boolean;
  accepted: boolean;
  reason?: string;
  rank?: number;
  boardSize?: number;
}

/** GET /v1/leaderboard?mode=&seed=&biomeId=&limit= */
export interface LeaderboardQuery {
  mode: RemoteMode;
  seed?: string;
  biomeId?: string;
  limit?: number;
}

export interface RemoteLeaderboardEntry {
  rank: number;
  displayName: string;
  heightPx: number;
  style: number;
  comboMax: number;
  biomeId: string;
  seed: string;
  mode: RemoteMode;
  createdAt: string;
}

export interface LeaderboardResponse {
  ok: boolean;
  entries: RemoteLeaderboardEntry[];
  mode: RemoteMode;
  seed?: string;
  generatedAt: string;
}

/** GET /v1/daily?date=YYYY-MM-DD (UTC) */
export interface DailySeedResponse {
  ok: boolean;
  date: string;
  seed: string;
  biomeId: string;
  /** Cosmetic reward id for claim (server-authoritative later) */
  rewardCosmeticId: string;
  clientVerMin: string;
  genVersion: string;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

/** Sanity clamps — client + server should share */
export function isPlausibleScore(req: ScoreSubmitRequest): { ok: boolean; reason?: string } {
  if (!req.displayName || req.displayName.length > 24) return { ok: false, reason: 'bad_name' };
  if (req.heightPx < 0 || req.heightPx > 500_000) return { ok: false, reason: 'height_range' };
  if (req.style < 0 || req.style > 10_000_000) return { ok: false, reason: 'style_range' };
  if (req.comboMax < 0 || req.comboMax > 500) return { ok: false, reason: 'combo_range' };
  if (req.durationMs < 500 && req.heightPx > 500) return { ok: false, reason: 'too_fast' };
  if (req.durationMs > 0 && req.heightPx / (req.durationMs / 1000) > 800)
    return { ok: false, reason: 'climb_rate' };
  if (req.clientVer !== CLIENT_VER && !req.clientVer) return { ok: false, reason: 'client_ver' };
  return { ok: true };
}
