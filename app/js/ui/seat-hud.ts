// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * O HUD QUE A ENGINE NÃO DESENHA — as telas 2 a 4 e o poder de cada uma.
 *
 * 📌 A DECISÃO A DO DEV (02/10): a raiz do `createGame` desenha UMA tela — um cartão de pausa, uma barra, um HUD,
 * do assento 0. As moedas do assento 0 são a faixa `mission` da engine (o gancho `hud` em `src/index.ts`); as dos
 * assentos 1–3 continuam deste jogo, cada uma na própria tela. E o PODER de todos os assentos também: a faixa
 * `power` da engine mostra números, e o poder aqui é um rótulo («🐇 Super pulo»), que número nenhum diz.
 *
 * ⚠️ É o que `ui/hud` da engine desenhava por tela MENOS o painel de pausa e a barra rápida — aquele módulo exige
 * `buildScreenPause`/`buildQuickBar`, e os dois morreram com a pausa por tela. As funções PURAS dele (grade,
 * retângulo, a vista de uma linha com o rótulo do contador) continuam publicadas e vêm por import: a aritmética da grade é a
 * mesma do pipeline de render, e uma cópia dela aqui derivaria em silêncio.
 *
 * 📌 A `.player-screen` FICA, com as mesmas classes, porque é ela que hospeda o desafio multi-tela
 * (`getScreen(i)`, lido por `game/quiz`) e o selo «aperte para entrar» (`showWaitingBadge`), e porque o CSS da
 * engine ainda as posiciona.
 */
import './seat-hud.css';
import { screenRect, screenCount, hudRowView, type HudPlayer } from '@the-inclusionist/engine/ui/hud.js';
import type { Objective } from '@the-inclusionist/engine/core/contract.js';
import type { Translate } from '@the-inclusionist/engine/core/i18n.js';

export interface SeatHudCtx {
  t: Translate;
  /** O `#game-hud` deste cartucho. */
  $: <T extends Element = HTMLElement>(sel: string) => T | null;
  getPlayers: () => readonly HudPlayer[];
  getNumPlayers: () => number;
  /** O objetivo do assento `i` — lido a cada quadro, para o idioma de agora. */
  objective: (i: number) => Objective;
  /** O ícone do objetivo (🪙). */
  icon: string;
  powerShort: (kind: string) => string;
}

export interface SeatHud {
  buildGameHud(): void;
  updateGameHud(): void;
  getScreen(i: number): HTMLElement | null;
  showWaitingBadge(i: number): void;
  clearWaitingBadge(i: number): void;
}

/**
 * Os assentos cujas moedas este jogo desenha: TODOS.
 *
 * 🔴 ERA `assento > 0`, e o 0 ficava de fora porque a faixa `mission` da engine o cobria. O Dev em 03/10:
 * *«Número de moedas não deveria aparecer com o fundo preto atrás, é HUD do jogo, não da engine.»* Com
 * `hud: []` no cartucho essa faixa não nasce, e sem esta mudança o jogador 1 ficaria sem contador nenhum.
 *
 * ⚠️ AS DUAS LINHAS ANDAM JUNTAS: tirar o `hud` do cartucho sem abrir o 0 aqui apaga o contador de quem
 * joga sozinho — que é quase toda a gente.
 */
export const desenhaMoedas = (_assento: number): boolean => true;

export function createSeatHud(ctx: SeatHudCtx): SeatHud {
  let telas: HTMLElement[] = [];
  let paineis: HTMLElement[] = [];
  let abandonos: HTMLElement[] = [];

  function buildGameHud(): void {
    const raiz = ctx.$<HTMLElement>('#game-hud');
    if (!raiz) return;
    raiz.replaceChildren();
    telas = []; paineis = []; abandonos = [];
    const doc = raiz.ownerDocument;
    const n = ctx.getNumPlayers();
    for (let i = 0; i < screenCount(n); i++) {
      const r = screenRect(i, n);
      const tela = doc.createElement('div');
      tela.className = 'player-screen';
      tela.dataset.player = String(i);
      Object.assign(tela.style, { left: r.L, top: r.T, width: r.W, height: r.H });
      // ⚠️ A subcamada de EXPERIÊNCIA continua irmã do que dá acesso (issue #82): a empatia a degrada, e o selo de
      // espera — que diz à criança COMO entrar — fica fora dela, como antes.
      const exp = doc.createElement('div');
      exp.className = 'screen-exp';
      const hud = doc.createElement('div');
      hud.className = 'vphud';
      if (desenhaMoedas(i)) {
        // Por nós e não por `innerHTML`: o nome do objetivo é texto do jogo e entra num ATRIBUTO (issue #106).
        const obj = doc.createElement('span'); obj.className = 'vphud-obj';
        const ico = doc.createElement('b'); ico.className = 'vphud-ico'; ico.textContent = ctx.icon;
        const tem = doc.createElement('b'); tem.className = 'vphud-n';
        const precisa = doc.createElement('span'); precisa.className = 'vphud-need';
        obj.append(ico, ' ', tem, ' / ', precisa);
        hud.append(obj);
      }
      const poder = doc.createElement('span'); poder.className = 'vphud-power';
      const pIco = doc.createElement('b'); pIco.className = 'vphud-ico'; pIco.textContent = '✨';
      const pw = doc.createElement('span'); pw.className = 'vphud-pw'; pw.textContent = '—';
      poder.append(pIco, ' ', pw);
      hud.append(poder);
      exp.append(hud);
      // 📌 O texto do selo é o MESMO literal que `ui/hud` da engine escrevia (pt-BR cru lá também): não é regressão,
      // e traduzi-lo pede uma chave nova que nenhuma frase deste jogo tem hoje.
      const quit = doc.createElement('div');
      quit.className = 'vphud-quit'; quit.hidden = true; quit.textContent = 'Jogo abandonado';
      exp.append(quit);
      tela.append(exp);
      raiz.append(tela);
      telas.push(tela); paineis.push(hud); abandonos.push(quit);
    }
    updateGameHud();
  }

  function updateGameHud(): void {
    const ps = ctx.getPlayers();
    for (let i = 0; i < paineis.length; i++) {
      const p = ps[i];
      if (!p) continue;
      const hud = paineis[i];
      const o = ctx.objective(i);
      const v = hudRowView(ctx.t, p, ctx.powerShort, o);
      const obj = hud.querySelector('.vphud-obj');
      if (obj) {
        const tem = obj.querySelector('.vphud-n'); if (tem) tem.textContent = v.have;
        const precisa = obj.querySelector('.vphud-need'); if (precisa) precisa.textContent = String(o.need);
        // o rótulo acompanha o número: escrito só na montagem, o leitor repetiria «0 de 10» a partida inteira
        obj.setAttribute('aria-label', v.label);
      }
      const pw = hud.querySelector('.vphud-pw'); if (pw) pw.textContent = v.power;
      if (abandonos[i]) abandonos[i].hidden = v.quitHidden;
      hud.style.visibility = v.visibility; // quem saiu: tela preta com o selo de abandono
    }
  }

  const getScreen = (i: number): HTMLElement | null => telas[i] ?? null;

  function showWaitingBadge(i: number): void {
    const tela = telas[i];
    if (!tela || tela.querySelector('.vp-wait')) return;
    // as MESMAS classes e a MESMA chave do `waitBadgeHtml` da engine, mas por nó: texto não passa por `innerHTML`
    const selo = tela.ownerDocument.createElement('div');
    selo.className = 'vphud-quit vp-wait';
    selo.textContent = ctx.t('hud.waitBadge', { n: i + 1 });
    tela.append(selo);
  }

  function clearWaitingBadge(i: number): void {
    telas[i]?.querySelector('.vp-wait')?.remove();
  }

  return { buildGameHud, updateGameHud, getScreen, showWaitingBadge, clearWaitingBadge };
}
