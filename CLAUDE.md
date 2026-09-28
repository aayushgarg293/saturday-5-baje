# Cyber Cafe — project rules

A first-person, nostalgic walk to an Indian cyber cafe in 2004–2010: a market
street in an Ajmer-like Rajasthan town, a first-floor cafe, a curtained cubicle,
a Windows XP look-alike desktop, then the walk home. **`BRIEF.md` is the source
of truth for what the game is; `TASKS.md` is the build order and current state.**
Read both before starting work.

## Status

Phase 3 (the look) built: ink outlines and a warm colour grade
(`render/post.ts`), a painted sky with clouds (`world/sky.ts`), brush strokes
and weathering on every surface (`render/paint.ts`), and every shop board,
wall ad and film poster lettered (`world/signs.ts`, words in `world/names.ts`).
Next: phase 4, street life (`TASKS.md`).

Baseline (2026-09-28, M4, Chrome, 1470×956): **~3.2 ms per frame at pixel
ratio 1.5, ~5 ms at 2; 85–162 draw calls** depending on the view (shadow pass
included). Budget for 60 fps: 16.7 ms.

## How the world is organised

- **`src/world/layout.ts` is the street plan, as data.** Everything is placed
  by `s` (metres along the street) and `offset` (metres to the side, left
  negative); `pointAt(s, offset)` turns that into world x/z, so the street can
  curve without anything else knowing. Plots, galis, the cafe and the phase 4
  stall spots (`SLOTS`) all live there.
- **Buildings are built in their own local frame** (x along the frontage, +z
  toward the street, z = 0 at the plot's front edge) from parts, then merged
  into **one mesh per building** with `Parts` (`src/world/kit.ts`). One building
  = one draw call. Shared pieces are in `src/world/buildings/common.ts`.
- **Everything with words is painted by `world/signs.ts`.** Builders return
  sign spots (boards, poster places); `street.ts` adds wall-ad spots where a
  building rises above its neighbour; `signs.ts` paints any spot whose `kind`
  has a painter, drawing on a canvas. All the words live in `world/names.ts`.
- **Frames go through `render/post.ts`**: scene → ink → grade → FXAA. The
  grade's settings are the `GRADE` object there. Dev keys: `O` ink, `G` grade.

## Commands

```bash
npm install      # once, after cloning
npm run dev      # dev server with dev tools: http://127.0.0.1:5180
npm run build    # type-check, then production build into dist/
npm run preview  # serve the production build: http://127.0.0.1:5181
```

Dev tools (dev server only), from the browser console:
- `await __shot('start')`: save a frame from a saved spot (`src/dev/cameras.ts`)
  to `.shots/start.jpg`; `await __shotAll()` for every spot.
- `__game.step(seconds)`: advance the game without rendering.
- `C` in the game: show your position as a ready-made `__shot` line.
- The top-left overlay shows fps, frame time, draw calls and triangles.

**A Chrome tab opened by Claude runs in the background, so the browser pauses
its animation** (`requestAnimationFrame` never fires). `__shot` and
`__game.step` work anyway. To measure speed from there, time
`__game.render()` in a loop and force the GPU to finish with a 1-pixel
`gl.readPixels`. For walking tests, set `__game.player.input.locked = true`,
add key codes to `__game.player.input.held`, then `__game.step()`.

## Working with the owner

- The owner is learning Three.js and game development. **Explain every change
  in plain language**: what changed, why, and how to see it. Avoid jargon, or
  explain it the first time it comes up.
- **Code must be readable by the owner.** Small files with one job each, clear
  names, and a comment wherever the *reason* for something isn't obvious.
  Prefer a straightforward version over a clever one.
- Work in **small steps** the owner can see and test. Plan larger features in
  plan mode first.
- **Commit each working step once the owner has seen it.** Never force-push or
  rewrite history.
- **Stay inside `cyber cafe game reboot/`.** Never read, list or run anything
  elsewhere on the machine without asking first. The earlier cyber cafe
  attempts elsewhere on the machine are **not** references.
- Ask before adding any npm package. `three` should stay the only runtime
  dependency unless there's a strong reason.

## References

Read-only, in the parent folder. Borrow ideas and techniques; never edit them.
- `../sakura-crossing/`: first-person walking, `E` interactions, toon
  materials with violet-shifted shadows, depth-based ink outlines, the
  `__shot` capture tool, and its "traps that have already bitten" table.
- `../summer-cycle/`: painterly post-processing, a single toon material
  factory, synthesized Web Audio sound, and performance discipline.
- `../threejs-skills/`: general Three.js API reference.

Both reference games were tuned for desktop GPUs. Check the cost of anything
borrowed on this machine before keeping it.

## Art rules

- **Painterly, cel-shaded, never photoreal.** Toon shading with 2–3 bands,
  ink outlines, a warm colour grade.
- **All materials come from one toon material factory** (`render/toon.ts`:
  `toon()` and `flat()`). No `MeshStandardMaterial` or other PBR materials.
  The only hand-written shaders are the sky dome and the post passes.
- Textures, signboards and posters are **drawn in code** (Canvas2D). Sound is
  **synthesized** (Web Audio), including the original film tune on the radio.
- **Look-alike names only** in anything the player can see or hear: Yorkut, not
  Orkut; Prison Brake, not Prison Break. The name table is in `BRIEF.md`.
- People are **stylized, simple figures**, readable from a distance and never
  shown in lingering close-up.
- Signboards are in Hindi (Devanagari), with a few English words, hand-painted
  and imperfect.

## Performance

- **Target: 60 fps on a MacBook Air M4** (integrated GPU, fanless, 2560×1664
  Retina display). Measure from the first build, not at the end.
- Draw calls are usually the limit: merge static geometry and instance
  repeated props. Heavy full-screen passes (MSAA ×4, Kuwahara, reflections)
  must earn their cost on this machine.
- Cap the pixel ratio; a Retina screen at full resolution is four times the
  pixels.

## Verifying changes

- **Look at it.** Visual bugs rarely throw errors. After any visual change,
  capture frames with the dev-only `__shot` tool from the saved camera
  positions and read them.
- The browser console must stay free of errors and warnings.
- It's a **browser game**: test in both **Chrome and Safari** (the owner is
  on a Mac), not only Chromium.
- Check the frame rate after anything that adds geometry or a render pass.
- The owner plays it at normal speed before a feature counts as done.

## Traps that have already bitten

*(Add a row whenever a bug costs real time: the symptom, the cause, the fix.
Keep each entry short.)*

| Symptom | Cause and fix |
|---|---|
| Shopfront line ragged; walls stop you short of the kerb; a gali is blocked | A box's two ground sizes were passed in the wrong order, so buildings were long along the street instead of deep. Always name sizes by axis (`sizeX`, `sizeZ`), never "width/depth". Caught by walking into every wall with `__game`; screenshots looked plausible. |
| The street jumps 10 m just after the start; the player stops early at the south end | `layout.ts` shifted the centre-line table by its own origin point *while* shifting that point to zero, so every later point was left unshifted. Copy values out before mutating the array they come from. Now checked: consecutive centre-line points are never more than 0.5 m apart. |
| A flickering speckled pattern on a surface | Two faces at exactly the same depth ("z-fighting"): the GPU can't pick one. Move one back by a few centimetres. First seen in the cafe's stair doorway. |
| Fine vertical stripes on big walls turned away from the sun | Shadow acne. `normalBias` raised from 0.03 to 0.06 in `lights.ts`. |
| Brush strokes look like wood-grain rings | Rotating the stroke pattern by an angle that varies across the surface: at large world coordinates a small angle change is a big shift. `paint.ts` stretches noise along the surface with a small wobble instead. |
| The colour grade turned everything dull and grey-violet | The grade *multiplies* by its tints, and a hex colour becomes a much darker number once converted to linear light. Keep tints close to white (`GRADE` in `post.ts`). |
| A `__shot` of a side-wall ad shows a blank wall | The test camera was inside the neighbouring building: side walls face *along* the street, so "a few metres in front of it" is inside the row. View side walls from a point on the street's centre line. |
| The fort looked like it was floating | It was on a pointed peak, so the ends of a wide fort hung in the air. Hill forts need a broad flat-topped hill (`ridgeProfile` in `backdrop.ts`). Check suspected floating with a narrow-field `__shot` (set `__game.camera.fov` low) and by measuring, before changing anything. |
