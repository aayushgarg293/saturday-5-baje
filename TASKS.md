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
- [ ] Owner plays it in Chrome and Safari

Found while building (for phase 3):
- At 4:30 pm the west-side buildings shade the whole street floor; tune
  heights / sun angle so sunlight falls on part of it.
- Shadow edges are jagged where they cross walls at a shallow angle.

**Done when:** you can walk the length of the grey street at 60 fps on the
MacBook Air, and frames can be captured with `__shot`.

## 2. The street: layout and buildings
- [ ] Street plan: length, width, where the cafe, temple, stalls and gali go
- [ ] Buildings: shopfronts, shutters, havelis with jharokhas, flat roofs, water tanks, antennas
- [ ] The cafe building: shop below, narrow staircase, cafe signboard
- [ ] Background: Aravalli hills and a hilltop fort silhouette
- [ ] Overhead wires and poles

**Done when:** the empty street already reads as a Rajasthan market street.

## 3. The look
- [ ] Toon shading tuned: bands, shadow colour, rim light
- [ ] Ink outlines
- [ ] Sky, haze and a warm colour grade for 4:30 pm
- [ ] Hand-painted signboards and wall-painted ads (Canvas2D, Devanagari)
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
