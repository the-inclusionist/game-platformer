# The Inclusionist — the platformer

The accessibility-first 2D pixel-art game the engine was extracted from. It now consumes that engine as a
package, from the public registry, like any other game will.

```bash
npm install
npm run dev        # or: npm run build && npm run preview
```

## Why this repository exists

**ADR-0036 ordered it on 2026-08-25.** It chose *«S1 — the game leaves; this repository becomes the engine»*
and explicitly rejected *«S3 — one monorepo holding engine, shell and every game»*. ADR-0058 rejected the
monorepo again (T4), ADR-0068 fixed one repository per game, and ADR-0082 fixed the name `game-<slug>`.

⚠️ **The code only moved on 2026-09-06 — twelve days late.** Nothing ever authorised it to stay; it simply
was not done. The engine's issue #111 is the record of that debt.

## What the boundary actually looks like

Measured on the day of the move, not assumed:

| | |
|---|---|
| the cartridge | 31 modules in `app/js/game/` + `app/js/main.ts` — **5153 + 2089 lines** |
| engine modules it uses | **90** |
| of those, delivered by `@the-inclusionist/engine@7.0.1` | **89** |
| imports rewritten from relative paths to the package name | **157** (74 stayed relative — they travel together) |
| engine modules that import from `game/` | **zero**, which is why the cartridge could leave at all |

⚠️ **The one module the package does not deliver is `render/sprites`, and that is deliberate on both sides.**
It imports `virtual:sprite-atlas`, a module that only exists inside this project's build plugin, and the
engine's `tsconfig.pkg.json` excludes it in writing because *«publishing it would hand the consumer an import
that does not resolve»*. So it travels here, together with `scripts/vite-plugin-atlas.mjs` that generates it.

## Three things the move found

⚠️ **The neural voice is declared HERE, and the first build proved why.** It failed with the exact error that
made the engine's `6.36.1` unbuildable — `Rolldown failed to resolve import "@mintplex-labs/piper-tts-web"` —
except pointing at `app/js/main.ts` instead of at the engine's shipped code. That is ADR-0094's port working:
`main.ts` opens it, so the game that wants the voice declares the package and pays the 135.4 MB of
`onnxruntime-web` it drags in. A game that never speaks pays nothing.

⚠️ **A module augmentation does not fail like an import.** `game/state.ts` augments the engine's event map,
and its target was still `'../core/state.js'`. A path that no longer exists produces `TS2664` plus four
errors somewhere else — *«'coins' is not assignable to keyof EventoDoJogo»* — because the map was simply
never extended. Import rewriting that only looks at `from` misses this.

⚠️ **The stylesheet is imported, not linked.** `index.html` carried `href="css/style.css"`, a local path that
does not exist here. The sheet belongs to the engine (`@the-inclusionist/engine/style.css`), and its
`sideEffects: ["*.css"]` exists so a consumer's `import` survives tree-shaking. Fonts stay under `/vendor/`,
which travels whole inside `app/public/` — `fonts.css` addresses the faces by relative url.

## What is still owed

**The engine has not been emptied yet.** This repository holds a working copy; removing `app/js/game/` and
`main.ts` from `the-inclusionist-engine` is the second half of issue #111, and it is the expensive half:
**24 test files there are engine gates that use this game as their fixture**, and each needs a neutral one.
Fifteen test files that only touch the cartridge travelled here and are green.

Git history stays in `the-inclusionist-engine`, which is public under AGPL. The move is a copy plus a
removal, not a history rewrite: rewriting 200+ commits of interleaved paths would have risked the engine's
own history to gain a `git log` that is one clone away.

## Licence

AGPL-3.0-or-later for the code. Art is **not** FOSS — see the engine's `docs/LICENSES.md`.
Patrimonial owner of the software: the Município, under Lei nº 9.609/1998 art. 4º.
