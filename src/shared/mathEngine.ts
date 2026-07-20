/**
 * Shared maths engine.
 *
 * Every mini-game asks this module for questions, so difficulty and
 * question style behave consistently across the whole game.
 *
 * Five operations are supported. Each is a self-contained generator, so
 * adding another means adding one entry to OPERATIONS — nothing else in
 * the codebase changes.
 *
 * No Phaser imports here: this is pure logic and is unit tested directly.
 */

/** Arithmetic the engine can produce. */
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'fraction';

/** All operations, in the order they're offered on the settings screen. */
export const ALL_OPERATIONS: readonly Operation[] = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'fraction',
];

/** Friendly names and symbols, for menus and prompts. */
export const OPERATION_INFO: Record<Operation, { label: string; symbol: string }> = {
  add: { label: 'Adding', symbol: '+' },
  subtract: { label: 'Taking away', symbol: '−' },
  multiply: { label: 'Times', symbol: '×' },
  divide: { label: 'Sharing', symbol: '÷' },
  fraction: { label: 'Fractions', symbol: '½' },
};

/**
 * How a fraction question should be drawn.
 *
 * Fractions are taught visually at this age: the child sees a shape with
 * some parts shaded and picks the fraction that matches. No symbolic
 * fraction arithmetic.
 */
export interface FractionVisual {
  numerator: number;
  denominator: number;
  shape: 'circle' | 'bar';
}

/** A question handed to a mini-game. */
export interface Question {
  /** Human-readable prompt, e.g. "12 ÷ 3". Empty for visual fractions. */
  prompt: string;
  /**
   * The correct answer as a number. For fractions this is the decimal
   * value (0.5 for a half), which keeps every game's comparison logic
   * identical.
   */
  answer: number;
  /** Shuffled choices including the answer. */
  options: number[];
  /** What to print on each option, index-matched to `options`. */
  optionLabels: string[];
  /** Which tier this came from. */
  tier: number;
  /** Which operation produced it. */
  operation: Operation;
  /** Present only for fraction questions: the picture to draw. */
  visual?: FractionVisual;
  /** A short instruction shown above the answers. */
  instruction: string;
}

/** How hard the player wants it. */
export type DifficultyMode = 'easy' | 'medium' | 'hard' | 'adaptive';

/** What the player chose on the settings screen. */
export interface MathSettings {
  /** Which operations to draw from. Never empty — falls back to addition. */
  operations: Operation[];
  mode: DifficultyMode;
}

/** The default for a new player: addition only, adapting as they improve. */
export const DEFAULT_MATH_SETTINGS: MathSettings = {
  operations: ['add'],
  mode: 'adaptive',
};

/** One rung on the difficulty ladder. */
export interface DifficultyTier {
  name: string;
  /** Smallest operand. */
  minOperand: number;
  /** Largest operand. */
  maxOperand: number;
  /** Ceiling on the result. */
  maxResult: number;
  /** Largest multiplication table used at this tier. */
  maxFactor: number;
  /** Denominators allowed for fraction questions. */
  denominators: number[];
  /** Correct answers needed within a session to move up. */
  correctToAdvance: number;
}

/**
 * The difficulty ladder, easiest first.
 *
 * The ramp is gentle on purpose: an eight-year-old should feel it getting
 * harder without ever hitting a wall.
 */
export const DIFFICULTY_TIERS: readonly DifficultyTier[] = [
  {
    name: 'Warm up',
    minOperand: 1,
    maxOperand: 8,
    maxResult: 10,
    maxFactor: 3,
    denominators: [2, 4],
    correctToAdvance: 4,
  },
  {
    name: 'Getting it',
    minOperand: 2,
    maxOperand: 15,
    maxResult: 20,
    maxFactor: 5,
    denominators: [2, 3, 4],
    correctToAdvance: 5,
  },
  {
    name: 'Nice work',
    minOperand: 3,
    maxOperand: 25,
    maxResult: 30,
    maxFactor: 6,
    denominators: [2, 3, 4, 5],
    correctToAdvance: 5,
  },
  {
    name: 'Tricky',
    minOperand: 5,
    maxOperand: 40,
    maxResult: 50,
    maxFactor: 9,
    denominators: [2, 3, 4, 5, 6],
    correctToAdvance: 6,
  },
  {
    name: 'Maths star',
    minOperand: 10,
    maxOperand: 80,
    maxResult: 100,
    maxFactor: 12,
    denominators: [2, 3, 4, 5, 6, 8],
    correctToAdvance: 8,
  },
];

/** Which tiers each difficulty mode may use. */
const MODE_TIERS: Record<DifficultyMode, { min: number; max: number }> = {
  easy: { min: 0, max: 1 },
  medium: { min: 1, max: 2 },
  hard: { min: 3, max: 4 },
  // Adaptive roams the whole ladder, climbing as the player gets things right.
  adaptive: { min: 0, max: 4 },
};

/** Random integer in [min, max] inclusive. */
function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Fisher-Yates shuffle, returning a new array. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Clamps a tier index into the valid range. */
export function clampTier(tier: number): number {
  if (!Number.isFinite(tier)) return 0;
  return Math.max(0, Math.min(DIFFICULTY_TIERS.length - 1, Math.floor(tier)));
}

/** Clamps a tier into the band a difficulty mode allows. */
export function tierForMode(tier: number, mode: DifficultyMode): number {
  const band = MODE_TIERS[mode];
  return Math.max(band.min, Math.min(band.max, clampTier(tier)));
}

/** Greatest common divisor, for reducing fractions. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Builds plausible wrong answers for a whole-number question.
 *
 * The point is that distractors must be *tempting* — the near-misses a
 * child actually makes — not random numbers dismissible at a glance.
 * Candidates are tried in order of how believable they are:
 *
 *   1. off by one, then off by two (miscounting)
 *   2. off by ten (place-value slips, once numbers are big enough)
 *   3. the operands themselves (answering the wrong question)
 *   4. wider near-misses
 *
 * Results are always distinct, non-negative, and never the right answer.
 */
export function generateDistractors(
  answer: number,
  operands: readonly number[],
  count: number,
  rng: () => number,
): number[] {
  const candidates: number[] = [];
  candidates.push(...shuffle([answer + 1, answer - 1], rng));
  candidates.push(...shuffle([answer + 2, answer - 2], rng));
  if (answer >= 10) candidates.push(...shuffle([answer + 10, answer - 10], rng));
  candidates.push(...shuffle(operands, rng));
  candidates.push(...shuffle([answer + 3, answer - 3, answer + 4, answer + 5, answer - 4], rng));

  const chosen: number[] = [];
  for (const candidate of candidates) {
    if (chosen.length === count) break;
    if (candidate === answer || candidate < 0 || chosen.includes(candidate)) continue;
    chosen.push(candidate);
  }

  // Safety net for very small answers, where the lists above can run dry.
  let offset = 6;
  while (chosen.length < count) {
    for (const candidate of [answer + offset, answer - offset]) {
      if (chosen.length === count) break;
      if (candidate === answer || candidate < 0 || chosen.includes(candidate)) continue;
      chosen.push(candidate);
    }
    offset += 1;
    if (offset > count * 4 + 20) break;
  }
  return chosen;
}

/** The result of one operation's generator, before options are assembled. */
interface Generated {
  prompt: string;
  answer: number;
  /** Numbers the child can see, used to build tempting distractors. */
  operands: number[];
  instruction: string;
  visual?: FractionVisual;
  /** Fractions supply their own options; everything else uses distractors. */
  fractionOptions?: { value: number; label: string }[];
}

/** Formats a fraction for display. */
function fractionLabel(numerator: number, denominator: number): string {
  return `${numerator}/${denominator}`;
}

/** The per-operation generators. */
const OPERATIONS: Record<Operation, (tier: DifficultyTier, rng: () => number) => Generated> = {
  add: (tier, rng) => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < 40; i++) {
      a = randomInt(tier.minOperand, tier.maxOperand, rng);
      b = randomInt(tier.minOperand, tier.maxOperand, rng);
      if (a + b <= tier.maxResult) break;
    }
    if (a + b > tier.maxResult) b = Math.max(0, tier.maxResult - a);
    return {
      prompt: `${a} + ${b}`,
      answer: a + b,
      operands: [a, b],
      instruction: 'Add them up!',
    };
  },

  subtract: (tier, rng) => {
    // Ordered largest-first so the answer is never negative.
    let a = randomInt(tier.minOperand, tier.maxOperand, rng);
    let b = randomInt(tier.minOperand, tier.maxOperand, rng);
    if (b > a) [a, b] = [b, a];
    return {
      prompt: `${a} − ${b}`,
      answer: a - b,
      operands: [a, b],
      instruction: 'Take it away!',
    };
  },

  multiply: (tier, rng) => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < 40; i++) {
      a = randomInt(2, tier.maxFactor, rng);
      b = randomInt(2, tier.maxFactor, rng);
      if (a * b <= tier.maxResult) break;
    }
    if (a * b > tier.maxResult) b = 2;
    return {
      prompt: `${a} × ${b}`,
      answer: a * b,
      operands: [a, b],
      instruction: 'How many altogether?',
    };
  },

  divide: (tier, rng) => {
    // Built backwards from a known product, so division is always exact —
    // remainders are well beyond what this age group needs.
    const divisor = randomInt(2, Math.max(2, Math.min(tier.maxFactor, 10)), rng);
    const quotient = randomInt(1, Math.max(1, Math.min(tier.maxFactor, 10)), rng);
    const dividend = divisor * quotient;
    return {
      prompt: `${dividend} ÷ ${divisor}`,
      answer: quotient,
      operands: [dividend, divisor],
      instruction: 'Share them out!',
    };
  },

  fraction: (tier, rng) => {
    const denominators = tier.denominators;
    const denominator = denominators[randomInt(0, denominators.length - 1, rng)]!;
    const numerator = randomInt(1, denominator - 1, rng);
    const value = numerator / denominator;

    // Distractors are other real fractions the child could plausibly read
    // off the picture: a neighbouring numerator, and the same numerator
    // over a neighbouring denominator.
    const pool: { value: number; label: string }[] = [];
    const add = (n: number, d: number): void => {
      if (n <= 0 || d <= 1 || n >= d) return;
      const v = n / d;
      if (Math.abs(v - value) < 1e-9) return;
      if (pool.some((p) => Math.abs(p.value - v) < 1e-9)) return;
      pool.push({ value: v, label: fractionLabel(n, d) });
    };
    add(numerator + 1, denominator);
    add(numerator - 1, denominator);
    add(numerator, denominator + 1);
    add(numerator, Math.max(2, denominator - 1));
    add(denominator - numerator, denominator);
    for (const d of denominators) add(1, d);

    // Show the answer in its simplest form, which is how a child would say it.
    const divisor = gcd(numerator, denominator);
    return {
      prompt: '',
      answer: value,
      operands: [numerator, denominator],
      instruction: 'How much is shaded?',
      visual: { numerator, denominator, shape: rng() < 0.5 ? 'circle' : 'bar' },
      fractionOptions: [
        { value, label: fractionLabel(numerator / divisor, denominator / divisor) },
        ...shuffle(pool, rng),
      ],
    };
  },
};

/**
 * Generates one question.
 *
 * @param tier Index into DIFFICULTY_TIERS. Out-of-range values are clamped.
 * @param optionCount How many choices to return, including the right one.
 * @param rng Injectable randomness — tests pass a seeded generator.
 * @param operations Which operations to choose from. Defaults to addition.
 */
export function generateQuestion(
  tier: number,
  optionCount = 4,
  rng: () => number = Math.random,
  operations: readonly Operation[] = ['add'],
): Question {
  const tierIndex = clampTier(tier);
  const config = DIFFICULTY_TIERS[tierIndex]!;

  const pool = operations.length > 0 ? operations : (['add'] as const);
  const operation = pool[randomInt(0, pool.length - 1, rng)]!;
  const generated = OPERATIONS[operation](config, rng);

  let options: number[];
  let labels: string[];

  if (generated.fractionOptions !== undefined) {
    // Fractions bring their own labelled options.
    const picked = generated.fractionOptions.slice(0, optionCount);
    // If the pool was thin, top it up with simple unit fractions.
    let extra = 2;
    while (picked.length < optionCount) {
      const value = 1 / extra;
      if (!picked.some((p) => Math.abs(p.value - value) < 1e-9)) {
        picked.push({ value, label: fractionLabel(1, extra) });
      }
      extra += 1;
      if (extra > 20) break;
    }
    const shuffled = shuffle(picked, rng);
    options = shuffled.map((p) => p.value);
    labels = shuffled.map((p) => p.label);
  } else {
    const distractors = generateDistractors(
      generated.answer,
      generated.operands,
      optionCount - 1,
      rng,
    );
    options = shuffle([generated.answer, ...distractors], rng);
    labels = options.map((n) => `${n}`);
  }

  return {
    prompt: generated.prompt,
    answer: generated.answer,
    options,
    optionLabels: labels,
    tier: tierIndex,
    operation,
    instruction: generated.instruction,
    ...(generated.visual !== undefined ? { visual: generated.visual } : {}),
  };
}

/**
 * Tracks difficulty within a single play session.
 *
 * A game creates one when a round starts, seeded with the player's best
 * tier so far. Correct answers push it up; wrong answers never push it
 * down — being demoted would feel like a punishment, which this game
 * deliberately avoids.
 *
 * In easy/medium/hard the tier is pinned inside that mode's band; only
 * adaptive roams the whole ladder.
 */
export class DifficultyTracker {
  private tierIndex: number;
  private correctInTier = 0;
  private readonly settings: MathSettings;
  /** The tier range the current level allows. */
  private readonly band: { min: number; max: number };

  /**
   * @param startTier Where to begin, usually the player's best so far.
   * @param settings  Chosen operations and difficulty mode.
   * @param band      The level's tier range. Defaults to the whole ladder.
   */
  constructor(
    startTier = 0,
    settings: MathSettings = DEFAULT_MATH_SETTINGS,
    band: { min: number; max: number } = { min: 0, max: DIFFICULTY_TIERS.length - 1 },
  ) {
    this.settings = settings;
    this.band = { min: clampTier(band.min), max: clampTier(band.max) };

    // The level sets the floor and ceiling; the mode picks where inside
    // that range to sit. So a child on Level 4 is never dropped back to
    // single-digit sums, but "Easy" still keeps them at the gentle end.
    const modeTier = tierForMode(startTier, settings.mode);
    const target =
      settings.mode === 'hard'
        ? this.band.max
        : settings.mode === 'easy'
          ? this.band.min
          : Math.max(this.band.min, Math.min(this.band.max, modeTier));
    this.tierIndex = target;
  }

  get tier(): number {
    return this.tierIndex;
  }

  get config(): DifficultyTier {
    return DIFFICULTY_TIERS[this.tierIndex]!;
  }

  /** The highest tier reachable: whichever of mode and level is stricter. */
  private get ceiling(): number {
    return Math.min(MODE_TIERS[this.settings.mode].max, this.band.max);
  }

  /**
   * Records a correct answer, advancing the tier if enough have been
   * answered at this level.
   * @returns true if the player just levelled up.
   */
  recordCorrect(): boolean {
    this.correctInTier += 1;
    if (this.correctInTier >= this.config.correctToAdvance && this.tierIndex < this.ceiling) {
      this.tierIndex += 1;
      this.correctInTier = 0;
      return true;
    }
    return false;
  }

  /**
   * Records a wrong answer.
   *
   * Deliberately a no-op on difficulty. It exists so calling code reads
   * symmetrically, and gives one obvious place to change if the design
   * ever wants easing-off behaviour.
   */
  recordWrong(): void {
    // Intentionally empty — see doc comment.
  }

  /** Asks for the next question at the current difficulty. */
  nextQuestion(optionCount = 4, rng: () => number = Math.random): Question {
    return generateQuestion(this.tierIndex, optionCount, rng, this.settings.operations);
  }
}
