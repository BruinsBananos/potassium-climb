export interface InputState {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  /** Latched jump press — stays true until consumeJump() */
  jumpPressed: boolean;
  pausePressed: boolean;
  resetPressed: boolean;
  debugPressed: boolean;
}

export function createInput(): {
  state: InputState;
  sample: () => InputState;
  /** Clear latched jump after physics has seen it this frame */
  consumeJump: () => void;
  attach: () => void;
  detach: () => void;
} {
  const held = {
    left: false,
    right: false,
    jump: false,
  };
  /** Sticky jump edge — not cleared by sample(), only consumeJump() */
  let jumpQueued = false;
  const edges = {
    pause: false,
    reset: false,
    debug: false,
  };

  const state: InputState = {
    left: false,
    right: false,
    jumpHeld: false,
    jumpPressed: false,
    pausePressed: false,
    resetPressed: false,
    debugPressed: false,
  };

  const queueJump = (): void => {
    jumpQueued = true;
    held.jump = true;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyA':
      case 'ArrowLeft':
        held.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        held.right = true;
        break;
      case 'Space':
      case 'KeyW':
      case 'ArrowUp':
        e.preventDefault();
        queueJump();
        break;
      case 'KeyP':
      case 'Escape':
        edges.pause = true;
        break;
      case 'KeyR':
        edges.reset = true;
        break;
      case 'F1':
        e.preventDefault();
        edges.debug = true;
        break;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyA':
      case 'ArrowLeft':
        held.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        held.right = false;
        break;
      case 'Space':
      case 'KeyW':
      case 'ArrowUp':
        held.jump = false;
        break;
    }
  };

  const bindTouch = (el: HTMLElement | null, which: 'left' | 'right' | 'jump') => {
    if (!el) return;
    const down = (ev: PointerEvent) => {
      ev.preventDefault();
      try {
        el.setPointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      if (which === 'left') held.left = true;
      if (which === 'right') held.right = true;
      if (which === 'jump') queueJump();
    };
    const up = (ev: PointerEvent) => {
      ev.preventDefault();
      try {
        if (el.hasPointerCapture(ev.pointerId)) el.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      if (which === 'left') held.left = false;
      if (which === 'right') held.right = false;
      if (which === 'jump') held.jump = false;
    };
    // Don't clear jump on pointerleave while captured — only pointerup/cancel
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  const attach = () => {
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    bindTouch(document.getElementById('btn-left'), 'left');
    bindTouch(document.getElementById('btn-right'), 'right');
    bindTouch(document.getElementById('btn-jump'), 'jump');

    const touch = document.getElementById('touch');
    if (touch && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)) {
      touch.classList.add('show');
    }
  };

  const detach = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };

  const sample = (): InputState => {
    state.left = held.left;
    state.right = held.right;
    state.jumpHeld = held.jump;
    state.jumpPressed = jumpQueued;
    state.pausePressed = edges.pause;
    state.resetPressed = edges.reset;
    state.debugPressed = edges.debug;
    edges.pause = false;
    edges.reset = false;
    edges.debug = false;
    return state;
  };

  const consumeJump = (): void => {
    jumpQueued = false;
  };

  return { state, sample, consumeJump, attach, detach };
}
