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

**Done when:** the empty street already reads as a Rajasthan market street.

## 3. The look
Owner's choices: warm & dusty (Ghibli-like), medium outlines, painterly +
weathered, invented period shop names.
- [x] Post-processing (`render/post.ts`): depth-based ink in warm brown,
      warm/violet split-tone grade, vignette, paper grain, FXAA; dev keys O / G
- [x] Sky (`world/sky.ts`): painted gradient dome with a warm glow on the sun
      side, 13 flat cel clouds; haze matched to the horizon; hills re-coloured
- [x] Lighting: cool fill opposite the sun (coloured shadows), 4096 shadow map
      with soft edges (fixes the jagged shadows)
- [x] Painted surfaces (`render/paint.ts`): brush strokes, uneven lime-wash,
      dust at the foot of walls, rain streaks, worn ground patches
- [x] Every shop board lettered: 36 invented names in Hindi + English, what
      they sell, a phone number, hand-painted styles, faded and rusty
- [x] 8 wall-painted ads on exposed side walls (look-alike brands, invented
      slogans), placed automatically from building heights, peeling
- [x] Film posters (look-alike titles) torn and overlapping on house walls
      and beside the cafe's stair door
- [x] Balcony railings as bars; lighter, sun-bleached road
- [x] ~3.2 ms per frame at pixel ratio 1.5 (budget 16.7)
- [x] Owner plays it and approves

Ideas for later polish: the road could use more texture (tyre marks,
potholes); ads are seen at an angle, which is right, but a couple could go
on end walls facing straight down the street.

**Done when:** the frames look painted, and still hold 60 fps.

## 4. Street life: stalls and props
Owner's choices: a few moving vehicles; animals mostly still with small idle
motion; busy but walkable.
- [x] Chai tapri, golgappa cart, kachori and samosa, jalebi, ice gola cart
      (`props/stalls.ts`), each with a painted board
- [x] Shop goods by trade (`props/goods.ts`): kirana snack strips and sacks,
      sweets case, sarees and cloth bolts, coolers and fans, tyres, shelves
- [x] The temple (`props/temple.ts`): shrine, shikhara, garland, bell, flag,
      peepal tree
- [x] Parked scooters, motorcycles, bicycles, a cycle-rickshaw and an auto
      (`props/vehicles.ts`, spots in `layout.ts` `PARKED`)
- [x] Cows and dogs with idle motion (`props/animals.ts`)
- [x] Side roads at both ends; an auto, a scooter and a bicycle shuttle
      between them, one at a time, stopping and honking for the player
      (`traffic.ts`; honk sound in phase 6)
- [x] Walk check (`__walkCheck`): all key places reachable, narrowest
      walkable width 4.8 m; traffic tested over 800 simulated seconds
- [x] ~3.5 ms per frame at pixel ratio 1.5 (budget 16.7)
- [x] Owner plays it and approves

## 5. People
- [x] The people system (`src/people/`): skeleton, one skinned mesh per body
      (+ a painted face shell), painted anime faces (eyes, brows, moustache,
      tilak), hair, clothes (vest, dhoti, gamchha so far), arm IK, head look-at
- [x] The chaiwala (`people/chaiwala.ts`): stirs → lifts and pours → wipes his
      hands on the gamchha, in a loop; looks at you when you're near
- [x] Owner round 1 ("face mostly enough, more expressive would help; body
      too stiff"): blinking; a grin, raised brows and a nod when he first
      notices you; torso twists toward the work, shoulders rock with the
      stirring, leans into the pour, weight shifts hip to hip, head tilts
- [x] Owner judges the chaiwala: approved
- [x] Clothing and variety (`people/clothes.ts`, `people/recipes.ts`): safa,
      kurta, Nehru jacket, ghagra-choli-odhni, salwar-kameez-dupatta, school
      uniform, jeans; a role gives a seeded, varied person. `?lineup` in the
      address shows nine of them in a row (dev only)
- [x] Actors (`people/actor.ts`): any person doing a loop of actions, sitting
      or standing; leg IK for sitting (`plant` in `pose.ts`)
- [x] Three men on the chai benches: sip, talk, listen, laugh (`chaiCorner.ts`)
- [x] Stall sellers and customers (`sellers.ts`): golgappa seller + a woman
      eating; kachori halwai with his jhara; jalebi halwai swirling batter;
      ice gola seller + a kid with a gola
- [x] `people/crowd.ts` places everyone and updates far groups less often
- [x] Owner looks at the chai corner and the stalls: "looks nice"
- [x] Shopkeepers (`shopkeepers.ts`): shops report a spot for their keeper
      (`PeopleSpot` in `buildings/common.ts`); five are shown, one per trade:
      kirana reads the paper, sweets fans himself, electrical is on his mobile,
      cycle and general sit out front (arms folded, stretching)
- [x] An old woman at the temple (`devotee.ts`): prays, rings the bell,
      touches the step
- [x] Gully cricket (`cricket.ts`): batter, bowler, two fielders and one ball
      on a shared 7 s loop; `crouch` in poses for bending the knees
- [x] Owner looks at the shopkeepers, the temple and the cricket: "i like it"
- [x] Owner's request: political posters on the electricity poles (28, on
      all nine poles; `polePosters` in `wires.ts`, painted by `signs.ts`, words
      in `names.ts`): independent candidates with invented symbols, a college
      union election, a birthday, a minister's welcome
- [x] Walkers (`walkers.ts`, lane plan in `lanes.ts`): five people walk the
      road's edge keeping left, cross at the ends of their stretch (waiting
      for traffic), pause to look at shops, swing round stalls and cows,
      squeeze aside for vehicles, step round you; vehicles stop for them.
      Walk cycle with planted feet, hips riding over the standing leg, four
      arm styles. Tested: 5 simulated minutes, nobody stuck or inside
      anything, no vehicle held up
- [x] Owner watches the walkers: "looks good"
- [x] Real riders on the moving vehicles (`people/riders.ts`; each vehicle
      gives its seat, grips and footrests as `Ride` in `props/vehicles.ts`):
      the khaki auto driver and a passenger; an uncle on the scooter with a
      child standing on the footboard; the doodhwala on his bicycle with milk
      cans, pedalling. 30 people on the street in all
- [x] Owner round ("can't see the doodhwala and the Chetak"): the traffic
      only ever sent the auto and the scooter (a turn-taking bug), one
      vehicle at a time. Now all three take turns, and up to two are out at
      once, one each way: a vehicle onto the street about every 35 s
- [x] The doodhwala now sets off first, from the north end, toward you as you
      walk in (he started behind you before, and you'd have to turn round)
- [x] Owner round ("this time I didn't see the Chetak"): with two at most,
      going opposite ways, the scooter waited behind the doodhwala at the
      north end. Now up to three: one may follow another the same way (well
      behind, no faster, and vehicles stop for a vehicle stopped ahead). The
      scooter leaves first, toward you; the auto behind you; the doodhwala
      after the scooter. Tested 10 simulated minutes: 7 trips each, all three
      out at once at times, never closer than 7 m in a lane
- [x] Owner saw the auto, the Chetak and the doodhwala: phase 5 done
- [ ] Maybe: a second look at the cow and dog alongside the people

## 6. Street sound
- [x] The sound system (`src/audio/`): engine (mixer, street echo, listener
      on the camera, M to mute), synth building blocks; `__audioLab` renders
      sound offline and measures it (Claude can't listen)
- [x] The background layer (`audio/bed.ts`): the town's hum and air, passing
      traffic beyond the rooftops, a koel, pigeons, a far-off pressure cooker,
      dog, horn and hawker. Owner listened: crows ("pew pew") and the voice
      murmur taken out; "we can add more sounds later"
- [ ] Film tune on the chai tapri's radio (original, 2000s filmy), in 3D
- [ ] More street sounds, when the owner has thought about which

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
