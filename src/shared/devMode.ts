/**
 * Dev mode.
 *
 * Press cmd+shift+\ (ctrl+shift+\ off a Mac) anywhere in the game to open
 * a small overlay panel that can:
 *
 *   - jump straight to any level,
 *   - grant any number of coins,
 *   - reveal the correct answer next to every question.
 *
 * It exists for testing and demos. It's plain DOM rather than a Phaser
 * scene so it floats above everything, survives every scene change, and
 * costs the game nothing when closed. The shortcut is the only way in —
 * nothing in the game ever points at it, so a child playing normally will
 * never see it.
 */

import type Phaser from 'phaser';
import { gameState } from './gameState';
import { MAX_LEVEL } from './pets';
import { SCENES } from './config';

/** Global dev switches. Read by MiniGameScene; never persisted. */
export const devMode = {
  /** When true, every mini-game prints the correct answer by the banner. */
  showAnswers: false,
  /** When true, every whole-number question uses the typed number pad. */
  alwaysType: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribes to dev-mode changes. Returns an unsubscribe function. */
export function onDevModeChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Scenes that are safe to restart when dev mode changes the save out from
 * under them — the hub and menu screens. Mini-games are deliberately left
 * alone so granting coins mid-round doesn't wipe the round; they pick up
 * the new values on the next answer or question anyway.
 */
const HUB_SCENES: readonly string[] = [
  SCENES.world,
  SCENES.pets,
  SCENES.shop,
  SCENES.settings,
];

/** Restarts whichever hub screens are showing, so stale HUDs refresh. */
function refreshHubScenes(game: Phaser.Game): void {
  for (const scene of game.scene.getScenes(true)) {
    if (HUB_SCENES.includes(scene.scene.key)) scene.scene.restart();
  }
}

/** Restarts every active scene — used after a level jump, where even a
 *  running mini-game's difficulty band is stale. */
function refreshAllScenes(game: Phaser.Game): void {
  for (const scene of game.scene.getScenes(true)) {
    if (scene.scene.key !== SCENES.boot) scene.scene.restart();
  }
}

/** Wires up the global shortcut. Called once from main.ts. */
export function initDevMode(game: Phaser.Game): void {
  let panel: { root: HTMLDivElement; dispose: () => void } | null = null;

  document.addEventListener('keydown', (event) => {
    // cmd+shift+\ — checked via `code` because with shift held the key
    // *value* is "|" on most layouts. Ctrl works for non-Mac keyboards.
    if (event.code !== 'Backslash' || !event.shiftKey || !(event.metaKey || event.ctrlKey)) {
      return;
    }
    event.preventDefault();
    if (panel !== null) {
      panel.dispose();
      panel = null;
    } else {
      panel = buildPanel(game, () => {
        panel = null;
      });
    }
  });
}

/* ------------------------------------------------------------------ *
 * The panel itself — plain DOM, styled inline, no dependencies.
 * ------------------------------------------------------------------ */

function styleButton(button: HTMLButtonElement): void {
  button.style.cssText =
    'background:#4ecdc4;border:none;border-radius:6px;padding:5px 10px;' +
    'font:inherit;color:#1c2333;cursor:pointer;font-weight:bold;';
}

function row(): HTMLDivElement {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
  return div;
}

function buildPanel(
  game: Phaser.Game,
  onClosed: () => void,
): { root: HTMLDivElement; dispose: () => void } {
  const root = document.createElement('div');
  root.style.cssText =
    'position:fixed;top:12px;right:12px;z-index:99999;min-width:250px;' +
    'background:rgba(30,27,45,0.94);color:#f5f2ff;border-radius:10px;' +
    'padding:14px;font:13px/1.5 ui-monospace,Menlo,monospace;' +
    'display:flex;flex-direction:column;gap:10px;box-shadow:0 6px 24px rgba(0,0,0,0.4);';

  const title = document.createElement('div');
  title.textContent = '🛠 DEV MODE';
  title.style.cssText = 'font-weight:bold;letter-spacing:1px;color:#ffd93d;';
  root.appendChild(title);

  /* --- Level ------------------------------------------------------ */
  const levelRow = row();
  const levelLabel = document.createElement('span');
  const levelValue = document.createElement('span');
  levelLabel.textContent = 'Level';
  levelValue.style.cssText = 'min-width:2ch;text-align:center;font-weight:bold;';

  const setLevel = (target: number): void => {
    gameState.devSetLevel(target);
    refresh();
    // A level jump changes the maths band and the cats on offer, so every
    // screen showing either is stale — including a running mini-game.
    refreshAllScenes(game);
  };

  const minus = document.createElement('button');
  minus.textContent = '−';
  const plus = document.createElement('button');
  plus.textContent = '+';
  const maxJump = document.createElement('button');
  maxJump.textContent = `max (${MAX_LEVEL})`;
  const resetJump = document.createElement('button');
  resetJump.textContent = '1';
  for (const b of [minus, plus, resetJump, maxJump]) styleButton(b);
  minus.onclick = () => setLevel(gameState.level - 1);
  plus.onclick = () => setLevel(gameState.level + 1);
  resetJump.onclick = () => setLevel(1);
  maxJump.onclick = () => setLevel(MAX_LEVEL);

  levelRow.append(levelLabel, minus, levelValue, plus, resetJump, maxJump);
  root.appendChild(levelRow);

  /* --- Coins ------------------------------------------------------ */
  const coinRow = row();
  const coinLabel = document.createElement('span');
  const coinValue = document.createElement('span');
  coinLabel.textContent = 'Coins';
  coinValue.style.fontWeight = 'bold';
  coinRow.append(coinLabel, coinValue);
  root.appendChild(coinRow);

  const grantRow = row();
  const amount = document.createElement('input');
  amount.type = 'number';
  amount.value = '1000';
  amount.style.cssText =
    'width:80px;background:#1c2333;color:#f5f2ff;border:1px solid #4ecdc4;' +
    'border-radius:6px;padding:4px 6px;font:inherit;';
  // Keep typed digits out of Phaser's keyboard handling (WASD walking etc).
  amount.addEventListener('keydown', (e) => e.stopPropagation());

  const grant = document.createElement('button');
  grant.textContent = 'Add';
  const grantBig = document.createElement('button');
  grantBig.textContent = '+10k';
  for (const b of [grant, grantBig]) styleButton(b);
  const addCoins = (n: number): void => {
    if (!Number.isFinite(n) || n === 0) return;
    gameState.addCoins(n);
    refresh();
    // Hub HUDs show stale coins otherwise; running games are left alone.
    refreshHubScenes(game);
  };
  grant.onclick = () => addCoins(Number(amount.value));
  grantBig.onclick = () => addCoins(10000);

  grantRow.append(amount, grant, grantBig);
  root.appendChild(grantRow);

  /* --- Show answers ------------------------------------------------ */
  const answersRow = row();
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'dev-show-answers';
  checkbox.checked = devMode.showAnswers;
  checkbox.style.cursor = 'pointer';
  const checkLabel = document.createElement('label');
  checkLabel.htmlFor = 'dev-show-answers';
  checkLabel.textContent = 'Show answers';
  checkLabel.style.cursor = 'pointer';
  checkbox.onchange = () => {
    devMode.showAnswers = checkbox.checked;
    emit();
  };
  answersRow.append(checkbox, checkLabel);
  root.appendChild(answersRow);

  /* --- Always-typed questions -------------------------------------- */
  const typedRow = row();
  const typedBox = document.createElement('input');
  typedBox.type = 'checkbox';
  typedBox.id = 'dev-always-type';
  typedBox.checked = devMode.alwaysType;
  typedBox.style.cursor = 'pointer';
  const typedLabel = document.createElement('label');
  typedLabel.htmlFor = 'dev-always-type';
  typedLabel.textContent = 'Typed questions (next Q)';
  typedLabel.style.cursor = 'pointer';
  typedBox.onchange = () => {
    devMode.alwaysType = typedBox.checked;
    emit();
  };
  typedRow.append(typedBox, typedLabel);
  root.appendChild(typedRow);

  const hint = document.createElement('div');
  hint.textContent = 'cmd/ctrl+shift+\\ to close';
  hint.style.cssText = 'opacity:0.55;font-size:11px;';
  root.appendChild(hint);

  /* --- Live values ------------------------------------------------- */
  const refresh = (): void => {
    levelValue.textContent = `${gameState.level}`;
    coinValue.textContent = `${gameState.coins}`;
  };
  refresh();
  // Coins earned by playing tick up live while the panel is open.
  const unsubscribe = gameState.subscribe(refresh);

  document.body.appendChild(root);

  return {
    root,
    dispose: () => {
      unsubscribe();
      root.remove();
      onClosed();
    },
  };
}
