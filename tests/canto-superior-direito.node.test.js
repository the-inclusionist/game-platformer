// SPDX-License-Identifier: AGPL-3.0-or-later
// O ARRANJO DO CANTO SUPERIOR DIREITO (ui/canto-superior-direito) — o print do Dev, 03/10.
//
// ========================= O QUE O PRINT MOSTRA =========================
//
//      ┌──────────────────────────────┐
//      │                 [mapa ] [R2] │   os dois botões encostados à direita, em coluna;
//      │                 [     ] [R1] │   o mapa À ESQUERDA deles, encostado ao alto
//      │                         [🥫] │   os itens POR BAIXO dos botões
//      │                         [📦] │
//
// *«Os itens devem aparecer abaixo dos botões R2 e R1 e, por consequência, abaixo do mapa quando não houverem
// botões visíveis.»*
//
// 🔴 ESTE FICHEIRO SUBSTITUI `mapa-sob-os-ombros.node.test.js`, que prendia a leitura ERRADA: eu tinha descido
// o mapa para debaixo dos botões, a partir da frase anterior dele («o mapa deve ficar ABAIXO dos botões R1 e
// R2»), e o print desfez a leitura. O portão antigo estava verde e certo sobre a coisa errada — que é o pior
// estado em que um teste pode estar, porque defende o defeito.
//
// ⚠️ ESTE FICHEIRO NÃO ABRE NAVEGADOR, e o que isso custa está declarado: ele mede a CONVERSÃO e a regra de
// quando escrever, com retângulos de mentira. Que os seletores casem os elementos certos é coisa que só a
// tela diz, e foi medido lá — ver o cabeçalho do módulo.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect } from 'vitest';
import { criarCantoSuperiorDireito, VAR_OCUPADO } from '../app/js/ui/canto-superior-direito.js';

/** Um elemento de mentira com o pouco que o módulo toca. */
const caixa = (x, y, w, h, { ligado = true } = {}) => ({
  isConnected: ligado,
  getBoundingClientRect: () => ({ x, y, top: y, left: x, width: w, height: h, right: x + w, bottom: y + h }),
});

/** A região: 960×540 px de CSS para 320×180 lógicos — 3 px de CSS por px lógico, nos dois eixos. */
const REGIAO = caixa(0, 0, 960, 540);

function montar({ ombros = null, fundoDoMapa = null, regiao = REGIAO } = {}) {
  const sel = { '#game-region': { ...regiao, style: { setProperty: (k, v) => escrito.push([k, v]) } },
    '.touch-ombros--dir': ombros };
  const escrito = [];
  const recuos = [];
  const api = criarCantoSuperiorDireito({
    $: (s) => sel[s] ?? null,
    fundoDoMapa: () => (typeof fundoDoMapa === 'function' ? fundoDoMapa() : fundoDoMapa),
    recuarMapa: (v) => recuos.push(v),
  });
  return { api, escrito, recuos, sel, ocupado: () => escrito.map(([, v]) => v) };
}

describe('o mapa encosta-se À ESQUERDA dos botões, e não por baixo', () => {
  it('[Zero] sem pad de toque não há coluna, e o mapa fica no canto sem recuo nenhum', () => {
    const m = montar();
    m.api.tick();
    expect(m.recuos).toEqual([0]);
  });

  it('🎯 com a coluna, o recuo é a LARGURA dela mais a folga, em pixels lógicos', () => {
    // Uma coluna de 66 px de CSS mais 8 de folga são 74; a 3 px de CSS por px lógico, 25 lógicos.
    const m = montar({ ombros: caixa(894, 12, 66, 150) });
    m.api.tick();
    expect(m.recuos).toEqual([25]);
  });

  it('🔴 é a LARGURA e não a altura — descer o mapa foi a leitura que o print desfez', () => {
    // 📏 Uma coluna alta e estreita: se o módulo medisse a altura, o recuo seria muito maior. O mapa é largo
    // e baixo, a coluna é estreita e alta; lado a lado partilham a faixa, empilhados deixam meio canto vazio.
    const m = montar({ ombros: caixa(894, 12, 66, 300) });
    m.api.tick();
    expect(m.recuos).toEqual([25]);
  });

  it('⚠️ e volta a zero quando o pad se esconde — senão o mapa ficava encolhido para sempre', () => {
    const m = montar({ ombros: caixa(894, 12, 66, 150) });
    m.api.tick();
    m.sel['.touch-ombros--dir'] = caixa(0, 0, 0, 0); // `display:none` com o pad oculto: caixa nula
    m.api.tick();
    expect(m.recuos).toEqual([25, 0]);
  });
});

describe('os itens descem para debaixo do que ocupa o canto', () => {
  it('[Zero] canto vazio, nada por cima deles', () => {
    const m = montar();
    m.api.tick();
    expect(m.ocupado()).toEqual(['0px']);
  });

  it('🎯 com os botões, descem para debaixo DELES — mesmo com o mapa ali ao lado', () => {
    // 📌 A ORDEM É A DO DEV, e não um `max`: os botões, SE houver; senão o mapa. Com os dois presentes o mapa
    // está ao LADO dos botões, não por cima dos ícones, e por isso não lhes manda nada.
    const m = montar({ ombros: caixa(894, 12, 66, 150), fundoDoMapa: 170 });
    m.api.tick();
    expect(m.ocupado()).toEqual(['170px']); // 12 + 150 de fundo, mais 8 de folga
  });

  it('🔴 SEM botões, descem para debaixo do MAPA — «por consequência», nas palavras dele', () => {
    // O mapa acaba a 40 lógicos; com a meia folga são 44, e a 3 px de CSS por lógico dão 132.
    const m = montar({ fundoDoMapa: 40 });
    m.api.tick();
    expect(m.ocupado()).toEqual(['132px']);
  });

  it('⚠️ e o mapa NOUTRO canto não os desce — ele não está por cima de nada ali', () => {
    // `fundoDoMinimapaNoAlto` responde `null` em qualquer canto que não seja o superior direito.
    const m = montar({ fundoDoMapa: null });
    m.api.tick();
    expect(m.ocupado()).toEqual(['0px']);
  });

  it('🎯 escreve SÓ quando o número muda — isto corre a cada quadro', () => {
    const m = montar({ ombros: caixa(894, 12, 66, 150) });
    m.api.tick(); m.api.tick(); m.api.tick();
    expect(m.ocupado()).toHaveLength(1);
    expect(m.recuos).toHaveLength(1);
  });

  it('🔴 caixa NULA num canto rolado não inventa ocupação', () => {
    // 📏 Medido no navegador em 03/10: a região pode começar ACIMA da janela (`top` negativo), e um elemento
    // escondido devolve um retângulo todo a zeros. Sem olhar para a altura, `0 - (-105)` dava ocupação vinda
    // de um botão que não está na tela.
    const m = montar({ ombros: caixa(0, 0, 0, 0), regiao: caixa(0, -105, 960, 540) });
    m.api.tick();
    expect(m.ocupado()).toEqual(['0px']);
    expect(m.recuos).toEqual([0]);
  });

  it('⚠️ um elemento DESLIGADO do documento não ocupa canto nenhum', () => {
    const m = montar({ ombros: caixa(894, 12, 66, 150, { ligado: false }) });
    m.api.tick();
    expect(m.recuos).toEqual([0]);
    expect(m.ocupado()).toEqual(['0px']);
  });

  it('[Zero] região ainda por medir não afirma nada, em vez de afirmar zero', () => {
    // Antes do primeiro layout a altura é 0, e dividir por ela daria `Infinity`.
    const m = montar({ ombros: caixa(894, 12, 66, 150), regiao: caixa(0, 0, 0, 0) });
    m.api.tick();
    expect(m.recuos).toEqual([]);
    expect(m.escrito).toEqual([]);
  });

  it('[Interface] a variável é a que o CSS lê', () => {
    // Um nome trocado aqui não quebra nada: o `max()` do CSS cai no `.4em` e os ícones voltam calados para
    // debaixo dos botões. Por isso o nome é exportado de um lado só, e este caso prende o par.
    expect(VAR_OCUPADO).toBe('--canto-dir-ocupado');
    const m = montar({ ombros: caixa(894, 12, 66, 150) });
    m.api.tick();
    expect(m.escrito[0][0]).toBe(VAR_OCUPADO);
  });

  it('sem região no documento (os testes), o tick é inerte em vez de rebentar', () => {
    const api = criarCantoSuperiorDireito({
      $: () => null, fundoDoMapa: () => 40, recuarMapa: () => { throw new Error('não devia recuar'); },
    });
    expect(() => api.tick()).not.toThrow();
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. `col.width` → `col.height` no recuo: cai o caso da largura (a leitura que o print desfez).
// 2. Trocar a ordem dos itens (o mapa a vencer os botões): cai o caso dos botões com o mapa ao lado.
// 3. Tirar o ramo do mapa (`fundoDoMapa`): cai o caso do «por consequência».
// 4. Tirar a guarda `r.height > 0` da coluna: cai o caso da caixa nula num canto rolado.
// 5. Tirar a guarda da região por medir: cai o caso [Zero] da região.
// 6. Escrever sempre, sem comparar com o último: cai o caso dos três ticks.
