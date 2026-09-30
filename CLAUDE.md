# Cyber Cafe — project rules

A first-person, nostalgic walk to an Indian cyber cafe in 2004–2010: a market
street in an Ajmer-like Rajasthan town, a first-floor cafe, a curtained cubicle,
a Windows XP look-alike desktop, then the walk home. **`BRIEF.md` is the source
of truth for what the game is; `TASKS.md` is the build order and current state.**
Read both before starting work.

## Status

Phases 0–8 done: the street (30 people, traffic, animals, sound); the cafe
(the stair, the hall with 13 booths, the owner and four customers, sitting
down in booth 2, the dial-up modem, the game clock); and the computer:
`src/desktop/`, an HTML Windoze XP look-alike over the game (lean in with a
click, Esc to lean back), with Yaaho! Messenger (Priya and Rohan, the story
as data in `desktop/story.ts`), Internet Xplorer (Rediffit portal, SongzPK,
Rediffit Mail, Yorkut, MeToob), two tasks woven into the chats (a song for
Priya, a photo for Rohan), the cafe timer, and Log Off. Phase 9 done too:
paying the owner, the light following the clock (render/daylight.ts), the
lamps coming on (world/evening.ts), evening life and sounds, home and the
ending card (*Saturday, 5 Baje*). This version is complete: one visit.
The owner prefers a spare soundscape: add sounds only when asked.

Latest (2026-09-30, Claude's background tab, 1521×784): ~4 ms per frame,
~380 draw calls on the street (the people and the cafe added since the
baseline below); dusk costs the same or less (no shadow pass once the sun
is down). Measure on the owner's machine before release.

Baseline (2026-09-28, M4, Chrome, 1470×956): **~3.5 ms per frame at pixel
ratio 1.5, ~5.3 ms at 2; 110–206 draw calls** depending on the view (shadow
pass included). Budget for 60 fps: 16.7 ms.

## How the world is organised

- **`src/world/layout.ts` is the street plan, as data.** Everything is placed
  by `s` (metres along the street) and `offset` (metres to the side, left
  negative); `pointAt(s, offset)` turns that into world x/z, so the street can
  curve without anything else knowing. Plots, galis, side roads, the cafe,
  stall spots (`SLOTS`), parked vehicles (`PARKED`) and animals all live there.
- **Props** (`world/props/`) are built in their own frame (x along the street,
  +z facing the middle of the street) and placed with `placeOnStreet()`.
  Everything that never moves goes into one `StaticBatch`: one draw call.
- **Shop names decide shop goods.** `street.ts` gives each shop a name from
  `names.ts`; the name's `trade` picks its goods (`props/goods.ts`) and the
  sign painter shows the same name.
- **Buildings are built in their own local frame** (x along the frontage, +z
  toward the street, z = 0 at the plot's front edge) from parts, then merged
  into **one mesh per building** with `Parts` (`src/world/kit.ts`). One building
  = one draw call. Shared pieces are in `src/world/buildings/common.ts`.
- **Floors above the street** are patches (`core/floors.ts`): flat or ramps
  (the cafe's stair). A building can return its own colliders and floors
  (the cafe does, so you can go in); a collider can cover only a band of
  heights (`y0`/`y1`), so first-floor walls don't stop you downstairs.
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
- `__walkCheck()`: flood-fills everywhere the player can stand; reports which
  key places are reachable and the narrowest walkable width. Run it after
  placing anything on the street.
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
| A prop added twice ends up in the wrong place | `Parts.add` moves the shape it's given in place. Clone a shape *before* adding it if you need a copy (the umbrella's lining). |
| Something seen from below is invisible | Surfaces are drawn from their front only. Things you look up at (umbrellas, canopies) need a mirrored copy facing down. |
| A vehicle stopped forever for someone standing at the road's edge | Its "in my path" test had too wide a margin. Use the player's body radius plus a little (`traffic.ts`). |
| Vehicles cut across each other in the back lanes | Routes went diagonally from the side road to far waiting spots, past nearer ones. They now drive along the lane's outer half until level with their spot, then pull in. |
| The walk check says a place is unreachable, but it isn't | Check what's *on* the probe point first: a dog was lying exactly on the spot being tested. |
| Animals look like boxes | Flat (faceted) shading suits buildings, not bodies. Build rounded things with `Parts.build(name, { smooth: true })`. |
| The fort looked like it was floating | It was on a pointed peak, so the ends of a wide fort hung in the air. Hill forts need a broad flat-topped hill (`ridgeProfile` in `backdrop.ts`). Check suspected floating with a narrow-field `__shot` (set `__game.camera.fov` low) and by measuring, before changing anything. |
| A `__shot` shows people frozen, arms hanging, props at the ground | `crowd.ts` doesn't animate people far from the *player*, and `__shot` only moves the camera. Move the player there first (`__game.player.place(...)`, then `__game.step(0.5)`), then shoot. |
| A seated man's kurta hangs down through the bench like a bucket | Kurta tails follow the hips joint, so they stay vertical when the thighs swing forward. Seated men wear shirts (`chaiCorner.ts`). |
| The walk check's narrowest width jumps around between runs | The moving vehicles have colliders too: whatever's driving past at that moment narrows the street. For the street's own narrowest point, move `__game.life.traffic.colliders` far away (`cx += 5000`), check, then put them back. |
| Speed measured in Claude's tab varies ±2× between runs | The background tab and the GPU's clock aren't steady. Compare with and without the thing being tested (e.g. hide `crowd`) in the same run, not against an old number. |
| Two walkers stood frozen side by side for minutes | "Never step closer to anyone" blocked every step, because the small sidestep back to the usual lane brought them closer even while the step along the street took them apart. Try the step along the street alone before holding still (`think` in `walkers.ts`). Found by stepping the game for minutes and logging who hasn't moved. |
| A rider's arms stuck straight out, short of the handlebar | The scooter's bar is further forward than an upright arm reaches. Real riders sit at the front of the seat and lean in: move `seat.x` forward and raise `lean` in the vehicle's `Ride`, and check the shoulder-to-grip distance is under the arm's length (≈0.53 m). |
| One vehicle (the bicycle) never left its lane | "Whoever has waited longest goes next" sorted by seconds *left* to wait, which is zero for everyone ready, so the first in the list always won. Track time since each last arrived (`idle` in `traffic.ts`) and pick the largest. Found by logging departures over ten simulated minutes; the owner noticed first. |
| A test says traffic is stuck | Check where the test put the player: vehicles stop for anyone in their path, and a test player parked on the road holds traffic up for good. Park it off the road (offset ≥ 3). |
| The owner doesn't see a vehicle that the tests say is running | Tests checked the traffic never collided or stuck, not *when* the player would see each vehicle. Check from the player's side: simulate walking in from the start and log when each vehicle first passes within 10 m. |
| Sound played out of the owner's speakers during a test | Calling `__game.audio.start()` in Claude's tab starts real sound. Measure with `__audioLab` instead (renders offline, silently); if the live context was started, `await __game.audio.ctx.close()`. |
| A console test hears nothing from a module the game clearly uses | The dev server loads a file edited since page load as `file.ts?t=…`; `import("/src/…/file.ts")` from the console then gets a second, separate copy. Use what the dev tools hand over (`__cues`, `__audioLayers`, `__game`), not console imports of stateful modules. |
| A steady sound (the oil sizzle) could be heard all along the street | Normal distance fading never reaches zero, and a hiss that never stops stays noticeable even when faint. Give never-ending sounds a hard edge: `place(..., reach)` fades them out completely by `reach` metres. |
| The clock couldn't be seen from the chair | Seated, your eyes (1.22 m) are lower than the booth partitions (1.45 m): check sight lines from the SEATED eye, not a standing camera. `__shot(name, "current")` shoots what the camera sees right now (seated, mid-glance). |
| After leaving the desktop, clicks did nothing ("stuck") | The overlay's CSS `display: flex` beat the `hidden` attribute, so the invisible desktop still lay over the game catching clicks. Any element hidden with `el.hidden` needs `[hidden] { display: none }` if its CSS sets `display`. Check with `document.elementFromPoint(x, y)`. |
| Esc on the desktop couldn't give the mouse back to the game | Browsers only capture the mouse (pointer lock) on a click, never a key. After Esc, the next click on the view captures it (`main.ts`). |
| Clicking a link on a web page leaned you out of the computer | The bezel's "clicked outside the screen?" test ran after the link's page had been swapped out, so the clicked element was no longer inside the screen. Check what was clicked (`e.target === bezel`), not "is it outside". |
| Real key presses from Claude's test tools never reach the game | The test tab gets no key events at all. Drive the desktop with `window.dispatchEvent(new KeyboardEvent("keydown", { key }))`; the owner checks real typing. |
| A fade (CSS transition) never ran in Claude's test tab | It was started on `requestAnimationFrame`, which a background tab never fires. Start it with a forced layout instead (`void el.offsetWidth; el.classList.add(...)`): works everywhere. |
| New random choices in a builder would reshuffle the whole street | Builders draw from forked random streams in a fixed order; an extra draw in one changes everything built after it. Builders only *report* new things (lamp spots, doors); the code that uses them draws from its own seed (world/evening.ts, the evening men at the chai tapri). |
