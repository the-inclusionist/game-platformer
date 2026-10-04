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
  /**
   * TUDO O QUE ESTE ASSENTO CARREGA, para o canto superior direito — vazio com as mãos vazias (Dev, 03/10:
   * *«os itens "lixo" que o personagem estiver carregando devem aparecer a parte superior direita da tela»*,
   * e no mesmo dia *«desta forma é possível coletar vários e saber o que foi coletado»*).
   *
   * ⚠️ UMA LISTA E JÁ NÃO UM ITEM: a braçada chegou quando o Dev reprovou a trava de um de cada vez a jogar.
   * A ORDEM É A DA FILA — o primeiro da lista é o da frente, o próximo a ir para a lixeira.
   *
   * ⚠️ O VOCABULÁRIO NÃO MORA AQUI, e é de propósito: este módulo desenha «o que o assento carrega» e não
   * sabe o que é lixo. Quem resolve ícone e nome é a raiz de composição, que já é dona do `t()` e da cena de
   * reciclagem — assim um jogo que carregue outra coisa reusa a mesma caixa sem lhe mudar uma linha.
   */
  cargas: (i: number) => readonly { icone: string; rotulo: string }[];
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
      // 🔴 A CARGA VAI NO CANTO OPOSTO, e é por isso que ela é filha ABSOLUTA do `.vphud` em vez de mais um
      // item da coluna: as moedas e o poder empilham-se à esquerda, e empurrar um terceiro para a direita
      // dentro do mesmo fluxo pedia um `space-between` que desalinharia os dois de cima. Fora do fluxo, ela
      // ancora no retângulo desta tela (o `.vphud` é `position:absolute`) e nada do resto se mexe.
      const carga = doc.createElement('span'); carga.className = 'vphud-carga'; carga.hidden = true;
      // ⚠️ `role="list"` À MÃO porque o CSS tira o papel implícito. Nenhuma `<ul>` sobreviveria ao layout que
      // esta caixa precisa; e sem o papel, quem usa leitor de tela ouve ícones soltos em vez de «lista de 3».
      carga.setAttribute('role', 'list');
      // ⚠️ E A LISTA TEM NOME, senão quem lê com o ouvido ouve «lista de 3 itens» sem saber lista de quê.
      // Escrito na montagem porque não muda com o conteúdo — o que muda são os itens.
      carga.setAttribute('aria-label', ctx.t('hud.carregando'));
      hud.append(carga);
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
    const doc = paineis[0]?.ownerDocument;
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
      const carga = hud.querySelector<HTMLElement>('.vphud-carga');
      if (carga) {
        const cs = ctx.cargas(i);
        carga.hidden = cs.length === 0;
        // ⚠️ SÓ SE MEXE NO DOM QUANDO A BRAÇADA MUDA. Isto corre a cada quadro; reconstruir quatro nós
        // sessenta vezes por segundo é trabalho inútil, e pior, faria o leitor de tela reanunciar a lista
        // por cima de si mesma enquanto a criança anda.
        const chave = cs.map((c) => c.icone).join('');
        if (carga.dataset.bracada !== chave) {
          carga.dataset.bracada = chave;
          carga.replaceChildren();
          for (const c of cs) {
            const item = doc!.createElement('b');
            item.className = 'vphud-ico vphud-carga-item';
            item.textContent = c.icone;
            item.setAttribute('role', 'listitem');
            // 🔴 O NOME VAI SÓ AQUI, e a escolha mediu-se na tela em 03/10: com ele visível, «CAIXA DE
            // PAPELÃO» ocupava 295 dos 640 px do HUD — quase metade — ao lado do relógio, porque o tamanho
            // de letra é o da engine (`--hud-fs`, pedido do Dev) e não encolhe para caber. O ícone É o
            // objeto, que é o que ele pediu que aparecesse; e para quem lê com o ouvido nada se perdeu —
            // o atributo diz o nome inteiro, e o jogo já o fala ao apanhar (`sr.lixo.pegou`).
            item.setAttribute('aria-label', c.rotulo);
            carga.append(item);
          }
        }
      }
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
