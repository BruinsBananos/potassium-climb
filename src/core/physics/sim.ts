import { approach, clamp, horizontalOverlapRatio, type AABB } from '../math/aabb';
import type { FeelParams } from '../../content/feelParams';
import type { Pickup, Snowball, WorldSpec } from '../../worldgen/types';
import {
  isJumpDebugEnabled,
  jumpDebugAttempt,
  jumpDebugPush,
  jumpDebugTick,
  type JumpFailReason,
} from './jumpDebug';
import type {
  GradeCounts,
  LandEvent,
  LandGrade,
  Platform,
  PlayerBody,
  SimDebug,
  Surface,
} from './types';

export interface InputFrame {
  left: boolean;
  right: boolean;
  jumpDown: boolean;
  jumpHeld: boolean;
}

export interface SimState {
  player: PlayerBody;
  platforms: Platform[];
  walls: Platform[];
  pickups: Pickup[];
  snowballs: Snowball[];
  killY: number;
  spawnX: number;
  spawnY: number;
  style: number;
  combo: number;
  comboMax: number;
  comboTimer: number;
  banRun: number;
  heightPx: number;
  maxHeightPx: number;
  dead: boolean;
  deathCause: 'fall' | 'spike' | null;
  summit: boolean;
  summitY: number;
  lastLand: LandEvent | null;
  landFlash: boolean;
  hitstopFrames: number;
  elapsed: number;
  grades: GradeCounts;
  sfxQueue: string[];
  comboTierHit: Set<number>;
  clearBonus: number;
  endless: boolean;
  biomeId: string;
  styleMult: number;
  bankDisabled: boolean;
  freeShield: boolean;
  wallJumps: number;
  luckMul: number;
  mode: WorldSpec['mode'];
}

function feetBox(p: PlayerBody, feel: FeelParams): AABB {
  const b = feel.body;
  return { x: p.x - b.feet_w / 2, y: p.y, w: b.feet_w, h: b.feet_h };
}

function hurtBox(p: PlayerBody, feel: FeelParams): AABB {
  const b = feel.body;
  return { x: p.x - b.hurt_w / 2, y: p.y, w: b.hurt_w, h: b.hurt_h };
}

function wallBox(p: PlayerBody, feel: FeelParams): AABB {
  const b = feel.body;
  return { x: p.x - b.wall_w / 2, y: p.y + 6, w: b.wall_w, h: b.wall_h };
}

function scoreToGrade(score: number): LandGrade {
  if (score >= 5) return 'perfect';
  if (score >= 3) return 'great';
  if (score >= 1) return 'ok';
  return 'scuff';
}

function gradeRank(g: LandGrade): number {
  return g === 'perfect' ? 3 : g === 'great' ? 2 : g === 'ok' ? 1 : 0;
}

function minGrade(a: LandGrade, b: LandGrade): LandGrade {
  return gradeRank(a) <= gradeRank(b) ? a : b;
}

function maxGrade(a: LandGrade, b: LandGrade): LandGrade {
  return gradeRank(a) >= gradeRank(b) ? a : b;
}

export function createPlayer(x: number, y: number): PlayerBody {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    surface: null,
    onWall: false,
    wallDir: 0,
    platformId: null,
    jumpHoldActive: false,
    jumpHoldTime: 0,
    coyoteLeft: 0,
    bufferLeft: 0,
    clingLeft: 0,
    wallGraceLeft: 0,
    regrabLockLeft: 0,
    lockedWallSeg: null,
    superJumpCharges: 0,
    shield: false,
    floatLeft: 0,
    magnetLeft: 0,
    speedLeft: 0,
    iFrames: 0,
  };
}

export function createSimFromWorld(
  world: WorldSpec,
  opts?: { luckMul?: number; startShield?: number },
): SimState {
  const p = createPlayer(world.spawnX, world.spawnY);
  if (world.freeShield || (opts?.startShield ?? 0) > 0) p.shield = true;
  return {
    player: p,
    platforms: world.platforms.map((pl) => ({ ...pl })),
    walls: world.walls,
    pickups: world.pickups.map((pk) => ({ ...pk, taken: false })),
    snowballs: (world.snowballs ?? []).map((s) => ({ ...s })),
    killY: world.killY,
    spawnX: world.spawnX,
    spawnY: world.spawnY,
    style: 0,
    combo: 0,
    comboMax: 0,
    comboTimer: 0,
    banRun: 0,
    heightPx: 0,
    maxHeightPx: 0,
    dead: false,
    deathCause: null,
    summit: false,
    summitY: world.summitY,
    lastLand: null,
    landFlash: false,
    hitstopFrames: 0,
    elapsed: 0,
    grades: { perfect: 0, great: 0, ok: 0, scuff: 0 },
    sfxQueue: [],
    comboTierHit: new Set(),
    clearBonus: world.clearBonus,
    endless: world.endless,
    biomeId: world.biomeId,
    styleMult: world.styleMult ?? 1,
    bankDisabled: !!world.lab || world.mode === 'lab',
    freeShield: !!world.freeShield,
    wallJumps: 0,
    luckMul: opts?.luckMul ?? 1,
    mode: world.mode,
  };
}

export function resetSim(sim: SimState, world: WorldSpec): void {
  const next = createSimFromWorld(world);
  Object.assign(sim, next);
}

function wishX(input: InputFrame): number {
  let w = 0;
  if (input.left) w -= 1;
  if (input.right) w += 1;
  return w;
}

function queueSfx(sim: SimState, id: string): void {
  sim.sfxQueue.push(id);
}

function computeGrade(
  feel: FeelParams,
  impact: number,
  edge: number,
  surface: Surface,
): LandGrade {
  const L = feel.landing;
  let score = 0;
  if (impact <= L.impact_perfect) score += 3;
  else if (impact <= L.impact_great) score += 2;
  else if (impact <= L.impact_ok) score += 1;
  if (edge <= L.edge_perfect) score += 2;
  else if (edge <= L.edge_great) score += 1;
  else if (edge <= L.edge_ok) score += 0;
  else score -= 1;
  let grade = scoreToGrade(score);
  if (surface === 'peel') grade = minGrade(grade, 'ok');
  if (surface === 'spring') grade = maxGrade(grade, 'great');
  return grade;
}

function applyGradeGameplay(
  sim: SimState,
  feel: FeelParams,
  grade: LandGrade,
  surface: Surface,
): void {
  const L = feel.landing;
  const p = sim.player;
  let dCombo = 0;
  let style = 0;
  let vxMul = 1;
  let ban = 0;
  let hitstop = 0;

  switch (grade) {
    case 'perfect':
      dCombo = L.combo_perfect;
      style = L.style_perfect;
      vxMul = L.land_vx_mul_perfect;
      ban = L.ban_crumb_perfect;
      hitstop = 0; // never freeze inputs on land — juice is visual/audio only
      queueSfx(sim, 'land_perfect');
      break;
    case 'great':
      dCombo = L.combo_great;
      style = L.style_great;
      vxMul = L.land_vx_mul_great;
      hitstop = 0;
      queueSfx(sim, 'land_great');
      break;
    case 'ok':
      dCombo = L.combo_ok;
      style = L.style_ok;
      vxMul = L.land_vx_mul_ok;
      queueSfx(sim, 'land_ok');
      break;
    case 'scuff':
      dCombo = L.combo_scuff;
      style = L.style_scuff;
      vxMul = L.land_vx_mul_scuff;
      queueSfx(sim, 'land_scuff');
      break;
  }

  sim.grades[grade] += 1;
  if (dCombo < 0 && sim.combo <= 1) sim.combo = 0;
  else sim.combo = Math.max(0, sim.combo + dCombo);
  sim.comboMax = Math.max(sim.comboMax, sim.combo);
  sim.comboTimer = L.combo_window_ms / 1000;
  sim.style += style * sim.styleMult * (1 + 0.05 * sim.combo);
  if (!sim.bankDisabled) sim.banRun += ban;
  p.vx *= vxMul;
  if (hitstop > 0) sim.hitstopFrames = Math.max(sim.hitstopFrames, hitstop);

  for (const t of [5, 10, 15, 20, 25, 30]) {
    if (sim.combo >= t && !sim.comboTierHit.has(t)) {
      sim.comboTierHit.add(t);
      queueSfx(sim, 'combo');
    }
  }

  if (surface === 'peel') {
    const dir = p.facing || 1;
    p.vx += dir * feel.horizontal.peel_impulse;
    const max = feel.horizontal.max_run_speed * (p.speedLeft > 0 ? 1.35 : 1.25);
    p.vx = clamp(p.vx, -max, max);
  }
}

function playerState(sim: SimState): string {
  const p = sim.player;
  if (sim.dead) return 'dead';
  if (sim.summit) return 'summit';
  if (p.onWall) return 'wall';
  if (p.onGround) return 'ground';
  return 'air';
}

/** If feet rest on a pad and not rising, force grounded truth before jump attempts (H2). */
function syncGroundedFromFeet(sim: SimState, feel: FeelParams): void {
  const p = sim.player;
  if (p.vy > 0) return; // rising — do not snap
  const feet = feetBox(p, feel);
  const plat = findLandPlatform(sim, feel, p.y + 2, feet);
  if (!plat) return;
  const top = plat.y + plat.h;
  if (Math.abs(p.y - top) > feel.body.land_y_slop + 2) return;
  p.y = top;
  p.vy = 0;
  p.onGround = true;
  p.surface = plat.kind as Surface;
  p.platformId = plat.id;
  p.onWall = false;
}

/**
 * Single jump authority. Returns whether jump started.
 */
function tryJump(
  sim: SimState,
  feel: FeelParams,
  fromWall: boolean,
  input: InputFrame,
): boolean {
  const p = sim.player;
  const J = feel.jump;

  const log = (succeeded: boolean, failReason: JumpFailReason, note?: string): boolean => {
    jumpDebugAttempt({
      onGround: p.onGround,
      coyoteMs: p.coyoteLeft * 1000,
      bufferMs: p.bufferLeft * 1000,
      jumpDown: input.jumpDown,
      jumpHeld: input.jumpHeld,
      vy: p.vy,
      state: playerState(sim),
      succeeded,
      failReason,
      note,
    });
    return succeeded;
  };

  if (sim.dead) return log(false, 'dead');
  if (sim.summit) return log(false, 'summit');

  if (fromWall) {
    const wallOk =
      (p.onWall && p.clingLeft > 0) || (!p.onWall && p.wallGraceLeft > 0 && p.wallDir !== 0);
    if (!wallOk) return log(false, 'wall_invalid');
    const dir = -p.wallDir || -p.facing;
    p.vx = dir * feel.wall.wall_jump_vx;
    let vy = feel.wall.wall_jump_vy;
    if (p.superJumpCharges > 0) {
      vy *= feel.super_jump.super_jump_mul;
      p.superJumpCharges -= 1;
    }
    p.vy = vy;
    p.onWall = false;
    p.onGround = false;
    p.surface = null;
    p.platformId = null;
    p.clingLeft = 0;
    p.wallGraceLeft = 0;
    p.regrabLockLeft = feel.wall.wall_regrab_lock_ms / 1000;
    p.lockedWallSeg = p.wallDir;
    p.jumpHoldActive = true;
    p.jumpHoldTime = 0;
    p.coyoteLeft = 0;
    p.bufferLeft = 0;
    p.facing = dir;
    sim.comboTimer = Math.max(sim.comboTimer, feel.wall.wall_combo_refresh_ms / 1000);
    sim.style += feel.wall.wall_style * sim.styleMult;
    sim.hitstopFrames = 0;
    sim.wallJumps += 1;
    queueSfx(sim, 'wall');
    return log(true, 'none', 'wall');
  }

  // Already rising from a jump this contact — not a miss, just no double-jump
  if (!p.onGround && p.coyoteLeft <= 0 && p.vy > 50 && p.jumpHoldActive) {
    return log(false, 'already_airborne');
  }

  if (!p.onGround && p.coyoteLeft <= 0) {
    return log(false, p.coyoteLeft <= 0 && !p.onGround ? 'not_grounded' : 'no_coyote');
  }
  if (!p.onGround && p.coyoteLeft > 0) {
    // coyote ok
  } else if (!p.onGround) {
    return log(false, 'no_coyote');
  }

  const carry = clamp(Math.abs(p.vx) / feel.horizontal.max_run_speed, 0, 1.25);
  let vy =
    J.jump_speed_base * (1.0 + J.jump_speed_from_run * Math.pow(carry, J.jump_carry_exp));
  if (p.superJumpCharges > 0) {
    vy *= feel.super_jump.super_jump_mul;
    p.superJumpCharges -= 1;
  }
  p.vy = vy;
  p.onGround = false;
  p.surface = null;
  p.platformId = null;
  p.coyoteLeft = 0;
  p.bufferLeft = 0;
  p.jumpHoldActive = true;
  p.jumpHoldTime = 0;
  queueSfx(sim, 'jump');
  return log(true, 'none', 'ground');
}

function findLandPlatform(
  sim: SimState,
  feel: FeelParams,
  prevBottom: number,
  feet: AABB,
): Platform | null {
  const slop = feel.body.land_y_slop;
  let best: Platform | null = null;
  let bestTop = -Infinity;
  for (const plat of sim.platforms) {
    if (plat.kind === 'spike' || plat.gone) continue;
    const top = plat.y + plat.h;
    const wasAbove = prevBottom >= top - slop;
    const nowAtOrBelow = feet.y <= top + slop;
    if (!wasAbove || !nowAtOrBelow) continue;
    if (feet.y < top - 40) continue;
    const overlap = horizontalOverlapRatio(feet, plat);
    if (overlap < feel.body.min_land_overlap) continue;
    if (top >= bestTop) {
      bestTop = top;
      best = plat;
    }
  }
  return best;
}

function resolveWall(sim: SimState, feel: FeelParams, input: InputFrame): void {
  const p = sim.player;
  if (p.onGround) {
    p.onWall = false;
    p.clingLeft = 0;
    return;
  }
  const wb = wallBox(p, feel);
  let hitDir = 0;
  let hitSeg: number | null = null;
  for (const wall of sim.walls) {
    if (
      wb.x < wall.x + wall.w &&
      wb.x + wb.w > wall.x &&
      wb.y < wall.y + wall.h &&
      wb.y + wb.h > wall.y
    ) {
      hitDir = wall.x + wall.w / 2 < p.x ? -1 : 1;
      hitSeg = wall.id;
      break;
    }
  }
  if (!hitDir) {
    p.onWall = false;
    return;
  }
  const wish = wishX(input);
  const movingIn =
    wish === hitDir ||
    (hitDir < 0 && p.vx < -feel.wall.wall_enter_speed) ||
    (hitDir > 0 && p.vx > feel.wall.wall_enter_speed);
  const locked = p.regrabLockLeft > 0 && p.lockedWallSeg === hitSeg;

  if (p.onWall) {
    if (wish === -p.wallDir) {
      p.onWall = false;
      p.wallGraceLeft = feel.wall.wall_grace_ms / 1000;
    }
    return;
  }
  if (movingIn && !locked) {
    p.onWall = true;
    p.wallDir = hitDir;
    p.clingLeft = feel.wall.wall_cling_ms / 1000;
    p.vx = 0;
    p.facing = -hitDir;
    p.wallGraceLeft = 0;
  }
}

function collectPickups(sim: SimState, feel: FeelParams): void {
  const p = sim.player;
  const hb = hurtBox(p, feel);
  const magnet = p.magnetLeft > 0;
  for (const pk of sim.pickups) {
    if (pk.taken) continue;
    let px = pk.x;
    let py = pk.y;
    if (magnet) {
      const dx = p.x - px;
      const dy = p.y + feel.body.hurt_h / 2 - py;
      const dist = Math.hypot(dx, dy);
      if (dist < 120 && dist > 1) {
        pk.x += (dx / dist) * 220 * (1 / 120);
        pk.y += (dy / dist) * 220 * (1 / 120);
        px = pk.x;
        py = pk.y;
      }
    }
    const dx = p.x - px;
    const dy = p.y + feel.body.hurt_h / 2 - py;
    if (Math.hypot(dx, dy) > pk.r + 18) continue;
    // AABB soft
    if (
      Math.abs(dx) > feel.body.hurt_w / 2 + pk.r &&
      Math.abs(dy) > feel.body.hurt_h / 2 + pk.r
    ) {
      continue;
    }
    pk.taken = true;
    switch (pk.kind) {
      case 'coin':
        if (!sim.bankDisabled) sim.banRun += Math.max(1, Math.round(1 * sim.luckMul));
        queueSfx(sim, 'coin');
        break;
      case 'coin_gold':
        if (!sim.bankDisabled) sim.banRun += Math.max(1, Math.round(5 * sim.luckMul));
        queueSfx(sim, 'coin');
        break;
      case 'super_jump':
        p.superJumpCharges = Math.min(
          feel.super_jump.super_jump_max_stacks,
          p.superJumpCharges + 1,
        );
        queueSfx(sim, 'power');
        break;
      case 'shield':
        p.shield = true;
        queueSfx(sim, 'power');
        break;
      case 'float':
        p.floatLeft = 5;
        queueSfx(sim, 'power');
        break;
      case 'magnet':
        p.magnetLeft = 8;
        queueSfx(sim, 'power');
        break;
      case 'speed':
        p.speedLeft = 6;
        queueSfx(sim, 'power');
        break;
    }
  }
}

function hazardCheck(sim: SimState, feel: FeelParams): void {
  const p = sim.player;
  if (p.iFrames > 0) return;
  const hb = hurtBox(p, feel);
  for (const plat of sim.platforms) {
    if (plat.kind !== 'spike') continue;
    if (
      hb.x < plat.x + plat.w &&
      hb.x + hb.w > plat.x &&
      hb.y < plat.y + plat.h &&
      hb.y + hb.h > plat.y
    ) {
      if (p.shield) {
        p.shield = false;
        p.iFrames = 0.8;
        p.vy = 280;
        queueSfx(sim, 'power');
        sim.hitstopFrames = 3;
      } else {
        sim.dead = true;
        sim.deathCause = 'spike';
        queueSfx(sim, 'spike');
        queueSfx(sim, 'death');
      }
      break;
    }
  }
}

export function stepSim(sim: SimState, feel: FeelParams, input: InputFrame, dt: number): void {
  if (sim.dead || sim.summit) return;

  const p = sim.player;
  const H = feel.horizontal;
  const J = feel.jump;

  jumpDebugTick();

  // Always accept jump presses (even during hitstop) so taps are never dropped
  if (input.jumpDown) p.bufferLeft = Math.max(p.bufferLeft, J.jump_buffer_ms / 1000);

  if (sim.hitstopFrames > 0) {
    sim.hitstopFrames -= 1;
    // Buffer stays armed; do not attempt while frozen (H3)
    if (isJumpDebugEnabled()) {
      jumpDebugPush({
        kind: 'step',
        onGround: p.onGround,
        coyoteMs: p.coyoteLeft * 1000,
        bufferMs: p.bufferLeft * 1000,
        jumpDown: input.jumpDown,
        jumpHeld: input.jumpHeld,
        vy: p.vy,
        state: playerState(sim),
        note: 'hitstop',
      });
    }
    return;
  }

  const speedMul = p.speedLeft > 0 ? 1.35 : 1;
  const maxRun = H.max_run_speed * speedMul;

  sim.elapsed += dt;
  if (p.iFrames > 0) p.iFrames -= dt;
  if (p.floatLeft > 0) p.floatLeft -= dt;
  if (p.magnetLeft > 0) p.magnetLeft -= dt;
  if (p.speedLeft > 0) p.speedLeft -= dt;

  if (!p.onGround && p.coyoteLeft > 0) p.coyoteLeft -= dt;
  if (p.regrabLockLeft > 0) p.regrabLockLeft -= dt;
  if (p.wallGraceLeft > 0) p.wallGraceLeft -= dt;
  if (sim.comboTimer > 0) {
    sim.comboTimer -= dt;
    if (sim.comboTimer <= 0) sim.combo = 0;
  }

  // H2: if feet rest on pad and not rising, force grounded truth before jump attempts
  syncGroundedFromFeet(sim, feel);

  // Jump EARLY while grounded/coyote/wall — before movement so platform presses feel instant.
  // Order (E.3): arm buffer → attempt → move → land → attempt again → tick buffer
  const wallJumpValid =
    (p.onWall && p.clingLeft > 0) || (!p.onWall && p.wallGraceLeft > 0 && p.wallDir !== 0);
  if (p.bufferLeft > 0 || input.jumpDown) {
    if (wallJumpValid) tryJump(sim, feel, true, input);
    else if (p.onGround || p.coyoteLeft > 0) tryJump(sim, feel, false, input);
  }

  const wish = wishX(input);
  if (wish !== 0) p.facing = wish;

  if (p.onWall && p.clingLeft > 0) {
    p.clingLeft -= dt;
    p.vy -= feel.wall.wall_slide_gravity * dt;
    p.vy = Math.max(p.vy, -feel.wall.wall_slide_max);
    p.vx = 0;
    if (p.clingLeft <= 0) {
      p.onWall = false;
      p.wallGraceLeft = feel.wall.wall_grace_ms / 1000;
    }
    if (wish !== 0 && wish === -p.wallDir) {
      p.onWall = false;
      p.clingLeft = 0;
      p.wallGraceLeft = feel.wall.wall_grace_ms / 1000;
    }
  } else {
    let accel = H.accel_air;
    let fric = H.air_drag;
    if (p.onGround) {
      const surf = p.surface ?? 'block';
      if (surf === 'ice') {
        accel = H.accel_ice;
        fric = H.friction_ice;
      } else if (surf === 'peel') {
        accel = H.accel_peel;
        fric = H.friction_peel;
      } else {
        accel = H.accel_ground;
        fric = H.friction_ground;
      }
      if (p.speedLeft > 0) accel *= 1.15;
    } else {
      accel = H.accel_ground * H.air_control;
      fric = H.air_drag;
    }
    if (wish !== 0) p.vx += wish * accel * dt;
    else p.vx = approach(p.vx, 0, fric * dt);
    p.vx = clamp(p.vx, -maxRun, maxRun);

    if (!p.onGround) {
      if (p.jumpHoldActive && input.jumpHeld && p.jumpHoldTime < J.jump_hold_max && p.vy > 0) {
        p.jumpHoldTime += dt;
        p.vy += J.jump_hold_accel * dt;
      } else if (p.jumpHoldActive && !input.jumpHeld && p.vy > 0) {
        p.vy *= J.jump_cut_multiplier;
        p.jumpHoldActive = false;
      }
      if (p.jumpHoldTime >= J.jump_hold_max) p.jumpHoldActive = false;
      const gMul = p.floatLeft > 0 ? 0.45 : 1;
      p.vy -= J.gravity * gMul * dt;
      p.vy = Math.max(p.vy, -J.max_fall_speed);
    }
  }

  const prevBottom = p.y;
  const wasGrounded = p.onGround;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  const hb = hurtBox(p, feel);
  for (const wall of sim.walls) {
    if (
      hb.x < wall.x + wall.w &&
      hb.x + hb.w > wall.x &&
      hb.y < wall.y + wall.h &&
      hb.y + hb.h > wall.y
    ) {
      const overlapL = hb.x + hb.w - wall.x;
      const overlapR = wall.x + wall.w - hb.x;
      if (overlapL < overlapR) {
        p.x -= overlapL;
        if (p.vx > 0) p.vx = 0;
      } else {
        p.x += overlapR;
        if (p.vx < 0) p.vx = 0;
      }
    }
  }

  let justLanded = false;
  {
    const feet = feetBox(p, feel);
    const plat = findLandPlatform(sim, feel, prevBottom, feet);
    // Only land when falling/resting (vy<=0) or staying grounded — never while rising
    if (plat && (p.vy <= 0 || wasGrounded)) {
      const top = plat.y + plat.h;
      const surface = plat.kind as Surface;
      const firstContact = !wasGrounded;
      const impactVy = Math.max(0, -p.vy);
      p.y = top;
      p.vy = 0;
      p.onGround = true;
      p.onWall = false;
      p.surface = surface;
      p.platformId = plat.id;
      p.coyoteLeft = 0;
      p.jumpHoldActive = false;
      if (firstContact) {
        justLanded = true;
        const edge = clamp(Math.abs(p.x - (plat.x + plat.w / 2)) / (plat.w / 2), 0, 1);
        const grade = computeGrade(feel, impactVy, edge, surface);
        sim.lastLand = { grade, impact: impactVy, edge, surface };
        sim.landFlash = true;
        applyGradeGameplay(sim, feel, grade, surface);
        sim.hitstopFrames = 0;
        if (plat.kind === 'crumble' && plat.crumbleArmedAt == null) {
          plat.crumbleArmedAt = sim.elapsed;
          queueSfx(sim, 'land_scuff');
        }
        if (plat.kind === 'spring') {
          p.vy = feel.spring.spring_vy * 0.92;
          p.vx *= feel.spring.spring_vx_keep;
          p.onGround = false;
          p.surface = null;
          p.platformId = null;
          p.jumpHoldActive = feel.spring.spring_allow_hold;
          p.jumpHoldTime = 0;
          sim.hitstopFrames = 0;
          queueSfx(sim, 'spring');
          justLanded = false;
        }
      }
    } else if (wasGrounded) {
      p.onGround = false;
      p.surface = null;
      p.platformId = null;
      p.coyoteLeft = J.coyote_ms / 1000;
    }
  }

  // Same-frame re-jump after landing (bunny-hop / buffered land / hold-through land C5)
  if (p.onGround && (p.bufferLeft > 0 || input.jumpDown || (justLanded && input.jumpHeld))) {
    if (justLanded && input.jumpHeld) {
      p.bufferLeft = Math.max(p.bufferLeft, J.jump_buffer_ms / 1000);
    }
    tryJump(sim, feel, false, input);
  }

  // H5: Tick jump buffer AFTER all attempts so a press the same frame always gets a try
  if (p.bufferLeft > 0) p.bufferLeft = Math.max(0, p.bufferLeft - dt);

  if (isJumpDebugEnabled()) {
    jumpDebugPush({
      kind: 'step',
      onGround: p.onGround,
      coyoteMs: p.coyoteLeft * 1000,
      bufferMs: p.bufferLeft * 1000,
      jumpDown: input.jumpDown,
      jumpHeld: input.jumpHeld,
      vy: p.vy,
      state: playerState(sim),
      note: justLanded ? 'justLanded' : undefined,
    });
  }

  if (justLanded && isJumpDebugEnabled()) {
    jumpDebugPush({
      kind: 'land',
      onGround: p.onGround,
      coyoteMs: p.coyoteLeft * 1000,
      bufferMs: p.bufferLeft * 1000,
      jumpDown: input.jumpDown,
      jumpHeld: input.jumpHeld,
      vy: p.vy,
      state: playerState(sim),
    });
  }

  // movers + crumble
  for (const plat of sim.platforms) {
    if (plat.kind === 'move' && plat.baseX != null && plat.moveAmp && plat.movePeriod) {
      const t = sim.elapsed;
      plat.x = plat.baseX + Math.sin(t * ((Math.PI * 2) / plat.movePeriod) + (plat.movePhase ?? 0)) * plat.moveAmp;
      if (p.onGround && p.platformId === plat.id) {
        // ride: approx follow x delta each step via re-place
        p.x +=
          Math.cos(t * ((Math.PI * 2) / plat.movePeriod) + (plat.movePhase ?? 0)) *
          plat.moveAmp *
          ((Math.PI * 2) / plat.movePeriod) *
          dt;
      }
    }
    if (plat.kind === 'crumble' && plat.crumbleArmedAt != null && !plat.gone) {
      const arm = (plat.crumbleArmMs ?? 350) / 1000;
      if (sim.elapsed - plat.crumbleArmedAt >= arm) {
        plat.gone = true;
        if (p.platformId === plat.id) {
          p.onGround = false;
          p.surface = null;
          p.platformId = null;
          p.coyoteLeft = feel.jump.coyote_ms / 1000;
        }
        queueSfx(sim, 'land_scuff');
      }
    }
  }

  // snowballs
  const hb2 = hurtBox(p, feel);
  for (const sb of sim.snowballs) {
    if (!sb.alive) continue;
    sb.x += sb.vx * dt;
    if (sb.x < 20 || sb.x > 700) sb.vx *= -1;
    const dx = p.x - sb.x;
    const dy = p.y + feel.body.hurt_h / 2 - sb.y;
    if (Math.hypot(dx, dy) < sb.r + 16) {
      if (p.iFrames > 0) continue;
      if (p.shield) {
        p.shield = false;
        p.iFrames = 0.8;
        p.vx += Math.sign(sb.vx) * 200;
        p.vy = 200;
        queueSfx(sim, 'power');
      } else {
        p.vx += Math.sign(sb.vx || 1) * 280;
        p.vy = 200;
        p.onGround = false;
        queueSfx(sim, 'spike');
      }
    }
  }

  if (!p.onGround) resolveWall(sim, feel, input);
  collectPickups(sim, feel);
  hazardCheck(sim, feel);

  sim.heightPx = Math.max(0, p.y - sim.spawnY);
  sim.maxHeightPx = Math.max(sim.maxHeightPx, sim.heightPx);

  if (p.y < sim.killY) {
    sim.dead = true;
    sim.deathCause = 'fall';
    queueSfx(sim, 'death');
  }
  // world mode needs summit; endless/daily never summit (lab optional no summit)
  if (!sim.endless && sim.mode !== 'daily' && p.y + feel.body.hurt_h >= sim.summitY) {
    sim.summit = true;
    p.vy = 0;
    queueSfx(sim, 'summit');
  }
}

export function drainSfx(sim: SimState): string[] {
  const q = sim.sfxQueue.slice();
  sim.sfxQueue.length = 0;
  return q;
}

export function getDebug(sim: SimState, feel: FeelParams): SimDebug {
  const p = sim.player;
  let state = 'air';
  if (sim.dead) state = 'dead';
  else if (sim.summit) state = 'summit';
  else if (p.onWall) state = 'wall';
  else if (p.onGround) state = 'ground';
  const powers = [
    p.superJumpCharges ? `J${p.superJumpCharges}` : '',
    p.shield ? 'S' : '',
    p.floatLeft > 0 ? `F${p.floatLeft.toFixed(1)}` : '',
    p.magnetLeft > 0 ? `M${p.magnetLeft.toFixed(1)}` : '',
    p.speedLeft > 0 ? `Sp${p.speedLeft.toFixed(1)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    speedPct: Math.abs(p.vx) / feel.horizontal.max_run_speed,
    gradeLast: sim.lastLand?.grade ?? null,
    impactLast: sim.lastLand?.impact ?? 0,
    edgeLast: sim.lastLand?.edge ?? 0,
    coyoteMs: Math.max(0, p.coyoteLeft * 1000),
    bufferMs: Math.max(0, p.bufferLeft * 1000),
    clingMs: Math.max(0, p.clingLeft * 1000),
    regrabMs: Math.max(0, p.regrabLockLeft * 1000),
    state,
    surface: p.surface ?? (p.onWall ? 'wall' : 'air'),
    powers,
  };
}
