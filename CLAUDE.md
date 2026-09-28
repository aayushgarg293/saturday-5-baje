# Cyber Cafe — project rules

A first-person, nostalgic walk to an Indian cyber cafe in 2004–2010: a market
street in an Ajmer-like Rajasthan town, a first-floor cafe, a curtained cubicle,
a Windows XP look-alike desktop, then the walk home. **`BRIEF.md` is the source
of truth for what the game is; `TASKS.md` is the build order and current state.**
Read both before starting work.

## Status

Phase 1 (walking skeleton) built: a grey box street you can walk in first
person. Next: phase 2, the real street layout (`TASKS.md`).

Baseline (2026-09-28, M4, Chrome, 1470×956 at pixel ratio 1.5):
**~1.0 ms per frame, 77 draw calls** (including the shadow pass).

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
- **All materials come from one toon material factory.** No
  `MeshStandardMaterial` or other PBR materials in the game.
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
| Shopfront line ragged; walls stop you short of the kerb; a gali is blocked | A box's two ground sizes were passed in the wrong order, so buildings were long along the street instead of deep. `building()` in `street.ts` now takes `sizeX` (east–west) and `sizeZ` (north–south), never "width/depth". Caught by walking into every wall with `__game`; screenshots looked plausible. |
