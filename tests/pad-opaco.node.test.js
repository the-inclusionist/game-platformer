// SPDX-License-Identifier: AGPL-3.0-or-later
// O PAD DE TOQUE NASCE SÓLIDO E ESMAECE (ui/pad-opaco) — a regra de QUANDO, sem navegador.
//
// ========================= POR QUE ESTE ARQUIVO EXISTE =========================
// O Dev em 03/10, depois de eu avisar que 30% fixos deixavam os números `1 2 3 4` quase ilegíveis:
// *«o problema é que sem isso não dá pra ver através dos controles, que tampam grande parte do cenário se
// usados via celular»*. A saída que ele desenhou não escolhe um número — separa no TEMPO: sólido enquanto
// a criança olha para os botões, transparente enquanto ela joga.
//
// ⚠️ A PARTE DO ALTO CONTRASTE NÃO SE TESTA AQUI, e a ausência é declarada: ela vive em CSS
// (`#dom-layer.hc #touch-controls.touch.pad-esmaecido{opacity:1}`), porque o jogo já marca essa classe e os
// três modos — `hc-direto`, `hc-direto-45`, `hc-direto-7` — partilham-na. Medido no navegador em 03/10: com
// o alto contraste ligado a opacidade é 1 mesmo com `pad-esmaecido` posto, o que é o desenho certo — a
// classe continua a seguir o relógio e o CSS decide o que fazer com ela.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarPadOpaco } from '../app/js/ui/pad-opaco.js';

/** Elementos de mentira com o pouco que o módulo toca. */
function montar({ larguraRegiao = 1000, alturaRegiao = 600, padEscondido = false } = {}) {
  const classes = new Set();
  const ouvintes = new Map();
  const pad = { hidden: padEscondido, classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } };
  const regiao = {
    getBoundingClientRect: () => ({ x: 0, y: 0, width: larguraRegiao, height: alturaRegiao }),
    addEventListener: (tipo, fn) => { (ouvintes.get(tipo) ?? ouvintes.set(tipo, []).get(tipo)).push(fn); },
  };
  const sel = { '#touch-controls': pad, '#game-region': regiao };
  const api = criarPadOpaco({ $: (s) => sel[s] ?? null, signal: new AbortController().signal });
  return {
    api, pad,
    esmaecido: () => classes.has('pad-esmaecido'),
    tocar: (x, y) => (ouvintes.get('pointerdown') ?? []).forEach((fn) => fn({ clientX: x, clientY: y })),
  };
}

let agora = 0;
beforeEach(() => { agora = 0; vi.spyOn(performance, 'now').mockImplementation(() => agora); });
afterEach(() => { vi.restoreAllMocks(); });

describe('ui/pad-opaco — sólido ao nascer, esmaecido depois', () => {
  it('[Zero] nasce sólido', () => {
    const m = montar();
    m.api.tick();
    expect(m.esmaecido()).toBe(false);
  });

  it('esmaece aos 5 s — e o limite exato é o que uma inversão de `>=` quebraria', () => {
    const m = montar();
    agora = 4999; m.api.tick();
    expect(m.esmaecido()).toBe(false);
    agora = 5000; m.api.tick();
    expect(m.esmaecido()).toBe(true);
  });

  it('🎯 um toque NO MEIO devolve-o a sólido', () => {
    const m = montar({ larguraRegiao: 1000, alturaRegiao: 600 });
    agora = 6000; m.api.tick();
    expect(m.esmaecido()).toBe(true);
    m.tocar(500, 300); // o centro exato
    m.api.tick();
    expect(m.esmaecido()).toBe(false);
  });

  it('⚠️ um toque FORA do retângulo central NÃO o acorda — tocar num botão é jogar, não é pedir para ver', () => {
    // O retângulo é 30% × 30% centrado: numa região de 1000×600 vai de x 350–650 e y 210–390.
    const m = montar({ larguraRegiao: 1000, alturaRegiao: 600 });
    agora = 6000; m.api.tick();
    m.tocar(100, 550);  // canto inferior esquerdo, onde mora o direcional
    m.api.tick();
    expect(m.esmaecido()).toBe(true);
  });

  it('as bordas do retângulo contam como dentro, e um pixel fora já não', () => {
    const m = montar({ larguraRegiao: 1000, alturaRegiao: 600 });
    agora = 6000; m.api.tick();
    m.tocar(350, 300); m.api.tick();        // x na borda esquerda do retângulo
    expect(m.esmaecido()).toBe(false);
    agora = 12000; m.api.tick();
    expect(m.esmaecido()).toBe(true);
    m.tocar(349, 300); m.api.tick();        // um pixel fora
    expect(m.esmaecido()).toBe(true);
  });

  it('🔴 o pad que APARECE nasce sólido, mesmo depois de muito tempo de teclado', () => {
    // O pad começa escondido e a engine mostra-o quando o dedo chega. Sem reiniciar o relógio nessa
    // transição, um pad que aparece ao fim de um minuto nasceria já esmaecido — o contrário do pedido.
    const m = montar({ padEscondido: true });
    agora = 60000; m.api.tick();
    expect(m.esmaecido()).toBe(false); // escondido, nada a fazer
    m.pad.hidden = false;              // a engine mostra-o agora
    m.api.tick();
    expect(m.esmaecido()).toBe(false); // nasce sólido
    agora = 64999; m.api.tick();
    expect(m.esmaecido()).toBe(false);
    agora = 65000; m.api.tick();
    expect(m.esmaecido()).toBe(true);  // e só 5 s DEPOIS de aparecer
  });

  it('o retângulo acompanha o tamanho da região — não é um número de pixels', () => {
    // Numa região estreita o mesmo ponto absoluto pode cair dentro ou fora; é a fração que manda.
    const m = montar({ larguraRegiao: 400, alturaRegiao: 300 });
    agora = 6000; m.api.tick();
    m.tocar(200, 150); m.api.tick();   // centro de 400×300
    expect(m.esmaecido()).toBe(false);
  });

  it('sem pad no documento, o tick é inerte em vez de rebentar', () => {
    const api = criarPadOpaco({ $: () => null, signal: new AbortController().signal });
    expect(() => { agora = 99999; api.tick(); }).not.toThrow();
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. `INATIVIDADE_MS` 5000 → 3000: cai o caso do limite (4999/5000).
// 2. `FRACAO_DO_MEIO` 0.3 → 1: o toque no canto passa a acordar — cai o caso do canto.
// 3. `Math.abs(x-cx) <= lw/2` → `<= lw`: cai o caso do pixel fora da borda.
// 4. Tirar o reinício do relógio quando o pad aparece: cai «o pad que APARECE nasce sólido».
