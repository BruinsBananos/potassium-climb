/** Jump reliability instrumentation (Phase A of jump squash). */

export type JumpFailReason =
  | 'none'
  | 'not_grounded'
  | 'no_coyote'
  | 'already_airborne'
  | 'hitstop_blocked'
  | 'spring'
  | 'dead'
  | 'summit'
  | 'wall_invalid'
  | 'other';

export interface JumpDebugEvent {
  t: number;
  kind: 'input' | 'step' | 'attempt' | 'land';
  onGround: boolean;
  coyoteMs: number;
  bufferMs: number;
  jumpDown: boolean;
  jumpHeld: boolean;
  vy: number;
  state: string;
  jumpAttempted?: boolean;
  jumpSucceeded?: boolean;
  failReason?: JumpFailReason;
  note?: string;
  perfMs?: number;
}

const MAX = 120;
const events: JumpDebugEvent[] = [];
let enabled = false;
/** Record attempts always (tests + live forensics). */
let recordAttemptsAlways = true;
let stepCounter = 0;

export function setJumpDebugEnabled(on: boolean): void {
  enabled = on;
}

export function isJumpDebugEnabled(): boolean {
  return enabled;
}

export function setJumpDebugRecordAttempts(on: boolean): void {
  recordAttemptsAlways = on;
}

function pushRaw(row: JumpDebugEvent): void {
  events.push(row);
  while (events.length > MAX) events.shift();
}

export function jumpDebugPush(ev: Omit<JumpDebugEvent, 't'> & { t?: number }): void {
  if (!enabled) return;
  pushRaw({
    t: ev.t ?? stepCounter,
    kind: ev.kind,
    onGround: ev.onGround,
    coyoteMs: ev.coyoteMs,
    bufferMs: ev.bufferMs,
    jumpDown: ev.jumpDown,
    jumpHeld: ev.jumpHeld,
    vy: ev.vy,
    state: ev.state,
    jumpAttempted: ev.jumpAttempted,
    jumpSucceeded: ev.jumpSucceeded,
    failReason: ev.failReason,
    note: ev.note,
    perfMs: ev.perfMs,
  });
}

/** Record jump attempts (always for automated tests). */
export function jumpDebugAttempt(ev: {
  onGround: boolean;
  coyoteMs: number;
  bufferMs: number;
  jumpDown: boolean;
  jumpHeld: boolean;
  vy: number;
  state: string;
  succeeded: boolean;
  failReason: JumpFailReason;
  note?: string;
}): void {
  if (!enabled && !recordAttemptsAlways) return;
  pushRaw({
    t: stepCounter,
    kind: 'attempt',
    onGround: ev.onGround,
    coyoteMs: ev.coyoteMs,
    bufferMs: ev.bufferMs,
    jumpDown: ev.jumpDown,
    jumpHeld: ev.jumpHeld,
    vy: ev.vy,
    state: ev.state,
    jumpAttempted: true,
    jumpSucceeded: ev.succeeded,
    failReason: ev.failReason,
    note: ev.note,
  });
}

/** Log keyboard/pointer edge with wall-clock timestamp. */
export function jumpDebugInputEdge(source: string, perfMs?: number): void {
  const row: JumpDebugEvent = {
    t: stepCounter,
    kind: 'input',
    onGround: false,
    coyoteMs: 0,
    bufferMs: 0,
    jumpDown: true,
    jumpHeld: true,
    vy: 0,
    state: 'input',
    note: source,
    perfMs: perfMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  };
  if (enabled || recordAttemptsAlways) pushRaw(row);
}

export function jumpDebugTick(): void {
  stepCounter += 1;
}

export function jumpDebugReset(): void {
  events.length = 0;
  stepCounter = 0;
}

export function jumpDebugDump(): JumpDebugEvent[] {
  return events.slice();
}

export function jumpDebugExportJson(): string {
  return JSON.stringify(events, null, 2);
}

export function jumpDebugSuccessCount(): number {
  return events.filter((e) => e.kind === 'attempt' && e.jumpSucceeded).length;
}
