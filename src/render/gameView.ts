import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { AssetBank } from '../assets/assetBank';
import type { FeelParams } from '../content/feelParams';
import type { SimState } from '../core/physics/sim';
import type { WorldSpec } from '../worldgen/types';

const FALLBACK: Record<string, number> = {
  ice: 0x5ec8e8,
  block: 0x6b5a4a,
  peel: 0xffd84d,
  spring: 0x6bcb3c,
  spike: 0xff4d6a,
  wall: 0x2a3a5c,
  crumble: 0xd4894a,
  move: 0x4da3ff,
};

export class GameView {
  app: Application;
  world = new Container();
  bgFar = new Sprite();
  bgMid = new Sprite();
  bgNear = new Sprite();
  platLayer = new Container();
  pickupLayer = new Container();
  playerSprite = new Sprite();
  fxLayer = new Container();
  fxPerfect = new Sprite();
  fxCombo = new Sprite();
  summitLabel: Text;
  camX = 0;
  camY = 0;
  designW = 720;
  designH = 1280;
  /** Multiplier on fit-scale; >1 = zoomed in */
  viewZoom = 1.18;
  private platSprites: { spr: Sprite | Graphics; id: number }[] = [];
  private wallG = new Graphics();
  private snowG = new Graphics();
  private landFxT = 0;
  private comboFxT = 0;
  private summitT = 0;
  private trauma = 0;
  reduceMotion = false;
  reduceShake = false;

  constructor(
    app: Application,
    private assets: AssetBank,
  ) {
    this.app = app;
    this.bgFar.alpha = 0.9;
    this.bgMid.alpha = 0.75;
    this.bgNear.alpha = 0.55;
    this.world.addChild(this.bgFar, this.bgMid, this.bgNear);
    this.world.addChild(this.wallG);
    this.world.addChild(this.snowG);
    this.world.addChild(this.platLayer);
    this.world.addChild(this.pickupLayer);
    this.world.addChild(this.playerSprite);
    this.fxPerfect.anchor.set(0.5);
    this.fxCombo.anchor.set(0.5);
    this.fxPerfect.visible = false;
    this.fxCombo.visible = false;
    this.fxLayer.addChild(this.fxPerfect, this.fxCombo);
    this.world.addChild(this.fxLayer);
    this.summitLabel = new Text({
      text: 'SUMMIT',
      style: { fill: 0xffe14a, fontSize: 20, fontWeight: '700', fontFamily: 'system-ui' },
    });
    this.world.addChild(this.summitLabel);
    this.playerSprite.anchor.set(0.5, 1);
    app.stage.addChild(this.world);
  }

  resize(world: WorldSpec, viewZoom?: number): void {
    this.designW = world.designW;
    this.designH = world.designH;
    if (viewZoom != null && viewZoom > 0) this.viewZoom = viewZoom;
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    const fit = Math.min(w / this.designW, h / this.designH);
    const scale = fit * this.viewZoom;
    this.world.scale.set(scale);
    // Center; zoom >1 crops edges slightly so playfield feels larger
    this.world.x = (w - this.designW * scale) / 2;
    this.world.y = (h - this.designH * scale) / 2;
  }

  private flipY(y: number, h = 0): number {
    return this.designH - y - h;
  }

  bakeWorld(world: WorldSpec): void {
    this.platLayer.removeChildren();
    this.pickupLayer.removeChildren();
    this.platSprites = [];
    this.wallG.clear();

    const setBg = (spr: Sprite, id: string, yOff: number) => {
      const t = this.assets.get(id);
      if (t) {
        spr.texture = t;
        spr.width = this.designW * 1.4;
        spr.height = this.designH * 1.2;
        spr.x = -this.designW * 0.2;
        spr.y = yOff;
      } else {
        spr.texture = Texture.EMPTY;
      }
    };
    setBg(this.bgFar, 'bg_far', -200);
    setBg(this.bgMid, 'bg_mid', -100);
    setBg(this.bgNear, 'bg_near', 0);

    for (const wall of world.walls) {
      this.wallG.rect(wall.x, this.flipY(wall.y, wall.h), wall.w, wall.h);
      this.wallG.fill(FALLBACK.wall);
    }

    for (const p of world.platforms) {
      const key =
        p.kind === 'ice'
          ? 'plat_ice'
          : p.kind === 'block'
            ? 'plat_block'
            : p.kind === 'peel'
              ? 'plat_peel'
              : p.kind === 'spring'
                ? 'plat_spring'
                : p.kind === 'spike'
                  ? 'hz_spike'
                  : p.kind === 'crumble'
                    ? 'plat_block'
                    : p.kind === 'move'
                      ? 'plat_ice'
                      : 'plat_block';
      const tex = this.assets.get(key);
      if (tex && p.kind !== 'crumble' && p.kind !== 'move') {
        const s = new Sprite(tex);
        s.anchor.set(0.5, 1);
        s.width = p.w;
        s.height = Math.max(p.h * (p.kind === 'spike' ? 2.2 : 2.4), 28);
        s.x = p.x + p.w / 2;
        s.y = this.flipY(p.y + p.h, 0);
        s.tint = 0xffffff;
        this.platLayer.addChild(s);
        this.platSprites.push({ spr: s, id: p.id });
      } else {
        const g = new Graphics();
        g.roundRect(p.x, this.flipY(p.y, p.h), p.w, p.h, 4);
        g.fill(FALLBACK[p.kind] ?? 0xffffff);
        this.platLayer.addChild(g);
        this.platSprites.push({ spr: g, id: p.id });
      }
    }

    for (const pk of world.pickups) {
      const key =
        pk.kind === 'coin'
          ? 'coin'
          : pk.kind === 'coin_gold'
            ? 'coin_gold'
            : pk.kind === 'super_jump'
              ? 'pw_jump'
              : pk.kind === 'shield'
                ? 'pw_shield'
                : pk.kind === 'float'
                  ? 'pw_float'
                  : pk.kind === 'magnet'
                    ? 'pw_magnet'
                    : 'pw_speed';
      const tex = this.assets.get(key);
      if (tex) {
        const s = new Sprite(tex);
        s.anchor.set(0.5);
        s.width = pk.r * 2.2;
        s.height = pk.r * 2.2;
        s.x = pk.x;
        s.y = this.flipY(pk.y);
        s.label = `pk_${pk.id}`;
        this.pickupLayer.addChild(s);
      }
    }

    this.summitLabel.x = world.designW / 2 - 40;
    this.summitLabel.y = this.flipY(world.summitY) - 28;
    this.summitLabel.visible = !world.endless;

    const fxP = this.assets.get('fx_perfect');
    const fxC = this.assets.get('fx_combo');
    if (fxP) this.fxPerfect.texture = fxP;
    if (fxC) this.fxCombo.texture = fxC;
    this.fxPerfect.width = this.fxPerfect.height = 120;
    this.fxCombo.width = this.fxCombo.height = 100;

    const idle = this.assets.get('hero_idle');
    if (idle) {
      this.playerSprite.texture = idle;
      this.playerSprite.width = 56;
      this.playerSprite.height = 64;
    }
  }

  private heroTex(sim: SimState): Texture | null {
    const p = sim.player;
    if (sim.dead) return this.assets.get('hero_death');
    if (p.onWall) return this.assets.get('hero_wall');
    if (p.onGround) {
      if (sim.landFlash || (sim.lastLand && sim.comboTimer > 1.6)) return this.assets.get('hero_land');
      if (Math.abs(p.vx) > 40) return this.assets.get('hero_run');
      return this.assets.get('hero_idle');
    }
    if (p.vy > 120) return this.assets.get('hero_jump');
    if (p.vy > -80) return this.assets.get('hero_apex');
    return this.assets.get('hero_fall');
  }

  sync(sim: SimState, feel: FeelParams, alpha: number, prevX: number, prevY: number): void {
    const p = sim.player;
    const x = prevX + (p.x - prevX) * alpha;
    const y = prevY + (p.y - prevY) * alpha;
    const screenY = this.flipY(y);

    const tex = this.heroTex(sim);
    if (tex) this.playerSprite.texture = tex;
    this.playerSprite.width = 56;
    this.playerSprite.height = 64;
    this.playerSprite.scale.x = p.facing >= 0 ? Math.abs(this.playerSprite.scale.x) : -Math.abs(this.playerSprite.scale.x);
    if (p.iFrames > 0 && Math.floor(p.iFrames * 20) % 2 === 0) this.playerSprite.alpha = 0.5;
    else this.playerSprite.alpha = 1;

    // platforms gone / movers
    for (const { spr, id } of this.platSprites) {
      const plat = sim.platforms.find((p) => p.id === id);
      if (!plat) continue;
      spr.visible = !plat.gone;
      if (plat.kind === 'move' && spr instanceof Sprite) {
        spr.x = plat.x + plat.w / 2;
        spr.y = this.flipY(plat.y + plat.h, 0);
      }
      if (plat.kind === 'crumble' && plat.crumbleArmedAt != null && spr instanceof Graphics) {
        spr.alpha = 0.55 + 0.45 * Math.sin(sim.elapsed * 20);
      }
    }

    // pickups visibility
    for (const child of this.pickupLayer.children) {
      const id = Number(String(child.label).replace('pk_', ''));
      const pk = sim.pickups.find((q) => q.id === id);
      if (!pk) continue;
      child.visible = !pk.taken;
      child.x = pk.x;
      child.y = this.flipY(pk.y);
    }

    // land / combo juice
    if (sim.landFlash && sim.lastLand) {
      const g = sim.lastLand.grade;
      if (g === 'perfect' || g === 'great') {
        this.fxPerfect.visible = true;
        this.fxPerfect.x = x;
        this.fxPerfect.y = screenY - 20;
        this.fxPerfect.alpha = g === 'perfect' ? 1 : 0.65;
        this.landFxT = this.reduceMotion ? 0.12 : 0.4;
      }
      if (g === 'scuff' && !this.reduceShake) this.trauma = Math.min(1, this.trauma + 0.12);
      if (g === 'perfect' && !this.reduceShake) this.trauma = Math.min(1, this.trauma + 0.04);
    }
    if (sim.combo >= 5 && sim.landFlash) {
      this.fxCombo.visible = true;
      this.fxCombo.x = x;
      this.fxCombo.y = screenY - 50;
      this.comboFxT = this.reduceMotion ? 0.15 : 0.45;
    }
    if (this.landFxT > 0) {
      this.landFxT -= 1 / 60;
      const s = this.reduceMotion ? 1 : 1 + (0.4 - this.landFxT) * 1.2;
      this.fxPerfect.scale.set(s);
      if (this.landFxT <= 0) this.fxPerfect.visible = false;
    }
    if (this.comboFxT > 0) {
      this.comboFxT -= 1 / 60;
      if (this.comboFxT <= 0) this.fxCombo.visible = false;
    }

    // summit ceremony: slow cam rise + gold pulse
    if (sim.summit) {
      this.summitT += 1 / 60;
      this.summitLabel.alpha = 0.7 + 0.3 * Math.sin(this.summitT * 6);
      this.summitLabel.scale.set(1 + Math.min(0.25, this.summitT * 0.15));
      if (!this.reduceMotion && this.summitT < 0.8) {
        // gentle rise bias
      }
    } else {
      this.summitT = 0;
      this.summitLabel.alpha = 1;
      this.summitLabel.scale.set(1);
    }

    // Camera: keep player low on screen so more of the climb is visible above
    const screenFrac = feel.camera.player_screen_y ?? 0.78;
    let targetCamX =
      x - this.designW / 2 + Math.sign(p.vx) * Math.min(Math.abs(p.vx) / feel.horizontal.max_run_speed, 1) * 28;
    let targetCamY = screenY - this.designH * screenFrac;
    if (sim.summit) {
      targetCamY = this.flipY(sim.summitY) - this.designH * 0.55;
      targetCamX = 0;
    }
    const dt = 1 / 60;
    const lx = this.reduceMotion ? 14 : feel.camera.cam_lerp_x;
    // Snappier vertical follow so look-ahead feels immediate, not laggy
    let ly = sim.summit ? 3 : this.reduceMotion ? 14 : feel.camera.cam_lerp_y_rise;
    if (p.vy > 80) ly = Math.max(ly, feel.camera.cam_lerp_y_rise * 1.35);
    if (p.vy < -200) ly = feel.camera.cam_lerp_y_fall;
    this.camX += (targetCamX - this.camX) * (1 - Math.exp(-lx * dt));
    this.camY += (targetCamY - this.camY) * (1 - Math.exp(-ly * dt));

    // shake trauma
    this.trauma = Math.max(0, this.trauma - 1.4 * dt);
    let shakeX = 0;
    let shakeY = 0;
    if (!this.reduceShake && this.trauma > 0.01) {
      const amp = 10 * this.trauma * this.trauma;
      shakeX = (Math.random() - 0.5) * 2 * amp;
      shakeY = (Math.random() - 0.5) * 2 * amp;
    }
    const camX = this.camX + shakeX;
    const camY = this.camY + shakeY;

    // snowballs (after cam)
    this.snowG.clear();
    for (const sb of sim.snowballs) {
      if (!sb.alive) continue;
      this.snowG.circle(sb.x, this.flipY(sb.y), sb.r);
      this.snowG.fill(0xe8f6ff);
    }

    this.wallG.position.set(-camX, -camY);
    this.snowG.position.set(-camX, -camY);
    this.platLayer.position.set(-camX, -camY);
    this.pickupLayer.position.set(-camX, -camY);
    this.playerSprite.position.set(x - camX, screenY - camY);
    this.fxLayer.position.set(-camX, -camY);
    this.summitLabel.position.set(this.designW / 2 - 40 - camX, this.flipY(sim.summitY) - 28 - camY);

    this.bgFar.x = -this.designW * 0.2 - this.camX * 0.15;
    this.bgFar.y = -200 - this.camY * 0.1;
    this.bgMid.x = -this.designW * 0.2 - this.camX * 0.3;
    this.bgMid.y = -100 - this.camY * 0.2;
    this.bgNear.x = -this.designW * 0.2 - this.camX * 0.5;
    this.bgNear.y = -this.camY * 0.35;
  }

  /** Call on death for juice */
  addTrauma(t: number): void {
    if (this.reduceShake) return;
    this.trauma = Math.min(1, this.trauma + t);
  }
}
