// SPDX-License-Identifier: AGPL-3.0-or-later
// O MAPA NÃO FICA DEBAIXO DO QUE JÁ ESTÁ NO CANTO (ui/mapa-sob-os-ombros) — pedido do Dev em 03/10.
//
// ========================= POR QUE ISTO EXISTE =========================
// *«No canto superior direito, o mapa deve ficar ABAIXO dos botões R1 e R2.»*
//
// 🔴 E O PROBLEMA É DE DUAS CAMADAS, que é o que obriga a medir em vez de declarar um número: o minimapa é
// desenhado DENTRO do canvas, no mundo lógico de 320×180 (`render/minimap`); os ombros são `<button>` do pad
// de toque da engine, DOM por cima do canvas. Nenhum `z-index` os arbitra, porque nem estão na mesma camada
// — o mapa fica simplesmente escondido.
//
// 📌 E SÃO DOIS OCUPANTES, não um. 📏 Medido no navegador em 03/10, com o conserto dos ombros já a correr: o
// mapa desceu abaixo do R1 e os ícones da braçada — que moram no mesmo canto desde a mesma manhã — passaram
// a cair sobre a borda direita dele. Consertar um e deixar o outro seria consertar metade.
//
// ⚠️ ESTE FICHEIRO NÃO ABRE NAVEGADOR, e o que isso custa está declarado: ele mede a CONVERSÃO e a regra de
// quando empurrar, com retângulos de mentira. Que os seletores casem os elementos certos é coisa que só a
// tela diz, e foi medido lá — ver o cabeçalho do módulo.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect } from 'vitest';
import { criarMapaSobOsOmbros } from '../app/js/ui/mapa-sob-os-ombros.js';

/** Um elemento de mentira com o pouco que o módulo toca: uma caixa e o estar-ligado-ao-documento. */
const caixa = (top, height, { ligado = true } = {}) => ({
  isConnected: ligado,
  getBoundingClientRect: () => ({ top, height, bottom: top + height }),
});

/** A região de 1000×540 px de CSS, que é o mundo de 320×180 — 3 px de CSS por px lógico na vertical. */
const REGIAO = caixa(0, 540);

function montar({ ombros = null, carga = null, regiao = REGIAO } = {}) {
  const sel = { '#game-region': regiao, '.touch-ombros--dir': ombros, '.vphud-carga': carga };
  const empurrados = [];
  const api = criarMapaSobOsOmbros({ $: (s) => sel[s] ?? null, recuar: (v) => empurrados.push(v) });
  return { api, empurrados, sel };
}

describe('ui/mapa-sob-os-ombros — quanto do canto já está ocupado', () => {
  it('[Zero] sem pad e sem braçada, não empurra nada — e quem joga de teclado não paga por esta regra', () => {
    const m = montar();
    m.api.tick(); m.api.tick();
    expect(m.empurrados).toEqual([]);
  });

  it('🎯 com a coluna de ombros, o recuo é o FUNDO dela, em pixels lógicos', () => {
    // 540 px de CSS são 180 lógicos: o fundo a 150 px de CSS cai em 50 lógicos.
    const m = montar({ ombros: caixa(0, 150) });
    m.api.tick();
    expect(m.empurrados).toEqual([50]);
  });

  it('🔴 e com a BRAÇADA por baixo dos ombros, é ELA que manda — o mapa desce abaixo das duas', () => {
    // 📏 Este é o caso medido no navegador: os ícones do lixo moram no mesmo canto, abaixo do R1, e tapavam
    // a borda direita do mapa depois de o conserto dos ombros já estar a funcionar.
    const m = montar({ ombros: caixa(0, 150), carga: caixa(150, 90) });
    m.api.tick();
    expect(m.empurrados).toEqual([80]);
  });

  it('⚠️ e a braçada SOZINHA também conta — ela existe sem pad nenhum, no teclado', () => {
    const m = montar({ carga: caixa(30, 60) });
    m.api.tick();
    expect(m.empurrados).toEqual([30]);
  });

  it('🎯 empurra SÓ quando o número muda — isto corre a cada quadro', () => {
    // Reposicionar o container do Pixi sessenta vezes por segundo para lhe escrever o mesmo `y` é trabalho
    // puro; e o módulo não tem como saber que é barato do outro lado.
    const m = montar({ ombros: caixa(0, 150) });
    m.api.tick(); m.api.tick(); m.api.tick();
    expect(m.empurrados).toEqual([50]);
  });

  it('🔴 e VOLTA A ZERO quando o canto se esvazia — senão o mapa ficava caído para sempre', () => {
    // O pad esconde-se assim que a criança toca no teclado, e a braçada esvazia-se na lixeira. Sem o
    // regresso, o mapa ficava a meia tela num canto livre, e nada no produto o traria de volta.
    const m = montar({ ombros: caixa(0, 150) });
    m.api.tick();
    m.sel['.touch-ombros--dir'] = caixa(0, 0);   // `display:none` com o pad oculto: caixa nula
    m.api.tick();
    expect(m.empurrados).toEqual([50, 0]);
  });

  it('⚠️ manda o MAIS FUNDO, seja qual for a ordem da lista', () => {
    // Hoje a braçada desenha-se sempre abaixo dos ombros (é o CSS dela que o diz), e por isso bastaria «o
    // último vence». 📌 Mas o que o módulo responde é «onde acaba o que já está lá», e essa pergunta não
    // tem ordem: no dia em que um dos dois mudar de lugar, o mapa não pode começar a subir por baixo dele.
    const m = montar({ ombros: caixa(0, 240), carga: caixa(30, 60) });
    m.api.tick();
    expect(m.empurrados).toEqual([80]);
  });

  it('🔴 caixa NULA num canto rolado não inventa recuo — o `height` é que diz se o elemento está lá', () => {
    // 📏 Medido no navegador em 03/10: a região pode começar ACIMA da janela (`top` negativo), e um elemento
    // escondido devolve um retângulo todo a zeros. Sem olhar para a altura, `0 - (-105)` dava 105 px de
    // ocupação vinda de um botão que não está na tela — e o mapa descia sozinho num canto vazio.
    const m = montar({ ombros: caixa(0, 0), regiao: caixa(-105, 540) });
    m.api.tick();
    expect(m.empurrados).toEqual([]);
  });

  it('⚠️ um elemento DESLIGADO do documento não ocupa canto nenhum', () => {
    const m = montar({ ombros: caixa(0, 150, { ligado: false }) });
    m.api.tick();
    expect(m.empurrados).toEqual([]);
  });

  it('[Zero] região ainda por medir não afirma nada, em vez de afirmar zero', () => {
    // Antes do primeiro layout a altura é 0, e dividir por ela daria `Infinity`. Calar é a resposta certa:
    // o quadro seguinte já tem medida.
    const m = montar({ ombros: caixa(0, 150), regiao: caixa(0, 0) });
    m.api.tick();
    expect(m.empurrados).toEqual([]);
  });

  it('sem região no documento (os testes), o tick é inerte em vez de rebentar', () => {
    const api = criarMapaSobOsOmbros({ $: () => null, recuar: () => { throw new Error('não devia empurrar'); } });
    expect(() => api.tick()).not.toThrow();
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. Tirar `.vphud-carga` de `OCUPAM_O_CANTO`: cai o caso da braçada e o da braçada sozinha.
// 2. `Math.max(fundo, …)` → `fundo = …` (o último vence): cai o caso do mais fundo.
// 3. Tirar a guarda `c.height <= 0`: cai o caso da caixa nula num canto rolado.
// 4. Tirar a guarda `r.height <= 0`: cai o caso da região por medir (`Infinity` empurrado).
// 5. Empurrar sempre, sem comparar com `ultimo`: cai o caso dos três ticks.
