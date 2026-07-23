import { Application } from 'pixi.js';
import { AssetBank } from './assets/assetBank';
import { AudioEngine } from './audio/audioEngine';
import { biomesInOrder, getBiome, isBiomeUnlocked, nextUnlockAfterClear } from './content/biomes';
import {
  activeWeekly,
  dailyEndlessChallenge,
  resolveChallengeBiome,
  type ChallengeDef,
} from './content/challenges';
import {
  COSMETICS,
  isCosmeticUnlocked,
  type UnlockContext,
} from './content/cosmetics';
import { createFeelParams, type FeelParams } from './content/feelParams';
import {
  applyAllUpgrades,
  luckCoinMul,
  startShieldCharges,
  upgradeCost,
  UPGRADES,
} from './content/upgrades';
import { assertContentValid, validateContent } from './content/validate';
import {
  createSimFromWorld,
  drainSfx,
  getDebug,
  resetSim,
  stepSim,
  type SimState,
} from './core/physics/sim';
import { GameView } from './render/gameView';
import {
  exportSave,
  importSaveJson,
  loadSave,
  pushLeaderboard,
  saveSave,
  updateBiomeBest,
  type SaveV3,
} from './save/saveService';
import { createInput } from './ui/input';
import {
  buildSharePayload,
  downloadCanvas,
  renderShareCard,
  shareText,
} from './ui/shareCard';
import { mapModeToRemote, net } from './net/client';
import { generateWorld } from './worldgen/generator';
import type { WorldSpec } from './worldgen/types';

const COMBO_LINES: Record<number, string> = {
  5: 'Chain snackin’!',
  10: 'DOUBLE DIGITS.',
  15: 'TOWER TOXIC.',
  20: 'LEGENDARY SLIDE.',
};

const TIPS = [
  { at: 0, text: 'Slide first. Jump second. Potassium forever.' },
  { at: 80, text: 'Feel that coast? Speed is fuel.' },
  { at: 280, text: 'Carry a slide into your jump. Standstill is shy.' },
  { at: 480, text: 'Hug the wall, then jump. Clutch is a lifestyle.' },
  { at: 700, text: 'BAN banks between runs. Upgrades later — skill now.' },
];

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

function show(el: HTMLElement, on: boolean): void {
  el.classList.toggle('hidden', !on);
}

function unlockCtx(save: SaveV3): UnlockContext {
  return {
    cleared: save.progress.worldsCleared,
    bestHeightPx: save.player.stats.bestHeightPx,
    bestCombo: save.player.stats.bestCombo,
    bestStyle: save.player.stats.bestStyle,
    totalDeaths: save.player.stats.totalDeaths,
    perfects: save.player.stats.perfects,
    scuffs: save.player.stats.scuffs,
    wallJumps: save.player.stats.wallJumps,
    bankLifetime: save.player.stats.bankLifetime,
    speedUses: save.player.stats.speedUses,
    dailyClaims: save.player.stats.dailyClaims,
    weeklyDone: save.player.stats.weeklyCompletions > 0,
  };
}

function syncCosmetics(save: SaveV3): void {
  const ctx = unlockCtx(save);
  for (const c of COSMETICS) {
    if (isCosmeticUnlocked(c, ctx) && !save.progress.cosmeticsOwned.includes(c.id)) {
      save.progress.cosmeticsOwned.push(c.id);
    }
  }
}

async function main(): Promise<void> {
  assertContentValid();
  console.info('[content]', validateContent());

  let save = loadSave();
  syncCosmetics(save);
  let feel = createFeelParams();
  applyAllUpgrades(feel, save.progress.upgrades);

  const audio = new AudioEngine();
  audio.setVolumes(save.settings.music, save.settings.sfx, save.settings.master);

  const assets = new AssetBank();
  const bootBar = $('boot-bar') as HTMLElement;
  await assets.loadCore((p) => {
    bootBar.style.width = `${Math.floor(p * 100)}%`;
  });

  const app = new Application();
  await app.init({
    background: '#0b1020',
    antialias: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    resizeTo: window,
  });
  $('app').appendChild(app.canvas);

  const view = new GameView(app, assets);
  const input = createInput();
  input.attach();

  $('hub-art').style.backgroundImage = `url(./assets/parallax/frost_keyart.jpg)`;

  let mode: 'hub' | 'climb' = 'hub';
  let world: WorldSpec = generateWorld({ biomeId: 'frost_grove', mode: 'world', seed: 'boot' });
  let sim: SimState = createSimFromWorld(world);
  let pendingChallenge: ChallengeDef | null = null;
  let selectedBiomeId = 'frost_grove';
  let paused = false;
  let showDebug = false;
  let accum = 0;
  let prevX = 0;
  let prevY = 0;
  let toastT = 0;
  let tipT = 0;
  let tipsShown = new Set<number>();
  let lastComboTier = 0;
  let resultsOpen = false;

  const FIXED_DT = 1 / feel.world.physics_hz;

  const hideAllScreens = (): void => {
    for (const id of [
      'screen-hub',
      'screen-worlds',
      'screen-challenges',
      'screen-lb',
      'screen-cosmetics',
      'screen-lab',
      'screen-upgrades',
      'screen-settings',
      'screen-boot',
    ]) {
      show($(id), false);
    }
  };

  const refreshHub = (): void => {
    $('hub-ban').textContent = `🍌 ${save.bank.ban}`;
    const m = (save.player.stats.bestHeightPx / 48).toFixed(1);
    $('hub-best').textContent = `⬆ ${m}m · ★ ${save.player.stats.bestStyle}`;
    const b = getBiome(selectedBiomeId);
    if (b) $('hub-tagline').textContent = `${b.name} — ${b.tagline}`;
  };

  const goHub = (): void => {
    mode = 'hub';
    paused = false;
    resultsOpen = false;
    pendingChallenge = null;
    audio.stopMusic();
    hideAllScreens();
    show($('screen-hub'), true);
    show($('hud'), false);
    show($('modal-pause'), false);
    show($('modal-results'), false);
    show($('modal-share'), false);
    show($('app'), false);
    refreshHub();
  };

  const renderWorlds = (): void => {
    const list = $('world-list');
    list.innerHTML = '';
    for (const b of biomesInOrder()) {
      const open = isBiomeUnlocked(b.id, save.progress.worldsCleared, save.progress.worldsUnlocked);
      const best = save.progress.biomeBests[b.id];
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <h3>${b.name} ${b.shipPhase === 'prestige' ? '★' : ''}</h3>
        <div class="meta">${b.tagline}</div>
        <div class="meta">Goal ${(b.goalHeightPx / 48).toFixed(0)}m · ★×${b.styleMult} · clear +${b.clearBonus}🍌</div>
        <div class="meta">${best ? `Best ${(best.heightPx / 48).toFixed(1)}m · clears ${best.clears}` : 'No runs yet'}</div>
        <button type="button" class="btn primary" ${open ? '' : 'disabled'}>${open ? 'Start Climb' : 'Locked'}</button>`;
      const btn = card.querySelector('button')!;
      btn.onclick = () => {
        if (!open) return;
        selectedBiomeId = b.id;
        startClimb({ mode: 'world', biomeId: b.id });
      };
      list.appendChild(card);
    }
  };

  const renderUpgrades = (): void => {
    const list = $('upgrade-list');
    list.innerHTML = '';
    $('up-ban').textContent = `🍌 ${save.bank.ban}`;
    for (const u of UPGRADES) {
      const lv = save.progress.upgrades[u.id] ?? 0;
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      const cost = upgradeCost(u, lv);
      const maxed = lv >= u.maxLevel;
      card.innerHTML = `
        <h3>${u.name}</h3>
        <div class="meta">Lv ${lv}/${u.maxLevel} · ${u.flavor}</div>
        <button type="button" class="btn primary" ${maxed || save.bank.ban < cost ? 'disabled' : ''}>
          ${maxed ? 'MAXED' : `Upgrade · ${cost}🍌`}
        </button>`;
      card.querySelector('button')!.onclick = () => {
        if (maxed || save.bank.ban < cost) return;
        save.bank.ban -= cost;
        save.progress.upgrades[u.id] = lv + 1;
        feel = createFeelParams();
        applyAllUpgrades(feel, save.progress.upgrades);
        saveSave(save);
        audio.playCue('upgrade');
        renderUpgrades();
        refreshHub();
      };
      list.appendChild(card);
    }
  };

  const renderCosmetics = (): void => {
    syncCosmetics(save);
    const list = $('cos-list');
    list.innerHTML = '';
    const ctx = unlockCtx(save);
    for (const c of COSMETICS) {
      const owned = save.progress.cosmeticsOwned.includes(c.id) || isCosmeticUnlocked(c, ctx);
      const eq = save.progress.cosmeticsEquipped[c.slot] === c.id;
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <h3><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#${c.tint.toString(16).padStart(6, '0')};margin-right:6px"></span>${c.name}</h3>
        <div class="meta">${c.slot} · ${owned ? 'Owned' : 'Locked'}${eq ? ' · Equipped' : ''}</div>
        <button type="button" class="btn secondary" ${owned ? '' : 'disabled'}>${eq ? 'Unequip' : 'Equip'}</button>`;
      card.querySelector('button')!.onclick = () => {
        if (!owned) return;
        if (eq) delete save.progress.cosmeticsEquipped[c.slot];
        else save.progress.cosmeticsEquipped[c.slot] = c.id;
        saveSave(save);
        renderCosmetics();
      };
      list.appendChild(card);
    }
  };

  const renderLab = (): void => {
    const list = $('lab-list');
    list.innerHTML = '';
    for (const b of biomesInOrder()) {
      const open = isBiomeUnlocked(b.id, save.progress.worldsCleared, save.progress.worldsUnlocked);
      if (!open) continue;
      const btn = document.createElement('button');
      btn.className = 'btn secondary';
      btn.textContent = b.name;
      btn.onclick = () => startClimb({ mode: 'lab', biomeId: b.id, lab: true, endless: true });
      list.appendChild(btn);
    }
  };

  const renderLb = (tab: string): void => {
    const list = $('lb-list');
    let rows = save.scores.local.slice();
    if (tab === 'daily') rows = rows.filter((e) => e.mode === 'daily');
    else if (tab === 'weekly') rows = rows.filter((e) => e.mode === 'weekly');
    else rows = rows.filter((e) => e.mode === 'world' || e.mode === 'endless');
    rows.sort((a, b) => b.heightPx - a.heightPx || b.style - a.style);
    list.innerHTML =
      rows
        .slice(0, 12)
        .map(
          (e, i) =>
            `<div>${i + 1}. ${e.name} — ${(e.heightPx / 48).toFixed(1)}m · ★${e.style} · ${e.biomeId} <span class="muted">(${e.mode})</span></div>`,
        )
        .join('') || '<div class="muted">No climbs yet. The tower is lonely.</div>';

    const bb = $('lb-biome');
    bb.innerHTML = biomesInOrder()
      .map((b) => {
        const best = save.progress.biomeBests[b.id];
        return `<div><strong>${b.name}</strong> — ${
          best ? `${(best.heightPx / 48).toFixed(1)}m · ★${best.style} · c${best.comboMax}` : '—'
        }</div>`;
      })
      .join('');
  };

  const showChallenge = (ch: ChallengeDef): void => {
    pendingChallenge = ch;
    hideAllScreens();
    show($('screen-challenges'), true);
    $('ch-title').textContent = ch.name;
    const biome = resolveChallengeBiome(ch);
    $('ch-body').innerHTML = `
      <p><strong>${biome.name}</strong></p>
      <p class="meta">${ch.description}</p>
      <p class="meta muted">Seed ${ch.seed}</p>
      <p class="meta">Reward: ${ch.rewardCosmeticId ?? 'pride'} (cosmetic only for daily)</p>`;
  };

  type ClimbOpts = {
    mode: WorldSpec['mode'];
    biomeId: string;
    endless?: boolean;
    lab?: boolean;
    challenge?: ChallengeDef;
  };

  const startClimb = async (opts: ClimbOpts): Promise<void> => {
    await audio.unlock();
    audio.setVolumes(save.settings.music, save.settings.sfx, save.settings.master);
    audio.startMusic();

    const biome = getBiome(opts.biomeId) ?? getBiome('frost_grove')!;
    await assets.loadBiomePack(biome.pack);

    const ch = opts.challenge ?? pendingChallenge;
    const seed =
      ch?.seed ??
      (opts.mode === 'daily'
        ? dailyEndlessChallenge().seed
        : opts.mode === 'lab'
          ? `lab-${opts.biomeId}-${Date.now() % 99999}`
          : opts.endless
            ? `end-${opts.biomeId}-${Date.now() % 99999}`
            : `${opts.biomeId}-campaign`);

    world = generateWorld({
      biomeId: opts.biomeId,
      mode: opts.mode,
      endless: opts.endless || opts.mode === 'daily' || opts.mode === 'endless' || opts.lab,
      seed,
      modifiers: ch?.modifiers,
      lab: opts.lab,
    });

    // daily: no clear bonus banking from "claim" — climb BAN still allowed except lab
    if (opts.mode === 'daily') {
      // flag for results
    }

    feel = createFeelParams();
    applyAllUpgrades(feel, save.progress.upgrades);
    // biome mechanical identity
    feel.wall.wall_cling_ms = Math.round(feel.wall.wall_cling_ms * biome.wallClingScale);
    feel.horizontal.peel_impulse *= biome.peelImpulseScale;

    sim = createSimFromWorld(world, {
      luckMul: luckCoinMul(save.progress.upgrades),
      startShield: startShieldCharges(save.progress.upgrades),
    });

    view.resize(world);
    view.bakeWorld(world);
    view.camX = world.spawnX - world.designW / 2;
    view.camY = world.designH - world.spawnY - world.designH * 0.55;
    prevX = sim.player.x;
    prevY = sim.player.y;
    accum = 0;
    tipsShown = new Set(save.flags.seenTutorial || opts.biomeId !== 'frost_grove' ? [0, 1, 2, 3, 4] : []);
    lastComboTier = 0;
    resultsOpen = false;
    paused = false;
    mode = 'climb';
    save.player.stats.totalRuns += 1;
    saveSave(save);

    hideAllScreens();
    show($('modal-results'), false);
    show($('modal-pause'), false);
    show($('app'), true);
    show($('hud'), true);

    const touch = $('touch');
    if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) touch.classList.add('show');
    else touch.classList.remove('show');

    if (!save.flags.seenTutorial && opts.biomeId === 'frost_grove') {
      flashTip('Slide first. Jump second. Potassium forever.');
    }
  };

  const flashTip = (text: string): void => {
    const el = $('tip-toast');
    el.textContent = text;
    el.classList.add('show');
    tipT = 3.2;
  };

  const applyA11y = (): void => {
    document.body.classList.toggle('reduce-motion', save.settings.reduceMotion);
    document.body.classList.toggle('high-contrast', !!save.settings.highContrast);
    document.body.classList.remove('text-scale-115', 'text-scale-130');
    if (save.settings.textScale >= 1.3) document.body.classList.add('text-scale-130');
    else if (save.settings.textScale >= 1.15) document.body.classList.add('text-scale-115');
    view.reduceMotion = save.settings.reduceMotion;
    view.reduceShake = save.settings.reduceShake;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && save.settings.reduceMotion === false) {
      // respect OS if user hasn't forced off — default already false; optional auto
    }
  };

  const flashGrade = (g: string): void => {
    const el = $('grade-toast');
    el.textContent = g.toUpperCase();
    el.className = '';
    el.classList.add('show', g, 'pop');
    toastT = save.settings.reduceMotion ? 0.45 : 0.9;
  };

  const flashCombo = (n: number): void => {
    const el = $('combo-pop');
    el.textContent = COMBO_LINES[n] ?? `Combo ${n}`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 900);
  };

  const deathPun = (): string => {
    if (sim.deathCause === 'spike') return 'Spikes don’t take tips. They take lives.';
    return 'Fell for the ice. Literally.';
  };

  const openResults = (summit: boolean): void => {
    if (resultsOpen) return;
    resultsOpen = true;
    paused = true;

    if (!summit) view.addTrauma(0.45);
    else view.addTrauma(0.2);

    const isLab = world.lab || world.mode === 'lab';
    const isDaily = world.mode === 'daily';
    const prevBestH = save.player.stats.bestHeightPx;
    const prevBestS = save.player.stats.bestStyle;
    // Daily: cosmetic pride only — do NOT bank BAN (lock: dailies not grind-optimal)
    let banGain = isLab || isDaily ? 0 : sim.banRun;
    if (summit && !sim.endless && !isLab && !isDaily) banGain += sim.clearBonus;

    // Daily completion: cosmetic pride only (no extra meta BAN)
    if (isDaily && !isLab) {
      const date = world.seed.replace('daily-', '') || dailyEndlessChallenge().id.replace('daily_', '');
      if (save.daily.lastDailyDate !== date) {
        save.daily.lastDailyDate = date;
        save.player.stats.dailyClaims += 1;
        const reward =
          pendingChallenge?.rewardCosmeticId ?? dailyEndlessChallenge().rewardCosmeticId;
        if (reward && !save.progress.cosmeticsOwned.includes(reward)) {
          save.progress.cosmeticsOwned.push(reward);
          save.daily.claimedCosmeticIds.push(reward);
        }
      }
    }

    if (!isLab) {
      save.bank.ban += banGain;
      save.player.stats.bankLifetime += banGain;
    }
    const newBest =
      sim.maxHeightPx > prevBestH || Math.floor(sim.style) > prevBestS;
    save.player.stats.bestHeightPx = Math.max(save.player.stats.bestHeightPx, sim.maxHeightPx);
    save.player.stats.bestStyle = Math.max(save.player.stats.bestStyle, Math.floor(sim.style));
    save.player.stats.bestCombo = Math.max(save.player.stats.bestCombo, sim.comboMax);
    save.player.stats.perfects += sim.grades.perfect;
    save.player.stats.scuffs += sim.grades.scuff;
    save.player.stats.wallJumps += sim.wallJumps;
    if (!summit) save.player.stats.totalDeaths += 1;

    if (summit && world.mode === 'world' && !isLab) {
      if (!save.progress.worldsCleared.includes(world.biomeId)) {
        save.progress.worldsCleared.push(world.biomeId);
      }
      const next = nextUnlockAfterClear(world.biomeId);
      if (next && !save.progress.worldsUnlocked.includes(next)) {
        save.progress.worldsUnlocked.push(next);
      }
      save.flags.seenTutorial = true;
    }

    if (world.mode === 'weekly' && (summit || sim.maxHeightPx > 2000)) {
      save.player.stats.weeklyCompletions += 1;
      const wk = activeWeekly();
      if (wk.rewardCosmeticId && !save.progress.cosmeticsOwned.includes(wk.rewardCosmeticId)) {
        save.progress.cosmeticsOwned.push(wk.rewardCosmeticId);
      }
    }

    updateBiomeBest(save, world.biomeId, sim.maxHeightPx, Math.floor(sim.style), sim.comboMax, summit && world.mode === 'world');

    if (!isLab) {
      pushLeaderboard(save, {
        mode: world.mode,
        biomeId: world.biomeId,
        seed: world.seed,
        heightPx: sim.maxHeightPx,
        style: Math.floor(sim.style),
        comboMax: sim.comboMax,
        name: save.player.displayName,
        at: new Date().toISOString(),
      });
      // global submit (mock or remote)
      void net
        .submitScore({
          mode: mapModeToRemote(world.mode),
          seed: world.seed,
          biomeId: world.biomeId,
          heightPx: sim.maxHeightPx,
          style: Math.floor(sim.style),
          comboMax: sim.comboMax,
          grades: { ...sim.grades },
          durationMs: Math.floor(sim.elapsed * 1000),
          displayName: save.player.displayName,
        })
        .then((r) => {
          const el = $('res-global');
          if (r.accepted && r.rank) {
            el.textContent = `Global board (mock/remote): rank #${r.rank} of ${r.boardSize ?? '?'}`;
          } else {
            el.textContent = r.reason ? `Global: ${r.reason}` : 'Global: offline / not submitted';
          }
        });
    }

    syncCosmetics(save);
    try {
      saveSave(save);
    } catch {
      /* */
    }

    const biome = getBiome(world.biomeId);
    $('res-title').textContent = summit ? 'Summit' : 'Fall';
    $('res-pun').textContent = summit
      ? biome?.summitLine ?? 'World cleared.'
      : deathPun();
    $('res-height').textContent = `${(sim.maxHeightPx / 48).toFixed(1)}m`;
    $('res-style').textContent = `${Math.floor(sim.style)}`;
    $('res-combo').textContent = `${sim.comboMax}`;
    $('res-ban').textContent = isLab
      ? '+0 (lab)'
      : isDaily
        ? `+0 banked (daily pride · run had ${sim.banRun}🍌)`
        : `+${banGain}`;
    const g = sim.grades;
    $('res-grades').textContent = `P${g.perfect} G${g.great} OK${g.ok} S${g.scuff}`;
    $('res-bank-line').textContent = isLab
      ? 'Practice — not banked / not ranked'
      : `Bank now 🍌 ${save.bank.ban}`;
    $('res-global').textContent = isLab ? '' : 'Global: submitting…';
    const nb = $('res-newbest');
    nb.classList.toggle('hidden', !newBest || isLab);
    if (newBest && !isLab) audio.playCue('newbest');
    $('btn-res-endless').classList.toggle('hidden', !(summit && world.mode === 'world'));
    show($('modal-results'), true);

    if (!save.flags.firstUpgradeOffered && save.bank.ban >= 25) {
      save.flags.firstUpgradeOffered = true;
      saveSave(save);
      flashTip('Bank’s warm. Buy Potassium Calves. Thank us mid-air.');
    }
  };

  // boot → hub
  show($('screen-boot'), false);
  applyA11y();
  goHub();

  $('btn-play').onclick = () => {
    hideAllScreens();
    show($('screen-worlds'), true);
    renderWorlds();
  };
  $('btn-worlds-back').onclick = () => goHub();
  $('btn-daily').onclick = async () => {
    const remote = await net.fetchDailySeed();
    const ch = dailyEndlessChallenge(remote.date);
    // prefer remote seed/biome when API online
    const merged = {
      ...ch,
      seed: remote.seed || ch.seed,
      biomeId: remote.biomeId || ch.biomeId,
      rewardCosmeticId: remote.rewardCosmeticId || ch.rewardCosmeticId,
      description: `${ch.description} (seed ${remote.seed})`,
    };
    showChallenge(merged);
  };
  $('btn-weekly').onclick = () => showChallenge(activeWeekly());
  $('btn-ch-back').onclick = () => goHub();
  $('btn-ch-play').onclick = () => {
    if (!pendingChallenge) return;
    const ch = pendingChallenge;
    startClimb({
      mode: ch.mode === 'daily_endless' ? 'daily' : 'weekly',
      biomeId: ch.biomeId,
      endless: ch.mode === 'daily_endless',
      challenge: ch,
    });
  };
  $('btn-upgrades').onclick = () => {
    hideAllScreens();
    show($('screen-upgrades'), true);
    renderUpgrades();
  };
  $('btn-up-back').onclick = () => goHub();
  $('btn-cosmetics').onclick = () => {
    hideAllScreens();
    show($('screen-cosmetics'), true);
    renderCosmetics();
  };
  $('btn-cos-back').onclick = () => goHub();
  $('btn-lb').onclick = () => {
    hideAllScreens();
    show($('screen-lb'), true);
    renderLb('height');
  };
  $('btn-lb-back').onclick = () => goHub();
  $('lb-tabs').onclick = (ev) => {
    const t = (ev.target as HTMLElement).getAttribute('data-lb');
    if (t) renderLb(t);
  };
  $('btn-lab').onclick = () => {
    hideAllScreens();
    show($('screen-lab'), true);
    renderLab();
  };
  $('btn-lab-back').onclick = () => goHub();

  $('btn-settings').onclick = () => {
    hideAllScreens();
    show($('screen-settings'), true);
    ($('set-name') as HTMLInputElement).value = save.player.displayName;
    ($('set-music') as HTMLInputElement).value = String(save.settings.music);
    ($('set-sfx') as HTMLInputElement).value = String(save.settings.sfx);
    ($('set-motion') as HTMLInputElement).checked = save.settings.reduceMotion;
    ($('set-shake') as HTMLInputElement).checked = save.settings.reduceShake;
    ($('set-contrast') as HTMLInputElement).checked = !!save.settings.highContrast;
    ($('set-sr') as HTMLInputElement).checked = save.settings.screenReaderHints !== false;
    ($('set-textscale') as HTMLSelectElement).value = String(save.settings.textScale || 1);
  };
  $('btn-set-back').onclick = () => {
    save.player.displayName = ($('set-name') as HTMLInputElement).value.slice(0, 16) || 'MonKey';
    save.settings.music = Number(($('set-music') as HTMLInputElement).value);
    save.settings.sfx = Number(($('set-sfx') as HTMLInputElement).value);
    save.settings.reduceMotion = ($('set-motion') as HTMLInputElement).checked;
    save.settings.reduceShake = ($('set-shake') as HTMLInputElement).checked;
    save.settings.highContrast = ($('set-contrast') as HTMLInputElement).checked;
    save.settings.screenReaderHints = ($('set-sr') as HTMLInputElement).checked;
    save.settings.textScale = Number(($('set-textscale') as HTMLSelectElement).value) || 1;
    audio.setVolumes(save.settings.music, save.settings.sfx, save.settings.master);
    applyA11y();
    saveSave(save);
    if (save.settings.screenReaderHints) {
      $('a11y-live').textContent = 'Settings saved.';
    }
    goHub();
  };
  $('btn-howto').onclick = () => show($('modal-howto'), true);
  $('btn-howto-ok').onclick = () => {
    show($('modal-howto'), false);
    audio.playCue('ui');
  };
  $('btn-pause').onclick = () => {
    if (mode !== 'climb' || resultsOpen) return;
    paused = true;
    show($('modal-pause'), true);
  };
  $('btn-resume').onclick = () => {
    paused = false;
    show($('modal-pause'), false);
  };
  $('btn-pause-howto').onclick = () => show($('modal-howto'), true);
  $('btn-pause-hub').onclick = () => {
    if (confirm('Leave run and return to Hub? Progress this climb is lost.')) goHub();
  };
  $('btn-again').onclick = () => {
    show($('modal-results'), false);
    startClimb({
      mode: world.mode,
      biomeId: world.biomeId,
      endless: world.endless,
      lab: world.lab,
      challenge: pendingChallenge ?? undefined,
    });
  };
  $('btn-res-hub').onclick = () => goHub();
  $('btn-res-endless').onclick = () => {
    show($('modal-results'), false);
    startClimb({ mode: 'endless', biomeId: world.biomeId, endless: true });
  };
  $('btn-share').onclick = () => {
    const payload = buildSharePayload(sim, save, world.biomeName);
    const canvas = renderShareCard(payload);
    const cv = $('share-canvas') as HTMLCanvasElement;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(canvas, 0, 0, cv.width, cv.height);
    (cv as unknown as { __full?: HTMLCanvasElement }).__full = canvas;
    show($('modal-share'), true);
  };
  $('btn-share-save').onclick = () => {
    const full = ($('share-canvas') as unknown as { __full?: HTMLCanvasElement }).__full;
    if (full) downloadCanvas(full);
  };
  $('btn-share-copy').onclick = async () => {
    const payload = buildSharePayload(sim, save, world.biomeName);
    const t = shareText(payload);
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      prompt('Copy:', t);
    }
  };
  $('btn-share-close').onclick = () => show($('modal-share'), false);

  $('btn-export').onclick = () => {
    const blob = new Blob([exportSave(save)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'potassium-climb-save.json';
    a.click();
    $('set-msg').textContent = 'Save exported.';
  };
  $('btn-import').onclick = () => ($('import-file') as HTMLInputElement).click();
  ($('import-file') as HTMLInputElement).onchange = async (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      save = importSaveJson(await f.text());
      syncCosmetics(save);
      feel = createFeelParams();
      applyAllUpgrades(feel, save.progress.upgrades);
      $('set-msg').textContent = 'Save imported. Welcome back, climber.';
      refreshHub();
    } catch {
      $('set-msg').textContent = 'That file isn’t a valid Potassium Climb save.';
    }
  };
  $('btn-reset').onclick = () => {
    if (!confirm('Reset ALL progress? This can’t be undone. Export first if you care.')) return;
    localStorage.removeItem('bx-potassium-climb-v3');
    save = loadSave();
    feel = createFeelParams();
    $('set-msg').textContent = 'Progress reset.';
    refreshHub();
  };

  window.addEventListener('resize', () => {
    if (mode === 'climb') view.resize(world);
  });

  app.ticker.add((ticker) => {
    if (mode !== 'climb') return;
    const frameDt = Math.min(0.05, ticker.deltaMS / 1000);
    const snap = input.sample();

    if (snap.debugPressed) {
      showDebug = !showDebug;
      show($('debug'), showDebug);
    }
    if (snap.pausePressed && !resultsOpen) {
      paused = !paused;
      show($('modal-pause'), paused);
    }
    if (snap.resetPressed && !resultsOpen) {
      resetSim(sim, world);
      prevX = sim.player.x;
      prevY = sim.player.y;
      paused = false;
      show($('modal-pause'), false);
    }

    if (!paused && !sim.dead && !sim.summit) {
      accum += frameDt;
      let steps = 0;
      // Keep jump latched across all substeps; sim arms a 200ms buffer so late frames still jump
      const wantJump = snap.jumpPressed;
      while (accum >= FIXED_DT && steps < feel.world.max_physics_steps_per_frame) {
        prevX = sim.player.x;
        prevY = sim.player.y;
        stepSim(
          sim,
          feel,
          {
            left: snap.left,
            right: snap.right,
            jumpDown: wantJump,
            jumpHeld: snap.jumpHeld || wantJump,
          },
          FIXED_DT,
        );
        accum -= FIXED_DT;
        steps += 1;
      }
      if (wantJump) input.consumeJump();
      if (steps === feel.world.max_physics_steps_per_frame) accum = 0;
    } else {
      // Still queue jumps while paused? No — but don't lose edge across pause: keep latch
      accum = 0;
    }

    for (const id of drainSfx(sim)) audio.playCue(id);

    if (sim.landFlash && sim.lastLand) {
      flashGrade(sim.lastLand.grade);
      sim.landFlash = false;
    }
    for (const t of [5, 10, 15, 20]) {
      if (sim.combo >= t && lastComboTier < t) {
        lastComboTier = t;
        flashCombo(t);
      }
    }
    if (sim.combo < lastComboTier) lastComboTier = sim.combo;

    if (!save.flags.seenTutorial && world.biomeId === 'frost_grove') {
      for (let i = 0; i < TIPS.length; i++) {
        if (!tipsShown.has(i) && sim.maxHeightPx >= TIPS[i].at) {
          tipsShown.add(i);
          flashTip(TIPS[i].text);
        }
      }
    }

    if (sim.dead || sim.summit) openResults(sim.summit);

    const alpha = paused || sim.dead || sim.summit ? 1 : accum / FIXED_DT;
    view.sync(sim, feel, alpha, prevX, prevY);

    const meters = (sim.maxHeightPx / 48).toFixed(1);
    $('stats').textContent = `⬆ ${meters}m · ★ ${Math.floor(sim.style)} · 🍌 ${sim.banRun} · c${sim.combo}`;

    const p = sim.player;
    const bits: string[] = [];
    if (p.superJumpCharges) bits.push(`⬆×${p.superJumpCharges}`);
    if (p.shield) bits.push('🛡');
    if (p.floatLeft > 0) bits.push(`☁${p.floatLeft.toFixed(0)}s`);
    if (p.magnetLeft > 0) bits.push(`🧲${p.magnetLeft.toFixed(0)}s`);
    if (p.speedLeft > 0) bits.push(`⚡${p.speedLeft.toFixed(0)}s`);
    $('powers').textContent = bits.join(' ');

    if (showDebug) {
      const d = getDebug(sim, feel);
      $('debug').textContent = [
        `fps ${app.ticker.FPS.toFixed(0)} ${world.biomeId}`,
        `vx ${p.vx.toFixed(0)} vy ${p.vy.toFixed(0)}`,
        `spd ${(d.speedPct * 100).toFixed(0)}% ${d.state}`,
        `grade ${d.gradeLast ?? '-'}`,
        `mode ${world.mode}`,
      ].join('\n');
    }

    if (toastT > 0) {
      toastT -= frameDt;
      if (toastT <= 0) $('grade-toast').classList.remove('show');
    }
    if (tipT > 0) {
      tipT -= frameDt;
      if (tipT <= 0) $('tip-toast').classList.remove('show');
    }
  });

  (window as unknown as { __FEEL: FeelParams; __SAVE: SaveV3; __validate: typeof validateContent }).__FEEL =
    feel;
  (window as unknown as { __SAVE: SaveV3 }).__SAVE = save;
  (window as unknown as { __validate: typeof validateContent }).__validate = validateContent;
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#fff;padding:24px">Failed: ${String(err)}</pre>`;
});
