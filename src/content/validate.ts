import { BIOMES } from './biomes';
import { COSMETICS } from './cosmetics';
import { WEEKLY_POOL } from './challenges';
import { UPGRADES } from './upgrades';

export interface ValidationIssue {
  level: 'error' | 'warn';
  msg: string;
}

export function validateContent(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const b of BIOMES) {
    if (ids.has(b.id)) issues.push({ level: 'error', msg: `Duplicate biome id ${b.id}` });
    ids.add(b.id);
    if (b.goalHeightPx < 1000) issues.push({ level: 'warn', msg: `${b.id} goal very short` });
    if (b.order < 1 || b.order > 8) issues.push({ level: 'error', msg: `${b.id} bad order` });
    const sum = Object.values(b.weights).reduce((a, c) => a + c, 0);
    if (sum <= 0) issues.push({ level: 'error', msg: `${b.id} zero weights` });
    if (b.unlockAfter && !BIOMES.some((x) => x.id === b.unlockAfter)) {
      issues.push({ level: 'error', msg: `${b.id} unlockAfter missing` });
    }
    if (b.teachNotes.length < 1) issues.push({ level: 'warn', msg: `${b.id} no teach notes` });
  }

  // chain integrity
  const ordered = [...BIOMES].sort((a, b) => a.order - b.order);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].unlockAfter !== ordered[i - 1].id) {
      issues.push({
        level: 'warn',
        msg: `Unlock chain break at ${ordered[i].id} (expected after ${ordered[i - 1].id})`,
      });
    }
  }

  const cosIds = new Set<string>();
  for (const c of COSMETICS) {
    if (cosIds.has(c.id)) issues.push({ level: 'error', msg: `Dup cosmetic ${c.id}` });
    cosIds.add(c.id);
    if (c.unlock.type === 'clear' && c.unlock.ref && !ids.has(c.unlock.ref)) {
      issues.push({ level: 'error', msg: `Cosmetic ${c.id} clear ref missing biome` });
    }
  }

  for (const u of UPGRADES) {
    if (u.maxLevel < 1) issues.push({ level: 'error', msg: `Upgrade ${u.id} maxLevel` });
    if (u.costBase < 1) issues.push({ level: 'error', msg: `Upgrade ${u.id} cost` });
  }

  for (const w of WEEKLY_POOL) {
    if (!ids.has(w.biomeId)) issues.push({ level: 'error', msg: `Weekly ${w.id} bad biome` });
  }

  if (BIOMES.filter((b) => b.shipPhase === 'v1').length !== 6) {
    issues.push({ level: 'warn', msg: 'Expected 6 v1 biomes' });
  }
  if (BIOMES.filter((b) => b.shipPhase === 'prestige').length !== 2) {
    issues.push({ level: 'warn', msg: 'Expected 2 prestige biomes' });
  }

  return issues;
}

export function assertContentValid(): void {
  const issues = validateContent();
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length) {
    console.error('[content validation]', errors);
    throw new Error(`Content validation failed: ${errors.map((e) => e.msg).join('; ')}`);
  }
  if (issues.length) console.warn('[content validation warns]', issues);
}
