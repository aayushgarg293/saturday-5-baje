# Cyber Cafe — game brief

*Working title. Draft 1, 2026-09-27.*

## The feeling

Nostalgia for the Indian cyber cafe of 2004–2010: pocket money, a summer
vacation afternoon, the walk through the market, the stairs up to the first
floor, the owner at the counter, the curtained cubicle, the dial-up tone, and
an hour on Orkut and Messenger with friends. Nothing is at stake. The game
exists to make someone who lived it remember it, and to show someone who
didn't what it was like.

## Setting

- **Era:** 2004–2010, before smartphones. Feature phones, CRT monitors, pen drives.
- **Place:** one market street in a tier-2/3 city in Rajasthan, Ajmer-like.
  Signboards in Hindi (Devanagari), with the odd English word
  ("CYBER CAFE", "STD ISD PCO"), hand-painted and imperfect.
- **Season and time:** summer vacation, late afternoon, roughly 3–6 pm.
  Warm, low sun, but not yet golden hour.

## The player

A 15–16-year-old boy on summer vacation, going to the cyber cafe to:
- check his Orkut-style profile and a friend's post, and leave scraps
- reply to friends on a Yahoo-Messenger-style chat
- talk with fellow fans of a popular TV show in a forum or community
- mess around on the internet

## Structure

```
the street (walk)  →  stairs to 1st floor  →  the owner at the counter
      →  a curtained cubicle  →  the computer (fake Windows XP)
      →  log off  →  walk home
```

**Art style:** painterly, cel-shaded, like `sakura-crossing/` and
`summer-cycle/`: toon shading, ink outlines, warm grade, everything generated in
code where practical.

### 1. The street

First person, **free WASD walking**. The walk is **pure atmosphere with no
interactions**: life happens around him on its own.

One short, dense market street (about 100–150 m) rather than a long thin one.

- **Food stalls:** pani puri / golgappa cart, chai tapri (chaiwala making chai,
  men talking around it, glasses clinking), kachori and samosa, jalebi shop,
  ice gola cart
- **Shops:** kirana stores, shopkeepers sitting out front, shop shutters
- **Street life:** cows sitting in the road, stray dogs, auto-rickshaws,
  scooters and bikes, cycle-rickshaws, kids playing cricket in the gali,
  a small roadside temple with bells
- **Texture:** tangled overhead wires, hand-painted signboards,
  wall-painted ads and posters, tubelights coming on at dusk
- **Sound:** horns, a film song from a shop radio, hawkers' calls,
  temple bells, the chaiwala's glasses

### 2. The cafe

- **On the first floor**, reached by a narrow staircase from the street,
  which is the signature of the place.
- **The owner** is at a counter as soon as you enter.
- Every computer sits in a **wooden cubicle with a curtain**.
- **Other customers** sit in other booths doing their own thing, with light
  animation. No paying, no entry register for now.
- Sound: the **dial-up modem**, and the rest of the room around you.

### 3. The computer

A **classic Windows XP look-alike desktop** you can actually use: the hill
wallpaper, blue taskbar, green Start button, and the sounds. Inside it are
look-alike versions of the sites and apps of the time (see Naming).

- **Core (usable):** Orkut (scraps, testimonials, a friend's post, communities
  as the fan forum), Yahoo Messenger (chat with friends, buzz, status),
  YouTube (tiny videos that buffer forever)
- **Also in:** Facebook (the new thing, 2008+), Yahoo forums / Groups,
  Yahoo Answers, Hi5, BigAdda, ibibo, Gmail invites, Google Talk, MSN,
  Rediffmail, Rediff Bol, Cricinfo live scores, Miniclip, Wikipedia,
  Blogspot, Naukri, results sites, MP3 sites, Winamp, Nero, desktop games
  (Counter-Strike 1.6, Road Rash, NFS Most Wanted, Pinball, Minesweeper)
  and a pen drive with a shortcut virus. These can be background detail:
  tabs, icons, pop-ups, bookmarks.

### Pop culture

**Real shows and films of the period, with names changed a little**, not
invented ones. They show up in Orkut communities, messenger statuses, forum
threads, and film posters on the street walls. All of these are in:

- **Indian TV:** MTV Roadies, Dill Mill Gayye, Remix, Sarabhai vs Sarabhai,
  Khichdi, WWE
- **International TV:** Prison Break, FRIENDS, How I Met Your Mother,
  The Big Bang Theory, Heroes, Lost
- **Films:** 3 Idiots, Rang De Basanti, Jab We Met, Dhoom 2, Rock On!!,
  Jaane Tu Ya Jaane Na, Golmaal

The look-alike names are still to be picked (first-pass list in Open questions).

### The clock

Time never runs out, but it is always ticking. That's the small, familiar
anxiety: he still has to finish the chat with his friend.

The mechanic: a **button or key that turns his view from the monitor to the
wall clock**, so the player looks up, sees how much time has passed, and
looks back.

### 4. Ending

When he's done, he **logs off, leaves the cafe and walks home** through the
same street. That's the end of this version.

## Scope

This version is **one visit**: the street, the cafe, the computer, the walk
home. The world is meant to grow later (more places, more visits), so the code
should make adding a location or a scene straightforward, but nothing beyond
this one visit gets built now.

## Characters

**Stylized, simple figures**, like background characters in a Ghibli film:
readable from a distance and never lingered on in close-up. Prototype one (the
chaiwala) first and judge before building the rest.

## Naming

**Look-alikes, not real names**, for sites, apps, brands, TV shows and songs.
Close enough to be recognized instantly, e.g. an Orkut-like social network and a
Yahoo-Messenger-like chat under made-up names. The film song on the radio is an
original "filmy" tune.

## Technical

- **Browser game only, for now**: Vite + TypeScript + Three.js, playable
  from a link in Chrome and Safari. A downloadable version (desktop wrapper,
  itch.io, Steam) may be considered later, depending on how it turns out.
- Must run smoothly (target 60 fps) on a **MacBook Air M4**, which has
  integrated graphics. Performance is measured from the start, not at the end.
- A dev-only capture tool (like Sakura Crossing's `__shot`) so rendered frames
  can be checked by the AI from set camera positions.
- Code the owner can read and understand: clear structure, small files,
  comments where the reason isn't obvious.

References in this folder: `summer-cycle/`, `sakura-crossing/`,
`threejs-skills/`.

## Proposed, not yet agreed

- **Ajmer details:** pyaaz kachori and mirchi bada stalls; havelis with
  jharokhas; lime-washed pastel walls and sandstone; rooftop water tanks and
  antennas; the Aravalli hills and a hilltop fort silhouette at the end of the
  street; a desert cooler roaring in a doorway; a shopkeeper on a charpai; a
  matka with a steel glass.
- **Dusk bookend:** walk there around 4:30 pm; walk home around 7 pm
  (sunset in a Rajasthan summer is about 7:15), the same street with the sky
  turning and tubelights flickering on. That's where "tubelights coming on at
  dusk" would land.

## Open questions

1. **Look-alike names.** First pass, to be edited:

   | Real | Look-alike | | Real | Look-alike |
   |---|---|---|---|---|
   | Orkut | Yorkut | | Prison Break | Prison Brake |
   | Yahoo! Messenger | Yaaho! Messenger | | FRIENDS | F.R.E.N.D.S |
   | YouTube | MeToob | | How I Met Your Mother | How I Met Your Mummy |
   | Facebook | FaceBuk | | The Big Bang Theory | The Big Bong Theory |
   | Rediff | Rediffit | | Heroes / Lost | Heroez / Lozt |
   | MTV Roadies | Rodies | | 3 Idiots | 3 Idiotz |
   | Dill Mill Gayye | Dil Mil Gaye Yaar | | Rang De Basanti | Rang De Basant |
   | Remix | Re-Mixx | | Jab We Met | Jab We Mate |
   | Sarabhai vs Sarabhai | Parabhai vs Parabhai | | Dhoom 2 | Dhoom Dhaam 2 |
   | Khichdi | Khichdee | | Rock On!! | Rock Onn!! |
   | WWE | WWX | | Jaane Tu Ya Jaane Na | Jaane Tu Ya Jaane Main |
   | Windows XP | Windoze XP | | Golmaal | Gollmaal |

2. **The story on the computer:** what the friend's post is, who he chats
   with and about what.
3. ~~**The clock control.**~~ Settled: **T** turns your view to the wall
   clock (above the stairwell), zooming in to read it, then back.
4. **Title:** a typical Indian cyber cafe name ("Cyber Planet",
   "Shree Ganesh Cyber Cafe", "Net World"…). Placeholder: "Cyber Cafe".
