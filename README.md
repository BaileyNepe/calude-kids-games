# Math World

A colourful maths game for kids aged 8+. Solve arithmetic inside playful
mini-games, win collectible pet cats, and wander a shared world hub.

## Running it

```bash
npm install
npm run dev        # http://localhost:5180
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server, reachable from a tablet on the same network |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests in watch mode |

> The dev server uses port **5180**, not Vite's default 5173 — another
> project on this machine already binds 5173 on IPv6 localhost, and the two
> servers can coexist at the OS level while `localhost` silently resolves to
> the wrong one.

## Deploying to the web

The game is hosted on **Railway**. `Dockerfile` builds the bundle with Node
and serves it from nginx; `railway.json` points Railway at that Dockerfile, so
there is nothing to fill in by hand:

1. Push this repo to GitHub.
2. At [railway.app](https://railway.app) → *New Project* → *Deploy from GitHub
   repo* → pick the repo.
3. Under *Settings → Networking*, press *Generate Domain* to get a public URL.
4. Under *Settings → Edge*, turn on *Enable CDN Caching*. It's free on every
   plan and off by default. There is no config-as-code key for it, so it has
   to be clicked once per service.

Every push to the default branch redeploys. Railway injects `PORT` and nginx
picks it up at container start, so don't set it yourself. `/healthz` is the
healthcheck endpoint Railway waits on before switching traffic to a new build.

The CDN obeys the `Cache-Control` headers nginx sends, which is why they are
set deliberately in `docker/nginx.conf.template`: hashed files under
`/assets/` are cached at the edge for a year, while `index.html` revalidates
on every request so a deploy is visible immediately.

To run the image locally exactly as Railway will:

```bash
docker build -t math-world .
docker run --rm -e PORT=8080 -p 8080:8080 math-world
```

On an iPad, opening the site in Safari and choosing *Share → Add to Home
Screen* gives an app-like icon that launches full screen — worth doing while
the TestFlight build is pending.

## Building the iOS app

Capacitor wraps the built web game in a native shell. The Xcode project is
already generated and configured (landscape-only, full screen, no zoom).

```bash
npm run ios:open      # builds, syncs, and opens Xcode
```

Then, in Xcode:

1. Select the **App** target → *Signing & Capabilities*.
2. Set **Team** to your Apple Developer account, and change the **Bundle
   Identifier** from `com.mathworld.game` to something you own
   (e.g. `com.yourname.mathworld`). Keep `capacitor.config.ts`'s `appId` in
   sync with it.
3. Plug in an iPad, pick it as the run target, and press ▶ to test on device.
4. For TestFlight: *Product → Archive*, then *Distribute App → App Store
   Connect → Upload*.

**Requirements:** TestFlight needs a paid Apple Developer account
($99/year, from [developer.apple.com](https://developer.apple.com/programs/) —
approval usually takes a day or two). You'll also need to create the app
record in App Store Connect with the same bundle identifier before the first
upload.

After any change to the game, re-run `npm run ios:sync` to copy the new build
into the iOS project.

## The games

| Game | What you do |
| --- | --- |
| Balloon Pop | Pop the balloon showing the answer |
| Pirate Ship | Tap the right treasure plank on the deck |
| Feed the Cat | Drag the numbered fish to the cat's mouth |
| Number Ninja | Swipe through the correct answer in mid-air |
| Build a Number | Drag digit blocks to construct the answer |
| Cat Cafe | Serve your cats by paying the right number of coins |
| Rocket Launch | Fuel a rocket — streaks push it higher into space |
| Frog Pond | Tap the lily pad and the frog leaps across to it |
| Honey Hive | Tap the bee carrying the right answer home to the hive |
| Treasure Dive | Pop the rising bubble with the right answer |
| Memory Cards | Cards flip face-down — remember where the answer went |
| Castle Knock | Slingshot: knock down the tower flying the right banner |
| Number Train | Couple the right wagon to the engine |
| Magic Potion | Pour the right potion bottle into the cauldron |
| Patterns | Finish the caterpillar's number sequence |
| UFO Catch | The saucer beams up the right space rock |
| Balance Scales | Find the missing number that levels the seesaw |

The original seven games are always open; the newer ten unlock as the
player levels up (level 2 through 8, shown as padlocks on the hub). The
harder games — the logic ones especially — pay more coins per answer and
carry a bonus to the cat-drop chance.

Every round gives **three hearts**. A wrong answer costs one (the question
can still be retried); losing all three ends the round with no cat. Winning
a round rolls for a cat — guaranteed up to level 5, and from level 6 the
cats grow shyer (a won round may pay out bonus coins instead). Collected
cats follow the player around the world hub.

From level 6, roughly one question in three must be **typed** on a drawn
number pad instead of picked from choices — recall rather than
recognition. (Fraction and decimal questions always stay multiple-choice.)

A handful of **hidden gems** are tucked into scenery around the world —
each pays out coins once, ever, to whoever spots it.

## Levels

There are **152 cats across 15 levels**. Only cats from your current level
can drop, and collecting all of them unlocks the next. The first five levels
climb the maths tiers from sums-to-20 to six-digit arithmetic; from level 6
(Jungle, Desert, Candy Land, Volcano, Crystal Caves, Cloud Kingdom, Deep
Ocean, Fairy Garden, Dreamland, Rainbow Realm) the rounds grow longer, the
games move a little faster, and the cat-drop chance eases down from 90% to
50%.

Each level raises the difficulty *floor*, so a child who has worked through
the Meadow is never dropped back to single-digit sums. The Maths screen still
chooses which operations to practise.

## Shop and character

Pick a character on first launch (changeable later). Coins earned from maths
buy hats and outfits for your character, collars for your cats, extra
**emotes** for the world's emote bar (the first four faces are free), and
**celebration effects** — heart bursts, confetti, fireworks — that restyle
every correct-answer flourish in every game. Prices run from 40 coins to
3000, so there's always a next thing to save for.

## Maths

Choose what to practise on the **Maths** screen: adding, taking away, times,
sharing (exact division only — no remainders), and fractions. Fractions are
taught visually: a shape is shown with parts shaded, and the child picks the
fraction that matches.

Difficulty is either fixed (Easy / Medium / Hard) or **Just right**, which
starts one tier below the player's best and climbs as they get answers right.
It never drops on a wrong answer — being demoted for trying would undercut the
whole tone.

## Structure

```
src/
├── main.ts                  Entry point: game config, scene registration
├── scenes/                  One Phaser Scene per screen
│   ├── BootScene.ts         Bakes every texture once, loads the save
│   ├── WorldScene.ts        Hub: portals, walking, pets, emotes
│   ├── SettingsScene.ts     Operation and difficulty pickers
│   ├── PetsScene.ts         The cat collection
│   └── …                    The seventeen mini-games
├── world/                   Hub-only pieces (player, wanderers, companions)
└── shared/
    ├── mathEngine.ts        Question generation, difficulty tiers  ← unit tested
    ├── gameState.ts         Typed save, persisted to localStorage  ← unit tested
    ├── pets.ts              Cat catalog and the rarity roll        ← unit tested
    ├── MiniGameScene.ts     Shared round loop behind every game
    ├── ui.ts                Buttons, HUD, question banner
    ├── audio.ts             Synthesized sound effects
    └── art/                 All artwork, drawn in code
```

### There are no asset files

Every sprite is drawn at runtime with the Phaser Graphics API and baked into
a texture during `BootScene`; every sound is synthesized from WebAudio
oscillators. Nothing is loaded from disk.

The hand-drawn look comes from `art/doodle.ts`: lines are jittered by a
*seeded* PRNG, fills are offset slightly from their outlines (colouring
outside the lines), and outlines use a warm near-black rather than pure
black. Seeding matters — without it the art would shimmer whenever a texture
was regenerated.

The people are modelled on the reference drawing in `IMG_2080.jpeg`: big
concentric eyes, a thick bob of hair with finger-like strands, a two-tone
trapezoid tunic, long thin line limbs, and solid blob shoes.

## Tuning

| What | Where |
| --- | --- |
| Cat drop rates | `DROP_RATES` in `shared/pets.ts` |
| The cat catalog | `CAT_CATALOG` in `shared/pets.ts` |
| Difficulty ladder | `DIFFICULTY_TIERS` in `shared/mathEngine.ts` |
| Coins per answer, round length | `shared/config.ts` |
| Colours | `PALETTE` in `shared/art/doodle.ts` |

## Gotchas worth knowing

**Never call `setSize()` on an interactive Container.** Doing so shifts the
origin Phaser uses for hit-area coordinates by half the size, leaving the
tappable region offset from the drawn shape. This made every button, card,
balloon and fish mis-aligned. Pass an explicit hit area instead — `setSize`
is unnecessary when you do.

**Phaser pauses when the tab is hidden.** Expected behaviour, but it means
automated testing in a background tab needs the game loop stepped by hand
(`game.step(time, delta)`); tweens with a `delay` do not advance reliably
under manual stepping.

**Audio needs a user gesture.** The `AudioContext` is created on the first
pointer or key event (`main.ts`), not at load.

## Resetting

A small `reset` link sits in the bottom-right of the world screen, behind a
confirmation. It is deliberately understated — an eight-year-old will tap a
big friendly "Reset" button, and losing the collection is the worst outcome
this game has.
