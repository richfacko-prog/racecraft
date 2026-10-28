export interface Controls {
  throttle: number; // -1..1
  steer: number; // -1..1 (+ = right)
  pitch: number; // -1..1 (+ = nose down / stick forward)
  yaw: number; // -1..1 (+ = right)
  roll: number; // -1..1 (+ = roll right)
  jump: boolean;
  boost: boolean;
  handbrake: boolean;
}

export function emptyControls(): Controls {
  return { throttle: 0, steer: 0, pitch: 0, yaw: 0, roll: 0, jump: false, boost: false, handbrake: false };
}

const DEADZONE = 0.15;
function dz(v: number) {
  if (Math.abs(v) < DEADZONE) return 0;
  return (Math.sign(v) * (Math.abs(v) - DEADZONE)) / (1 - DEADZONE);
}

/** Keyboard + mouse + Gamepad API input, mapped to Rocket League's default layouts. */
export class Input {
  private keys = new Set<string>();
  private mouse = new Set<number>();
  private pressedOnce = new Set<string>();
  private padPrev: boolean[] = [];
  usingGamepad = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.ctrlKey && ['KeyS', 'KeyD', 'KeyA', 'KeyR'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressedOnce.add(e.code);
      this.keys.add(e.code);
      this.usingGamepad = false;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.clear();
    });
    window.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement)?.closest?.('button, .menu')) return;
      this.mouse.add(e.button);
    });
    window.addEventListener('mouseup', (e) => this.mouse.delete(e.button));
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener(
      'wheel',
      (e) => {
        if ((e.target as HTMLElement)?.closest?.('.menu, .garage')) return;
        this.pressedOnce.add(e.deltaY > 0 ? 'WheelDown' : 'WheelUp');
      },
      { passive: true },
    );
  }

  private pad(): Gamepad | null {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  /** Edge-triggered UI actions: 'ballcam', 'pause', 'skip'. Call once per frame. */
  consumeActions(): Set<string> {
    const out = new Set<string>();
    if (this.pressedOnce.has('KeyY')) out.add('ballcam');
    if (this.pressedOnce.has('Escape') || this.pressedOnce.has('KeyP')) out.add('pause');
    if (this.pressedOnce.has('Space') || this.pressedOnce.has('Enter')) out.add('skip');
    if (this.pressedOnce.has('KeyM')) out.add('mute');
    if (this.pressedOnce.has('KeyH')) out.add('guide');
    if (this.pressedOnce.has('BracketLeft') || this.pressedOnce.has('WheelUp')) out.add('camNear');
    if (this.pressedOnce.has('BracketRight') || this.pressedOnce.has('WheelDown')) out.add('camFar');
    this.pressedOnce.clear();
    const p = this.pad();
    if (p) {
      const b = p.buttons.map((x) => x.pressed);
      const edge = (i: number) => b[i] && !this.padPrev[i];
      if (edge(3)) out.add('ballcam');
      if (edge(9)) out.add('pause');
      if (edge(0)) out.add('skip');
      if (b.some((x) => x) || p.axes.some((a) => Math.abs(a) > 0.3)) this.usingGamepad = true;
      this.padPrev = b;
    }
    return out;
  }

  read(): Controls {
    const c = emptyControls();
    const k = (code: string) => this.keys.has(code);
    const fwd = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
    const side = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0);
    c.throttle = fwd;
    c.steer = side;
    c.pitch = fwd;
    c.yaw = side;
    c.jump = k('Space') || this.mouse.has(2);
    c.boost = k('ShiftLeft') || k('ShiftRight') || this.mouse.has(0);
    c.handbrake = k('KeyQ') || k('ControlLeft') || k('ControlRight');
    // Dedicated directional air roll (optional): E = roll right
    if (k('KeyE')) c.roll = 1;
    if (c.handbrake) {
      c.roll = side;
    }

    const p = this.pad();
    if (p) {
      const ax = dz(p.axes[0] ?? 0);
      const ay = dz(p.axes[1] ?? 0);
      const rt = p.buttons[7]?.value ?? 0;
      const lt = p.buttons[6]?.value ?? 0;
      const b = (i: number) => !!p.buttons[i]?.pressed;
      const padThrottle = rt - lt;
      if (Math.abs(padThrottle) > 0.02) c.throttle = padThrottle;
      if (ax) {
        c.steer = ax;
        c.yaw = ax;
      }
      if (ay) c.pitch = -ay; // stick up = nose down
      c.jump = c.jump || b(0);
      c.boost = c.boost || b(1);
      const hb = b(2);
      c.handbrake = c.handbrake || hb;
      if (hb) c.roll = ax;
      if (b(4)) c.roll = -1; // LB air roll left
      if (b(5)) c.roll = 1; // RB air roll right
    }
    if (c.handbrake && c.roll !== 0) c.yaw = 0;
    return c;
  }
}
