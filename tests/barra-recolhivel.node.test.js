// SPDX-License-Identifier: AGPL-3.0-or-later
// A BARRA DE ACESSIBILIDADE QUE SE RECOLHE (ui/barra-recolhivel) — a REGRA DE QUANDO, sem navegador.
//
// ========================= POR QUE ESTE ARQUIVO EXISTE =========================
// A geometria (a barra sai inteira pelo topo, a centragem da engine sobrevive ao deslize) mediu-se no
// navegador em 03/10 e está no corpo do CSS. O que NÃO se mede lá é a regra de estado: o painel do
// navegador estava oculto, e com ele o `requestAnimationFrame` e o relógio de transições congelam — um
// `tick` que nunca corre faz a barra parecer certa estando errada, e foi exatamente o que a primeira
// medição mostrou (ver `aba-oculta-parece-jogo-morto`). Aqui o relógio é meu.
//
// ========================= A GARANTIA QUE O BOOLEANO NÃO DÁ =========================
// «Recolhe aos 5 s» tem QUATRO estados por trás, e três deles são `mundoRodando() === false` por motivos
// diferentes: o título, a barra aberta por START e o cartão de pausa. Um caso que só afirmasse «recolheu»
// passaria com a regra invertida em dois deles. Por isso cada estado tem o seu caso, e o caso do START
// afirma o que o Dev pediu em palavras: *«ela só some apertando START novamente»*.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBarraRecolhivel } from '../app/js/ui/barra-recolhivel.js';

/** Um elemento de mentira com o pouco que o módulo toca: classes, ouvintes e um pai onde nascer. */
function elementoFalso(id) {
  const classes = new Set();
  const ouvintes = new Map();
  return {
    id,
    filhos: [],
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
    },
    addEventListener: (tipo, fn) => { (ouvintes.get(tipo) ?? ouvintes.set(tipo, []).get(tipo)).push(fn); },
    setAttribute: () => {},
    appendChild: function (f) { this.filhos.push(f); },
    get ownerDocument() { return { createElement: () => elementoFalso('') }; },
    /** O disparador do teste: chama os ouvintes daquele tipo, como o navegador faria. */
    disparar: (tipo) => (ouvintes.get(tipo) ?? []).forEach((fn) => fn()),
  };
}

/** Monta o módulo sobre elementos falsos e devolve o que o teste precisa de espreitar. */
function montar(mundoRodando) {
  const barra = elementoFalso('title-icons');
  const regiao = elementoFalso('game-region');
  const sel = { '#title-icons': barra, '#game-region': regiao };
  const b = createBarraRecolhivel({
    $: (s) => sel[s] ?? null,
    mundoRodando,
    signal: new AbortController().signal,
  });
  // A fita de pico nasce dentro da região; é o único filho que o módulo lá põe.
  const pico = regiao.filhos[0];
  return { b, barra, pico, recolhida: () => barra.classList.contains('barra-recolhida'), armado: () => pico.classList.contains('pico-armado') };
}

let agora = 0;
beforeEach(() => { agora = 0; vi.spyOn(performance, 'now').mockImplementation(() => agora); });
afterEach(() => { vi.restoreAllMocks(); });

describe('ui/barra-recolhivel — a regra de quando', () => {
  it('[Zero] nasce à vista, com a fita desarmada', () => {
    const m = montar(() => true);
    m.b.tick();
    expect(m.recolhida()).toBe(false);
    expect(m.armado()).toBe(false);
  });

  it('em jogo, recolhe aos 5 s de inatividade — e arma a fita de pico junto', () => {
    const m = montar(() => true);
    agora = 4999; m.b.tick();
    expect(m.recolhida()).toBe(false); // ⚠️ 4999 e não 4000: o limite exato é o que uma inversão de `>=` quebraria
    agora = 5000; m.b.tick();
    expect(m.recolhida()).toBe(true);
    expect(m.armado()).toBe(true);     // a fita só captura o ponteiro quando há barra escondida para trazer de volta
  });

  it('no título NÃO recolhe, por mais tempo que passe', () => {
    const m = montar(() => false); // o título é `worldRunning: false`
    agora = 60000; m.b.tick();
    expect(m.recolhida()).toBe(false);
  });

  it('com a barra aberta por START, fica — «só some apertando START novamente» (o Dev, 03/10)', () => {
    // O START não abre o cartão: muda a fase para `paused`, e `worldRunning` cai. Medido no navegador em 03/10.
    let rodando = true;
    const m = montar(() => rodando);
    rodando = false;                    // START
    agora = 30000; m.b.tick();
    expect(m.recolhida()).toBe(false);  // trinta segundos depois, continua lá
    rodando = true;                     // START de novo: volta ao jogo
    m.b.tick();
    expect(m.recolhida()).toBe(false);  // e o relógio reinicia — não recolhe no mesmo quadro
    agora = 35000; m.b.tick();
    expect(m.recolhida()).toBe(true);   // só 5 s DEPOIS do regresso
  });

  it('o cartão de pausa aberto devolve a barra escondida, e desarma a fita', () => {
    let rodando = true;
    const m = montar(() => rodando);
    agora = 6000; m.b.tick();
    expect(m.recolhida()).toBe(true);
    rodando = false;                    // abriu a pausa
    m.b.tick();
    expect(m.recolhida()).toBe(false);
    expect(m.armado()).toBe(false);
  });

  it('o ponteiro sobre a fita de pico traz a barra de volta', () => {
    const m = montar(() => true);
    agora = 6000; m.b.tick();
    expect(m.recolhida()).toBe(true);
    m.pico.disparar('pointermove');     // o rato chegou ao topo
    m.b.tick();
    expect(m.recolhida()).toBe(false);
  });

  it('o toque na fita de pico traz a barra de volta', () => {
    const m = montar(() => true);
    agora = 6000; m.b.tick();
    expect(m.recolhida()).toBe(true);
    m.pico.disparar('pointerdown');     // o dedo no lugar onde ela estaria
    m.b.tick();
    expect(m.recolhida()).toBe(false);
  });

  it('🔴 o FOCO por teclado traz a barra de volta — o caminho de quem não usa rato', () => {
    // Os ícones ficam tabuláveis com a barra em cima (ver o CSS); sem este ouvinte o Tab punha o foco num
    // botão invisível, que é o defeito que ADR-0074 chama pelo nome.
    const m = montar(() => true);
    agora = 6000; m.b.tick();
    expect(m.recolhida()).toBe(true);
    m.barra.disparar('focusin');
    m.b.tick();
    expect(m.recolhida()).toBe(false);
  });

  it('depois de acordar, volta a recolher ao fim de outros 5 s', () => {
    const m = montar(() => true);
    agora = 6000; m.b.tick();
    expect(m.recolhida()).toBe(true);
    agora = 6000; m.pico.disparar('pointermove'); m.b.tick();
    expect(m.recolhida()).toBe(false);
    agora = 10999; m.b.tick();
    expect(m.recolhida()).toBe(false);  // 4999 ms depois do acordar
    agora = 11000; m.b.tick();
    expect(m.recolhida()).toBe(true);
  });

  it('sem a barra no documento, o tick é inerte em vez de rebentar', () => {
    // Um jogo montado noutro documento (os próprios testes) não tem `#title-icons`; o módulo não pode
    // derrubar o quadro por isso.
    const b = createBarraRecolhivel({ $: () => null, mundoRodando: () => true, signal: new AbortController().signal });
    expect(() => { agora = 99999; b.tick(); }).not.toThrow();
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. `INATIVIDADE_MS` 5000 → 4000: cai «recolhe aos 5 s» (o caso dos 4999 ms morde).
// 2. `>=` → `>` no limite: cai o mesmo caso, na fronteira exata.
// 3. `if (!ctx.mundoRodando())` → `if (ctx.mundoRodando())`: caem os casos do título, do START e da pausa.
// 4. Tirar o `ultimoToque = performance.now()` do ramo de fora-do-mundo: cai «só 5 s DEPOIS do regresso»
//    no caso do START — a barra recolheria no primeiro quadro de volta ao jogo.
// 5. Tirar o ouvinte `focusin`: cai o caso do teclado, e com ele o único caminho de quem não usa rato.
// 6. Tirar o `pico.classList.toggle('pico-armado', …)`: cai a asserção da fita nos dois casos que a afirmam.
