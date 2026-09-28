# TASKS — build order

Each phase ends with something the owner can run, look at and play. Tick items
as they're done, and add anything new that turns up. A phase is done only when
its **Done when** line is true.

## 0. Setup
- [x] Game brief (`BRIEF.md`)
- [x] Project rules (`CLAUDE.md`) and this task list
- [x] Check Node.js is installed (Node 23.11, npm 10.9, pnpm 10.12)

## 1. Walking skeleton
Proves the foundation before anything is pretty.
- [x] Vite + TypeScript + Three.js project
- [x] First-person player: WASD, mouse look (pointer lock), walking speed, collisions with walls
- [x] An empty grey street block with simple box buildings on both sides
- [x] The toon material factory (first version) and basic lighting
- [x] Dev-only `__shot` capture tool, plus a few saved camera positions
- [x] FPS counter (dev only)
- [x] Scripted collision checks pass (walls, both ends, both galis, sliding)
- [x] Speed: ~1 ms per frame on the M4 (budget for 60 fps is 16.7 ms)
- [x] Owner plays it (speed confirmed good)

**Done when:** you can walk the length of the grey street at 60 fps on the
MacBook Air, and frames can be captured with `__shot`.

## 2. The street: layout and buildings
- [x] Street plan (`world/layout.ts`): 205 m, gentle S-bend, cafe on the right
      near the end, two walkable gali stubs, temple plot, phase 4 stall slots
- [x] Buildings: shops (platform, open room, shutter, awning, board), havelis
      (arched door, jharokhas, cornices, chhatris), houses; flat roofs with
      parapets, black water tanks, TV antennas, dishes
- [x] The cafe building: STD/PCO shop below, stair doorway (closed until
      phase 7), first-floor window strip, main board and blade sign
- [x] Background: three layers of Aravalli ridges, fort on a flat-topped hill
      where the street points
- [x] Overhead wires and poles, sagging, dropping to houses, tangled bundles
- [x] Checks: blade sign visible from the start (9/9 rays, 173 m); 81 s walk
      to the cafe; wall sweep every 2 m on both sides with no gaps; both ends
      and both galis stop you correctly; 1.0–1.7 ms per frame
- [x] Owner feedback round 1: the cafe couldn't be picked out, and the fort
      didn't read as a fort. Fixed: the cafe's signs are painted now
      (`world/signs.ts`: main board, two-sided blade sign, stair-door board,
      STD/ISD/PCO below), pulled forward from phase 3; the fort is rebuilt with
      merlons, tapering bastions, an arched gate, a palace with chhatris, and
      outer walls stepping down the hill (one draw call)
- [x] Owner plays it and approves

Carried to phase 3 (the look):
- Shadow edges are jagged where they cross walls at a shallow angle.
- The hills' colours are close to the sky's; tune with the sky and haze.
- Balcony railings are solid dark panels; lighten or add bars.

**Done when:** the empty street already reads as a Rajasthan market street.

## 3. The look
- [ ] Toon shading tuned: bands, shadow colour, rim light
- [ ] Ink outlines
- [ ] Sky, haze and a warm colour grade for 4:30 pm
- [ ] Hand-painted signboards for every other shop (the cafe's are done;
      `world/signs.ts` already paints any `kind` that has a painter) and
      wall-painted ads (Canvas2D, Devanagari)
- [ ] Film posters with look-alike names

**Done when:** the frames look painted, and still hold 60 fps.

## 4. Street life: stalls and props
- [ ] Chai tapri, golgappa cart, kachori and samosa, jalebi shop, ice gola cart
- [ ] Kirana shops with hanging snack strips; the small temple with bells
- [ ] Parked and passing vehicles: autos, scooters, bikes, cycle-rickshaws
- [ ] Cows and stray dogs

## 5. People
- [ ] One stylized figure: the chaiwala, making chai. Judge it before building more.
- [ ] Men talking at the chai corner, shopkeepers sitting out front
- [ ] Kids playing gully cricket
- [ ] Hawkers

## 6. Street sound
- [ ] Ambient mix: horns, hawkers' calls, temple bells, chai glasses
- [ ] Film tune on a shop radio (original), positioned in 3D

## 7. The cafe
- [ ] Staircase up to the first floor
- [ ] The owner at the counter
- [ ] Wooden cubicles with curtains; other customers with light animation
- [ ] Sitting down at the computer: the camera moves to the screen
- [ ] The wall clock and the look-up control
- [ ] Dial-up modem and room sounds

## 8. The computer
- [ ] Windows XP look-alike desktop: wallpaper, taskbar, Start menu, windows, sounds
- [ ] Yorkut: profile, scraps, a friend's post, communities
- [ ] Yaaho! Messenger: chat with friends
- [ ] MeToob: videos that buffer forever
- [ ] Background detail: icons, tabs, pop-ups
- [ ] Log off

Needs first: **the story on the computer** (open question in `BRIEF.md`).

## 9. The walk home
- [ ] Same street at dusk: sky, lighting, tubelights flickering on
- [ ] Street life and sound changed for evening
- [ ] Ending

## Open questions (from `BRIEF.md`)
- The story on the computer: the friend's post, who he chats with
- Which key looks up at the wall clock
- Final look-alike names
- Title
