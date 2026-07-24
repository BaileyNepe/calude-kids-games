/**
 * The shared skeleton behind every mini-game.
 *
 * The thirteen games differ only in how they *show* a question and how
 * they react to a tap, swipe or drop. Everything else — the round loop,
 * scoring, the three-heart lives system, difficulty ramp, HUD, and the
 * gentle wrong-answer feedback — lives here so the games can't drift
 * apart as they're written.
 *
 * A subclass implements three methods: build the scenery, present a
 * question, and clear it again.
 */

import Phaser from 'phaser';
import {
  CENTRE_X,
  COINS_PER_CORRECT,
  DESIGN_WIDTH,
  LIVES_PER_ROUND,
  SCENES,
  TYPED_ANSWER_CHANCE,
  TYPED_ANSWER_MIN_LEVEL,
  textStyle,
} from './config';
import { DifficultyTracker, type MathSettings, type Question } from './mathEngine';
import { devMode, onDevModeChange } from './devMode';
import { gameState, type GameId } from './gameState';
import { ESCAPED_COIN_REWARD, getLevel, rollReward } from './pets';
import { TypeAnswerPad } from './typePad';
import { showEscapedOverlay, showOutOfLivesOverlay, showRewardOverlay } from './rewardOverlay';
import {
  CoinDisplay,
  ENCOURAGEMENT,
  PRAISE,
  QuestionBanner,
  celebrate,
  createBackButton,
  floatingText,
  gentleWobble,
  pick,
} from './ui';
import { sfx } from './audio';

export abstract class MiniGameScene extends Phaser.Scene {
  /** Which mini-game this is, for saving progress. */
  protected readonly gameId: GameId;

  /** How many answer choices this game shows. Subclasses may override. */
  protected optionCount = 4;

  /**
   * Coins per correct answer. The trickier games — the logic ones, and the
   * ones that unlock late — set this higher, so braving them pays better.
   */
  protected coinsPerCorrect = COINS_PER_CORRECT;

  /**
   * Added to the level's catChance when the round reward is rolled.
   * The harder games carry a bonus, so playing them is the smart way to
   * hunt cats once the drops stop being guaranteed.
   */
  protected catChanceBonus = 0;

  protected difficulty!: DifficultyTracker;
  protected banner!: QuestionBanner;
  protected coinDisplay!: CoinDisplay;
  protected progressLabel!: Phaser.GameObjects.Text;
  /** "Add them up!", "Share them out!" — changes with the operation. */
  protected instructionLabel!: Phaser.GameObjects.Text;

  /** The question currently on screen. */
  protected question!: Question;

  /** Correct answers so far this round. */
  private correctThisRound = 0;

  /** Correct answers needed this round — grows with the player's level. */
  private questionsNeeded = 8;

  /** Hearts left this round. Losing the last one ends it with no cat. */
  private livesLeft = LIVES_PER_ROUND;

  /** The heart images in the HUD, index 0 leftmost. */
  private heartIcons: Phaser.GameObjects.Image[] = [];

  /** Dev mode only: the revealed answer beside the banner. */
  private answerHint: Phaser.GameObjects.Text | null = null;

  /** The number pad, present only while a typed question is up. */
  private typePad: TypeAnswerPad | null = null;

  /**
   * Gates input between questions. Without it, an excited child can tap a
   * second balloon during the celebration and bank two answers for one
   * question.
   */
  protected acceptingInput = false;

  constructor(key: string, gameId: GameId) {
    super(key);
    this.gameId = gameId;
  }

  /* --- Subclass contract -------------------------------------------- */

  /** Draws the static scenery. Called once when the scene starts. */
  protected abstract buildBackground(): void;

  /** Shows the answer choices for `question`. */
  protected abstract presentQuestion(question: Question): void;

  /** Removes the previous question's answer choices. */
  protected abstract clearQuestion(): void;

  /**
   * The maths settings this game should use.
   *
   * The player's chosen operations, unless a game physically cannot ask one
   * of them — Build a Number spells the answer out in digit blocks, so it
   * has no way to express a half. Overriding here rather than filtering
   * after the fact keeps the player's saved choices untouched: switch to a
   * game that *can* ask fractions and they are back.
   */
  protected mathSettings(): MathSettings {
    return gameState.math;
  }

  /* --- Lifecycle ----------------------------------------------------- */

  create(): void {
    this.cameras.main.fadeIn(260);
    this.buildBackground();
    this.buildHud();

    // Dev mode: react immediately when "show answers" is toggled while a
    // question is on screen, and stop listening when the scene goes away.
    const unsubscribe = onDevModeChange(() => this.updateAnswerHint());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);

    this.startRound();
  }

  /** The HUD is identical across every game, deliberately. */
  private buildHud(): void {
    createBackButton(this, () => this.returnToWorld());

    this.coinDisplay = new CoinDisplay(this, DESIGN_WIDTH - 150, 62, gameState.coins);

    this.progressLabel = this.add
      .text(DESIGN_WIDTH - 150, 108, '', textStyle(24, '#2f2b3a'))
      .setOrigin(0.5, 0);

    // The three hearts, in a little column-width row under the back
    // button — the one corner every game leaves free, clear of the
    // question banner. Kept above the scenery with a high depth.
    this.heartIcons = [];
    for (let i = 0; i < LIVES_PER_ROUND; i++) {
      this.heartIcons.push(
        this.add
          .image(78 + i * 52, 136, 'heart-full')
          .setScale(0.8)
          .setDepth(40),
      );
    }

    this.banner = new QuestionBanner(this, CENTRE_X, 86);

    // Clear of the banner: at 162 the top of this text ran under the
    // banner's bottom edge and its hand-drawn overshoot.
    this.instructionLabel = this.add
      .text(CENTRE_X, 178, '', textStyle(26, '#2f2b3a'))
      .setOrigin(0.5)
      .setAlpha(0.85);
  }

  /**
   * Begins a fresh round.
   *
   * Difficulty starts one tier *below* the player's best. Opening a session
   * on the hardest thing they've ever managed is how you lose an
   * eight-year-old in the first twenty seconds; a couple of easy wins first
   * lets them warm up and climb straight back.
   */
  protected startRound(): void {
    const best = gameState.getProgress(this.gameId).highestTier;
    const level = getLevel(gameState.level);
    this.difficulty = new DifficultyTracker(Math.max(0, best - 1), this.mathSettings(), {
      min: level.minTier,
      max: level.maxTier,
    });
    this.correctThisRound = 0;
    // Later levels ask for longer rounds — that's part of the difficulty
    // curve now that the maths tiers top out.
    this.questionsNeeded = level.questionsPerRound;
    // A fresh set of hearts every round.
    this.livesLeft = LIVES_PER_ROUND;
    this.refreshHearts();
    this.nextQuestion();
  }

  /**
   * Where the next question comes from.
   *
   * By default the shared maths engine. The logic games (patterns, the
   * balance scales) override this to build their own Question objects —
   * everything else about the round loop then works unchanged.
   */
  protected createQuestion(): Question {
    return this.difficulty.nextQuestion(this.optionCount);
  }

  /** Generates and presents the next question. */
  protected nextQuestion(): void {
    this.clearQuestion();
    this.clearTypePad();
    this.question = this.createQuestion();
    this.banner.setQuestion(this.question);
    // A picture question already carries its instruction in the banner, so
    // repeating it underneath would just be the same sentence twice.
    this.instructionLabel.setText(this.banner.hasVisual ? '' : this.question.instruction);
    this.updateProgressLabel();
    this.updateAnswerHint();
    if (this.shouldTypeAnswer()) {
      this.presentTypedQuestion();
    } else {
      this.presentQuestion(this.question);
    }
    this.acceptingInput = true;
  }

  /**
   * Whether this question must be typed rather than picked.
   *
   * Only from level 6, only sometimes, and only for whole-number answers —
   * a fraction or decimal has no honest home on a digit pad. Recall beats
   * recognition, which is exactly the step up the later levels want.
   */
  private shouldTypeAnswer(): boolean {
    if (!Number.isInteger(this.question.answer)) return false;
    if (devMode.alwaysType) return true;
    return gameState.level >= TYPED_ANSWER_MIN_LEVEL && Math.random() < TYPED_ANSWER_CHANCE;
  }

  /** Shows the number pad in place of the game's own answer pieces. */
  private presentTypedQuestion(): void {
    this.onTypedQuestion();
    this.typePad = new TypeAnswerPad(this, (value) => {
      const pad = this.typePad;
      if (pad === null) return;
      const wasCorrect = this.submitAnswer(value, pad);
      // A wrong entry is wiped so the retry starts from a clean slate —
      // leaving "4823" up would invite fiddling one digit at a time.
      if (!wasCorrect) pad.clearEntry();
    });
  }

  /**
   * Hook for scene-specific tidying when a question is typed instead of
   * presented normally — the Cat Cafe blanks its order line, Feed the Cat
   * closes the cat's mouth. Default: nothing.
   */
  protected onTypedQuestion(): void {
    // Intentionally empty — see doc comment.
  }

  private clearTypePad(): void {
    this.typePad?.destroy();
    this.typePad = null;
  }

  /**
   * Dev mode only: prints the current question's answer beside the banner.
   * Invisible (and destroyed) unless the dev panel's toggle is on.
   */
  private updateAnswerHint(): void {
    if (!devMode.showAnswers || this.question === undefined) {
      this.answerHint?.destroy();
      this.answerHint = null;
      return;
    }
    if (this.answerHint === null) {
      this.answerHint = this.add
        .text(952, 86, '', textStyle(22, '#c2401f', { fontStyle: 'bold' }))
        .setOrigin(0, 0.5)
        .setDepth(2000)
        .setAlpha(0.9);
    }
    // Use the option label rather than the raw number, so fractions show
    // as "1/2" and decimals keep their places — what's actually tappable.
    const index = this.question.options.findIndex(
      (value) => Math.abs(value - this.question.answer) < 1e-9,
    );
    const label = index >= 0 ? this.question.optionLabels[index]! : `${this.question.answer}`;
    this.answerHint.setText(`✓ ${label}`);
  }

  /**
   * The text to print on one answer choice.
   *
   * Whole numbers print as themselves; fractions print as "1/2". Games
   * should always use this rather than String(option).
   */
  protected labelFor(question: Question, index: number): string {
    return question.optionLabels[index] ?? `${question.options[index] ?? ''}`;
  }

  private updateProgressLabel(): void {
    this.progressLabel.setText(`${this.correctThisRound} / ${this.questionsNeeded}`);
  }

  /** Redraws the hearts to match livesLeft. */
  private refreshHearts(): void {
    this.heartIcons.forEach((icon, index) => {
      icon.setTexture(index < this.livesLeft ? 'heart-full' : 'heart-empty');
    });
  }

  /* --- Answering ----------------------------------------------------- */

  /**
   * The single entry point subclasses call when the player commits to an
   * answer, whether by tapping a balloon or dropping a fish.
   *
   * @param chosen The number the player picked.
   * @param target The object they picked, for positioning feedback.
   * @returns true if the answer was correct.
   */
  protected submitAnswer(
    chosen: number,
    target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  ): boolean {
    if (!this.acceptingInput) return false;

    const isCorrect = chosen === this.question.answer;
    if (isCorrect) {
      this.acceptingInput = false;
      this.handleCorrect(target);
    } else {
      // Input stays open on a wrong answer — the child can simply try
      // again straight away, which is the whole point.
      this.handleWrong(target);
    }
    return isCorrect;
  }

  /** Celebrate, bank the progress, and move on. */
  private handleCorrect(target: Phaser.GameObjects.Components.Transform): void {
    sfx.correct();
    celebrate(this, target.x, target.y);
    floatingText(this, target.x, target.y - 60, pick(PRAISE), '#2e7d32');

    gameState.addCoins(this.coinsPerCorrect);
    gameState.recordCorrectAnswer(this.gameId, this.difficulty.tier);
    this.coinDisplay.setValue(gameState.coins);

    this.correctThisRound += 1;
    this.updateProgressLabel();

    const leveledUp = this.difficulty.recordCorrect();
    if (leveledUp) this.showLevelUp();

    if (this.correctThisRound >= this.questionsNeeded) {
      this.time.delayedCall(900, () => this.endRound());
    } else {
      this.time.delayedCall(leveledUp ? 1300 : 850, () => this.nextQuestion());
    }
  }

  /**
   * Feedback for a wrong answer, and the cost of one heart.
   *
   * The moment itself stays gentle — no harsh sound, no red, and the child
   * can try the same question again straight away. But each slip costs a
   * heart, and losing the third ends the round without a cat. That's the
   * stake that makes a heart worth having; the kindness is in the framing,
   * not in pretending mistakes don't happen.
   */
  private handleWrong(target: Phaser.GameObjects.Components.Transform): void {
    this.difficulty.recordWrong();
    sfx.wrong();
    gentleWobble(this, target);
    floatingText(this, target.x, target.y - 50, pick(ENCOURAGEMENT), '#5b5470');

    this.livesLeft = Math.max(0, this.livesLeft - 1);

    // The heart that was just lost pops before it greys out, so the child
    // connects the slip to the cost without a word being said.
    const lost = this.heartIcons[this.livesLeft];
    if (lost !== undefined) {
      this.tweens.add({
        targets: lost,
        scale: { from: 1.25, to: 0.8 },
        duration: 320,
        ease: 'Back.easeIn',
        onComplete: () => this.refreshHearts(),
      });
    }

    if (this.livesLeft <= 0) {
      this.acceptingInput = false;
      // A short beat so the wobble finishes before the overlay lands.
      this.time.delayedCall(700, () => this.outOfLives());
    }
  }

  /** The round is over with no cat: the one cost the lives system carries. */
  private outOfLives(): void {
    this.clearQuestion();
    this.clearTypePad();
    this.banner.clearVisual();
    showOutOfLivesOverlay(
      this,
      () => this.startRound(),
      () => this.returnToWorld(),
    );
  }

  /** A cheerful "level up" flash. Framed as a reward, never as a warning. */
  private showLevelUp(): void {
    sfx.levelUp();
    floatingText(this, CENTRE_X, 220, 'Level up! ⭐', '#c47f00');
  }

  /* --- Round completion ---------------------------------------------- */

  /** Ends a *won* round, banks it, and rolls for a cat. */
  protected endRound(): void {
    this.acceptingInput = false;
    this.clearQuestion();
    this.clearTypePad();
    gameState.recordRoundWon(this.gameId);

    // From level 6 a cat is no longer guaranteed: the level's catChance
    // decides whether one appears at all — improved by the game's own
    // bonus, so the harder games are the better cat-hunting grounds. A
    // failed roll still pays out; the player won the round either way.
    const { catChance } = getLevel(gameState.level);
    const chance = Math.min(1, catChance + this.catChanceBonus);
    if (Math.random() >= chance) {
      gameState.addCoins(ESCAPED_COIN_REWARD);
      this.coinDisplay.setValue(gameState.coins);
      showEscapedOverlay(
        this,
        ESCAPED_COIN_REWARD,
        () => this.startRound(),
        () => this.returnToWorld(),
      );
      return;
    }

    const reward = rollReward(gameState.pets, gameState.level);
    if (reward.isNew) {
      gameState.collectPet(reward.cat.id);
    } else {
      gameState.addCoins(reward.coins);
      this.coinDisplay.setValue(gameState.coins);
    }

    // Collecting the last cat in a level opens the next one.
    const newLevel = gameState.advanceLevelIfComplete();

    showRewardOverlay(
      this,
      reward,
      newLevel,
      () => this.startRound(),
      () => this.returnToWorld(),
    );
  }

  /**
   * Awards bonus coins outside the answer flow — golden balloons and other
   * little extras. Never touches lives or round progress.
   */
  protected awardBonusCoins(amount: number, x: number, y: number): void {
    gameState.addCoins(amount);
    this.coinDisplay.setValue(gameState.coins);
    floatingText(this, x, y, `+${amount}!`, '#c47f00');
  }

  /** Fades back to the world hub. */
  protected returnToWorld(): void {
    this.acceptingInput = false;
    sfx.whoosh();
    this.cameras.main.fadeOut(240);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENES.world);
    });
  }
}
