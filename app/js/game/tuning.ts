// SPDX-License-Identifier: AGPL-3.0-or-later
// game/tuning — A AFINAÇÃO DESTE JOGO, e o objetivo dele. Vieram da engine em 2026-09-07.
//
// ========================= POR QUE MUDARAM DE CASA =========================
// Estavam em `core/constants.ts` da engine, e a issue #63 (etapa B) pergunta há semanas o que ali é motor e
// o que é ESTE jogo. A etapa C — o segundo consumidor, um quiz sem física e sem tiles — respondeu: catorze
// achados, e nenhum deles reclama estes dois para a engine.
//
// ⚠️ O SINAL MAIS CLARO ERA A CONTAGEM DE IMPORTADORES: `TUNE` e `COIN_TARGET` tinham ZERO importadores
// dentro da engine, e todos os que existiam estavam aqui, do outro lado da fronteira do pacote. Não eram
// código morto — eram a superfície pública que este cartucho consumia. Uma engine que exporta a gravidade e
// a meta de moedas está a decidir que todo jogo é uma plataforma de coletar coisas.
//
// `TUNE` é gravidade, velocidade de nado, curso do trampolim: a física DESTE jogo. Um quiz não tem gravidade;
// um jogo de tabuleiro não tem trampolim. `COIN_TARGET` é quantas moedas fazem uma fase — o objetivo, que é
// conteúdo e não motor.
//
// O que FICOU na engine, e é a fronteira que a mudança desenha: `LOGICAL_W`/`LOGICAL_H`/`TILE` (a resolução
// e a grade, que qualquer jogo 2D em pixel usa) e `TILE_TYPES` com os predicados que o `core/collision` lê —
// porque a engine RENDERIZA tiles (`render/minimap`, `render/world-tex`, `render/high-contrast` leem-nos).

/**
 * Os valores de física deste jogo, afinados pelo Dev. Objeto MUTÁVEL de propósito: o painel `?debug=true`
 * ajusta propriedades ao vivo. Nunca reatribuído, então `import` de const funciona.
 */
export const TUNE = {
  jumpVel: 3.5, waterJump: 3.5, waterJumpRun: 4, waterStrokeFrames: 30,
  trampBase: 5, trampMax: 8, gravity: 0.15, hWalk: 2, hRun: 3, climbSpeed: 1.5,
  maxFall: 7, waterMaxFall: 3, hTurbo: 4.5, ultraJumpVel: 10, // E12: power-ups (valores do José)
};

/** Quantas moedas fecham uma fase. É o OBJETIVO — conteúdo deste jogo, não regra de motor. */
export const COIN_TARGET = 10;
