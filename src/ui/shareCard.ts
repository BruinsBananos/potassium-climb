import type { SaveV3 } from '../save/saveService';
import type { SimState } from '../core/physics/sim';

export interface SharePayload {
  playerName: string;
  mode: string;
  biome: string;
  heightM: number;
  style: number;
  comboMax: number;
  grades: { perfect: number; great: number; ok: number; scuff: number };
  date: string;
}

export function buildSharePayload(sim: SimState, save: SaveV3, biomeName: string): SharePayload {
  return {
    playerName: save.player.displayName || 'MonKey',
    mode: sim.endless ? 'Endless' : 'World',
    biome: biomeName,
    heightM: sim.maxHeightPx / 48,
    style: Math.floor(sim.style),
    comboMax: sim.comboMax,
    grades: { ...sim.grades },
    date: new Date().toISOString().slice(0, 10),
  };
}

/** Draw share card to canvas — all text is code-drawn. */
export function renderShareCard(payload: SharePayload, bgImage?: HTMLImageElement | null): HTMLCanvasElement {
  const w = 720;
  const h = 900;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // background
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#0b1020');
  grd.addColorStop(1, '#1c2640');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  if (bgImage) {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(bgImage, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  // frame
  ctx.strokeStyle = '#5ec8e8';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, w - 48, h - 48);
  ctx.strokeStyle = '#ffe14a';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, w - 72, h - 72);

  ctx.fillStyle = '#f4f7ff';
  ctx.font = '700 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Potassium Climb', w / 2, 120);

  ctx.fillStyle = '#c5d0e8';
  ctx.font = '400 18px system-ui, sans-serif';
  ctx.fillText('Elegant ice. Maximum height.', w / 2, 155);

  ctx.fillStyle = '#ffe14a';
  ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText(payload.playerName, w / 2, 220);

  ctx.fillStyle = '#a8e7ff';
  ctx.font = '500 20px system-ui, sans-serif';
  ctx.fillText(`${payload.mode} · ${payload.biome}`, w / 2, 260);

  ctx.fillStyle = '#f4f7ff';
  ctx.font = '700 72px system-ui, sans-serif';
  ctx.fillText(`⬆ ${payload.heightM.toFixed(1)} m`, w / 2, 380);

  ctx.font = '600 32px system-ui, sans-serif';
  ctx.fillText(`★ ${payload.style}   combo ${payload.comboMax}`, w / 2, 450);

  const g = payload.grades;
  ctx.fillStyle = '#c5d0e8';
  ctx.font = '500 22px system-ui, sans-serif';
  ctx.fillText(`P${g.perfect}  G${g.great}  OK${g.ok}  S${g.scuff}`, w / 2, 520);

  ctx.fillStyle = '#6b7b9a';
  ctx.font = '400 16px system-ui, sans-serif';
  ctx.fillText(payload.date, w / 2, 820);
  ctx.fillText('Banano X · feeless height', w / 2, 850);

  return c;
}

export function downloadCanvas(canvas: HTMLCanvasElement, name = 'potassium-climb-share.png'): void {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = name;
  a.click();
}

export function shareText(payload: SharePayload): string {
  return `Potassium Climb — ${payload.heightM.toFixed(1)}m · ★${payload.style} · ${payload.biome} · combo ${payload.comboMax}`;
}
