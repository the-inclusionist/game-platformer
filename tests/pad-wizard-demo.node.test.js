// SPDX-License-Identifier: AGPL-3.0-or-later
// The mapping wizard's demonstration of this game's boy, moved from the engine's `input/gamepad` (engine note CD).
// Driven with fake elements: the page's `#padwiz-demo`, its `<img>` and its effect line.
import { describe, it, expect } from 'vitest';
import { createPadWizardDemo, PADWIZ_ANIM } from '../app/js/ui/pad-wizard-demo.js';

function page({ withImg = true, withBox = true } = {}) {
  const els = {
    '#padwiz-demo': withBox ? { className: 'stale' } : null,
    '#padwiz-demo-img': withImg ? { src: '', style: { display: 'x', transform: 'x' } } : null,
    '#padwiz-demo-fx': { textContent: 'stale' },
  };
  return { els, demo: createPadWizardDemo({ $: (sel) => els[sel] ?? null, spriteBase: 'spr/' }) };
}

describe('ui/pad-wizard-demo', () => {
  it('shows the first frame of the asked position, with its class, and mirrors the walk to the left', () => {
    const { els, demo } = page();
    demo.step('left');
    expect(els['#padwiz-demo'].className).toBe('pw-left');
    expect(els['#padwiz-demo-img'].src).toBe('spr/andar/0.png');
    expect(els['#padwiz-demo-img'].style.transform).toBe('scaleX(-1)');
    demo.step('right');
    expect(els['#padwiz-demo-img'].style.transform, 'the walk to the right is not mirrored').toBe('');
  });

  it('a tick advances one frame every `hold` ticks, and loops', () => {
    const { els, demo } = page();
    demo.step('up'); // escada/0, escada/1, hold 9
    for (let i = 0; i < 8; i++) demo.tick();
    expect(els['#padwiz-demo-img'].src).toBe('spr/escada/0.png');
    demo.tick();
    expect(els['#padwiz-demo-img'].src).toBe('spr/escada/1.png');
    for (let i = 0; i < 9; i++) demo.tick();
    expect(els['#padwiz-demo-img'].src, 'the loop did not come back to the first frame').toBe('spr/escada/0.png');
  });

  it('a position drawn only as an effect hides the boy and writes the effect', () => {
    const { els, demo } = page();
    demo.step('start');
    expect(els['#padwiz-demo-img'].style.display).toBe('none');
    expect(els['#padwiz-demo-fx'].textContent).toBe(PADWIZ_ANIM.start.fx);
  });

  it('the wizard opening (`null`) and a position the table does not name show the boy idle, with no effect and no animation', () => {
    for (const position of [null, 'leftShoulder']) {
      const { els, demo } = page();
      demo.step('action1');
      demo.step(position);
      expect(els['#padwiz-demo'].className).toBe('');
      expect(els['#padwiz-demo-fx'].textContent).toBe('');
      expect(els['#padwiz-demo-img'].src).toBe('spr/idle/0.png');
      demo.tick();
      expect(els['#padwiz-demo-img'].src, 'an animation kept running over the idle boy').toBe('spr/idle/0.png');
    }
  });

  it('a page without the demonstration, or without its image, is left alone', () => {
    const noBox = page({ withBox: false });
    expect(() => { noBox.demo.step('left'); noBox.demo.tick(); }).not.toThrow();
    const noImg = page({ withImg: false });
    noImg.demo.step('action3');
    expect(noImg.els['#padwiz-demo'].className).toBe('pw-especial');
    expect(noImg.els['#padwiz-demo-fx'].textContent).toBe('✨');
  });
});
