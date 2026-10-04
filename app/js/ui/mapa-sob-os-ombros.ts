// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * O MAPA FICA ABAIXO DOS BOTÕES R1 E R2 — regra do Dev em 03/10: *«no canto superior direito, o mapa deve
 * ficar ABAIXO dos botões R1 e R2»*.
 *
 * 🔴 O PROBLEMA QUE ELA RESOLVE, e porque é preciso um módulo para ele. O minimapa é desenhado DENTRO do
 * canvas, no mundo lógico de 320×180 (`render/minimap`); os ombros são `<button>` do pad de toque da engine,
 * DOM por cima do canvas. Os dois não se veem: nenhum `z-index` os arbitra, porque nem estão na mesma
 * camada, e no canto superior direito o mapa fica simplesmente escondido debaixo dos botões.
 *
 * 📌 E POR QUE SÓ AGORA: até 03/10 este jogo não declarava gatilho nenhum, e o pad não desenhava coluna de
 * ombros. O R2 (mover o mapa) e o R1 (sonar) criaram a coluna e, com ela, a colisão.
 *
 * ⚠️ A MEDIDA É LIDA, NÃO ESTIMADA. A altura de um ombro segue `--alvo-min`, o tamanho mínimo de alvo que a
 * criança escolhe nos ajustes, e a coluna tem um ou dois botões conforme o jogo declare um gatilho ou dois.
 * Um número meu acertaria hoje e erraria em silêncio na primeira dessas duas mudanças.
 */
import { LOGICAL_H } from '@the-inclusionist/engine/core/constants.js';

/**
 * O QUE JÁ OCUPA O CANTO SUPERIOR DIREITO, de cima para baixo — e por isso são DOIS e não um.
 *
 * 🔴 MEDIDO NO NAVEGADOR EM 03/10, com o conserto dos ombros já a funcionar: o mapa desceu abaixo do R1, e
 * os ícones da braçada — que moram no mesmo canto desde a mesma manhã — passaram a cair por cima da borda
 * direita dele. É o mesmo defeito com outro nome, e seria absurdo consertar um e deixar o outro. O que o
 * módulo responde não é «onde acabam os ombros», é «onde acaba o que já está lá».
 *
 * ⚠️ E NÃO HÁ CIRCULARIDADE: a caixa da braçada já se posiciona abaixo dos ombros, por CSS
 * (`--shoulders-right-reach` em `ui/seat-hud.css`); o mapa é que lê as duas. Nenhuma delas lê o mapa.
 */
const OCUPAM_O_CANTO = ['.touch-ombros--dir', '.vphud-carga'] as const;

export interface MapaSobOsOmbrosCtx {
  $: <T extends Element = HTMLElement>(sel: string) => T | null;
  /** Quem recebe o recuo, em pixels LÓGICOS (`render/minimap.setMinimapRecuoDeTopo`). */
  recuar: (logicos: number) => void;
}

export interface MapaSobOsOmbros {
  /** Avalia e empurra o recuo. Chamado uma vez por quadro pela raiz. */
  tick(): void;
}

export function criarMapaSobOsOmbros(ctx: MapaSobOsOmbrosCtx): MapaSobOsOmbros {
  const raiz = ctx.$<HTMLElement>('#game-region');
  if (!raiz) return { tick: () => {} }; // noutro documento (os testes) não há o que medir
  const regiao = raiz;

  /** O último valor empurrado — para o caminho comum não tocar no grafo de cena. */
  let ultimo = 0;

  /** O recuo a empurrar agora, em pixels lógicos. */
  function medir(): number {
    const r = regiao.getBoundingClientRect();
    if (r.height <= 0) return ultimo; // região ainda por medir (antes do primeiro layout): nada a afirmar
    let fundo = 0;
    for (const sel of OCUPAM_O_CANTO) {
      const el = ctx.$<HTMLElement>(sel);
      // Um elemento ausente, desligado do documento ou de caixa nula (`display:none`, `hidden`) não ocupa
      // nada — e é assim que o recuo volta a zero sozinho quando o pad se esconde ou a mão se esvazia.
      if (!el || !el.isConnected) continue;
      const c = el.getBoundingClientRect();
      if (c.height <= 0) continue;
      fundo = Math.max(fundo, c.bottom - r.top);
    }
    if (fundo <= 0) return 0;
    return Math.ceil((fundo * LOGICAL_H) / r.height);
  }

  return {
    tick(): void {
      const logicos = medir();
      if (logicos === ultimo) return;
      ultimo = logicos;
      ctx.recuar(logicos);
    },
  };
}
