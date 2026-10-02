// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * THE MAPPING WIZARD'S DEMONSTRATION — this game's boy doing what each position does, while the engine's wizard asks
 * the child to press it: climbing for up and down, walking for the sides, jumping, running, the swap icons.
 *
 * It came from the engine's `input/gamepad` (engine note CD, the Dev's order of 2026-09-23: «PADWIZ_ANIM e wizDemo vão
 * para o platformer»). The ORDER of the questions is the engine's; the sprites and the moves are this game's, and an
 * engine that describes one game's boy is the defect ADR-0228 removes.
 *
 * 📌 WIRED since engine 11, through the cartridge's `gamepad.wizardStep`/`wizardTick` hooks (`ligarGanchos` in
 * `main.ts`). The engine mounts `#padwiz` with its own markup, so the root creates the `#padwiz-demo` box inside the
 * engine's card the first time the wizard asks for a step.
 */
import './pad-wizard-demo.css';

export interface WizAnimDef { seq?: string[]; hold?: number; cls: string; fx?: string; noimg?: number; flip?: number; }

/** One demonstration per position, from this game's real frames. A position the table does not name shows the boy idle. */
export const PADWIZ_ANIM: Readonly<Record<string, WizAnimDef>> = Object.freeze({
  up: { seq: ['escada/0', 'escada/1'], hold: 9, cls: 'pw-up' },
  down: { seq: ['escada/1', 'escada/0'], hold: 9, cls: 'pw-down' },
  left: { seq: ['andar/0', 'andar/1', 'andar/2', 'andar/3', 'andar/4', 'andar/5', 'andar/6', 'andar/7'], hold: 4, cls: 'pw-left', flip: 1 },
  right: { seq: ['andar/0', 'andar/1', 'andar/2', 'andar/3', 'andar/4', 'andar/5', 'andar/6', 'andar/7'], hold: 4, cls: 'pw-right' },
  action2: { seq: ['pulo/0', 'pulo/0', 'pulo/1', 'pulo/1'], hold: 7, cls: 'pw-jump' },
  action1: { seq: ['correr/0', 'correr/1', 'correr/2', 'correr/3'], hold: 3, cls: 'pw-run' },
  action4: { fx: '👟 🕷️ 🎈 🐇 🦘', cls: 'pw-swap', noimg: 1 },
  action3: { seq: ['idle/0', 'idle/1', 'idle/2', 'idle/3'], hold: 8, fx: '✨', cls: 'pw-especial' },
  start: { fx: 'PAUSA', cls: 'pw-start', noimg: 1 },
});

export interface PadWizardDemoCtx {
  /** The page's element lookup — the demonstration lives in `#padwiz-demo`, inside the engine's `#padwiz` card. */
  $: <T extends Element>(sel: string) => T | null;
  /** Where this game's sprites are served from, ending in `/`. */
  spriteBase: string;
}

export interface PadWizardDemo {
  /** Shows the demonstration of `position`; `null` (the wizard opening) shows the boy idle. */
  step(position: string | null): void;
  /** Advances the animated frames by one wizard tick. */
  tick(): void;
}

export function createPadWizardDemo(ctx: PadWizardDemoCtx): PadWizardDemo {
  let anim: { seq: string[]; hold: number; t: number } | null = null;
  const frame = (name: string): string => `${ctx.spriteBase}${name}.png`;

  function step(position: string | null): void {
    const box = ctx.$<HTMLElement>('#padwiz-demo');
    const img = ctx.$<HTMLImageElement>('#padwiz-demo-img');
    const fx = ctx.$<HTMLElement>('#padwiz-demo-fx');
    if (!box) return;
    const a = position ? PADWIZ_ANIM[position] : undefined;
    box.className = a ? a.cls : '';
    anim = null;
    if (fx) fx.textContent = a?.fx ?? '';
    if (!img) return;
    img.style.display = a?.noimg ? 'none' : '';
    img.style.transform = a?.flip ? 'scaleX(-1)' : '';
    if (a?.seq) { img.src = frame(a.seq[0]); anim = { seq: a.seq, hold: a.hold ?? 6, t: 0 }; }
    else if (!a) img.src = frame('idle/0');
  }

  function tick(): void {
    if (!anim) return;
    anim.t++;
    const img = ctx.$<HTMLImageElement>('#padwiz-demo-img');
    if (img) img.src = frame(anim.seq[Math.floor(anim.t / anim.hold) % anim.seq.length]);
  }

  return { step, tick };
}
