// SPDX-License-Identifier: AGPL-3.0-or-later
// O CONTRATO PURO DE `render/sprites` — veio de `logic.node.test.js` da engine na separacao (issue #111).
//
// ⚠️ POR QUE ESTE MODULO ESTA NUM REPOSITORIO DE JOGO: ele importa `virtual:sprite-atlas`, que so' existe
// dentro do plugin de build deste projeto (`scripts/vite-plugin-atlas.mjs`). O `tsconfig.pkg.json` da engine
// ja' o excluia do pacote por escrito — «publica-lo entregaria ao consumidor um import que nao resolve» —, e
// a separacao apenas pos o ficheiro do lado onde a exclusao ja' dizia que ele estava.
//
// O que se afere aqui e' DADO, e por isso e' do jogo: quantos quadros tem cada animacao do personagem deste
// jogo, e quantas gracinhas ele faz. A engine nao tem opiniao sobre isso.
import { describe, it, expect } from 'vitest';
import * as SPR from '../app/js/render/sprites.js';

describe('render/sprites — contrato PURO (import não faz I/O)', () => {
  it('[Interface] SPRITE_MANIFEST traz as contagens de quadros por animação', () => {
    expect(SPR.SPRITE_MANIFEST.idle).toBe(4);
    expect(SPR.SPRITE_MANIFEST.andar).toBe(8);
    expect(SPR.SPRITE_MANIFEST.correr).toBe(4);
    expect(SPR.SPRITE_MANIFEST.parede).toBe(4);
  });
  it('[Interface] FLAVORS = 3 gracinhas com seq[] e hold (dados puros)', () => {
    expect(SPR.FLAVORS.length).toBe(3);
    expect(SPR.FLAVORS.every((f) => Array.isArray(f.seq) && typeof f.hold === 'number')).toBe(true);
  });
  it('[Zero] import é PURO: TEX_WALK vazio até initCharacterSprites() (não chamamos → sem I/O)', () => {
    expect(SPR.TEX_WALK).toEqual([]);
    expect(typeof SPR.initCharacterSprites).toBe('function');
  });
});
