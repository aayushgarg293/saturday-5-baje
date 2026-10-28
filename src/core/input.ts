import { touchFirst } from "./device";

/**
 * Keyboard and mouse input (and, on a phone, the touch controls feed it too:
 * ui/touchControls.ts).
 *
 * Keeps track of which keys are held down right now, and collects mouse
 * movement while the mouse is "locked" to the game. Pointer lock is the
 * browser feature that hides the cursor and reports raw movement, so turning
 * isn't stopped by the edge of the screen. It starts on a click and ends
 * when the player presses Esc (the browser handles Esc itself).
 */
/** A slow drag across the glass turns you this much (×) as the same distance of mouse (a quick flick turns more: ui/touchControls.ts). */
const TOUCH_LOOK = 1.4;

export class Input {
  /** Keys currently held, by their physical position ("KeyW", "ShiftLeft"...). */
  readonly held = new Set<string>();
  /** True while the mouse is captured by the game (on a touch screen: while you're playing, not paused). */
  locked = false;
  /** The touch joystick: x right, y down, each −1 to 1; zero when it isn't touched. `fast`: pulled well past its ring. */
  readonly stick = { x: 0, y: 0, fast: false };
  /** How fast a drag turns you, as a multiple of the usual (the look-speed setting). */
  lookSpeed = 1;
  /** Called when the lock turns on or off, so the start screen can show/hide. */
  onLockChange: (locked: boolean) => void = () => {};
  /** Called once per key press (not repeated while held). */
  onKeyPress: (code: string) => void = () => {};

  /** Has the game asked to go fullscreen yet (only the once: Chrome's "to exit full screen" notice comes up each time)? */
  private askedFullscreen = false;

  /** Mouse movement since the last frame, in screen pixels. */
  private dx = 0;
  private dy = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if (!e.repeat) this.onKeyPress(e.code);
      this.held.add(e.code);
      // stop the page from scrolling on arrow keys or space
      if (this.locked && e.code.startsWith("Arrow")) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    // Switching to another app while holding W would otherwise leave W "stuck".
    window.addEventListener("blur", () => this.held.clear());

    document.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.held.clear();
      this.onLockChange(this.locked);
    });
  }

  /** Capture the mouse. Browsers only allow this in response to a click. */
  lock() {
    if (touchFirst) return this.playOnTouch();
    // Newer browsers return a promise that fails if the lock is refused (say,
    // too soon after Esc); then the start screen simply stays up for a click.
    const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
    p?.catch?.(() => {});
  }

  /** Let the mouse go (or, on a touch screen, pause). */
  unlock() {
    if (!touchFirst) return document.exitPointerLock();
    if (!this.locked) return;
    this.locked = false;
    this.held.clear();
    this.stick.x = this.stick.y = 0;
    this.stick.fast = false;
    this.onLockChange(false);
  }

  /** A drag on the touch screen, in screen pixels: turns you as the mouse does. */
  look(dx: number, dy: number) {
    if (!this.locked) return;
    this.dx += dx * TOUCH_LOOK * this.lookSpeed;
    this.dy += dy * TOUCH_LOOK * this.lookSpeed;
  }

  /** A touch button standing in for a key ("KeyE", "Tab"…): pressed and let go, as if typed. */
  press(code: string) {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code }));
  }

  /**
   * On a touch screen there's no mouse to capture: "locked" just means playing. On the first tap the game
   * also goes fullscreen and, where the phone allows it (Android), locks the screen sideways. Only on the
   * first: Chrome covers the bottom of the screen with its "to exit full screen" notice every time, and
   * later on that's where the buttons are (get up, eat…). Left fullscreen, the game stays as it is.
   */
  private playOnTouch() {
    const root = document.documentElement;
    if (!this.askedFullscreen && !document.fullscreenElement && root.requestFullscreen) {
      this.askedFullscreen = true;
      root
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"))
        .catch(() => {}); // (iPhones: neither; the page turns itself instead, core/device.ts)
    }
    if (this.locked) return;
    this.locked = true;
    this.onLockChange(true);
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  /** Mouse movement since the last call, then reset to zero. */
  takeMouseMovement(): { dx: number; dy: number } {
    const out = { dx: this.dx, dy: this.dy };
    this.dx = this.dy = 0;
    return out;
  }
}
