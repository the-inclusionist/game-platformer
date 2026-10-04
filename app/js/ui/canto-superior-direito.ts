// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * QUEM ARRUMA O CANTO SUPERIOR DIREITO — os botões R1/R2 do pad, o minimapa e os itens carregados.
 *
 * ========================= O ARRANJO, NAS PALAVRAS E NO PRINT DO DEV (03/10) =========================
 *
 *      ┌──────────────────────────────┐
 *      │                 [mapa ] [R2] │   os dois botões encostados à direita, em coluna;
 *      │                 [     ] [R1] │   o mapa À ESQUERDA deles, encostado ao alto
 *      │                         [🥫] │   os itens POR BAIXO dos botões
 *      │                         [📦] │
 *
 * *«Os itens devem aparecer abaixo dos botões R2 e R1 e, por consequência, abaixo do mapa quando não houverem
 * botões visíveis.»*
 *
 * 🔴 ISTO CORRIGE A MINHA PRIMEIRA LEITURA, e vale registar o erro porque ele foi de interpretação e não de
 * código. Ele tinha escrito *«no canto superior direito, o mapa deve ficar ABAIXO dos botões R1 e R2»* e eu
 * desci o mapa para debaixo deles. O print mostra o contrário: o mapa fica EM CIMA, ao LADO dos botões, e
 * quem desce são os itens. Faz sentido à vista — o mapa é largo e baixo, a coluna de botões é estreita e
 * alta: lado a lado partilham a mesma faixa de altura, empilhados deixam meio canto vazio.
 *
 * ========================= POR QUE ISTO TEM DE SER MEDIDO =========================
 * O minimapa é desenhado DENTRO do canvas, no mundo lógico de 320×180 (`render/minimap`); os botões e os
 * ícones são DOM por cima do canvas. Não estão na mesma camada, então nenhum `z-index` os arbitra — quem
 * ficar no mesmo lugar fica simplesmente escondido. E as medidas não são constantes: a altura de um ombro
 * segue `--alvo-min`, o tamanho mínimo de alvo que a criança escolhe nos ajustes.
 *
 * ========================= AS DUAS RESPOSTAS QUE ELE DÁ =========================
 *  · ao MAPA, em pixels lógicos: quanto a coluna de ombros ocupa à direita, para ele se encostar à esquerda
 *    dela (`render/minimap.setMinimapRecuoDaDireita`);
 *  · aos ITENS, em pixels de CSS, por uma variável que o CSS lê: onde acaba o que está por cima deles —
 *    a coluna, se houver; senão o mapa, quando é ele que está no alto daquele canto.
 */
import { LOGICAL_W, LOGICAL_H } from '@the-inclusionist/engine/core/constants.js';

/** A variável que o `.vphud-carga` lê (`ui/seat-hud.css`). Escrita na região, não no documento. */
export const VAR_OCUPADO = '--canto-dir-ocupado';

/** O respiro entre o que ocupa o canto e o que vem a seguir, quando a engine não declara o seu. */
const FOLGA_PADRAO = 8;

export interface CantoSuperiorDireitoCtx {
  $: <T extends Element = HTMLElement>(sel: string) => T | null;
  /** Onde o mapa acaba, em baixo, se estiver no canto superior direito — `null` noutro canto. */
  fundoDoMapa: () => number | null;
  /** Quem recebe o recuo lateral do mapa, em pixels LÓGICOS. */
  recuarMapa: (logicos: number) => void;
}

export interface CantoSuperiorDireito {
  /** Avalia e escreve. Chamado uma vez por quadro pela raiz. */
  tick(): void;
}

export function criarCantoSuperiorDireito(ctx: CantoSuperiorDireitoCtx): CantoSuperiorDireito {
  const raiz = ctx.$<HTMLElement>('#game-region');
  if (!raiz) return { tick: () => {} }; // noutro documento (os testes) não há o que medir
  const regiao = raiz;

  /**
   * O que já foi escrito — para o caminho comum não tocar no estilo nem no grafo de cena.
   *
   * ⚠️ NASCEM EM `-1`, QUE NENHUMA MEDIDA PRODUZ, e não em `0`: zero é uma resposta legítima («o canto está
   * vazio»), e começar nele faria o primeiro quadro CALAR-SE em vez de a dizer. Calar-se parece inofensivo
   * — os dois lados já estão a zero — mas deixa o módulo sem saber se alguma vez publicou, e é a diferença
   * entre «ainda não medi» e «medi e deu zero».
   */
  let ultimoRecuo = -1;
  let ultimoOcupado = -1;

  /** A caixa da coluna de ombros, ou `null` quando ela não está à vista. */
  function coluna(): DOMRect | null {
    const el = ctx.$<HTMLElement>('.touch-ombros--dir');
    // Ausente, desligada do documento ou de caixa nula (`display:none` com o pad oculto): não ocupa nada.
    // ⚠️ A ALTURA É QUE DECIDE, e não o `bottom`: um elemento escondido devolve um retângulo todo a zeros, e
    // numa região que começa acima da janela (`top` negativo) isso daria ocupação vinda de um botão ausente.
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    return r.height > 0 ? r : null;
  }

  return {
    tick(): void {
      const reg = regiao.getBoundingClientRect();
      if (reg.height <= 0 || reg.width <= 0) return; // antes do primeiro layout: nada a afirmar
      const col = coluna();

      // ── ao MAPA: a largura da coluna, mais a folga, em pixels lógicos ────────────────────────────────
      const recuo = col ? Math.ceil(((col.width + FOLGA_PADRAO) * LOGICAL_W) / reg.width) : 0;
      if (recuo !== ultimoRecuo) { ultimoRecuo = recuo; ctx.recuarMapa(recuo); }

      // ── aos ITENS: o fundo do que está por cima deles ─────────────────────────────────────────────────
      // 📌 A ORDEM É A DO DEV, e não um `max`: os botões, SE houver; senão o mapa. Com os dois presentes o
      // mapa está ao LADO dos botões e não por cima dos ícones, então não lhes manda nada.
      let ocupado = 0;
      if (col) ocupado = col.bottom - reg.top + FOLGA_PADRAO;
      else {
        const fundo = ctx.fundoDoMapa();
        if (fundo !== null) ocupado = ((fundo + FOLGA_PADRAO / 2) * reg.height) / LOGICAL_H;
      }
      const px = Math.max(0, Math.round(ocupado));
      if (px !== ultimoOcupado) {
        ultimoOcupado = px;
        regiao.style.setProperty(VAR_OCUPADO, `${px}px`);
      }
    },
  };
}
