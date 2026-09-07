// SPDX-License-Identifier: AGPL-3.0-or-later
// O AVISO DE ALCANCE, DO LADO DO JOGO (issue #112, ADR-0091).
//
// ⚠️ ESTE FICHEIRO VEIO DA ENGINE NA SEPARACAO DO CARTUCHO (issue #111), e o motivo da mudanca e' o que ele
// afere: as duas asseercoes falam do JOGO, nao da engine. Uma le o fonte de `main.ts` — que e' a raiz de
// composicao deste repositorio — e a outra afirma que o preset REAL do plataforma tem NOVE acoes.
//
// Com o cartucho fora da engine, nenhuma das duas era aferivel la', e falsificar o preset teria apagado
// exatamente o que elas provam. O TEXTO do aviso continua a ser gate da engine, onde sempre foi.
import { describe, it, expect } from 'vitest';
import { alcance, transportesPadrao } from '@the-inclusionist/engine/input/transports.js';
import { presetActions } from '@the-inclusionist/engine/core/actions.js';
import { platformerPreset } from '../app/js/game/platformer-preset.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const nunca = () => false;
const sempre = () => true;

describe('a raiz deste jogo mostra o aviso, e ela nao passa por `createGame`', () => {
  // Ler o fonte pelo mesmo motivo do `loop-crash`: `main.ts` arranca PixiJS, audio e o documento inteiro, e
  // nao entra num teste. Mas e' ele quem monta a engine a mao, e a alternativa a ler o fonte era nao aferir
  // nada — que foi o estado em que `input/transports` ficou sem consumidor nenhum.
  const FONTE = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');

  it('[Right] a raiz chama o aviso com as acoes do PROPRIO preset', () => {
    expect(FONTE).toContain('mostrarAvisoDeAlcance');
    expect(FONTE).toContain('presetActions(platformerPreset())');
  });

  it('[Interface] ⚠️ o preset deste jogo tem NOVE acoes, e o toque tem nove lugares', () => {
    // Nao e' coincidencia e vale estar preso: o jogo foi desenhado para caber no controle de tela, e por isso
    // o aviso hoje nao dispara nele. No dia em que declarar a DECIMA acao, o tablet deixa de alcancar — e
    // este caso reprova primeiro, que e' o unico aviso que chega antes da crianca.
    const acoes = presetActions(platformerPreset());
    expect(acoes).toHaveLength(9);
    expect(alcance(transportesPadrao({ gamepad: nunca, teclado: nunca, toque: sempre }), acoes).ok).toBe(true);
  });
});
