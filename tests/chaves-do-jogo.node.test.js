// SPDX-License-Identifier: AGPL-3.0-or-later
// THIS GAME'S SENTENCES ARE THIS GAME'S (engine ADR-0174, issue #171).
//
// 📏 Measured on 2026-09-13 across the sibling repositories: 176 keys of the engine's dictionaries were used by this game
// alone. They moved to `app/js/i18n/game-keys.ts`, and the engine drops them in its next major. This gate holds what makes
// that safe: every key is in pt, en and es, the three are handed to the engine's `registerDict`, and `create()` registers
// them. ⚠️ Comparing `t()` before and after would prove nothing on engine 9.0.0: it still carries the same sentences.
//
// ⚠️ ENGINE 11 (ADR-0232 D3, note CV): `core/i18n` keeps no state, so there is no importable `registerDict` left and the
// game no longer registers anything. `game-keys.ts` exports the three dictionaries as DATA (`DICIONARIOS`); the cartridge
// hands them over as `hooks.dictionaries`, and `createGame` registers them in ITS translator. The two cases that used to spy
// on a global registration now register into a REAL translator (`createTranslator`), and read the hand-over in `src/index.ts`.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createTranslator } from '@the-inclusionist/engine/core/i18n.js';
import { DICIONARIOS } from '../app/js/i18n/game-keys.ts';

const FONTE = readFileSync(new URL('../app/js/i18n/game-keys.ts', import.meta.url), 'utf8');
const CARTUCHO = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
/** The keys of one language's record, read from the file itself. */
function chavesDe(lingua) {
  const ini = FONTE.indexOf(`const ${lingua}: Record<string, string> = {`);
  return [...FONTE.slice(ini, FONTE.indexOf('};', ini)).matchAll(/^\s*'([\w.-]+)'\s*:/gm)].map((m) => m[1]);
}

describe('the game\'s own dictionary keys (engine ADR-0174)', () => {
  it('🎯 [Zero] the list is the measured one, not an empty file', () => {
    // 176 measured when the menu moved here; three left with WebGazer's eye button on 2026-09-16 (engine ADR-0214) → 173;
    // 13 arrived on 2026-09-27 with the accommodations' words (2213eaa): `accom.{caneSpacing,characterMotion,easyMode,
    // ownerColors,readingLevel,wheelchair}` and their six `.hint`, plus `accom.contrastOutlines.hint` → 186.
    expect(chavesDe('pt').length).toBe(196);
  });

  it('🔴 [Right] every key is in pt, en and es', () => {
    const pt = chavesDe('pt');
    expect(chavesDe('en')).toEqual(pt);
    expect(chavesDe('es')).toEqual(pt);
  });

  it('🔴 [Right] the three languages are handed to the engine, every key with a sentence', () => {
    expect(Object.keys(DICIONARIOS)).toEqual(['pt', 'en', 'es']);
    const tr = createTranslator();
    for (const [code, entries] of Object.entries(DICIONARIOS)) {
      // The expectation is the FILE's text (`chavesDe`), not the exported object: reading both through `DICIONARIOS`
      // would move them together.
      expect(Object.keys(entries), `${code}: a key is not handed over`).toEqual(chavesDe('pt'));
      expect(Object.values(entries).filter((v) => typeof v !== 'string' || !v.trim()), `${code}: an empty sentence`).toEqual([]);
      expect(tr.registerDict(code, entries), `${code}: keys the translator refused`).toEqual([]);
    }
    expect(tr.dictionaryGaps(), 'a key registered in one language and not another').toEqual([]);
    expect(chavesDe('pt').filter((k) => !tr.declares(k)), 'a key the translator does not declare').toEqual([]);
  });

  it('🔴 [Interface] a sentence about screens or rounds carries the number by parameter (the rule moved from the engine\'s i18n-dicts)', () => {
    // With the number inside the sentence there would be one key per number, and each translation would redo the arithmetic.
    const ini = FONTE.indexOf('const pt: Record<string, string> = {');
    const pt = Object.fromEntries([...FONTE.slice(ini, FONTE.indexOf('};', ini)).matchAll(/^\s*'([\w.-]+)'\s*:\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => [m[1], m[2]]));
    const comNumero = Object.keys(pt).filter((k) => /screens\.(alreadyN|activeN|newRoundN|wontFitN)|round\.multi/.test(k));
    expect(comNumero.length, 'the case needs the screen and round sentences').toBeGreaterThanOrEqual(4);
    for (const k of comNumero) expect(pt[k], k).toContain('{n}');
  });

  it('🔴 [Right] the cartridge hands them to whoever loads it, as `hooks.dictionaries`', () => {
    // Since engine 11 the cartridge never registers its own (ADR-0139): it EXPOSES them, and `createGame` registers.
    expect(CARTUCHO, 'dicts is not the game\'s dictionaries').toMatch(/export const dicts\b[^=]*=\s*DICIONARIOS;/);
    const hooks = CARTUCHO.slice(CARTUCHO.indexOf('export const hooks'), CARTUCHO.indexOf('};', CARTUCHO.indexOf('export const hooks')));
    expect(hooks, 'hooks does not hand the dictionaries to createGame').toMatch(/^\s*dictionaries:\s*dicts,/m);
  });
});

// ============================== MUTATIONS CHECKED ==============================
//   G1 `es` dropped from DICIONARIOS (engine 11)          🔴 handed to the engine
//   G2 `dictionaries: dicts` commented out of `hooks`     🔴 the cartridge hands them over
//   G2b `dicts = {}` instead of DICIONARIOS               🔴 the cartridge hands them over
//   (G1/G2/G2b run on 2026-10-02, each alone, sources restored from a copy and checked by sha1)
//   G3 a key dropped from es                              🔴 pt, en and es
