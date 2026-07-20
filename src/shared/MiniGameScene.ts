/**
 * The shared skeleton behind all three mini-games.
 *
 * Balloon Pop, Pirate Ship and Feed the Cat differ only in how they *show*
 * a question and how they react to a tap or a drop. Everything else — the
 * round loop, scoring, difficulty ramp, HUD, and the "never punishing"
 * wrong-answer feedback — lives here so the three games can't drift apart
 * as they're written.
 *
 * A subclass implements three methods: build the scenery, present a
 * question, and clear it again.
 */

import Phaser from 'phaser';
import {
  CENTRE_X,
  COINS_PER_CORRECT,
  DESIGN_WIDTH,
  QUESTIONS_PER_ROUND,
  SCENES,
  textStyle,
} from './config';
import { DifficultyTracker, type Question } from './mathEngine';
import { gameState, type GameId } from './gameState';
import { getLevel, rollReward } from './pets';
import { showRewardOverlay } from './rewardOverlay';
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

  /* --- Lifecycle ----------------------------------------------------- */

  create(): void {
    this.cameras.main.fadeIn(260);
    this.buildBackground();
    this.buildHud();
    this.startRound();
  }

  /** The HUD is identical across the three games, deliberately. */
  private buildHud(): void {
    createBackButton(this, () => this.returnToWorld());

    this.coinDisplay = new CoinDisplay(this, DESIGN_WIDTH - 150, 62, gameState.coins);

    this.progressLabel = this.add
      .text(DESIGN_WIDTH - 150, 108, '', textStyle(24, '#2f2b3a'))
      .setOrigin(0.5, 0);

    this.banner = new QuestionBanner(this, CENTRE_X, 86);

    this.instructionLabel = this.add
      .text(CENTRE_X, 162, '', textStyle(26, '#2f2b3a'))
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
    this.difficulty = new DifficultyTracker(Math.max(0, best - 1), gameState.math, {
      min: level.minTier,
      max: level.maxTier,
    });
    this.correctThisRound = 0;
    this.nextQuestion();
  }

  /** Generates and presents the next question. */
  protected nextQuestion(): void {
    this.clearQuestion();
    this.question = this.difficulty.nextQuestion(this.optionCount);
    this.banner.setQuestion(this.question);
    // A picture question already carries its instruction in the banner, so
    // repeating it underneath would just be the same sentence twice.
    this.instructionLabel.setText(this.banner.hasVisual ? '' : this.question.instruction);
    this.updateProgressLabel();
    this.presentQuestion(this.question);
    this.acceptingInput = true;
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
    this.progressLabel.setText(`${this.correctThisRound} / ${QUESTIONS_PER_ROUND}`);
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

    gameState.addCoins(COINS_PER_CORRECT);
    gameState.recordCorrectAnswer(this.gameId, this.difficulty.tier);
    this.coinDisplay.setValue(gameState.coins);

    this.correctThisRound += 1;
    this.updateProgressLabel();

    const leveledUp = this.difficulty.recordCorrect();
    if (leveledUp) this.showLevelUp();

    if (this.correctThisRound >= QUESTIONS_PER_ROUND) {
      this.time.delayedCall(900, () => this.endRound());
    } else {
      this.time.delayedCall(leveledUp ? 1300 : 850, () => this.nextQuestion());
    }
  }

  /**
   * Gentle feedback only.
   *
   * No score deduction, no difficulty drop, no harsh sound, no red. This is
   * the single implementation of wrong-answer feedback in the codebase so
   * that the low-pressure promise holds across all three games.
   */
  private handleWrong(target: Phaser.GameObjects.Components.Transform): void {
    this.difficulty.recordWrong();
    sfx.wrong();
    gentleWobble(this, target);
    floatingText(this, target.x, target.y - 50, pick(ENCOURAGEMENT), '#5b5470');
  }

  /** A cheerful "level up" flash. Framed as a reward, never as a warning. */
  private showLevelUp(): void {
    sfx.levelUp();
    floatingText(this, CENTRE_X, 220, 'Level up! ⭐', '#c47f00');
  }

  /* --- Round completion ---------------------------------------------- */

  /** Ends the round, banks it, and rolls for a cat. */
  protected endRound(): void {
    this.acceptingInput = false;
    this.clearQuestion();
    gameState.recordRoundWon(this.gameId);

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
