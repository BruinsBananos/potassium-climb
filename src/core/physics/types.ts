export type Surface = 'block' | 'ice' | 'peel' | 'spring' | 'crumble' | 'move';

export type LandGrade = 'perfect' | 'great' | 'ok' | 'scuff';

export type PlatformKind = Surface | 'spike';

export interface Platform {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatformKind;
  solidWall?: boolean;
  /** Crumble */
  crumbleArmMs?: number;
  crumbleFallMs?: number;
  crumbleArmedAt?: number; // sim elapsed when armed
  gone?: boolean;
  /** Move */
  moveAmp?: number;
  movePeriod?: number;
  movePhase?: number;
  baseX?: number;
  baseY?: number;
}

export interface PlayerBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  onGround: boolean;
  surface: Surface | null;
  onWall: boolean;
  wallDir: number;
  platformId: number | null;
  jumpHoldActive: boolean;
  jumpHoldTime: number;
  coyoteLeft: number;
  bufferLeft: number;
  clingLeft: number;
  wallGraceLeft: number;
  regrabLockLeft: number;
  lockedWallSeg: number | null;
  superJumpCharges: number;
  shield: boolean;
  floatLeft: number;
  magnetLeft: number;
  speedLeft: number;
  iFrames: number;
}

export interface LandEvent {
  grade: LandGrade;
  impact: number;
  edge: number;
  surface: Surface;
}

export interface GradeCounts {
  perfect: number;
  great: number;
  ok: number;
  scuff: number;
}

export interface SimDebug {
  speedPct: number;
  gradeLast: LandGrade | null;
  impactLast: number;
  edgeLast: number;
  coyoteMs: number;
  bufferMs: number;
  clingMs: number;
  regrabMs: number;
  state: string;
  surface: string;
  powers: string;
}
