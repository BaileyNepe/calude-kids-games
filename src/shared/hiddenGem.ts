/**
 * Hidden gems.
 *
 * A handful of little gems are tucked into the scenery around the world —
 * peeking out from behind a bush, resting near the treasure chest, sitting
 * on the wizard's wall. Spotting one and tapping it pays out coins, once,
 * ever: found gems never come back, which is exactly what makes finding
 * one feel like a real secret.
 *
 * Scenes call `placeHiddenGem` while building their background. If that
 * gem has already been found the call quietly does nothing, so scenes
 * don't need to check anything themselves.
 */

import type Phaser from 'phaser';
import { gameState } from './gameState';
import { celebrate, floatingText } from './ui';
import { sfx } from './audio';

/** Coins for spotting a hidden gem. */
export const GEM_COIN_REWARD = 40;

/**
 * Puts a hidden gem into the scene, unless it's already been found.
 *
 * @param id    Stable id, written to the save. One per hiding place.
 * @param depth Where it sits in the scenery — pick something that tucks it
 *              *behind* a foreground prop so it only peeks out.
 */
export function placeHiddenGem(
  scene: Phaser.Scene,
  id: string,
  x: number,
  y: number,
  options: { scale?: number; depth?: number } = {},
): void {
  if (gameState.hasGem(id)) return;

  const gem = scene.add
    .image(x, y, 'gem')
    .setScale(options.scale ?? 0.5)
    .setDepth(options.depth ?? 2);

  // A slow twinkle — dim enough to miss, bright enough to reward looking.
  scene.tweens.add({
    targets: gem,
    alpha: { from: 0.95, to: 0.5 },
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  gem.setInteractive({ useHandCursor: true });
  gem.once('pointerdown', () => {
    if (!gameState.collectGem(id)) return;
    gameState.addCoins(GEM_COIN_REWARD);
    sfx.reward();
    celebrate(scene, gem.x, gem.y, 12);
    floatingText(scene, gem.x, gem.y - 40, `Secret gem! +${GEM_COIN_REWARD}`, '#1c6b64');
    scene.tweens.add({
      targets: gem,
      scale: gem.scale * 1.7,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => gem.destroy(),
    });
  });
}
