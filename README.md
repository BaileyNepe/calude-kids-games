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

The game is a static site, so any static host works. **Netlify** is set up
already via `netlify.toml`:

1. Push this repo to GitHub.
2. At [app.netlify.com](https://app.netlify.com) → *Add new site* → *Import
   an existing project* → pick the repo.
3. Netlify reads `netlify.toml`, so leave the build settings alone and press
   Deploy.

Every push to the default branch redeploys. To try it without a repo,
run `npm run build` and drag the `dist/` folder onto Netlify's dashboard.

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

Winning a round rolls for a cat. Collected cats follow the player around the
world hub.

## Levels

There are **52 cats across 5 levels**. Only cats from your current level can
drop, and collecting all of them unlocks the next:

| Level | Cats | Difficulty |
| --- | --- | --- |
| 1 · Meadow | 12 | Sums to ~20 |
| 2 · Seaside | 10 | Sums to ~30 |
| 3 · Forest | 10 | Up to 50 |
| 4 · Mountain | 10 | Up to 100 |
| 5 · Space | 10 | The hardest tier |

Each level raises the difficulty *floor*, so a child who has worked through
the Meadow is never dropped back to single-digit sums. The Maths screen still
chooses which operations to practise.

## Shop and character

Pick a character on first launch (changeable later). Coins earned from maths
buy hats and outfits for your character and collars for your cats in the
**Shop** — everything bought is worn in the world.

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
│   └── …                    The seven mini-games
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
