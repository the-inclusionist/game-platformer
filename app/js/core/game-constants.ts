// SPDX-License-Identifier: AGPL-3.0-or-later
// 🔴 VEIO DA ENGINE NA F12 (ADR-0228, 2026-09-23). Três constantes que descrevem ESTE jogo: as cadências de
// animação de uma personagem que anda, corre, nada, se agarra e escala; os multiplicadores do Modo Fácil; e a
// cor de cada tipo de tile.
//
// 📌 `TILE_TYPES`, `isHazard` e `isTrampoline` NÃO vieram, e a razão é medida: o `isSolidType` da engine
// torna perigo e trampolim SÓLIDOS no modo cego e no de cadeira de rodas — «a criança em cadeira de rodas não
// cai no fosso» — logo são acessibilidade, e a engine continua a lê-las.
//
// ⚠️ O código deste repositório ainda as lê do PACOTE, porque continua preso à engine 9.0.0, que as publica.
// Quando ele subir de versão, é este ficheiro que passa a responder.

// E15: cadência de animação (ticks por quadro) — regulável ao vivo no painel ?debug=true. Como TUNE, é objeto
// mutável (o debug ajusta propriedades) mas NUNCA reatribuído → import const funciona. andar 6; correr 8 (~8fps,
// pedido do José); idle 20; swim 24; cling 10; escada 8; flavor ~6s.
export const ANIM = { walkHold: 6, runHold: 8, idleHold: 20, swimHold: 24, clingHold: 10, climbHold: 8, flavorDelay: 360 };

// Modo FÁCIL (acessibilidade motora): multiplicadores que suavizam a física. grav ×2/3, pulo ×8/7, velocidade
// ×0,7, zona-morta do pad ×4, queda lenta ×1,4, trampolim ×3,4. Lido pela física (game.js) e por jumpVel (player).
export const EASY = { grav: 2 / 3, jump: 8 / 7, speed: 0.7, pad: 4, slowFall: 1.4, tramp: 3.4 };

export const TILE_COLOR = {
  0:'#0a0a14',1:'#241f38',2:'#6b6480',3:'#2f6fae',4:'#8a5a2b',5:'#34e29b',6:'#3a3a46',
  7:'#7fdcff',8:'#ffd23f',9:'#ff5b3a',10:'#9a8a6f',11:'#ffe06a',12:'#3a86ff',13:'#8a5cff',14:'#ff6fae',
};
