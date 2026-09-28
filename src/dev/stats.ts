import type * as THREE from "three";
import type { Player } from "../core/player";

/**
 * Dev-only overlay in the top-left corner.
 *
 * Line 1: frames per second, milliseconds per frame, draw calls, triangles.
 * Draw calls (how many separate things the GPU is asked to draw each frame)
 * are usually what slows a scene like this down, so watch that number as the
 * street fills up.
 *
 * Press C to add line 2: where you are standing, written as a ready-made
 * `__shot` command. Copy it into a message to Claude to point at an exact spot.
 */
export function createStats(renderer: THREE.WebGLRenderer, player: Player) {
  const el = document.createElement("pre");
  el.style.cssText =
    "position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;z-index:10;" +
    "font:12px/1.4 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.55);" +
    "border-radius:4px;pointer-events:none;white-space:pre";
  document.body.append(el);

  let showPosition = false;
  // Average over half a second, so the numbers are readable instead of flickering.
  let frames = 0;
  let elapsed = 0;
  let fpsText = "";

  return {
    togglePosition() {
      showPosition = !showPosition;
    },
    /** Call once per frame, after rendering (draw counts are for the last render). */
    update(dt: number) {
      frames++;
      elapsed += dt;
      if (elapsed >= 0.5) {
        const info = renderer.info.render;
        const fps = frames / elapsed;
        fpsText =
          `${fps.toFixed(0)} fps  ${((elapsed / frames) * 1000).toFixed(1)} ms  ` +
          `${info.calls} draws  ${(info.triangles / 1000).toFixed(1)}k tris`;
        frames = 0;
        elapsed = 0;
      }
      let text = fpsText;
      if (showPosition) {
        const p = player.pos;
        text +=
          `\n__shot('here', { pos: [${p.x.toFixed(2)}, ${p.z.toFixed(2)}], ` +
          `yaw: ${player.yaw.toFixed(3)}, pitch: ${player.pitch.toFixed(3)} })`;
      }
      el.textContent = text;
    },
  };
}
