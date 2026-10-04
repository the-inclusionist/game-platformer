// SPDX-License-Identifier: AGPL-3.0-or-later
// THE ACCESSIBILITY GATE — axe-core against the BUILT game over HTTP, not against the source.
//
// ========================= WHY THIS REPOSITORY GOT ONE LAST =========================
// 📏 MEASURED on 2026-09-08: `game-soccer` had an axe gate and THIS repository — the monolith of origin and
// the largest consumer of an accessibility-first engine — had none, not even the package. The `ci.yml` that
// joined the shared workflow had to write `a11y: false` and say why, which is the line this file deletes.
//
// ========================= WHY THE RUNNING GAME AND NOT THE SOURCE =========================
// Almost nothing this game shows a child exists in the markup. The HUD's objective line, the coin counters,
// the pause card, the accessibility bar's ten labels and every accessible name on the remap screen are
// assembled at run time, most of them from the child's dictionary. A source analyser would read an empty
// `<div id="hud-objective">` and report nothing at all — a green that looked at nothing.
//
// ========================= ⚠️ IT WAITS FOR THE GAME, NOT FOR THE PAGE =========================
// `networkidle` says the network went quiet. It does not say PixiJS mounted, the declaration built or the
// dictionary landed. The wait is this project's OWN boot criterion, written in `CLAUDE.md` and used for
// every manual check: a CANVAS exists and `window.__incl` exists. Waiting on `#sr-status`, which is static
// markup, would let this audit a page where nothing had started.
//
// 📌 And a third condition guards the half the first two miss: `#hud-objective` must have stopped being
// empty. The canvas can exist while the dictionary is still a chunk in flight — the engine loads en/es
// asynchronously — and auditing then measures a page in the fallback language. Measured live before this was
// written: with all three satisfied the line reads «Colete 10 moedas».
//
// ========================= NOTHING IS EXCLUDED, SINCE 2026-10-03 =========================
// 🔴 THE ONE EXCLUSION THIS FILE EVER HAD IS GONE, and the absence is worth as much as the rule was. It was
// the VLibras interpreter's subtree, in two selectors — `[vw]`, the div the page declared, and
// `#vlibras-access-wrapper`, which the widget attached straight onto `<body>`. Third-party markup this
// repository did not write and could not repair without fighting the widget's own re-renders, with a
// CRITICAL `image-alt` inside it.
//
// 📌 AND THE REPAIR WAS NOT A SELECTOR, IT WAS A DECISION: the Dev, on 2026-10-03, «Libras deve copiar a
// engine ao invés de usar o VLibras do governo federal». The widget left the page, and the defect left with
// it — for the gate AND for the child, which an exclusion never did. The engine's own interpreter draws into
// a canvas it builds itself (`ui/libras-avatar-player`), from this origin, and it is audited like the rest.
//
// ⚠️ SO A NEW `.exclude(…)` HERE IS A CLAIM THAT SOMETHING UNREPAIRABLE CAME BACK, and it should be argued
// in this header before it is written. The whole page is audited with no exceptions, which is where the
// value is.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const URL = process.env.AXE_URL || 'http://localhost:4173/';

const browser = await chromium.launch();
try {
  // Playwright's axe binding needs a page from an explicit context.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => {
      const objetivo = document.querySelector('#hud-objective');
      return document.querySelectorAll('canvas').length > 0
        && typeof window.__incl === 'object' && window.__incl !== null
        && objetivo !== null && objetivo.textContent !== null && objetivo.textContent.trim() !== '';
    },
    { timeout: 15_000 },
  );

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // No `.exclude(…)`: the whole page, every rule. See the header for the one that used to be here.
    .analyze();

  if (results.violations.length) {
    console.error(JSON.stringify(results.violations, null, 2));
    console.error(`\n✗ axe: ${results.violations.length} WCAG A/AA violation(s).`);
    process.exit(1);
  }
  console.log('✓ axe: 0 WCAG A/AA violations — one exclusion, the VLibras widget.');
} finally {
  await browser.close();
}
