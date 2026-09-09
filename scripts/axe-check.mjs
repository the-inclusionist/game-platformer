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
// ========================= WHAT IS EXCLUDED, AND WHY =========================
// ONE subtree, in two selectors: the VLibras interpreter. It is third-party markup this repository does not
// write and cannot repair without fighting the widget's own re-renders, and axe reports a CRITICAL
// `image-alt` inside it.
//
// ⚠️ TWO SELECTORS, AND THE SECOND IS THE ONE THAT WORKS. `[vw]` is the div this page declares; the widget
// does not stay in it — it attaches `#vlibras-access-wrapper` straight onto `<body>`. Measured live in this
// game: both are present, so both are named. Excluding only our own div would exclude nothing.
//
// ⚠️ AND THE EXCLUSION DOES NOT FIX IT FOR A CHILD. It stops the gate reporting a defect nobody here can
// repair; the image is still in the page she opens. It is the same exclusion the engine and `game-soccer`
// make, for the same widget, and it is narrow — one subtree, not a rule switched off.
//
// The rest of the page is audited with no exceptions at all, which is where the value is.
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
    // The interpreter widget, and nothing else. See the header.
    .exclude('[vw]')
    .exclude('#vlibras-access-wrapper')
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
