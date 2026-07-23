/**
 * Headless playability + integrity tests for Potassium Climb.
 * Run: npx tsx scripts/playtest.ts
 */
import { createFeelParams } from '../src/content/feelParams';
import { applyAllUpgrades, luckCoinMul, startShieldCharges, totalBanToMax } from '../src/content/upgrades';
import { assertContentValid, validateContent } from '../src/content/validate';
import { biomesInOrder, getBiome } from '../src/content/biomes';
import { dailyEndlessChallenge, activeWeekly } from '../src/content/challenges';
import { createSimFromWorld, stepSim, type SimState } from '../src/core/physics/sim';
import { generateWorld, validateWorld } from '../src/worldgen/generator';
import type { WorldSpec } from '../src/worldgen/types';

let failed = 0;
let passed = 0;

function ok(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function step(
  sim: SimState,
  feel: ReturnType<typeof createFeelParams>,
  input: { left?: boolean; right?: boolean; jump?: boolean; hold?: boolean },
  n = 1,
): void {
  for (let i = 0; i < n; i++) {
    stepSim(
      sim,
      feel,
      {
        left: !!input.left,
        right: !!input.right,
        jumpDown: !!input.jump && i === 0,
        jumpHeld: !!input.hold || !!input.jump,
      },
      1 / 120,
    );
  }
}

function botClimb(world: WorldSpec, feel: ReturnType<typeof createFeelParams>, maxSteps = 20000): {
  height: number;
  dead: boolean;
  summit: boolean;
  lands: number;
  grades: SimState['grades'];
} {
  const sim = createSimFromWorld(world, { luckMul: 1, startShield: 1 });
  let lands = 0;
  let lastOnGround = false;
  let jumpCd = 0;

  for (let s = 0; s < maxSteps; s++) {
    if (sim.dead || sim.summit) break;

    const p = sim.player;
    if (p.onGround && !lastOnGround) lands += 1;
    lastOnGround = p.onGround;

    // nearest landable pad above, prefer not-spike and not-crumbling
    let targetX = p.x;
    let bestScore = -1e9;
    let bestDy = 999;
    for (const plat of sim.platforms) {
      if (plat.gone || plat.kind === 'spike') continue;
      const top = plat.y + plat.h;
      const dy = top - p.y;
      if (dy < 8 || dy > 170) continue;
      const dx = Math.abs(plat.x + plat.w / 2 - p.x);
      let score = 200 - dy - dx * 0.35;
      if (plat.kind === 'crumble' && plat.crumbleArmedAt != null) score -= 80;
      if (plat.kind === 'spring') score += 30;
      if (plat.kind === 'block') score += 10;
      if (score > bestScore) {
        bestScore = score;
        bestDy = dy;
        targetX = plat.x + plat.w / 2;
      }
    }

    let left = false;
    let right = false;
    if (targetX > p.x + 6) right = true;
    else if (targetX < p.x - 6) left = true;

    // build speed on ice before long gaps
    if (p.onGround && bestDy > 90 && Math.abs(p.vx) < 220) {
      if (!left && !right) right = p.facing >= 0;
    }

    let jump = false;
    let hold = false;
    if (p.onWall && jumpCd <= 0) {
      jump = true;
      jumpCd = 18;
      // kick away from wall
      if (p.wallDir < 0) right = true;
      if (p.wallDir > 0) left = true;
    } else if (p.onGround && jumpCd <= 0 && bestDy > 25 && bestDy < 165) {
      // wait for some speed on taller gaps
      if (bestDy < 85 || Math.abs(p.vx) > 140 || bestDy < 50) {
        jump = true;
        hold = true;
        jumpCd = 12;
      }
    } else if (!p.onGround) {
      hold = p.vy > -50;
      // air steer toward target
      if (targetX > p.x + 4) right = true;
      if (targetX < p.x - 4) left = true;
    }
    if (jumpCd > 0) jumpCd -= 1;

    stepSim(
      sim,
      feel,
      {
        left,
        right,
        jumpDown: jump,
        jumpHeld: hold || jump,
      },
      1 / 120,
    );
  }

  return {
    height: sim.maxHeightPx,
    dead: sim.dead,
    summit: sim.summit,
    lands,
    grades: { ...sim.grades },
  };
}

console.log('\n=== Potassium Climb playtest ===\n');

// 1) Content validation
console.log('1) Content validation');
try {
  assertContentValid();
  ok('assertContentValid', true);
} catch (e) {
  ok('assertContentValid', false, String(e));
}
const warns = validateContent().filter((i) => i.level === 'warn');
ok('no content errors', validateContent().filter((i) => i.level === 'error').length === 0);
if (warns.length) console.log('     warns:', warns.map((w) => w.msg).join('; '));

// 2) World gen for all biomes
console.log('\n2) World generation');
for (const b of biomesInOrder()) {
  const w = generateWorld({ biomeId: b.id, mode: 'world', seed: `${b.id}-test` });
  const issues = validateWorld(w);
  const landable = w.platforms.filter((p) => p.kind !== 'spike' && !p.solidWall).length;
  ok(
    `gen ${b.id}`,
    w.platforms.length > 10 && landable >= 8 && w.spawnY > w.killY && w.summitY > w.spawnY,
    `plats=${w.platforms.length} landable=${landable} issues=${issues.length}`,
  );
  if (issues.filter((i) => i.includes('no platform near spawn')).length) {
    ok(`${b.id} spawn pad`, false, issues.join(','));
  }
}

// 3) Physics basics
console.log('\n3) Physics golden checks');
{
  const feel = createFeelParams();
  const world = generateWorld({ biomeId: 'frost_grove', mode: 'world', seed: 'phys-1' });
  // flat test pad
  world.platforms = [
    { id: 1, x: 200, y: 100, w: 300, h: 16, kind: 'block' },
    { id: 2, x: 200, y: 280, w: 120, h: 16, kind: 'ice' },
  ];
  world.walls = [
    { id: 90, x: 0, y: 0, w: 32, h: 2000, kind: 'block', solidWall: true },
    { id: 91, x: 688, y: 0, w: 32, h: 2000, kind: 'block', solidWall: true },
  ];
  world.pickups = [];
  world.snowballs = [];
  world.spawnX = 350;
  world.spawnY = 117;
  world.killY = -200;
  world.summitY = 5000;

  // standstill jump height — force grounded on pad
  let sim = createSimFromWorld(world);
  sim.player.x = 350;
  sim.player.y = 116;
  sim.player.vx = 0;
  sim.player.vy = 0;
  sim.player.onGround = true;
  sim.player.surface = 'block';
  sim.player.platformId = 1;
  const y0 = sim.player.y;
  step(sim, feel, { jump: true, hold: true }, 1);
  let apex = sim.player.y;
  for (let i = 0; i < 100; i++) {
    step(sim, feel, { hold: true }, 1);
    apex = Math.max(apex, sim.player.y);
    if (sim.player.vy < 0 && sim.player.y < apex - 5) break;
  }
  const standH = apex - y0;
  ok('stand jump height floaty ~110-200px', standH > 100 && standH < 220, `h=${standH.toFixed(1)}`);

  // run jump higher (wide pad so we don't walk off while accelerating)
  world.platforms = [{ id: 1, x: 100, y: 100, w: 500, h: 16, kind: 'ice' }];
  sim = createSimFromWorld(world);
  sim.player.x = 200;
  sim.player.y = 116;
  sim.player.vx = 0;
  sim.player.vy = 0;
  sim.player.onGround = true;
  sim.player.surface = 'ice';
  sim.player.platformId = 1;
  for (let i = 0; i < 90; i++) step(sim, feel, { right: true }, 1);
  const speed = Math.abs(sim.player.vx);
  const y1 = sim.player.y;
  // release run input on takeoff so we stay over the pad
  step(sim, feel, { jump: true, hold: true }, 1);
  let apex2 = sim.player.y;
  for (let i = 0; i < 120; i++) {
    step(sim, feel, { hold: true }, 1);
    apex2 = Math.max(apex2, sim.player.y);
    if (sim.player.vy < 0 && sim.player.y < apex2 - 5) break;
  }
  const runH = apex2 - y1;
  ok('run builds speed', speed > 200, `vx=${speed.toFixed(0)}`);
  ok('run jump higher than stand', runH > standH + 10, `runH=${runH.toFixed(1)} standH=${standH.toFixed(1)}`);

  // coyote
  sim = createSimFromWorld(world);
  sim.player.y = 117;
  sim.player.onGround = true;
  sim.player.x = 100; // walk off left of pad? pad is 200-500
  sim.player.x = 210;
  // force walk off
  sim.player.onGround = false;
  sim.player.coyoteLeft = 0.08;
  sim.player.vy = -10;
  step(sim, feel, { jump: true, hold: true }, 1);
  ok('coyote jump works', sim.player.vy > 100, `vy=${sim.player.vy.toFixed(0)}`);

  // peel grade cap
  world.platforms = [{ id: 1, x: 200, y: 100, w: 200, h: 16, kind: 'peel' }];
  sim = createSimFromWorld(world);
  sim.player.y = 200;
  sim.player.vy = -100;
  sim.player.onGround = false;
  for (let i = 0; i < 30; i++) step(sim, feel, {}, 1);
  ok(
    'peel never perfect/great',
    !sim.lastLand || sim.lastLand.grade === 'ok' || sim.lastLand.grade === 'scuff',
    `grade=${sim.lastLand?.grade}`,
  );

  // L+R no accel
  sim = createSimFromWorld(world);
  sim.player.onGround = true;
  sim.player.surface = 'ice';
  sim.player.vx = 200;
  step(sim, feel, { left: true, right: true }, 30);
  ok('L+R does not super-brake instantly', Math.abs(sim.player.vx) > 50, `vx=${sim.player.vx.toFixed(0)}`);
}

// 4) Daily BAN integrity expectation helper
console.log('\n4) Mode flags');
{
  const daily = generateWorld({
    biomeId: 'frost_grove',
    mode: 'daily',
    endless: true,
    seed: dailyEndlessChallenge().seed,
  });
  ok('daily is endless', daily.endless === true);
  ok('daily mode flag', daily.mode === 'daily');
  const lab = generateWorld({ biomeId: 'frost_grove', mode: 'lab', lab: true, endless: true, seed: 'lab-1' });
  const sim = createSimFromWorld(lab);
  ok('lab bankDisabled', sim.bankDisabled === true);
  const wk = activeWeekly();
  ok('weekly has biome', !!getBiome(wk.biomeId), wk.biomeId);
}

// 5) Bot playability — can make progress on Frost Grove
console.log('\n5) Bot climb progress');
{
  const feel = createFeelParams();
  const world = generateWorld({ biomeId: 'frost_grove', mode: 'world', seed: 'bot-grove' });
  const r = botClimb(world, feel, 40000);
  ok('bot lands >= 3 times', r.lands >= 3, `lands=${r.lands}`);
  ok('bot height > 250px', r.height > 250, `h=${r.height.toFixed(0)}`);
  ok('bot not softlocked at spawn', r.height > 100 || r.dead || r.summit, `h=${r.height}`);
  console.log(
    `     grove bot: h=${r.height.toFixed(0)} lands=${r.lands} dead=${r.dead} summit=${r.summit} grades=${JSON.stringify(r.grades)}`,
  );
  const landable = world.platforms
    .filter((p) => p.kind !== 'spike' && !p.solidWall)
    .sort((a, b) => a.y + a.h - (b.y + b.h));
  let maxGap = 0;
  for (let i = 1; i < landable.length; i++) {
    maxGap = Math.max(maxGap, landable[i].y + landable[i].h - (landable[i - 1].y + landable[i - 1].h));
  }
  ok('grove max landable gap <= 155', maxGap <= 155, `maxGap=${maxGap.toFixed(0)}`);
}

// 6) Bot mid biomes + gap integrity
console.log('\n6) Bot mid biomes');
for (const id of ['peel_perch', 'crumble_canopy', 'wallvine_spire']) {
  const feel = createFeelParams();
  applyAllUpgrades(feel, { up_jump: 2, up_grip: 1, up_coyote: 1 });
  const world = generateWorld({ biomeId: id, mode: 'world', seed: `bot-${id}` });
  const r = botClimb(world, feel, 40000);
  ok(`${id} bot progress > 180px`, r.height > 180, `h=${r.height.toFixed(0)} lands=${r.lands}`);
  const issues = validateWorld(world);
  ok(
    `${id} no softlock gaps`,
    issues.filter((i) => i.includes('large vertical')).length === 0,
    issues.join(';') || 'clean',
  );
}

// 7) Upgrade costs
console.log('\n7) Economy');
{
  const total = totalBanToMax();
  ok('total max upgrades ~1500-3000', total > 1500 && total < 3500, `total=${total}`);
}

// 8) apply peel scale simulation (document expected)
console.log('\n8) Biome scales present');
{
  const perch = getBiome('peel_perch')!;
  ok('peel perch scale > 1', perch.peelImpulseScale > 1, `x${perch.peelImpulseScale}`);
  const spire = getBiome('wallvine_spire')!;
  ok('spire cling scale < 1', spire.wallClingScale < 1, `x${spire.wallClingScale}`);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
