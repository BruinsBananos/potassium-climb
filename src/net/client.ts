import {
  CLIENT_VER,
  FEEL_VERSION,
  GEN_VERSION,
  isPlausibleScore,
  type DailySeedResponse,
  type LeaderboardQuery,
  type LeaderboardResponse,
  type ScoreSubmitRequest,
  type ScoreSubmitResponse,
} from './types';
import { dailyEndlessChallenge, hashSeed, utcDateString } from '../content/challenges';

const DEFAULT_BASE = (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env
  ?.VITE_API_BASE;

export type NetMode = 'remote' | 'mock' | 'off';

export class NetClient {
  baseUrl: string | null;
  mode: NetMode;
  /** In-memory mock board when no server */
  private mockBoard: ScoreSubmitRequest[] = [];

  constructor(baseUrl?: string | null) {
    this.baseUrl = baseUrl ?? DEFAULT_BASE ?? null;
    this.mode = this.baseUrl ? 'remote' : 'mock';
  }

  setBaseUrl(url: string | null): void {
    this.baseUrl = url;
    this.mode = url ? 'remote' : 'mock';
  }

  async submitScore(req: Omit<ScoreSubmitRequest, 'clientVer' | 'genVersion' | 'feelVersion'>): Promise<ScoreSubmitResponse> {
    const full: ScoreSubmitRequest = {
      ...req,
      clientVer: CLIENT_VER,
      genVersion: GEN_VERSION,
      feelVersion: FEEL_VERSION,
    };
    const check = isPlausibleScore(full);
    if (!check.ok) return { ok: true, accepted: false, reason: check.reason };

    if (this.mode === 'off') return { ok: true, accepted: false, reason: 'offline' };

    if (this.mode === 'mock' || !this.baseUrl) {
      this.mockBoard.push(full);
      this.mockBoard.sort((a, b) => b.heightPx - a.heightPx || b.style - a.style);
      const rank = this.mockBoard.findIndex((e) => e === full) + 1;
      return { ok: true, accepted: true, rank, boardSize: this.mockBoard.length };
    }

    try {
      const res = await fetch(`${this.baseUrl}/v1/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(full),
      });
      if (!res.ok) return { ok: false, accepted: false, reason: `http_${res.status}` };
      return (await res.json()) as ScoreSubmitResponse;
    } catch {
      // fall back to mock accept
      this.mockBoard.push(full);
      return { ok: true, accepted: true, reason: 'mock_fallback', rank: 1, boardSize: this.mockBoard.length };
    }
  }

  async fetchLeaderboard(q: LeaderboardQuery): Promise<LeaderboardResponse> {
    if (this.mode === 'remote' && this.baseUrl) {
      try {
        const params = new URLSearchParams({ mode: q.mode, limit: String(q.limit ?? 20) });
        if (q.seed) params.set('seed', q.seed);
        if (q.biomeId) params.set('biomeId', q.biomeId);
        const res = await fetch(`${this.baseUrl}/v1/leaderboard?${params}`);
        if (res.ok) return (await res.json()) as LeaderboardResponse;
      } catch {
        /* mock below */
      }
    }

    let rows = this.mockBoard.filter((e) => e.mode === q.mode || (q.mode === 'endless_daily' && e.mode === 'endless_daily'));
    if (q.seed) rows = rows.filter((e) => e.seed === q.seed);
    if (q.biomeId) rows = rows.filter((e) => e.biomeId === q.biomeId);
    rows = rows.slice(0, q.limit ?? 20);
    return {
      ok: true,
      mode: q.mode,
      seed: q.seed,
      generatedAt: new Date().toISOString(),
      entries: rows.map((e, i) => ({
        rank: i + 1,
        displayName: e.displayName,
        heightPx: e.heightPx,
        style: e.style,
        comboMax: e.comboMax,
        biomeId: e.biomeId,
        seed: e.seed,
        mode: e.mode,
        createdAt: new Date().toISOString(),
      })),
    };
  }

  /** Prefer remote daily; else local Content Bible seed (must match offline). */
  async fetchDailySeed(date = utcDateString()): Promise<DailySeedResponse> {
    if (this.mode === 'remote' && this.baseUrl) {
      try {
        const res = await fetch(`${this.baseUrl}/v1/daily?date=${encodeURIComponent(date)}`);
        if (res.ok) return (await res.json()) as DailySeedResponse;
      } catch {
        /* local */
      }
    }
    const local = dailyEndlessChallenge(date);
    return {
      ok: true,
      date,
      seed: local.seed,
      biomeId: local.biomeId,
      rewardCosmeticId: local.rewardCosmeticId ?? 'hat_daily_rain',
      clientVerMin: CLIENT_VER,
      genVersion: GEN_VERSION,
    };
  }
}

export const net = new NetClient();

export function mapModeToRemote(mode: string): ScoreSubmitRequest['mode'] {
  if (mode === 'daily') return 'endless_daily';
  if (mode === 'weekly') return 'weekly';
  if (mode === 'endless') return 'endless';
  return 'world';
}

// re-export hash for tests
export { hashSeed };
