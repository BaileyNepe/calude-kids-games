/**
 * Tests for the save system.
 *
 * The save holds a child's whole collection, so the priorities here are:
 * never crash on a corrupt or outdated save, and never silently lose
 * progress.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, createNewSave, GAME_IDS } from './gameState';
import { ALL_OPERATIONS } from './mathEngine';
import { CAT_CATALOG, MAX_LEVEL, catsForLevel } from './pets';

/** A minimal in-memory stand-in for localStorage. */
function installFakeStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const fake = {
    getItem: (k: string): string | null => store.get(k) ?? null,
    setItem: (k: string, v: string): void => void store.set(k, v),
    removeItem: (k: string): void => void store.delete(k),
    clear: (): void => store.clear(),
  };
  (globalThis as unknown as { localStorage: unknown }).localStorage = fake;
  return store;
}

const KEY = 'math-world-save';

describe('createNewSave', () => {
  it('starts empty, with progress for every game', () => {
    const save = createNewSave();
    expect(save.coins).toBe(0);
    expect(save.pets).toEqual([]);
    for (const id of GAME_IDS) expect(save.progress[id]).toBeDefined();
  });

  it('does not share its operations array between saves', () => {
    // A shared array reference would let one save mutate another.
    const a = createNewSave();
    const b = createNewSave();
    a.math.operations.push('multiply');
    expect(b.math.operations).not.toContain('multiply');
  });
});

describe('GameState persistence', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installFakeStorage();
  });

  it('round-trips coins, pets and settings', () => {
    const first = new GameState();
    first.load();
    first.addCoins(45);
    first.collectPet('ginger');
    first.setDifficultyMode('hard');

    const second = new GameState();
    second.load();
    expect(second.coins).toBe(45);
    expect(second.pets).toEqual(['ginger']);
    expect(second.math.mode).toBe('hard');
  });

  it('remembers the newer operations too, not just the original five', () => {
    const first = new GameState();
    first.load();
    first.setMath({ operations: ['decimal', 'percent', 'exponent', 'placeValue'], mode: 'medium' });

    const second = new GameState();
    second.load();
    expect(second.math.operations).toEqual(['decimal', 'percent', 'exponent', 'placeValue']);
    expect(second.math.mode).toBe('medium');
  });

  it('writes to storage on every change', () => {
    const state = new GameState();
    state.load();
    state.addCoins(10);
    expect(store.get(KEY)).toBeDefined();
    expect(JSON.parse(store.get(KEY)!).coins).toBe(10);
  });

  it('falls back to a fresh save when the stored JSON is corrupt', () => {
    store.set(KEY, '{ this is not json');
    const state = new GameState();
    state.load();
    expect(state.coins).toBe(0);
    expect(state.pets).toEqual([]);
  });

  it('migrates an older save instead of wiping the collection', () => {
    // A version-2 save predates levels, characters and the wardrobe.
    store.set(
      KEY,
      JSON.stringify({ version: 2, coins: 120, pets: ['ginger', 'mint'], progress: {} }),
    );
    const state = new GameState();
    state.load();

    // The things the child earned survive...
    expect(state.coins).toBe(120);
    expect(state.pets).toEqual(['ginger', 'mint']);
    // ...and the new fields get sensible defaults.
    expect(state.level).toBe(1);
    expect(state.character).toBeNull();
    expect(state.ownedItems).toEqual([]);
  });

  it('discards a save from a newer version it cannot interpret', () => {
    store.set(KEY, JSON.stringify({ version: 99, coins: 9999, pets: ['ginger'] }));
    const state = new GameState();
    state.load();
    expect(state.coins).toBe(0);
  });

  it('repairs a save with missing or junk fields', () => {
    store.set(KEY, JSON.stringify({ version: 3, coins: 'lots', pets: 'nope' }));
    const state = new GameState();
    state.load();
    expect(state.coins).toBe(0);
    expect(state.pets).toEqual([]);
    for (const id of GAME_IDS) expect(state.getProgress(id).roundsWon).toBe(0);
  });

  it('de-duplicates a hand-edited pet list', () => {
    store.set(
      KEY,
      JSON.stringify({ version: 3, coins: 0, pets: ['ginger', 'ginger', 'mint'], progress: {} }),
    );
    const state = new GameState();
    state.load();
    expect(state.pets).toEqual(['ginger', 'mint']);
  });

  it('clamps a hand-edited level into range', () => {
    store.set(KEY, JSON.stringify({ version: 3, coins: 0, pets: [], level: 99, progress: {} }));
    const state = new GameState();
    state.load();
    expect(state.level).toBeLessThanOrEqual(5);
    expect(state.level).toBeGreaterThanOrEqual(1);
  });

  it('never lets coins go negative', () => {
    const state = new GameState();
    state.load();
    state.addCoins(10);
    state.addCoins(-999);
    expect(state.coins).toBe(0);
  });

  it('reports whether a collected pet was new', () => {
    const state = new GameState();
    state.load();
    expect(state.collectPet('ginger')).toBe(true);
    expect(state.collectPet('ginger')).toBe(false);
    expect(state.pets).toEqual(['ginger']);
  });

  it('remembers the best tier reached, never a worse one', () => {
    const state = new GameState();
    state.load();
    state.recordCorrectAnswer('balloonPop', 3);
    state.recordCorrectAnswer('balloonPop', 1);
    expect(state.getProgress('balloonPop').highestTier).toBe(3);
    expect(state.getProgress('balloonPop').correctAnswers).toBe(2);
  });

  it('reset clears everything', () => {
    const state = new GameState();
    state.load();
    state.addCoins(100);
    state.collectPet('mint');
    state.reset();
    expect(state.coins).toBe(0);
    expect(state.pets).toEqual([]);
  });

  it('notifies subscribers, and stops after unsubscribing', () => {
    const state = new GameState();
    state.load();
    let calls = 0;
    const unsubscribe = state.subscribe(() => calls++);
    state.addCoins(5);
    expect(calls).toBe(1);
    unsubscribe();
    state.addCoins(5);
    expect(calls).toBe(1);
  });
});

describe('levels, character and wardrobe', () => {
  beforeEach(() => {
    installFakeStorage();
  });

  it('starts on level 1 with no character chosen', () => {
    const state = new GameState();
    state.load();
    expect(state.level).toBe(1);
    expect(state.character).toBeNull();
  });

  it('only advances a level once every cat in it is collected', () => {
    const state = new GameState();
    state.load();
    expect(state.advanceLevelIfComplete()).toBeNull();

    for (const cat of catsForLevel(1)) state.collectPet(cat.id);
    expect(state.advanceLevelIfComplete()).toBe(2);
    expect(state.level).toBe(2);
  });

  it('never advances past the last level', () => {
    const state = new GameState();
    state.load();
    for (const cat of CAT_CATALOG) state.collectPet(cat.id);
    for (let i = 0; i < 20; i++) state.advanceLevelIfComplete();
    expect(state.level).toBe(MAX_LEVEL);
  });

  it('remembers the chosen character', () => {
    const state = new GameState();
    state.load();
    state.setCharacter('boy');
    expect(state.character).toBe('boy');
  });

  it('buys an item only when it is affordable and not already owned', () => {
    const state = new GameState();
    state.load();

    // Too poor.
    expect(state.buyItem('hat-bow', 40)).toBe(false);
    expect(state.ownsItem('hat-bow')).toBe(false);

    state.addCoins(100);
    expect(state.buyItem('hat-bow', 40)).toBe(true);
    expect(state.coins).toBe(60);
    expect(state.ownsItem('hat-bow')).toBe(true);

    // Buying it twice must not charge twice.
    expect(state.buyItem('hat-bow', 40)).toBe(false);
    expect(state.coins).toBe(60);
  });

  it('wears and removes items', () => {
    const state = new GameState();
    state.load();
    state.wear('hat', 'hat-bow');
    expect(state.wearing.hat).toBe('hat-bow');
    state.wear('hat', null);
    expect(state.wearing.hat).toBeNull();

    state.wearCatItem('collar-red');
    expect(state.catWearing.collar).toBe('collar-red');
  });

  it('persists level, character and wardrobe across a reload', () => {
    const first = new GameState();
    first.load();
    first.setCharacter('boy');
    first.addCoins(200);
    first.buyItem('hat-crown', 300);
    first.buyItem('hat-bow', 40);
    first.wear('hat', 'hat-bow');

    const second = new GameState();
    second.load();
    expect(second.character).toBe('boy');
    expect(second.ownsItem('hat-bow')).toBe(true);
    // Couldn't afford the crown, so it must not have been granted.
    expect(second.ownsItem('hat-crown')).toBe(false);
    expect(second.wearing.hat).toBe('hat-bow');
  });
});

describe('maths settings', () => {
  beforeEach(() => {
    installFakeStorage();
  });

  it('toggles an operation on and off', () => {
    const state = new GameState();
    state.load();
    expect(state.math.operations).toEqual(['add']);
    state.toggleOperation('multiply');
    expect(state.math.operations).toContain('multiply');
    state.toggleOperation('multiply');
    expect(state.math.operations).not.toContain('multiply');
  });

  it('refuses to switch off the last operation', () => {
    const state = new GameState();
    state.load();
    state.toggleOperation('add');
    // Still there: the player must always have something to practise.
    expect(state.math.operations).toEqual(['add']);
  });

  it('drops unrecognised operations from a stored save', () => {
    (globalThis.localStorage as Storage).setItem(
      KEY,
      JSON.stringify({
        version: 3,
        coins: 0,
        pets: [],
        progress: {},
        math: { operations: ['add', 'calculus', 'divide'], mode: 'wizard' },
      }),
    );
    const state = new GameState();
    state.load();
    expect(state.math.operations).toEqual(['add', 'divide']);
    // An unknown mode falls back to the safe default.
    expect(state.math.mode).toBe('adaptive');
  });

  it('accepts every real operation', () => {
    const state = new GameState();
    state.load();
    state.setMath({ operations: [...ALL_OPERATIONS], mode: 'adaptive' });
    expect(state.math.operations).toHaveLength(ALL_OPERATIONS.length);
  });

  it('never stores an empty operation list', () => {
    const state = new GameState();
    state.load();
    state.setMath({ operations: [], mode: 'easy' });
    expect(state.math.operations.length).toBeGreaterThan(0);
  });
});
