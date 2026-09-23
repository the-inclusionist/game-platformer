// SPDX-License-Identifier: AGPL-3.0-or-later
// 🔴 a legenda glifo↔tipo, o parser do mundo e a consistência entre os dois vieram da engine na F12 (ADR-0228); as constantes, o RNG, o mixer e o estado de entrada ficaram lá.
import { describe, it, expect } from 'vitest';
// `core/constants` FICOU na engine — é o que a engine É, sem jogo nenhum — logo vem do pacote.
import * as C from '@the-inclusionist/engine/core/constants.js';
import * as T from '../app/js/core/tiles.js';
import * as W from '../app/js/core/world.js';

describe('core/tiles — legenda glifo↔tipo + parser', () => {
  it('[Cross-check] selfTest confirma a bijeção (únicos, invertível, sem faltas)', () => {
    const r = T.selfTest();
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });
  it('[Zero] texto vazio → grid vazio', () => {
    expect(T.parseLevel('')).toEqual([]);
  });
  it('[One] um glifo → grid 1×1', () => {
    expect(T.parseLevel(T.TYPE_GLYPH[2])).toEqual([[2]]); // '#' = pedra
  });
  it('[Many] várias linhas preservam o comprimento irregular de cada uma', () => {
    const g = T.parseLevel('..\n.'); // 2ª linha mais curta
    expect(g.length).toBe(2);
    expect(g[0].length).toBe(2);
    expect(g[1].length).toBe(1); // irregular preservado (buildWorld preenche depois)
  });
  it('[Inverse] gridToGlyphs ∘ parseLevel = identidade (glifos válidos)', () => {
    const txt = [T.TYPE_GLYPH[0] + T.TYPE_GLYPH[2] + T.TYPE_GLYPH[9],
                 T.TYPE_GLYPH[3] + T.TYPE_GLYPH[4] + T.TYPE_GLYPH[5]].join('\n');
    expect(T.gridToGlyphs(T.parseLevel(txt))).toBe(txt);
  });
  it('[Error] glifo desconhecido → AIR (= tipo do ".", ar iluminado)', () => {
    const g = T.parseLevel('.?.');
    expect(g[0][1]).toBe(T.GLYPH_TYPE['.']);
    expect(g[0]).toEqual([T.GLYPH_TYPE['.'], T.GLYPH_TYPE['.'], T.GLYPH_TYPE['.']]);
  });
  it('[Boundary/Existence] linha de meta "#!" é ignorada (mas "#" sozinho é parede)', () => {
    expect(T.parseLevel('#!nome=teste\n' + T.TYPE_GLYPH[2])).toEqual([[2]]);
  });
});


describe('core/world — buildWorldFromText', () => {
  it('[One] mundo mínimo mantém as dimensões', () => {
    const w = W.buildWorldFromText('...\n...');
    expect(w.length).toBe(2);
    expect(w[0].length).toBe(3);
  });
  it('[Boundary] linha curta é preenchida à direita com ar escuro (tipo 0)', () => {
    const g = T.TYPE_GLYPH[2];
    const w = W.buildWorldFromText(g + g + '\n' + g); // 2ª linha mais curta
    expect(w[1].length).toBe(2);   // padded à largura máxima
    expect(w[1][1]).toBe(0);       // preenchimento = ar escuro (não-sólido)
  });
  it('[Right] pedra (2) preservada', () => {
    const g = T.TYPE_GLYPH[2];
    expect(W.buildWorldFromText(g + '\n' + g)[0][0]).toBe(2);
  });
  it('[Right/a11y] passagem de 1 tile é ALARGADA (teto de pedra vira ar p/ o jogador caber)', () => {
    // '#' teto · '.' ar sobre chão · '#' chão → o teto (pedra=2) é convertido em ar(1); jogador tem 2 tiles.
    expect(W.buildWorldFromText('#\n.\n#')).toEqual([[1], [1], [2]]);
  });
  it('[Boundary/a11y] passagem já com 2 tiles NÃO é alterada (não alarga à toa)', () => {
    expect(W.buildWorldFromText('#\n.\n.\n#')[0][0]).toBe(2); // teto de pedra preservado
  });
  it('[Right] power-up injetado no mapa (super-corrida=12 em x13,y8)', () => {
    const big = Array.from({ length: 9 }, () => '.'.repeat(14)).join('\n');
    expect(W.buildWorldFromText(big)[8][13]).toBe(12);
  });
});


describe('registro de tiles — consistência cross-módulo (smell: 4 objetos em 2 módulos)', () => {
  it('[Cross-check] todo tipo 0..14 existe em TILE_TYPES, TILE_COLOR (constants) e TYPE_GLYPH, TILE_NAME (tiles)', () => {
    for (let t = 0; t <= 14; t++) {
      expect(T.TILE_TYPES[t], `TILE_TYPES[${t}]`).toBeDefined();
      expect(C.TILE_COLOR[t], `TILE_COLOR[${t}]`).toBeDefined();
      expect(T.TYPE_GLYPH[t], `TYPE_GLYPH[${t}]`).toBeDefined();
      expect(T.TILE_NAME[t], `TILE_NAME[${t}]`).toBeDefined();
    }
  });
});

