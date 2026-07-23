export interface InputState {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  pausePressed: boolean;
  resetPressed: boolean;
  debugPressed: boolean;
}

export function createInput(): {
  state: InputState;
  sample: () => InputState;
  attach: () => void;
  detach: () => void;
} {
  const held = {
    left: false,
    right: false,
    jump: false,
  };
  const edges = {
    jump: false,
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
        held.jump = true;
        edges.jump = true;
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
    const down = (ev: Event) => {
      ev.preventDefault();
      if (which === 'left') held.left = true;
      if (which === 'right') held.right = true;
      if (which === 'jump') {
        held.jump = true;
        edges.jump = true;
      }
    };
    const up = (ev: Event) => {
      ev.preventDefault();
      if (which === 'left') held.left = false;
      if (which === 'right') held.right = false;
      if (which === 'jump') held.jump = false;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
  };

  const attach = () => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    bindTouch(document.getElementById('btn-left'), 'left');
    bindTouch(document.getElementById('btn-right'), 'right');
    bindTouch(document.getElementById('btn-jump'), 'jump');

    // show touch on coarse pointers
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
    state.jumpPressed = edges.jump;
    state.pausePressed = edges.pause;
    state.resetPressed = edges.reset;
    state.debugPressed = edges.debug;
    edges.jump = false;
    edges.pause = false;
    edges.reset = false;
    edges.debug = false;
    return state;
  };

  return { state, sample, attach, detach };
}
