import type * as THREE from "three";

/**
 * Dev-only: how much memory the game holds, the way a phone counts it. An iPhone stops a page that holds
 * too much, and Safari refuses any more canvases past a few hundred MB of them (render/memory.ts). From
 * the browser console:
 *
 *   __memory()   the canvases still holding a picture, the shapes the page still holds, and how many
 *                pictures and shapes are on the graphics chip
 *
 * Try it with ?touch&quality=phone in the address for the phone's numbers. (Canvases are counted from the
 * start of main.ts, where `trackCanvases` runs, before anything is painted.)
 */

const canvases: WeakRef<HTMLCanvasElement>[] = [];

/** Notice every canvas made from now on. */
export function trackCanvases() {
  const create = Document.prototype.createElement;
  Document.prototype.createElement = function (this: Document, tag: string, options?: ElementCreationOptions) {
    const element = create.call(this, tag, options);
    if (element instanceof HTMLCanvasElement) canvases.push(new WeakRef(element));
    return element;
  } as typeof create;
}

export function installMemoryTool(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const mb = (bytes: number) => Math.round(bytes / 1e5) / 10;
  Object.assign(window, {
    __memory() {
      let canvasBytes = 0, canvasCount = 0;
      for (const ref of canvases) {
        const c = ref.deref();
        if (!c || c.width * c.height === 0) continue; // (gone, or emptied once on the graphics chip)
        canvasBytes += c.width * c.height * 4;
        canvasCount++;
      }
      const shapes = new Set<THREE.BufferGeometry>();
      let shapeBytes = 0;
      scene.traverse((o) => {
        const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
        if (!g?.isBufferGeometry || shapes.has(g)) return;
        shapes.add(g);
        for (const a of [...Object.values(g.attributes), g.index]) if (a) shapeBytes += a.array.byteLength;
      });
      return {
        canvases: { holdingPictures: canvasCount, mb: mb(canvasBytes) },
        shapes: { count: shapes.size, heldByPageMb: mb(shapeBytes) },
        onGraphicsChip: { ...renderer.info.memory },
      };
    },
  });
}
