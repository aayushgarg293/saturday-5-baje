import * as THREE from "three";
import { quality } from "../core/quality";

/**
 * Keeping the game small enough for a phone's memory.
 *
 * An iPhone stops a web page that holds too much (and Safari, before that, refuses any more canvases
 * past a few hundred MB of them): the game showed nothing at all on one. Everything painted in code
 * (signboards, faces, the nameplates' sheet...) and every shape was held twice: once by the page, and
 * once by the graphics chip, which draws from its own copy. On a phone (core/quality.ts):
 *
 *   - pictures are painted with fewer pixels (`canvasFor`): the painting code still draws in its own
 *     full-size pixels, and the canvas shrinks the drawing as it goes, so nothing else changes;
 *   - once the chip has a picture or a shape, the page lets go of its own copy (`paintedTexture`,
 *     `letGoOfShapes`);
 *   - so if the chip ever loses its copies (the "WebGL context" is lost: a phone can do that to a page
 *     left in the background), there's nothing to send it again: the page reloads instead, and the
 *     walk picks up where it was (core/save.ts).
 *
 * The laptop keeps everything, as before. To try the phone's way on a laptop: ?quality=phone.
 */

/**
 * A canvas to paint a `w` × `h` picture on, `w` and `h` in the painting code's own pixels; the canvas
 * itself is `scale` of that (the phone's `paint`, unless given).
 */
export function canvasFor(w: number, h: number, scale = quality.paint) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(canvas.width / w, canvas.height / h);
  return { canvas, ctx };
}

/**
 * The texture for a picture painted once and never again (not the cafe's screens, which keep changing).
 * On a phone, once it's on the graphics chip, its canvas is emptied: a canvas of no size holds no memory,
 * and the browser frees it at once (it would wait for the garbage collector otherwise).
 */
export function paintedTexture(canvas: HTMLCanvasElement, anisotropy = 4): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; // the canvas colours are ordinary screen colours
  tex.anisotropy = anisotropy; // keeps lettering crisp when seen at a steep angle
  if (!quality.keepCopies) {
    tex.onUpdate = () => {
      canvas.width = canvas.height = 0;
    };
  }
  return tex;
}

/**
 * On a phone: every shape in `root` lets go of its page copy once it's on the graphics chip. Shapes in
 * this game never change once built (things move by moving whole objects, and people by their bones),
 * so the chip's copy is all that's needed. Called once the town is built, before its first frame;
 * shapes made later (the PCO's phone cord, remade every frame) keep theirs.
 *
 * The one thing still read from a shape's points is the ball round it that says whether it's in view
 * (its "bounding sphere"), worked out the first time it's needed. The first frame draws everything
 * whether in view or not (main.ts), so that would come after the points were gone, and everything would
 * vanish: each ball is worked out here first.
 */
export function letGoOfShapes(root: THREE.Object3D) {
  if (quality.keepCopies) return;
  const seen = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    const geometry = (object as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!geometry?.isBufferGeometry) return;
    // (a posed body has its own ball, round the body in any pose: people/body.ts sets it)
    if (object instanceof THREE.SkinnedMesh && object.boundingSphere === null) object.computeBoundingSphere();
    if (seen.has(geometry)) return;
    seen.add(geometry);
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
    for (const attribute of [...Object.values(geometry.attributes), geometry.index]) {
      if (attribute && !("isInterleavedBufferAttribute" in attribute)) attribute.onUpload(emptyOut);
    }
  });
}

/** (an attribute's `onUpload`: `this` is the attribute; it keeps its `count`, which is all drawing needs) */
function emptyOut(this: THREE.BufferAttribute) {
  this.array = this.array.slice(0, 0);
}

/** On a phone: if the graphics chip loses its copies, reload (the page let go of its own). */
export function reloadIfChipForgets(canvas: HTMLCanvasElement) {
  if (quality.keepCopies) return;
  canvas.addEventListener("webglcontextlost", () => location.reload());
}
