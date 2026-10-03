// SPDX-License-Identifier: AGPL-3.0-or-later
// O AVISO DE ALCANCE, DO LADO DO JOGO (issue #112, ADR-0091).
//
// ⚠️ ESTE FICHEIRO VEIO DA ENGINE NA SEPARACAO DO CARTUCHO (issue #111), e o motivo da mudanca e' o que ele
// afere: as asseercoes falam do JOGO, nao da engine — o que este cartucho entrega ao aviso (o preset REAL,
// com OITO acoes, e a declaracao a pedir TRES seguradas) e que a raiz ja nao mostra um segundo.
//
// Com o cartucho fora da engine, nada disto era aferivel la', e falsificar o preset teria apagado exatamente
// o que estes casos provam. O TEXTO do aviso continua a ser gate da engine, onde sempre foi.
import { describe, it, expect } from 'vitest';
import { reach, defaultTransports } from '@the-inclusionist/engine/input/transports.js';
import { presetActions } from '@the-inclusionist/engine/core/actions.js';
import { platformerPreset } from '../app/js/game/platformer-preset.js';
import { createPlatformerDeclaration } from '../app/js/declaration/platformer-declaration.js';
import { DEPS_VIVAS } from '../app/js/declaration/live.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';


const nunca = () => false;
const sempre = () => true;
// So o toque disponivel: e' o aparelho da crianca que este ficheiro afere, e `rato` entrou como quarta
// pergunta da `Disponibilidade` na engine 8.0.0 (ADR-0112) — um rato sozinho nao carrega as catorze posicoes.
const soToque = () => defaultTransports({ gamepad: nunca, keyboard: nunca, touch: sempre, mouse: nunca });

describe('o aviso e da engine, e este cartucho entrega-lhe as duas respostas que ele pede', () => {
  // ⚠️ ATE 02/10 ESTE CASO PROVAVA O CONTRARIO: que `main.ts` chamava `showReachNotice` ele mesmo, porque a raiz
  // nao passava por `createGame`. Passou a passar, e o `createGame` mostra o aviso sozinho a partir do `preset` e
  // do `holdsAtOnce()` (`create-game.js:2007-2020`) — com a chamada da raiz eram DOIS avisos de id igual. Ler o
  // fonte continua a ser a unica forma de aferir a raiz, que arranca PixiJS e nao entra num teste.
  const RAIZ = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');
  const CARTUCHO = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf8');

  it('[Right] o cartucho entrega o PROPRIO preset nos ganchos, e a declaracao pede TRES', () => {
    expect(CARTUCHO).toMatch(/preset:\s*platformerPreset\(\)/);
    // TRES e literal: direcao + correr + pular, medido na fisica (ver `holdsAtOnce` na declaracao).
    expect(createPlatformerDeclaration(DEPS_VIVAS).holdsAtOnce()).toBe(3);
  });

  it('[Wrong] a raiz ja nao mostra um segundo aviso', () => {
    expect(RAIZ).not.toMatch(/showReachNotice\s*\(/);
  });

  // NOVE desde 03/10, e o literal muda porque o JOGO muda: eram oito desde que o `start` saiu do preset (a pausa
  // passou a ser da engine, que recusa um preset que o reclame), e o `rightTrigger` entrou para mover o canto do
  // minimapa a pedido do Dev. A pergunta deste caso continua a mesma.
  it('[Interface] os nove lugares CABEM, e nao e essa a pergunta que reprova', () => {
    // Esta metade da crenca antiga continua VERDADEIRA e vale prende-la: o jogo foi desenhado para caber no
    // controle de tela, e `curtos` (os transportes com lugares a menos) fica vazio. O que mudou foi haver uma
    // SEGUNDA pergunta ao lado desta desde a engine 8.0.0 — contar lugares responde se as acoes cabem, nao se
    // a crianca consegue segura-las ao mesmo tempo.
    const acoes = presetActions(platformerPreset());
    expect(acoes).toHaveLength(9);
    expect(reach(soToque(), acoes, 1).short).toEqual([]);
  });

  it('[Wrong] com as TRES posicoes da rota padrao, o toque nao alcanca — e diz qual e', () => {
    // A rota padrao deste jogo exige tres posicoes seguradas ao mesmo tempo: correr para a direita e saltar
    // sao `right` + `action1` + `action2`. O toque segura DUAS (`SEGURA_TOQUE`), entao reprova.
    //
    // ⚠️ O `2` esta escrito aqui como LITERAL de proposito. Le-lo de `SEGURA_TOQUE` faria a asserçao andar
    // junto com a engine: no dia em que o toque passasse a segurar tres, este caso continuaria verde a
    // dizer que reprova, e ninguem saberia que a barreira tinha desaparecido.
    const r = reach(soToque(), presetActions(platformerPreset()), 3);
    expect(r.ok).toBe(false);
    expect(r.cannotHold).toEqual([{ id: 'toque', holds: 2 }]);
  });

  it('[Right] com a trava do botao de correr, a exigencia cai para duas e o toque alcanca', () => {
    // E o que torna `#opt-togglerun` a RESPOSTA ao aviso, e nao um ajuste qualquer: com a corrida engatada
    // sobram direcao e pulo. Quem liga a trava sozinha no toque e' o `travaDeCorrerNoToque` de `main.ts`.
    expect(reach(soToque(), presetActions(platformerPreset()), 2).ok).toBe(true);
  });
  // (O caso «a raiz declara TRES» saiu: o TRES passou da chamada da raiz para `holdsAtOnce()` da declaracao, e o
  //  primeiro caso deste bloco afere-o la', no objeto, em vez de numa expressao regular sobre o fonte.)
});
