// SPDX-License-Identifier: AGPL-3.0-or-later
// A TELA DE AJUDA LISTA AS POSICOES QUE ESTE JOGO DECLARA (engine#125, seguimento do lado do cartucho).
//
// ========================= O QUE ISTO CONSERTA =========================
// O `openHelp` montava a tabela a partir do `ACT_LABEL` da engine: OITO posicoes fixas, com as palavras
// deste jogo a viver dentro do motor. Duas consequencias, e nenhuma e de estilo:
//
//   · o vocabulario passou a CATORZE (ADR-0085). Uma tabela de oito mostra a crianca um controle que nao e
//     o dela — faltam seis linhas, e nada aponta a falta;
//   · era o ULTIMO leitor daquele `ACT_LABEL`. A issue #125 da engine mede que remover a tabela de la
//     depende desta linha, e por isso ela e «migracao e nao limpeza». Esta e a migracao.
//
// ⚠️ E o que se afere aqui e a MOLDAGEM, nao o desenho: o `openHelp` continua a ser funcao local do `main.ts`
// e nao tem teste. Foi por isso que a parte que importa saiu para um modulo proprio — o molde do
// `ui/reach-notice` da engine, que separa o texto (aferivel sem navegador) da montagem do DOM.
//
// MUTACOES CONFERIDAS (no fim do ficheiro).
import { describe, it, expect } from 'vitest';
import { linhasDaAjuda } from '../app/js/game/help-lines.js';

const ACOES = [
  { acao: 'left', rotulo: 'Esquerda' },
  { acao: 'action1', rotulo: 'Correr' },
  { acao: 'action2', rotulo: 'Pular' },
];

describe('game/help-lines — a ajuda lista o que este jogo declara', () => {
  it('[Right] uma linha por acao declarada, na ordem do preset, com as teclas do esquema', () => {
    const linhas = linhasDaAjuda(ACOES, { left: ['KeyA'], action1: ['KeyU'], action2: ['KeyJ', 'Space'] });
    expect(linhas.map((l) => l.rotulo)).toEqual(['Esquerda', 'Correr', 'Pular']);
    expect(linhas[2].teclas).toEqual(['KeyJ', 'Space']);
  });

  it('⚠️ [Interface] o numero de linhas segue o PRESET, e nao uma tabela de oito', () => {
    // O defeito em uma assercao: com o `ACT_LABEL` a tabela tinha sempre oito linhas, dissesse o jogo o que
    // dissesse. Aqui um jogo de tres acoes mostra tres, e um de catorze mostraria catorze.
    expect(linhasDaAjuda(ACOES, {})).toHaveLength(3);
    const catorze = Array.from({ length: 14 }, (_, i) => ({ acao: 'a' + i, rotulo: 'A' + i }));
    expect(linhasDaAjuda(catorze, {})).toHaveLength(14);
  });

  it('⚠️ [Zero] posicao SEM tecla fica na tabela com lista vazia — sumir com ela seria mentir', () => {
    // A crianca que procura «correr» na ajuda precisa de saber que a acao existe e nao tem tecla. Uma linha
    // que desaparece faz a acao parecer inexistente, que e a mentira que o `null` do KeyScheme evita.
    const linhas = linhasDaAjuda(ACOES, { left: ['KeyA'], action1: null });
    expect(linhas).toHaveLength(3);
    expect(linhas[1]).toEqual({ rotulo: 'Correr', teclas: [] });
    expect(linhas[2].teclas, 'posicao ausente do esquema tambem e lista vazia').toEqual([]);
  });

  it('[Boundary] devolve DADO cru: nem escapa nem traduz o `code` da tecla', () => {
    // Quem traduz `KeyA` para «A» e o `keyName` da engine, no desenho; quem escapa e o `escaparHtml`, ali
    // tambem. Se esta funcao fizesse qualquer uma das duas, o teste dela passaria a depender da engine.
    const linhas = linhasDaAjuda([{ acao: 'x', rotulo: '<b>cru</b>' }], { x: ['KeyA'] });
    expect(linhas[0].rotulo).toBe('<b>cru</b>');
    expect(linhas[0].teclas).toEqual(['KeyA']);
  });

  it('[Zero] sem acoes declaradas, tabela vazia — e nao um erro', () => {
    expect(linhasDaAjuda([], { left: ['KeyA'] })).toEqual([]);
  });

  it('⚠️ [Interface] a lista devolvida nao partilha o array do esquema', () => {
    // `teclas` sai como copia: se saisse por referencia, o desenho da ajuda poderia reordenar o esquema vivo
    // do jogador sem que nada apontasse a causa.
    const esquema = { left: ['KeyA'] };
    const linhas = linhasDaAjuda([{ acao: 'left', rotulo: 'Esquerda' }], esquema);
    linhas[0].teclas.push?.('KeyB');
    expect(esquema.left, 'o esquema vivo foi alterado pela tela de ajuda').toEqual(['KeyA']);
  });
});

// ========================= MUTACOES CONFERIDAS =========================
//   · devolvendo `esquema[acao] ?? []` por referencia (`(esquema[acao] ?? [])` sem espalhar) → "[Interface] a
//     lista devolvida nao partilha o array" reprova: o `push` chega ao esquema vivo do jogador.
//   · filtrando as posicoes sem tecla (`.filter(l => l.teclas.length)`) → "[Zero] posicao SEM tecla fica na
//     tabela" reprova com duas linhas em vez de tres. E a acao a desaparecer da ajuda.
//   · voltando `openHelp` a `Object.keys(ACT_LABEL)` → nenhum caso DAQUI reprova, e vale dizer porque: o
//     `openHelp` e funcao local do `main.ts`, sem teste. ⚠️ O que este ficheiro afere e a moldagem; a ligacao
//     entre ela e a tela continua sem gate neste repositorio, e o `tsc` e a unica coisa que a segura (o
//     `ACT_LABEL` deixou de ser importado, entao repo-la exigiria repor o import).
