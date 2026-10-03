// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * A BARRA DE ACESSIBILIDADE RECOLHE-SE EM JOGO — pedido do Dev em 03/10: *«deve desaparecer se recolhendo
 * pra cima após 5 segundos de inatividade, exceto se o jogo estiver pausado. Deve aparecer novamente quando
 * o mouse se dirige em sua direção ou se há um toque na tela no lugar onde ele deveria estar.»*
 *
 * 🔴 PALIATIVO DESTE JOGO, E É PARA SAIR DAQUI. A barra (`#title-icons`) é da ENGINE — o `createGame`
 * preenche-a (`A11Y_BAR_SELECTOR` em `boot/create-game.js`), e o comportamento de a esconder é universal:
 * todo jogo da engine o quer, e repeti-lo em cada cartucho é a duplicação que o ADR-0036 existe para evitar.
 * Fica aqui porque o MVP precisa dele AGORA; quando a engine o absorver, este módulo e o seu CSS apagam-se
 * e o `main.ts` perde quatro linhas.
 *
 * 📌 A REGRA TODA CABE NUMA PERGUNTA: `mundoRodando()`. Medido no navegador em 03/10, o START não abre o
 * cartão — muda a fase para `paused` e deixa `#vp-pause-0` escondido. Então os quatro estados que o Dev
 * nomeou separam-se por essa única leitura:
 *
 *   | estado                     | `mundoRodando()` | barra                        |
 *   |----------------------------|------------------|------------------------------|
 *   | ecrã de título             | `false`          | fica                         |
 *   | jogo a correr              | `true`           | recolhe aos 5 s              |
 *   | barra aberta por START     | `false`          | fica até ao START seguinte   |
 *   | cartão de pausa aberto     | `false`          | fica                         |
 *
 * Não há estado a detectar nem máquina a manter: fora do mundo a correr, a barra está sempre lá.
 */
import './barra-recolhivel.css';

/** Cinco segundos, o número que o Dev deu. Em milissegundos porque o relógio aqui é o do `performance.now()`
 *  e não o do quadro: o tempo que a criança passa sem tocar em nada não é tempo de jogo. */
const INATIVIDADE_MS = 5000;

export interface BarraRecolhivelCtx {
  $: <T extends Element = HTMLElement>(sel: string) => T | null;
  /** `true` só com o mundo a correr. No título e em qualquer pausa (incluindo a barra por START) é `false`. */
  mundoRodando: () => boolean;
  /** O `signal` do `AbortController` da raiz — solta todos os ouvintes no `teardown()`. */
  signal: AbortSignal;
}

export interface BarraRecolhivel {
  /** Avalia o estado. Chamado uma vez por quadro pela raiz; barato (uma leitura e, no muito, uma classe). */
  tick(): void;
}

export function createBarraRecolhivel(ctx: BarraRecolhivelCtx): BarraRecolhivel {
  const barra = ctx.$<HTMLElement>('#title-icons');
  const regiao = ctx.$<HTMLElement>('#game-region');
  // Sem barra ou sem região não há nada a recolher. Devolve um `tick` morto em vez de rebentar: um jogo
  // montado noutro documento (os testes) continua a correr.
  if (!barra || !regiao) return { tick: () => {} };

  // A FAIXA DE PICO nasce aqui e não no `index.html` porque só este módulo a usa; se ele sair, ela sai junto.
  const pico = regiao.ownerDocument.createElement('div');
  pico.id = 'barra-pico';
  pico.setAttribute('aria-hidden', 'true'); // é superfície de ponteiro, não conteúdo: o leitor de ecrã ignora-a
  regiao.appendChild(pico);

  let ultimoToque = performance.now();
  let recolhida = false;

  /** Qualquer sinal de vida adia o recolhimento e, se já estava em cima, traz a barra de volta. */
  const acordar = (): void => { ultimoToque = performance.now(); };

  // O QUE ADIA E O QUE ACORDA, pela resposta do Dev («(d) tudo»): o rato por perto, o dedo no lugar dela, e a
  // tecla que navega os seus ícones. Cada um chega por um ouvinte diferente porque são superfícies diferentes.
  for (const alvo of [barra, pico]) {
    alvo.addEventListener('pointermove', acordar, { signal: ctx.signal });
    alvo.addEventListener('pointerdown', acordar, { signal: ctx.signal });
    alvo.addEventListener('pointerenter', acordar, { signal: ctx.signal });
  }
  // 🔴 O `focusin` É O OUVINTE DA CRIANÇA QUE NÃO USA RATO. Os ícones ficam tabuláveis com a barra em cima
  // (ver o CSS), então o Tab chega a eles — e sem isto o foco ia para um botão invisível, que é o defeito
  // que ADR-0074 chama pelo nome. Com isto, a barra desce no mesmo quadro em que o foco lá entra.
  barra.addEventListener('focusin', acordar, { signal: ctx.signal });
  // A tecla premida SOBRE a barra conta como vida: a criança está a mexer nos ícones, não a jogar.
  barra.addEventListener('keydown', acordar, { signal: ctx.signal });

  return {
    tick(): void {
      // Fora do mundo a correr a barra fica, e o relógio reinicia: ao voltar ao jogo ela tem os 5 s inteiros,
      // e não o resto de uma contagem que correu enquanto a criança lia o cartão de pausa.
      if (!ctx.mundoRodando()) {
        ultimoToque = performance.now();
        if (recolhida) { recolhida = false; barra.classList.remove('barra-recolhida'); pico.classList.remove('pico-armado'); }
        return;
      }
      const devia = performance.now() - ultimoToque >= INATIVIDADE_MS;
      if (devia === recolhida) return; // nada mudou: o caminho de todos os quadros menos dois
      recolhida = devia;
      barra.classList.toggle('barra-recolhida', recolhida);
      pico.classList.toggle('pico-armado', recolhida);
    },
  };
}
