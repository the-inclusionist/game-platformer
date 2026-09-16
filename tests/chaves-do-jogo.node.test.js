// SPDX-License-Identifier: AGPL-3.0-or-later
// THIS GAME'S SENTENCES ARE THIS GAME'S (engine ADR-0174, issue #171).
//
// 📏 Measured on 2026-09-13 across the sibling repositories: 176 keys of the engine's dictionaries were used by this game
// alone. They moved to `app/js/i18n/game-keys.ts`, and the engine drops them in its next major. This gate holds what makes
// that safe: every key is in pt, en and es, the three are handed to the engine's `registerDict`, and `create()` registers
// them. ⚠️ Comparing `t()` before and after would prove nothing on engine 9.0.0: it still carries the same sentences.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const registrados = [];
vi.mock('@the-inclusionist/engine/core/i18n.js', async (original) => ({
  ...(await original()),
  registerDict: (code, entries) => { registrados.push([code, entries]); return []; },
}));
const { registrarChavesDoJogo } = await import('../app/js/i18n/game-keys.ts');

const FONTE = readFileSync(new URL('../app/js/i18n/game-keys.ts', import.meta.url), 'utf8');
const MAIN = readFileSync(new URL('../app/js/main.ts', import.meta.url), 'utf8');
/** The keys of one language's record, read from the file itself. */
function chavesDe(lingua) {
  const ini = FONTE.indexOf(`const ${lingua}: Record<string, string> = {`);
  return [...FONTE.slice(ini, FONTE.indexOf('};', ini)).matchAll(/^\s*'([\w.-]+)'\s*:/gm)].map((m) => m[1]);
}

describe('the game\'s own dictionary keys (engine ADR-0174)', () => {
  it('🎯 [Zero] the list is the measured one, not an empty file', () => {
    // 176 measured when the menu moved here; three left with WebGazer's eye button on 2026-09-16 (engine ADR-0214)
    expect(chavesDe('pt').length).toBe(173);
  });

  it('🔴 [Right] every key is in pt, en and es', () => {
    const pt = chavesDe('pt');
    expect(chavesDe('en')).toEqual(pt);
    expect(chavesDe('es')).toEqual(pt);
  });

  it('🔴 [Right] the three languages are handed to the engine, every key with a sentence', () => {
    registrados.length = 0;
    registrarChavesDoJogo();
    expect(registrados.map(([code]) => code)).toEqual(['pt', 'en', 'es']);
    for (const [code, entries] of registrados) {
      expect(Object.keys(entries), `${code}: a key is not registered`).toEqual(chavesDe('pt'));
      expect(Object.values(entries).filter((v) => typeof v !== 'string' || !v.trim()), `${code}: an empty sentence`).toEqual([]);
    }
  });

  it('🔴 [Interface] a sentence about screens or rounds carries the number by parameter (the rule moved from the engine\'s i18n-dicts)', () => {
    // With the number inside the sentence there would be one key per number, and each translation would redo the arithmetic.
    const ini = FONTE.indexOf('const pt: Record<string, string> = {');
    const pt = Object.fromEntries([...FONTE.slice(ini, FONTE.indexOf('};', ini)).matchAll(/^\s*'([\w.-]+)'\s*:\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => [m[1], m[2]]));
    const comNumero = Object.keys(pt).filter((k) => /screens\.(alreadyN|activeN|newRoundN|wontFitN)|round\.multi/.test(k));
    expect(comNumero.length, 'the case needs the screen and round sentences').toBeGreaterThanOrEqual(4);
    for (const k of comNumero) expect(pt[k], k).toContain('{n}');
  });

  it('🔴 [Right] the game registers them first thing in create()', () => {
    const corpo = MAIN.slice(MAIN.indexOf('export async function create('));
    expect(corpo.split('\n').slice(1, 3).join('\n'), 'create() does not start by registering the game\'s keys').toMatch(/registrarChavesDoJogo\(\);/);
  });
});

// ============================== MUTATIONS CHECKED ==============================
//   G1 registrarChavesDoJogo registers pt only           🔴 handed to the engine
//   G2 the call removed from create()                     🔴 first thing in create()
//   G3 a key dropped from es                              🔴 pt, en and es
