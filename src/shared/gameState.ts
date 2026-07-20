/**
 * Game state and save system.
 *
 * A single typed object holds everything worth remembering between visits:
 * coins earned, cats collected, and how far the player has got in each
 * mini-game. It is written to localStorage on every meaningful change.
 *
 * Everything here is plain TypeScript with no Phaser dependency, so it can
 * be unit tested directly.
 */

import {
  ALL_OPERATIONS,
  DEFAULT_MATH_SETTINGS,
  type DifficultyMode,
  type MathSettings,
  type Operation,
} from './mathEngine';
import { MAX_LEVEL, isLevelComplete } from './pets';

/** The mini-games. Used as keys for per-game progress. */
export type GameId =
  | 'balloonPop'
  | 'pirateShip'
  | 'feedTheCat'
  | 'numberNinja'
  | 'buildNumber'
  | 'catCafe'
  | 'rocketLaunch';

/** All mini-game ids, handy for iterating. */
export const GAME_IDS: readonly GameId[] = [
  'balloonPop',
  'pirateShip',
  'feedTheCat',
  'numberNinja',
  'buildNumber',
  'catCafe',
  'rocketLaunch',
];

/** How far the player has got in one mini-game. */
export interface GameProgress {
  /** Highest difficulty tier reached (index into the maths engine's tiers). */
  highestTier: number;
  /** How many rounds of this game have been completed. */
  roundsWon: number;
  /** Lifetime correct answers in this game. */
  correctAnswers: number;
}

/** The complete persisted save. */
export interface SaveData {
  /** Schema version — lets us migrate or discard old saves safely. */
  version: number;
  /** Spendable/earned points shown in the HUD. */
  coins: number;
  /** Ids of every cat the player has collected. */
  pets: string[];
  /** Which operations to practise and how hard. */
  math: MathSettings;
  /** The highest level unlocked so far (1-based). */
  level: number;
  /** Which character the player chose, or null before they've picked. */
  character: string | null;
  /** Ids of every wardrobe item bought. */
  ownedItems: string[];
  /** What the player is currently wearing. */
  wearing: { hat: string | null; outfit: string | null };
  /** What the cats are currently wearing. */
  catWearing: { collar: string | null };
  /** Per-mini-game progress. */
  progress: Record<GameId, GameProgress>;
}

/** Bump this if the shape of SaveData changes incompatibly. */
const SCHEMA_VERSION = 3;

const STORAGE_KEY = 'math-world-save';

/** A brand-new save for a first-time player. */
export function createNewSave(): SaveData {
  const progress = {} as Record<GameId, GameProgress>;
  for (const id of GAME_IDS) {
    progress[id] = { highestTier: 0, roundsWon: 0, correctAnswers: 0 };
  }
  return {
    version: SCHEMA_VERSION,
    coins: 0,
    pets: [],
    math: { ...DEFAULT_MATH_SETTINGS, operations: [...DEFAULT_MATH_SETTINGS.operations] },
    level: 1,
    character: null,
    ownedItems: [],
    wearing: { hat: null, outfit: null },
    catWearing: { collar: null },
    progress,
  };
}

/**
 * Validates and repairs data read from localStorage.
 *
 * A save can be missing fields if it was written by an older build, or be
 * outright corrupt if someone edited it. Rather than crash the game in a
 * child's hands, anything unrecognisable falls back to a fresh save and
 * anything merely incomplete is topped up with defaults.
 */
function reconcile(raw: unknown): SaveData {
  const fresh = createNewSave();
  if (typeof raw !== 'object' || raw === null) return fresh;

  const data = raw as Partial<SaveData>;

  // Older saves are *migrated*, not discarded. Every field below is read
  // defensively with a default, so a save written before levels, characters
  // or the wardrobe existed simply picks up sensible values for them — and
  // the player keeps the cats and coins they earned.
  //
  // A save from a *newer* version than we understand is the one case we
  // can't safely interpret, so that falls back to a fresh start.
  if (typeof data.version !== 'number' || data.version > SCHEMA_VERSION) return fresh;

  const progress = fresh.progress;
  if (typeof data.progress === 'object' && data.progress !== null) {
    for (const id of GAME_IDS) {
      const p = (data.progress as Partial<Record<GameId, Partial<GameProgress>>>)[id];
      if (p) {
        progress[id] = {
          highestTier: numberOr(p.highestTier, 0),
          roundsWon: numberOr(p.roundsWon, 0),
          correctAnswers: numberOr(p.correctAnswers, 0),
        };
      }
    }
  }

  const wearing = data.wearing;
  const catWearing = data.catWearing;

  return {
    version: SCHEMA_VERSION,
    coins: numberOr(data.coins, 0),
    // Filter to strings and de-duplicate, in case of a hand-edited save.
    pets: Array.isArray(data.pets) ? [...new Set(data.pets.filter(isString))] : [],
    math: reconcileMath(data.math),
    // Clamped so a hand-edited save can't skip to a level that doesn't exist.
    level: Math.max(1, Math.min(MAX_LEVEL, Math.floor(numberOr(data.level, 1)))),
    character: isString(data.character) ? data.character : null,
    ownedItems: Array.isArray(data.ownedItems)
      ? [...new Set(data.ownedItems.filter(isString))]
      : [],
    wearing: {
      hat: typeof wearing === 'object' && wearing !== null && isString(wearing.hat) ? wearing.hat : null,
      outfit:
        typeof wearing === 'object' && wearing !== null && isString(wearing.outfit)
          ? wearing.outfit
          : null,
    },
    catWearing: {
      collar:
        typeof catWearing === 'object' && catWearing !== null && isString(catWearing.collar)
          ? catWearing.collar
          : null,
    },
    progress,
  };
}

/** Validates the saved maths settings, discarding anything unrecognised. */
function reconcileMath(raw: unknown): MathSettings {
  const fallback: MathSettings = {
    ...DEFAULT_MATH_SETTINGS,
    operations: [...DEFAULT_MATH_SETTINGS.operations],
  };
  if (typeof raw !== 'object' || raw === null) return fallback;

  const data = raw as Partial<MathSettings>;
  const modes: DifficultyMode[] = ['easy', 'medium', 'hard', 'adaptive'];

  const operations = Array.isArray(data.operations)
    ? data.operations.filter((op): op is Operation => ALL_OPERATIONS.includes(op as Operation))
    : [];

  return {
    // Never leave the player with nothing to practise.
    operations: operations.length > 0 ? [...new Set(operations)] : fallback.operations,
    mode: modes.includes(data.mode as DifficultyMode) ? (data.mode as DifficultyMode) : 'adaptive',
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Called whenever the state changes, so HUDs can refresh. */
type Listener = (state: SaveData) => void;

/**
 * The live game state.
 *
 * Exposed as a small class with a module-level singleton (`gameState`).
 * Mutations go through methods so that saving and notifying always happen —
 * scenes never write to the save object directly.
 */
export class GameState {
  private data: SaveData;
  private listeners: Listener[] = [];

  /** Set false in tests, or when localStorage is unavailable. */
  private persistenceEnabled = true;

  constructor(initial?: SaveData) {
    this.data = initial ?? createNewSave();
  }

  /** Reads the save from localStorage, falling back to a new save. */
  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw === null ? createNewSave() : reconcile(JSON.parse(raw));
    } catch {
      // Private browsing, disabled storage, or malformed JSON. Play anyway —
      // the game just won't remember anything this session.
      this.data = createNewSave();
      this.persistenceEnabled = false;
    }
  }

  /** Writes the save to localStorage. Failure is non-fatal by design. */
  save(): void {
    if (!this.persistenceEnabled) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      this.persistenceEnabled = false;
    }
  }

  /** Wipes all progress. Used by the reset button on the world screen. */
  reset(): void {
    this.data = createNewSave();
    this.save();
    this.emit();
  }

  /** A read-only snapshot. Callers must not mutate the result. */
  get snapshot(): Readonly<SaveData> {
    return this.data;
  }

  get coins(): number {
    return this.data.coins;
  }

  /** Ids of collected cats. */
  get pets(): readonly string[] {
    return this.data.pets;
  }

  hasPet(id: string): boolean {
    return this.data.pets.includes(id);
  }

  /** Adds coins (clamped at zero) then saves. */
  addCoins(amount: number): void {
    this.data.coins = Math.max(0, this.data.coins + amount);
    this.commit();
  }

  /**
   * Records a newly collected cat.
   * @returns true if this was a new cat, false if it was already owned.
   */
  collectPet(id: string): boolean {
    if (this.data.pets.includes(id)) return false;
    this.data.pets.push(id);
    this.commit();
    return true;
  }

  /** The highest level unlocked. */
  get level(): number {
    return this.data.level;
  }

  /** Which character the player picked, or null if they haven't yet. */
  get character(): string | null {
    return this.data.character;
  }

  setCharacter(name: string): void {
    this.data.character = name;
    this.commit();
  }

  /** Wardrobe items owned. */
  get ownedItems(): readonly string[] {
    return this.data.ownedItems;
  }

  ownsItem(id: string): boolean {
    return this.data.ownedItems.includes(id);
  }

  get wearing(): Readonly<{ hat: string | null; outfit: string | null }> {
    return this.data.wearing;
  }

  get catWearing(): Readonly<{ collar: string | null }> {
    return this.data.catWearing;
  }

  /**
   * Buys a wardrobe item if the player can afford it.
   * @returns true if the purchase went through.
   */
  buyItem(id: string, price: number): boolean {
    if (this.ownsItem(id)) return false;
    if (this.data.coins < price) return false;
    this.data.coins -= price;
    this.data.ownedItems.push(id);
    this.commit();
    return true;
  }

  /** Wears (or removes, when passed null) an item in the given slot. */
  wear(slot: 'hat' | 'outfit', id: string | null): void {
    this.data.wearing[slot] = id;
    this.commit();
  }

  /** Puts a collar on the cats, or removes it when passed null. */
  wearCatItem(id: string | null): void {
    this.data.catWearing.collar = id;
    this.commit();
  }

  /**
   * Unlocks the next level if the current one is fully collected.
   * @returns the new level number if the player advanced, otherwise null.
   */
  advanceLevelIfComplete(): number | null {
    if (this.data.level >= MAX_LEVEL) return null;
    if (!isLevelComplete(this.data.pets, this.data.level)) return null;
    this.data.level += 1;
    this.commit();
    return this.data.level;
  }

  /** The player's chosen operations and difficulty mode. */
  get math(): Readonly<MathSettings> {
    return this.data.math;
  }

  /** Replaces the maths settings. Empty operation lists are rejected. */
  setMath(settings: MathSettings): void {
    this.data.math = {
      operations: settings.operations.length > 0 ? [...settings.operations] : ['add'],
      mode: settings.mode,
    };
    this.commit();
  }

  /**
   * Turns one operation on or off.
   * Refuses to switch off the last remaining one — the player must always
   * have something to practise.
   */
  toggleOperation(operation: Operation): void {
    const current = this.data.math.operations;
    const next = current.includes(operation)
      ? current.filter((op) => op !== operation)
      : [...current, operation];
    if (next.length === 0) return;
    this.data.math.operations = next;
    this.commit();
  }

  setDifficultyMode(mode: DifficultyMode): void {
    this.data.math.mode = mode;
    this.commit();
  }

  /** Progress for one mini-game. */
  getProgress(game: GameId): Readonly<GameProgress> {
    return this.data.progress[game];
  }

  /** Notes that the player answered correctly, remembering their best tier. */
  recordCorrectAnswer(game: GameId, tier: number): void {
    const p = this.data.progress[game];
    p.correctAnswers += 1;
    p.highestTier = Math.max(p.highestTier, tier);
    this.commit();
  }

  /** Notes that the player finished a round of a mini-game. */
  recordRoundWon(game: GameId): void {
    this.data.progress[game].roundsWon += 1;
    this.commit();
  }

  /** Subscribes to changes. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Saves and notifies — the standard tail of every mutation. */
  private commit(): void {
    this.save();
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.data);
  }
}

/** The singleton used by every scene. */
export const gameState = new GameState();
