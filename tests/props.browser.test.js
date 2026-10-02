// SPDX-License-Identifier: AGPL-3.0-or-later
// Testes de game/props — a arte procedural DESTE jogo (project browser: precisa de canvas de verdade).
//
// Saiu de `tests/render.browser.test.js` no item 19, junto com o módulo. O teste viaja com o módulo, e aqui
// isso teve uma consequência concreta: se o bloco tivesse ficado no arquivo misto, aquele arquivo passaria a
// importar de `game/` e os outros quatro módulos de ENGINE que ele cobre sairiam da varredura de fixtures —
// que pula testes de jogo de propósito. Um teste no lugar errado não erra sozinho: apaga a cobertura vizinha.
//
// O que os casos afirmam é DIMENSÃO e não desenho: a moeda tem 11×11, os sete ícones têm 12×12, e um tipo
// desconhecido ainda devolve 12×12 em vez de lançar. Afirmar a cor de um pixel amarraria o teste à arte, que
// é justamente o que se espera que mude.
import { describe, it, expect } from 'vitest';
import * as P from '../app/js/game/props.js';

// O documento entra por PARÂMETRO (engine 11, ADR-0232): aqui o teste é a raiz de composição e entrega o real.
const doc = document;

describe('game/props — arte procedural', () => {
  it('[Right] coinCanvas 11×11 e treeCanvas 30×52', () => {
    expect([P.coinCanvas(doc).width, P.coinCanvas(doc).height]).toEqual([11, 11]);
    expect([P.treeCanvas(doc).width, P.treeCanvas(doc).height]).toEqual([30, 52]);
  });
  it('[Many] powerupCanvas — os 7 tipos, todos 12×12', () => {
    for (const k of ['superjump', 'ultrajump', 'turbo', 'fly', 'wallcling', 'key', 'runcane']) {
      const c = P.powerupCanvas(doc, k);
      expect([c.width, c.height], k).toEqual([12, 12]);
    }
  });
  it('[Boundary/Error] powerupCanvas de tipo desconhecido ainda devolve 12×12 (fallback)', () => {
    const c = P.powerupCanvas(doc, '__nao_existe__');
    expect([c.width, c.height]).toEqual([12, 12]);
  });
});
