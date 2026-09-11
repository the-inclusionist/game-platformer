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
// So o toque disponivel: e' o aparelho da crianca que este ficheiro afere, e `rato` entrou como quarta
// pergunta da `Disponibilidade` na engine 8.0.0 (ADR-0112) — um rato sozinho nao carrega as catorze posicoes.
const soToque = () => transportesPadrao({ gamepad: nunca, teclado: nunca, toque: sempre, rato: nunca });

describe('a raiz deste jogo mostra o aviso, e ela nao passa por `createGame`', () => {
  // Ler o fonte pelo mesmo motivo do `loop-crash`: `main.ts` arranca PixiJS, audio e o documento inteiro, e
  // nao entra num teste. Mas e' ele quem monta a engine a mao, e a alternativa a ler o fonte era nao aferir
  // nada — que foi o estado em que `input/transports` ficou sem consumidor nenhum.
  const FONTE = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');

  it('[Right] a raiz chama o aviso com as acoes do PROPRIO preset', () => {
    expect(FONTE).toContain('mostrarAvisoDeAlcance');
    expect(FONTE).toContain('presetActions(platformerPreset())');
  });

  it('[Interface] os nove lugares CABEM, e nao e essa a pergunta que reprova', () => {
    // Esta metade da crenca antiga continua VERDADEIRA e vale prende-la: o jogo foi desenhado para caber no
    // controle de tela, e `curtos` (os transportes com lugares a menos) fica vazio. O que mudou foi haver uma
    // SEGUNDA pergunta ao lado desta desde a engine 8.0.0 — contar lugares responde se as acoes cabem, nao se
    // a crianca consegue segura-las ao mesmo tempo.
    const acoes = presetActions(platformerPreset());
    expect(acoes).toHaveLength(9);
    expect(alcance(soToque(), acoes, 1).curtos).toEqual([]);
  });

  it('[Wrong] com as TRES posicoes da rota padrao, o toque nao alcanca — e diz qual e', () => {
    // A rota padrao deste jogo exige tres posicoes seguradas ao mesmo tempo: correr para a direita e saltar
    // sao `right` + `action1` + `action2`. O toque segura DUAS (`SEGURA_TOQUE`), entao reprova.
    //
    // ⚠️ O `2` esta escrito aqui como LITERAL de proposito. Le-lo de `SEGURA_TOQUE` faria a asserçao andar
    // junto com a engine: no dia em que o toque passasse a segurar tres, este caso continuaria verde a
    // dizer que reprova, e ninguem saberia que a barreira tinha desaparecido.
    const r = alcance(soToque(), presetActions(platformerPreset()), 3);
    expect(r.ok).toBe(false);
    expect(r.naoSeguram).toEqual([{ id: 'toque', holds: 2 }]);
  });

  it('[Right] com a trava do botao de correr, a exigencia cai para duas e o toque alcanca', () => {
    // E o que torna `#opt-togglerun` a RESPOSTA ao aviso, e nao um ajuste qualquer: com a corrida engatada
    // sobram direcao e pulo. Quem liga a trava sozinha no toque e' o `onTouchControlsShown` de `main.ts`.
    expect(alcance(soToque(), presetActions(platformerPreset()), 2).ok).toBe(true);
  });

  it('[Interface] a raiz declara TRES, e nao um numero qualquer', () => {
    // O terceiro argumento de `alcance` e' a declaracao deste jogo sobre a barreira que a crianca encontra.
    // Aferido no fonte pelo mesmo motivo do caso de cima: `main.ts` nao entra num teste.
    expect(FONTE).toMatch(/presetActions\(platformerPreset\(\)\),\s*3\)/);
  });
});
