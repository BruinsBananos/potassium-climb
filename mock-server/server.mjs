/**
 * Minimal mock global API for Potassium Climb Phase 4.
 * Run: node mock-server/server.mjs
 * Default: http://127.0.0.1:8787
 *
 * Endpoints:
 *   POST /v1/scores
 *   GET  /v1/leaderboard?mode=&seed=&biomeId=&limit=
 *   GET  /v1/daily?date=YYYY-MM-DD
 *   GET  /health
 */
import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const CLIENT_VER = '1.0.0';
const GEN_VERSION = '3.0.0';

/** @type {any[]} */
const scores = [];

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(data);
}

function plausible(req) {
  if (!req.displayName || String(req.displayName).length > 24) return 'bad_name';
  if (req.heightPx < 0 || req.heightPx > 500000) return 'height_range';
  if (req.style < 0 || req.style > 1e7) return 'style_range';
  if (req.comboMax < 0 || req.comboMax > 500) return 'combo_range';
  if (req.durationMs < 500 && req.heightPx > 500) return 'too_fast';
  return null;
}

/** FNV-style hash matching client `hashSeed` in challenges.ts */
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dailyPayload(date) {
  // Align with client dailyEndlessChallenge(date)
  const h = hashSeed(`daily-${date}`);
  const biomeIds = [
    'frost_grove',
    'peel_perch',
    'crumble_canopy',
    'magnet_monsoon',
    'snowball_siege',
    'wallvine_spire',
  ];
  const biomeId = biomeIds[h % biomeIds.length];
  return {
    ok: true,
    date,
    seed: `daily-${date}`,
    biomeId,
    rewardCosmeticId: h % 2 === 0 ? 'hat_daily_rain' : 'trail_daily',
    clientVerMin: CLIENT_VER,
    genVersion: GEN_VERSION,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    return json(res, 200, { ok: true, scores: scores.length });
  }

  if (req.method === 'POST' && url.pathname === '/v1/scores') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return json(res, 400, { ok: false, accepted: false, reason: 'bad_json' });
    }
    const reason = plausible(data);
    if (reason) return json(res, 200, { ok: true, accepted: false, reason });
    scores.push({ ...data, createdAt: new Date().toISOString() });
    scores.sort((a, b) => b.heightPx - a.heightPx || b.style - a.style);
    const rank = scores.findIndex((e) => e === scores.find((s) => s.createdAt === scores[scores.length - 1]?.createdAt)) + 1;
    // simpler rank:
    const r = scores.findIndex((s) => s.displayName === data.displayName && s.heightPx === data.heightPx) + 1;
    return json(res, 200, {
      ok: true,
      accepted: true,
      rank: r || 1,
      boardSize: scores.length,
    });
  }

  if (req.method === 'GET' && url.pathname === '/v1/leaderboard') {
    const mode = url.searchParams.get('mode') || 'world';
    const seed = url.searchParams.get('seed') || undefined;
    const biomeId = url.searchParams.get('biomeId') || undefined;
    const limit = Math.min(50, Number(url.searchParams.get('limit') || 20));
    let rows = scores.filter((e) => e.mode === mode);
    if (seed) rows = rows.filter((e) => e.seed === seed);
    if (biomeId) rows = rows.filter((e) => e.biomeId === biomeId);
    rows = rows.slice(0, limit);
    return json(res, 200, {
      ok: true,
      mode,
      seed,
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
        createdAt: e.createdAt,
      })),
    });
  }

  if (req.method === 'GET' && url.pathname === '/v1/daily') {
    const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
    return json(res, 200, dailyPayload(date));
  }

  json(res, 404, { ok: false, error: 'not_found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Potassium Climb mock API http://127.0.0.1:${PORT}`);
  console.log('  POST /v1/scores');
  console.log('  GET  /v1/leaderboard');
  console.log('  GET  /v1/daily');
});
