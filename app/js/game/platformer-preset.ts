// SPDX-License-Identifier: AGPL-3.0-or-later
// game/platformer-preset — AS PALAVRAS DESTE JOGO. O outro lado do corte que o Dev nomeou em 2026-09-06.
//
// ========================= POR QUE ISTO VIVE EM `game/` =========================
// A engine conhece POSIÇÕES (`core/actions.ts`) e como cada transporte as alcança. Qual PALAVRA está em qual
// posição é do jogo, e este é o jogo da plataforma. Um quiz declara «Confirmar» onde aqui se lê «Pular»; um
// jogo de tabuleiro declara «Colocar peça».
//
// ⚠️ E É POR ISSO QUE ESTE FICHEIRO NÃO PODE ESTAR EM `input/` NEM EM `ui/`: `tests/engine-boundary` proíbe a
// engine importar de `game/`, o que obriga o preset a ser INJETADO pela raiz de composição em vez de
// importado. A proibição não é burocracia — é ela que garante que o pacote publicado no npm não leva a
// plataforma dentro.
//
// ========================= O MAPEAMENTO É O DO ADR-0086 §2 =========================
// `action1` correr · `action2` pular · `action3` especial · `action4` trocar poder. Foi o Dev quem corrigiu a
// tabela do ADR-0074, e a correção é a leitura CONSERVADORA: medida contra `input/keyboard.ts` e
// `input/gamepad.ts`, ela deixa cada verbo na tecla e no botão que já ocupava. Zero de quatro se movem.

import type { ActionPreset } from '@the-inclusionist/engine/core/actions.js';

/**
 * O vocabulário da plataforma, resolvido no IDIOMA VIGENTE a cada chamada.
 *
 * ⚠️ É FUNÇÃO E NÃO CONSTANTE, e a razão é a mesma que `input/devices` já tinha escrito para as suas chaves:
 * uma `const` de módulo congela as palavras no idioma que estava carregado quando o módulo foi importado. A
 * criança troca de idioma no menu e o assistente de controle continuaria a dizer «PULAR» em português.
 */
// ⚠️ O PRESET DECLARA CHAVES, E JA NAO PALAVRAS (`ActionPreset = Record<Action, ActionKeys>`, ADR-0232 D3).
// Ele nao recebe tradutor nenhum — e essa e' a correcao: uma palavra resolvida aqui ficaria na lingua em
// que foi resolvida, e a linha do menu deixaria de seguir a troca de idioma. Quem resolve e' a engine, a
// cada desenho, contra `createGame({ dictionaries })`.
export function platformerPreset(): ActionPreset {
  return {
    up: { labelKey: 'act.up' },
    down: { labelKey: 'act.down' },
    left: { labelKey: 'act.left' },
    right: { labelKey: 'act.right' },

    // ⚠️ AS QUATRO AÇÕES TÊM DUAS PALAVRAS, e não é redundância: `act.*` é a da lista de remapeamento
    // («Correr / interagir») e `legend.*` é a da legenda do título («correr»), que fica debaixo de um glifo
    // numa fileira de quatro e não tem largura para a longa. A distinção já existia no dicionário; o que
    // mudou é que ela atravessa a fronteira COM as palavras, em vez de a engine ter de a conhecer.
    action1: { labelKey: 'act.run', shortKey: 'legend.run' },
    action2: { labelKey: 'act.jump', shortKey: 'legend.jump' },
    action3: { labelKey: 'act.especial', shortKey: 'legend.especial' },
    action4: { labelKey: 'act.swap', shortKey: 'legend.swap' },
    // 🔴 `start` SAIU, e não por esquecimento: a engine 11 é DONA da pausa (decisão (A) do Dev, 02/10) e o
    // `createGame` RECUSA um preset que reclame `start` ou `select` — o jogo não arrancava. O START abre a pausa
    // rápida e o SELECT o cartão em qualquer transporte, e quem os rotula é a engine.
    // ⚠️ `select` e os quatro ombros/gatilhos NÃO são declarados, e a ausência é a declaração: esta
    // plataforma não os usa. O assistente de controle não vai perguntar por eles, o que é exatamente o que
    // `labellerFrom` devolver `null` significa — uma ausência vira menos um passo, nunca um passo mudo.
  };
}
