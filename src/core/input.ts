/**
 * Keyboard and mouse input.
 *
 * Keeps track of which keys are held down right now, and collects mouse
 * movement while the mouse is "locked" to the game. Pointer lock is the
 * browser feature that hides the cursor and reports raw movement, so turning
 * isn't stopped by the edge of the screen. It starts on a click and ends
 * when the player presses Esc (the browser handles Esc itself).
 */
export class Input {
  /** Keys currently held, by their physical position ("KeyW", "ShiftLeft"...). */
  readonly held = new Set<string>();
  /** True while the mouse is captured by the game. */
  locked = false;
  /** Called when the lock turns on or off, so the start screen can show/hide. */
  onLockChange: (locked: boolean) => void = () => {};
  /** Called once per key press (not repeated while held). */
  onKeyPress: (code: string) => void = () => {};

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
    this.canvas.requestPointerLock();
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
