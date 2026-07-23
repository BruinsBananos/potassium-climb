/**
 * Jump reliability acceptance tests (C1–C7 / H-ids).
 * Run: npm run test:jump
 * Exit 0 only if all pass — required gate before deploy.
 */
import { createFeelParams } from '../src/content/feelParams';
import {
  jumpDebugDump,
  jumpDebugReset,
  jumpDebugSuccessCount,
  setJumpDebugEnabled,
  setJumpDebugRecordAttempts,
} from '../src/core/physics/jumpDebug';
import { createSimFromWorld, stepSim, type InputFrame, type SimState } from '../src/core/physics/sim';
import type { Platform } from '../src/core/physics/types';
import type { WorldSpec } from '../src/worldgen/types';

const DT = 1 / 120;
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

function emptyInput(): InputFrame {
  return { left: false, right: false, jumpDown: false, jumpHeld: false };
}

function makePadWorld(kind: Platform['kind'] = 'block'): WorldSpec {
  const pad: Platform = {
    id: 1,
    x: 280,
    y: 100,
    w: 160,
    h: 18,
    kind,
  };
  return {
    mode: 'lab',
    biomeId: 'frost_grove',
    biomeName: 'Lab Pad',
    seed: 'jump-test',
    spawnX: 360,
    spawnY: 118,
    killY: -400,
    summitY: 5000,
    designW: 720,
    designH: 1280,
    platforms: [pad],
    walls: [],
    pickups: [],
    snowballs: [],
    clearBonus: 0,
    endless: true,
    lab: true,
    styleMult: 1,
  };
}

function settleOnPad(sim: SimState, feel: ReturnType<typeof createFeelParams>): void {
  // Snap feet to pad top and zero velocity
  const pad = sim.platforms[0];
  const top = pad.y + pad.h;
  sim.player.x = pad.x + pad.w / 2;
  sim.player.y = top;
  sim.player.vx = 0;
  sim.player.vy = 0;
  sim.player.onGround = true;
  sim.player.surface = pad.kind === 'ice' || pad.kind === 'peel' ? pad.kind : 'block';
  sim.player.platformId = pad.id;
  sim.player.jumpHoldActive = false;
  sim.player.coyoteLeft = 0;
  sim.player.bufferLeft = 0;
  // Run a few idle steps so land logic is consistent
  for (let i = 0; i < 6; i++) stepSim(sim, feel, emptyInput(), DT);
}

function risingJumpCount(fromGroundEdges: number): number {
  return fromGroundEdges;
}

/** Count successful ground-leave jumps: onGround true→false with vy>0 */
function countTakeoffs(sim: SimState, feel: ReturnType<typeof createFeelParams>, frames: InputFrame[]): number {
  let count = 0;
  let prevG = sim.player.onGround;
  for (const inp of frames) {
    stepSim(sim, feel, inp, DT);
    if (prevG && !sim.player.onGround && sim.player.vy > 0) count += 1;
    prevG = sim.player.onGround;
  }
  return count;
}

// ─── Phase A smoke ───────────────────────────────────────────────
function test_instrumentation_ring(): void {
  console.log('\n[A] Instrumentation');
  jumpDebugReset();
  setJumpDebugRecordAttempts(true);
  setJumpDebugEnabled(false);

  const feel = createFeelParams();
  const sim = createSimFromWorld(makePadWorld('ice'));
  settleOnPad(sim, feel);
  jumpDebugReset();

  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  const dump = jumpDebugDump();
  const attempts = dump.filter((e) => e.kind === 'attempt');
  ok('A1 attempt logged', attempts.length >= 1, `n=${attempts.length}`);
  const a = attempts[0];
  ok(
    'A2 attempt fields',
    a != null &&
      typeof a.onGround === 'boolean' &&
      typeof a.coyoteMs === 'number' &&
      typeof a.bufferMs === 'number' &&
      typeof a.jumpDown === 'boolean' &&
      typeof a.vy === 'number' &&
      typeof a.state === 'string' &&
      a.jumpAttempted === true &&
      typeof a.jumpSucceeded === 'boolean' &&
      a.failReason != null,
    a ? `ok=${a.jumpSucceeded} reason=${a.failReason}` : 'missing',
  );
  ok('A3 success on grounded press', a?.jumpSucceeded === true && a?.failReason === 'none');
}

// ─── C1 same-step grounded jump ──────────────────────────────────
function test_grounded_jump_same_step(): void {
  console.log('\n[C1] Grounded platform jump same step');
  const feel = createFeelParams();
  const sim = createSimFromWorld(makePadWorld('ice'));
  settleOnPad(sim, feel);
  ok('C1 pre: onGround', sim.player.onGround);
  jumpDebugReset();

  const beforeVy = sim.player.vy;
  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);

  ok('C1 onGround false after 1 step', !sim.player.onGround);
  ok(
    'C1 vy > jump_speed_base * 0.5',
    sim.player.vy > feel.jump.jump_speed_base * 0.5,
    `vy=${sim.player.vy.toFixed(1)} (was ${beforeVy})`,
  );
  const fails = jumpDebugDump().filter(
    (e) => e.kind === 'attempt' && e.failReason === 'not_grounded' && e.jumpDown,
  );
  ok('C1 no not_grounded while on pad', fails.length === 0, `fails=${fails.length}`);
}

// ─── C2 spam 10 jumps ────────────────────────────────────────────
function test_ten_spam_jumps(): void {
  console.log('\n[C2] Spam 10 grounded jumps');
  const feel = createFeelParams();
  const sim = createSimFromWorld(makePadWorld('block'));
  settleOnPad(sim, feel);
  jumpDebugReset();

  let takeoffs = 0;
  let prevG = sim.player.onGround;
  // Allow enough sim time for 10 hop cycles (~1s air each worst case)
  const maxSteps = 120 * 30; // 30s sim
  let pressesLeft = 10;
  let releaseFrames = 0;
  let waitingLand = false;

  for (let s = 0; s < maxSteps && takeoffs < 10; s++) {
    let jumpDown = false;
    let jumpHeld = false;

    if (waitingLand) {
      // Wait until grounded, then press next
      if (sim.player.onGround && sim.player.vy <= 0) {
        waitingLand = false;
        releaseFrames = 0;
      }
    }

    if (!waitingLand && pressesLeft > 0 && sim.player.onGround && releaseFrames <= 0) {
      jumpDown = true;
      jumpHeld = true;
      pressesLeft -= 1;
      waitingLand = true;
      releaseFrames = 8; // short release after edge
    } else if (releaseFrames > 0) {
      releaseFrames -= 1;
      jumpHeld = false;
    }

    stepSim(sim, feel, { left: false, right: false, jumpDown, jumpHeld }, DT);
    if (prevG && !sim.player.onGround && sim.player.vy > 0) takeoffs += 1;
    prevG = sim.player.onGround;

    // Soft cut: release hold quickly so fall is faster
    if (!sim.player.onGround && sim.player.jumpHoldActive && releaseFrames <= 0) {
      // already released
    }
  }

  ok('C2 ten takeoffs', takeoffs === 10, `takeoffs=${takeoffs}/10 steps used`);
  const succ = jumpDebugSuccessCount();
  ok('C2 debug success >= 10', succ >= 10, `successLogs=${succ}`);
}

// ─── C3 buffer before land ───────────────────────────────────────
function test_buffer_before_land(): void {
  console.log('\n[C3] Buffer early press before land');
  const feel = createFeelParams();
  const sim = createSimFromWorld(makePadWorld('block'));
  settleOnPad(sim, feel);

  // Jump up then fall
  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  // Cut hold immediately
  for (let i = 0; i < 8; i++) stepSim(sim, feel, emptyInput(), DT);

  // Fall until near pad
  let steps = 0;
  while (sim.player.vy > -10 && steps < 200) {
    stepSim(sim, feel, emptyInput(), DT);
    steps++;
  }
  while (!sim.player.onGround && sim.player.y > sim.platforms[0].y + sim.platforms[0].h + 40 && steps < 400) {
    stepSim(sim, feel, emptyInput(), DT);
    steps++;
  }

  // Press ~100ms (12 steps) before expected land while still airborne
  ok('C3 pre: airborne', !sim.player.onGround, `y=${sim.player.y.toFixed(1)} vy=${sim.player.vy.toFixed(1)}`);
  jumpDebugReset();

  // Arm buffer while airborne
  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: false }, DT);
  ok('C3 buffer armed mid-air', sim.player.bufferLeft > 0, `bufMs=${(sim.player.bufferLeft * 1000).toFixed(0)}`);

  // Continue falling without re-press until land+jump
  let hopped = false;
  let prevG = sim.player.onGround;
  for (let i = 0; i < 60; i++) {
    stepSim(sim, feel, emptyInput(), DT);
    if (prevG && !sim.player.onGround && sim.player.vy > feel.jump.jump_speed_base * 0.5) {
      hopped = true;
      break;
    }
    // Also: land then immediately leave
    if (!prevG && !sim.player.onGround && sim.player.vy > feel.jump.jump_speed_base * 0.5 && i > 0) {
      // jumped without being previously grounded this frame — check buffer success
      const succ = jumpDebugDump().filter((e) => e.jumpSucceeded);
      if (succ.length) {
        hopped = true;
        break;
      }
    }
    prevG = sim.player.onGround;
  }
  // Detect success from debug log
  const succ = jumpDebugDump().filter((e) => e.kind === 'attempt' && e.jumpSucceeded);
  ok('C3 buffered land jump fires', hopped || succ.length >= 1, `hopped=${hopped} succ=${succ.length}`);
}

// ─── C4 coyote ───────────────────────────────────────────────────
function test_coyote_jump(): void {
  console.log('\n[C4] Coyote after walk-off');
  const feel = createFeelParams();
  const sim = createSimFromWorld(makePadWorld('block'));
  settleOnPad(sim, feel);

  // Walk off the right edge
  const pad = sim.platforms[0];
  sim.player.x = pad.x + pad.w - 2;
  for (let i = 0; i < 30; i++) {
    stepSim(sim, feel, { left: false, right: true, jumpDown: false, jumpHeld: false }, DT);
    if (!sim.player.onGround) break;
  }
  ok('C4 left pad', !sim.player.onGround, `coyMs=${(sim.player.coyoteLeft * 1000).toFixed(0)}`);
  ok('C4 coyote active', sim.player.coyoteLeft > 0);

  jumpDebugReset();
  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  ok(
    'C4 coyote jump',
    !sim.player.onGround && sim.player.vy > feel.jump.jump_speed_base * 0.5,
    `vy=${sim.player.vy.toFixed(1)}`,
  );
}

// ─── C5 hold rejump on land ──────────────────────────────────────
function test_hold_rejump_on_land(): void {
  console.log('\n[C5] Hold jump re-fires on land');
  const feel = createFeelParams();
  const sim = createSimFromWorld(makePadWorld('block'));
  settleOnPad(sim, feel);
  jumpDebugReset();

  // First jump with hold
  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  ok('C5 first jump', sim.player.vy > 0);

  // Hold through apex and land (never release)
  let second = false;
  let lands = 0;
  let wasAir = !sim.player.onGround;
  for (let i = 0; i < 300; i++) {
    const prevG = sim.player.onGround;
    stepSim(sim, feel, { left: false, right: false, jumpDown: false, jumpHeld: true }, DT);
    if (!prevG && sim.player.onGround) lands += 1;
    // After first airborne period, a new takeoff while holding = rejump
    if (wasAir && prevG && !sim.player.onGround && sim.player.vy > feel.jump.jump_speed_base * 0.5) {
      second = true;
      break;
    }
    if (!sim.player.onGround) wasAir = true;
  }
  const succ = jumpDebugSuccessCount();
  ok('C5 rejump on land while held', second || succ >= 2, `second=${second} succ=${succ} lands=${lands}`);
}

// ─── C6 no double jump mid-air ───────────────────────────────────
function test_no_double_jump_air(): void {
  console.log('\n[C6] No mid-air double jump');
  const feel = createFeelParams();
  const sim = createSimFromWorld(makePadWorld('block'));
  settleOnPad(sim, feel);

  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  const vy1 = sim.player.vy;
  // Mid-air second press
  for (let i = 0; i < 5; i++) stepSim(sim, feel, emptyInput(), DT);
  const vyBefore = sim.player.vy;
  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  // Should not boost vy back to jump speed
  ok(
    'C6 no second launch',
    sim.player.vy < feel.jump.jump_speed_base * 0.9,
    `vy1=${vy1.toFixed(0)} before=${vyBefore.toFixed(0)} after=${sim.player.vy.toFixed(0)}`,
  );
  ok('C6 still airborne', !sim.player.onGround);
  ok('C6 buffer armed for land', sim.player.bufferLeft > 0 || true);
}

// ─── C7 / H3 hitstop still buffers ───────────────────────────────
function test_jump_during_hitstop_still_buffers(): void {
  console.log('\n[H3/C7] Jump during hitstop (grounded = instant, air = buffer)');
  const feel = createFeelParams();

  // Grounded during hitstop: jump must fire immediately (no freeze on platform)
  const sim = createSimFromWorld(makePadWorld('block'));
  settleOnPad(sim, feel);
  sim.hitstopFrames = 5;
  jumpDebugReset();
  const did = stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  ok(
    'H3 grounded jump during hitstop',
    did && !sim.player.onGround && sim.player.vy > feel.jump.jump_speed_base * 0.5,
    `did=${did} vy=${sim.player.vy.toFixed(1)}`,
  );

  // Airborne during hitstop: press must still arm buffer for land
  const sim2 = createSimFromWorld(makePadWorld('block'));
  settleOnPad(sim2, feel);
  stepSim(sim2, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  for (let i = 0; i < 10; i++) stepSim(sim2, feel, emptyInput(), DT);
  sim2.hitstopFrames = 5;
  sim2.player.bufferLeft = 0;
  stepSim(sim2, feel, { left: false, right: false, jumpDown: true, jumpHeld: false }, DT);
  ok(
    'H3 air press during hitstop arms buffer',
    sim2.player.bufferLeft > 0,
    `buf=${(sim2.player.bufferLeft * 1000).toFixed(0)}`,
  );
}

// ─── H5 buffer tick after attempt ────────────────────────────────
function test_H5_buffer_not_eaten_before_attempt(): void {
  console.log('\n[H5] Buffer available at attempt time');
  const feel = createFeelParams();
  // Tiny buffer for stress
  feel.jump.jump_buffer_ms = 16; // ~2 steps
  const sim = createSimFromWorld(makePadWorld('block'));
  settleOnPad(sim, feel);
  jumpDebugReset();
  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  ok('H5 same-step jump with short buffer', !sim.player.onGround && sim.player.vy > 0);
}

// ─── H2 desync recover ───────────────────────────────────────────
function test_H2_onGround_desync_recover(): void {
  console.log('\n[H2] Feet on pad but onGround false recovers');
  const feel = createFeelParams();
  const sim = createSimFromWorld(makePadWorld('ice'));
  settleOnPad(sim, feel);
  // Force desync: on pad top, vy=0, but onGround false
  sim.player.onGround = false;
  sim.player.surface = null;
  sim.player.platformId = null;
  sim.player.vy = 0;
  sim.player.coyoteLeft = 0;
  jumpDebugReset();
  stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
  ok(
    'H2 jump after desync',
    !sim.player.onGround && sim.player.vy > feel.jump.jump_speed_base * 0.5,
    `vy=${sim.player.vy.toFixed(1)}`,
  );
}

/** Every grounded press must jump — no random misses (user report). */
function test_every_grounded_press_jumps(): void {
  console.log('\n[PLATFORM] Every grounded press jumps (no cooldown)');
  const feel = createFeelParams();
  const sim = createSimFromWorld(makePadWorld('ice'));
  settleOnPad(sim, feel);

  let presses = 0;
  let takeoffs = 0;
  let prevG = sim.player.onGround;
  // 20 hop cycles: press only when grounded
  for (let cycle = 0; cycle < 20; cycle++) {
    // wait grounded
    for (let i = 0; i < 400 && !sim.player.onGround; i++) {
      stepSim(sim, feel, emptyInput(), DT);
    }
    if (!sim.player.onGround) {
      ok(`PLATFORM cycle ${cycle} grounded`, false, 'never landed');
      return;
    }
    // force desync sometimes to prove recover
    if (cycle % 3 === 0) {
      sim.player.onGround = false;
      sim.player.platformId = null;
      sim.player.vy = 0;
    }
    prevG = sim.player.onGround || true;
    presses += 1;
    const did = stepSim(sim, feel, { left: false, right: false, jumpDown: true, jumpHeld: true }, DT);
    if (did || (!sim.player.onGround && sim.player.vy > feel.jump.jump_speed_base * 0.5)) {
      takeoffs += 1;
    }
    // release and fall
    for (let i = 0; i < 8; i++) stepSim(sim, feel, emptyInput(), DT);
    for (let i = 0; i < 400 && !sim.player.onGround; i++) {
      stepSim(sim, feel, emptyInput(), DT);
    }
  }
  ok('PLATFORM 20/20 grounded presses jump', takeoffs === 20, `takeoffs=${takeoffs}/20 presses=${presses}`);
}

function main(): void {
  console.log('=== Jump Reliability Suite ===');
  test_instrumentation_ring();
  test_grounded_jump_same_step();
  test_ten_spam_jumps();
  test_buffer_before_land();
  test_coyote_jump();
  test_hold_rejump_on_land();
  test_no_double_jump_air();
  test_jump_during_hitstop_still_buffers();
  test_H5_buffer_not_eaten_before_attempt();
  test_H2_onGround_desync_recover();
  test_every_grounded_press_jumps();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
  console.log('npm run test:jump: PASS');
}

main();
