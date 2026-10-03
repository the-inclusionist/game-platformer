// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * O PAD DE TOQUE NASCE SÓLIDO E ESMAECE — regra do Dev em 03/10.
 *
 * 🔴 O PROBLEMA QUE ELA RESOLVE, nas palavras dele: *«sem isso não dá pra ver através dos controles, que
 * tampam grande parte do cenário se usados via celular»*. Um pad permanentemente a 30% esconde o cenário
 * menos, mas deixa os números `1 2 3 4` quase ilegíveis; um pad sólido tapa meia tela num telemóvel. A
 * regra desfaz o dilema no TEMPO em vez de o resolver por um número só: sólido quando a criança está a
 * olhar para ele, transparente quando ela está a jogar.
 *
 * 📌 TRÊS COMPORTAMENTOS, e dois deles não vivem aqui:
 *  1. Nasce a 100% e cai a 30% ao fim de 5 s — ESTE módulo.
 *  2. Volta a 100% ao tocar no meio da tela — ESTE módulo (ver `NO_MEIO` abaixo).
 *  3. Fica a 100% nos três modos de alto contraste — CSS, porque o jogo já marca `#dom-layer.hc`
 *     (`main.ts`, `applyHighContrastToDom`) e os três — `hc-direto`, `hc-direto-45`, `hc-direto-7` —
 *     partilham essa classe. Uma pergunta que o CSS já sabe fazer não precisa de JavaScript a repeti-la.
 *
 * ⚠️ O ALCANCE NUNCA MUDA: isto mexe só em `opacity`. Um botão a 30% recebe o toque exatamente como a
 * 100%, porque o `pointer-events` continua a ser o que a engine lhe deu. Esmaecer não é desligar.
 */
import './pad-opaco.css';

/** Cinco segundos, o número que o Dev deu — o mesmo da barra de acessibilidade, e de propósito. */
const INATIVIDADE_MS = 5000;

/**
 * O RETÂNGULO QUE ACORDA O PAD: 30% da largura e 30% da altura, no centro (o Dev: *«retângulo central com
 * 30% da altura e da largura da tela»*).
 *
 * ⚠️ O MEIO E NÃO O PAD, e a escolha é dele: tocar no próprio botão é JOGAR, e acordar ali faria o pad
 * piscar a cada pulo. O meio da tela é onde a criança não tem controlo nenhum — tocar lá só pode querer
 * dizer «deixa-me ver os botões».
 */
const FRACAO_DO_MEIO = 0.3;

export interface PadOpacoCtx {
  $: <T extends Element = HTMLElement>(sel: string) => T | null;
  /** O `signal` do `AbortController` da raiz — solta os ouvintes no `teardown()`. */
  signal: AbortSignal;
}

export interface PadOpaco {
  /** Avalia o estado. Chamado uma vez por quadro pela raiz; barato. */
  tick(): void;
}

export function criarPadOpaco(ctx: PadOpacoCtx): PadOpaco {
  const pad = ctx.$<HTMLElement>('#touch-controls');
  const regiao = ctx.$<HTMLElement>('#game-region');
  if (!pad || !regiao) return { tick: () => {} }; // noutro documento (os testes) não há o que esmaecer

  let ultimoToque = performance.now();
  let esmaecido = false;
  // 📌 O pad nasce escondido e a engine mostra-o quando o dedo chega. Nessa transição o relógio reinicia,
  // senão um pad que aparece ao fim de um minuto de teclado nasceria já esmaecido — e o Dev pediu o
  // contrário: *«o controle nasce […] com opacidade 100%»*.
  let estavaEscondido = pad.hidden;

  /** O ponto caiu no retângulo central? Medido a cada evento: a região muda de tamanho com a janela. */
  const noMeio = (x: number, y: number): boolean => {
    const r = regiao.getBoundingClientRect();
    const lw = r.width * FRACAO_DO_MEIO, lh = r.height * FRACAO_DO_MEIO;
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    return Math.abs(x - cx) <= lw / 2 && Math.abs(y - cy) <= lh / 2;
  };

  const acordar = (): void => { ultimoToque = performance.now(); };

  // ⚠️ NA REGIÃO E NÃO NO PAD: o pad não cobre o meio da tela, que é exatamente onde o Dev quer o gatilho.
  // `pointerdown` apanha o dedo e o rato pela mesma porta (ADR-0223 chama-lhe a porta única).
  regiao.addEventListener('pointerdown', (e) => { if (noMeio(e.clientX, e.clientY)) acordar(); },
    { signal: ctx.signal });

  return {
    tick(): void {
      // O pad que acabou de aparecer nasce sólido, com os 5 s inteiros pela frente.
      if (estavaEscondido && !pad.hidden) acordar();
      estavaEscondido = pad.hidden;
      // ⚠️ UM PAD ESCONDIDO NÃO TEM ESTADO DE OPACIDADE. Sem esta saída o relógio corria por baixo e a
      // classe ficava posta num elemento invisível — o `hidden` tapa-o, então nada se vê, mas é estado
      // afirmado sobre o que não está lá, e a linha seguinte teria de o desfazer ao aparecer.
      if (pad.hidden) return;

      const devia = performance.now() - ultimoToque >= INATIVIDADE_MS;
      if (devia === esmaecido) return; // o caminho de todos os quadros menos dois
      esmaecido = devia;
      pad.classList.toggle('pad-esmaecido', esmaecido);
    },
  };
}
