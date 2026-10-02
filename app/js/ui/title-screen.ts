// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * A TELA DE TÍTULO DESTE JOGO — a metade de `ui/shell` da engine que é dela, e só essa.
 *
 * 📌 A DECISÃO A DO DEV (02/10): a pausa é a da engine. O `initShell` que a raiz montava à mão fazia as duas coisas
 * — projetar a cena no documento E a tabela de ações do cartão de pausa por tela, que exigia os abridores dos
 * painéis (`openTypo`, `openAudio`…) que esta raiz já não tem: os painéis e o cartão são do `createGame`. Ficou o
 * que só este jogo sabe: o `#title-overlay` aparece no título e some fora dele, o som cala fora do jogo (GAG), o
 * foco vai para onde a cena pede, e a legenda dos botões do título descreve o aparelho da criança.
 *
 * ⚠️ O QUE SAIU DA PROJEÇÃO, e por que não faz falta: esconder o pad de toque (a política é da engine — some com o
 * cartão ou qualquer overlay aberto, e com mais de um assento), o `aria-pressed` do `#touch-start` (o pad e a pílula
 * START são da engine) e o cursor do cartão (o `engine.pause.show` põe-no no item 1).
 *
 * As partes PURAS (`phaseView`, as linhas da legenda, os glifos do pad) continuam da engine e vêm por import — são
 * elas que têm teste no repositório dela.
 */
import { phaseView, legendRow1, legendRow2, legendHtml, padActionGlyphs, touchActionGlyphs, pickLegendPad }
  from '@the-inclusionist/engine/ui/shell.js';
import { padLayoutFromId } from '@the-inclusionist/engine/input/touch.js';
import type { SceneFacts } from '@the-inclusionist/engine/core/scenes.js';
import type { Translate } from '@the-inclusionist/engine/core/i18n.js';
import type { KeyScheme } from '@the-inclusionist/engine/core/entity.js';
import type { PadLike, PadMap } from '@the-inclusionist/engine/input/pad-reading.js';

export interface TitleScreenCtx {
  t: Translate;
  $: <T extends Element = HTMLElement>(sel: string) => T | null;
  sceneFacts: () => SceneFacts;
  /** GAG: fora do jogo (título e pausa) todo o som do jogo cala, e volta ao retomar. */
  setMasterMuted: (m: boolean) => void;
  getNumPlayers: () => number;
  /** O pad do Jogador 1, se ele tem um (`-1` = nenhum). */
  padOfPlayer1: () => number;
  getGamepads: () => readonly (PadLike | null)[];
  /** O mapa gravado pelo assistente para um pad fora do padrão. */
  padMapFor: (id: string) => PadMap | null;
  /** O esquema de teclas do Jogador 1, com o remapeamento dele. */
  keysOfPlayer1: () => KeyScheme;
  keyName: (code: string) => string;
  /** A palavra CURTA da posição, do preset deste jogo; `null` = o jogo não a usa. */
  shortLabel: (action: string) => string | null;
  /** O pad de toque está em uso (a engine marca `body.touch-mode`). */
  isTouchMode: () => boolean;
}

export interface TitleScreen {
  /** Projeta a cena do topo no documento. Chamada pelas cenas DEPOIS de cada troca. */
  applyScene(): void;
  /** As duas linhas da legenda do título, com o que está configurado para o Jogador 1. */
  updateTitleLegend(): void;
}

export function createTitleScreen(ctx: TitleScreenCtx): TitleScreen {
  const { t } = ctx;

  function legendaDoTeclado(): [string, string] {
    const m = ctx.keysOfPlayer1();
    const K = (a: string): string => ctx.keyName((m[a as keyof KeyScheme] ?? [])[0] ?? '?');
    // 'Enter' é o START por padrão da engine (`input/default-bindings`) — a tecla que abre a pausa rápida
    return [legendRow1(t, `${K('up')} ${K('left')} ${K('down')} ${K('right')}`, 'Enter'),
      legendRow2({ action2: [K('action2'), null], action3: [K('action3'), null], action1: [K('action1'), null], action4: [K('action4'), null] }, ctx.shortLabel)];
  }

  function updateTitleLegend(): void {
    const el = ctx.$<HTMLElement>('#title-legend');
    if (!el) return;
    let linhas: [string, string];
    if (ctx.isTouchMode()) {
      linhas = [legendRow1(t, '✜', 'START'), legendRow2(touchActionGlyphs(), ctx.shortLabel)];
    } else {
      const gp = pickLegendPad(ctx.getGamepads(), ctx.padOfPlayer1());
      if (gp) {
        const layout = gp.mapping === 'standard' ? padLayoutFromId(gp.id) : 'generic';
        const custom = gp.mapping !== 'standard' ? ctx.padMapFor(gp.id) : null;
        linhas = [legendRow1(t, '✜', 'START'), legendRow2(padActionGlyphs(layout, custom), ctx.shortLabel)];
      } else linhas = legendaDoTeclado();
    }
    el.innerHTML = legendHtml(linhas[0], linhas[1]);
    const espera = ctx.$<HTMLElement>('#title-wait');
    if (espera) espera.hidden = ctx.getNumPlayers() <= 1; // multi: «aguarde o Jogador 1 escolher»
  }

  function applyScene(): void {
    const v = phaseView(ctx.sceneFacts());
    const titulo = ctx.$<HTMLElement>('#title-overlay');
    if (titulo) titulo.hidden = v.titleOverlayHidden;
    ctx.setMasterMuted(v.masterMuted);
    if (v.focus === 'game-region') ctx.$<HTMLElement>('#game-region')?.focus();
    else if (v.focus === 'title-button') { updateTitleLegend(); ctx.$<HTMLElement>('#tm-main button')?.focus(); }
    // 'pause-menu': o cartão é da engine, e o `engine.pause.show` já pôs o cursor no item 1 (ADR-0158)
  }

  return { applyScene, updateTitleLegend };
}
