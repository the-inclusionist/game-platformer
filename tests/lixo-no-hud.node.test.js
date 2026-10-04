// SPDX-License-Identifier: AGPL-3.0-or-later
// O QUE A CRIANÇA CARREGA APARECE NO CANTO SUPERIOR DIREITO (ui/seat-hud) — pedido do Dev em 03/10.
//
// ========================= POR QUE ISTO EXISTE =========================
// *«Os itens "lixo" que o personagem estiver carregando devem aparecer a parte superior direita da tela.»*
//
// 🔴 E O DESENHO NA BARRIGA FICA. Ele foi uma decisão escrita do Dev, com o motivo dentro
// (`game/recycling-scene`, o bloco «onde o objeto carregado aparece»): *«um objeto boiando sobre a cabeça não
// é alguém carregando alguma coisa — é um ícone de estado»*. As duas coisas não competem porque respondem a
// perguntas diferentes: o boneco DIZ que ela está carregando, o canto diz O QUÊ, sem obrigar a procurar o
// personagem com os olhos no meio do cenário.
//
// ⚠️ O MÓDULO NÃO SABE O QUE É LIXO, e isto é a parte do desenho que mais importa prender: `ui/seat-hud`
// recebe `{ icone, rotulo }` prontos e desenha «o que o assento carrega». Quem resolve o vocabulário é a raiz
// de composição, que já é dona do `t()` — ver `main.ts`, `ICONE_DO_LIXO` e `carga:`.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSeatHud } from '../app/js/ui/seat-hud.js';
import { MATERIAIS } from '../app/js/game/recycling.js';

const CSS = readFileSync(join(process.cwd(), 'app', 'js', 'ui', 'seat-hud.css'), 'utf8');
const RAIZ = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');

/* ===================== UM DOM DE MENTIRA, COM O POUCO QUE O MÓDULO TOCA =====================
 * `createElement`, `append`, `className`, `querySelector` por classe, atributos e `hidden`. Não é um
 * navegador e não finge ser: o que se mede aqui é QUANDO cada nó existe e o que ele diz, e isso é tudo o que
 * o `updateGameHud` decide. Onde o nó CAI na tela é CSS, e tem o seu próprio bloco no fim. */
function elemento(doc) {
  const el = {
    className: '', textContent: '', hidden: false, filhos: [], atributos: {},
    style: {}, dataset: {}, ownerDocument: doc,
    append(...fs) { for (const f of fs) if (typeof f !== 'string') this.filhos.push(f); },
    querySelectorAll(sel) {
      const classe = sel.replace(/^\./, '');
      return this.filhos.flatMap((f) => [
        ...(f.className.split(' ').includes(classe) ? [f] : []), ...f.querySelectorAll(sel),
      ]);
    },
    replaceChildren() { this.filhos = []; },
    setAttribute(k, v) { this.atributos[k] = String(v); },
    getAttribute(k) { return this.atributos[k] ?? null; },
    remove() {},
    querySelector(sel) {
      const classe = sel.replace(/^\./, '');
      for (const f of this.filhos) {
        if (f.className.split(' ').includes(classe)) return f;
        const fundo = f.querySelector(sel);
        if (fundo) return fundo;
      }
      return null;
    },
  };
  return el;
}

/** Um ícone por material, para o teste poder distinguir as peças da braçada umas das outras. */
const ICONES = { metal: '🥫', papel: '📦', plastico: '🧴', vidro: '🫙' };

/** Monta o HUD de `n` assentos; `carregando[i]` é a braçada daquele assento, na ordem da fila. */
function montar(carregando = [[]], n = carregando.length) {
  const doc = { createElement: () => elemento(doc) };
  const raiz = elemento(doc);
  raiz.className = 'game-hud';
  const seatHud = createSeatHud({
    t: (k) => k,
    $: (s) => (s === '#game-hud' ? raiz : null),
    getPlayers: () => Array.from({ length: n }, () => ({ activePower: null, quit: false })),
    getNumPlayers: () => n,
    objective: () => ({ name: { text: 'moedas', gender: 'f', plural: true }, have: 0, need: 10 }),
    icon: '🪙',
    powerShort: () => '—',
    cargas: (i) => (carregando[i] ?? []).map((m) => ({ icone: ICONES[m], rotulo: 'lata:' + m })),
  });
  seatHud.buildGameHud();
  const cargaDe = (i) => raiz.filhos[i]?.querySelector('.vphud-carga') ?? null;
  return { seatHud, raiz, cargaDe };
}

describe('ui/seat-hud — a carga no canto', () => {
  it('[Zero] de mãos vazias o canto está escondido, e não vazio', () => {
    // 📌 `hidden` e não uma caixa vazia: um nó presente sem conteúdo continua a ocupar a sua linha e a ser
    // lido pelo leitor de tela como um elemento sem nome.
    const m = montar([[]]);
    expect(m.cargaDe(0)).not.toBeNull();
    expect(m.cargaDe(0).hidden).toBe(true);
  });

  it('🎯 carregando, aparece com o ícone', () => {
    const m = montar([['metal']]);
    m.seatHud.updateGameHud();
    const c = m.cargaDe(0);
    expect(c.hidden).toBe(false);
    expect(c.querySelector('.vphud-ico').textContent).toBe('🥫');
  });

  it('🔴 A BRAÇADA: um ícone por peça, NA ORDEM DA FILA', () => {
    // O Dev, em 03/10: «desta forma é possível coletar vários e saber o que foi coletado». Saber O QUÊ pede
    // um ícone por peça; e a ordem não é enfeite — o primeiro é o da frente, o próximo a ir para a lixeira.
    const m = montar([['vidro', 'metal', 'papel']]);
    m.seatHud.updateGameHud();
    expect(m.cargaDe(0).querySelectorAll('.vphud-carga-item').map((e) => e.textContent))
      .toEqual([ICONES.vidro, ICONES.metal, ICONES.papel]);
  });

  it('⚠️ e a lista encolhe quando uma peça desce para a lixeira', () => {
    const mao = [['vidro', 'metal']];
    const m = montar(mao);
    m.seatHud.updateGameHud();
    expect(m.cargaDe(0).querySelectorAll('.vphud-carga-item')).toHaveLength(2);
    mao[0] = ['metal'];               // o vidro foi para a verde
    m.seatHud.updateGameHud();
    expect(m.cargaDe(0).querySelectorAll('.vphud-carga-item').map((e) => e.textContent))
      .toEqual([ICONES.metal]);
  });

  it('🔴 e o DOM só se refaz quando a braçada muda — senão o leitor de tela reanunciava a lista', () => {
    // 📏 Isto corre a cada quadro. Reconstruir quatro nós sessenta vezes por segundo não é só trabalho
    // perdido: um leitor de tela volta a anunciar a lista por cima de si mesma enquanto a criança anda.
    const m = montar([['vidro', 'metal']]);
    m.seatHud.updateGameHud();
    const antes = m.cargaDe(0).querySelectorAll('.vphud-carga-item')[0];
    m.seatHud.updateGameHud();
    expect(m.cargaDe(0).querySelectorAll('.vphud-carga-item')[0], 'o mesmo nó').toBe(antes);
  });

  it('⚠️ e volta a esconder-se ao depositar a última — senão o canto mentiria até ao fim da volta', () => {
    const mao = [['metal']];
    const m = montar(mao);
    m.seatHud.updateGameHud();
    expect(m.cargaDe(0).hidden).toBe(false);
    mao[0] = [];                   // a criança deitou o lixo na lixeira
    m.seatHud.updateGameHud();
    expect(m.cargaDe(0).hidden).toBe(true);
  });

  it('🔴 o nome vai SÓ no `aria-label` — escrito, ele ocupava metade do HUD', () => {
    // 📏 Medido no navegador em 03/10: «CAIXA DE PAPELÃO» dava 295 dos 640 px da linha, ao lado do relógio,
    // porque a letra é a da engine (`--hud-fs`, pedido do Dev) e não encolhe para caber. O ícone É o objeto,
    // que é o que o Dev pediu que aparecesse; e o nome não se perde — vai inteiro para quem lê com o ouvido,
    // e o jogo já o fala ao apanhar (`sr.lixo.pegou`).
    const m = montar([['papel']]);
    m.seatHud.updateGameHud();
    const peca = m.cargaDe(0).querySelectorAll('.vphud-carga-item')[0];
    expect(peca.getAttribute('aria-label')).toBe('lata:papel');
    expect(peca.textContent, 'e à vista fica só o ícone').toBe(ICONES.papel);
  });

  it('⚠️ a caixa é uma LISTA e cada peça um item dela', () => {
    // Sem os papéis, quem usa leitor de tela ouve ícones soltos em vez de «lista de 3 itens». O CSS que esta
    // caixa precisa apaga o papel implícito de uma `<ul>`, por isso ele é declarado à mão.
    const m = montar([['papel', 'metal']]);
    m.seatHud.updateGameHud();
    expect(m.cargaDe(0).getAttribute('role')).toBe('list');
    expect(m.cargaDe(0).querySelectorAll('.vphud-carga-item').map((e) => e.getAttribute('role')))
      .toEqual(['listitem', 'listitem']);
  });

  it('cada assento mostra a SUA carga — num jogo de dois, a mão de um não aparece na tela do outro', () => {
    const m = montar([['metal'], []]);
    m.seatHud.updateGameHud();
    expect(m.cargaDe(0).hidden).toBe(false);
    expect(m.cargaDe(1).hidden).toBe(true);
  });
});

describe('o vocabulário mora na raiz, e cobre os quatro materiais', () => {
  it('🔴 `ICONE_DO_LIXO` tem um ícone para cada material de `game/recycling`', () => {
    // 📏 As duas listas são escritas em ficheiros diferentes e podem divergir em silêncio: um material novo
    // em `MATERIAIS` apareceria no canto como o 🗑️ genérico, sem nada ficar vermelho. É o mesmo portão que
    // `recycling-tex` já tem contra `recycling`, pelo mesmo motivo.
    const bloco = RAIZ.slice(RAIZ.indexOf('const ICONE_DO_LIXO'));
    const corpo = bloco.slice(0, bloco.indexOf('});'));
    for (const m of MATERIAIS) {
      expect(corpo, `falta o ícone de ${m} em ICONE_DO_LIXO`).toMatch(new RegExp(`\\b${m}\\s*:`));
    }
  });

  it('⚠️ o nome vem do dicionário e não cravado — o piso do projeto são três idiomas', () => {
    expect(RAIZ).toMatch(/rotulo:\s*t\('lixo\.obj\.'\s*\+\s*it\.material\)/);
  });
});

describe('e o canto é o SUPERIOR DIREITO', () => {
  const regra = CSS.slice(CSS.indexOf('.vphud-carga {'), CSS.indexOf('}', CSS.indexOf('.vphud-carga {')));

  it('🎯 ancora à direita e ao topo, fora do fluxo da coluna', () => {
    // Sem `position: absolute` ele entrava na coluna da engine e caía por baixo do poder, à esquerda — que é
    // o canto oposto ao pedido.
    expect(regra).toMatch(/position:\s*absolute/);
    expect(regra).toMatch(/right:/);
    expect(regra).toMatch(/top:/);
    expect(regra).not.toMatch(/left:/);
  });

  it('⚠️ alinha pelo recuo DA ENGINE, para cair na mesma linha das moedas', () => {
    // 📌 `.4em`/`.55em` são o `padding` que o `.vphud` tem em `style.css:255`. Um número meu funcionaria hoje
    // e desalinhar-se-ia no dia em que a engine mudasse o recuo — que é o defeito que o Dev já apanhou uma
    // vez no relógio («use o padding da engine»).
    expect(regra).toMatch(/top:\s*max\(0?\.4em,/);
    expect(regra).toMatch(/right:\s*0?\.55em/);
  });

  it('🔴 e desce abaixo do ombro direito do pad, pela medida DA ENGINE', () => {
    // 📏 Medido em 03/10, depois de o R2 passar a ser declarado: o pad de toque ganhou um botão R2 naquele
    // canto, e um `elementFromPoint` sobre o 📦 devolvia `touch-btn touch-ombro` — o ícone no DOM, por baixo
    // do botão. `--shoulders-right-reach` é a resposta da própria engine («where they and anything else
    // meet, the other thing moves»), e vale `0px` quando aquele canto não tem ombro nenhum.
    // ⚠️ Um número meu — «desce 72 px quando há pad» — ficaria errado no dia em que o alvo mínimo mudasse,
    // e ficaria errado em silêncio: o ícone voltava para trás do botão e o teste continuava verde.
    expect(regra).toMatch(/var\(--shoulders-right-reach,\s*0px\)/);
  });

  it('⚠️ e não escreve o nome ao lado — é o que o fazia ocupar metade da linha', () => {
    // Um `.vphud-carga-nome` de volta ao DOM poria o nome ao lado do ícone outra vez, e nada o apanharia:
    // o `aria-label` continuaria certo, os casos de cima continuariam verdes, e o HUD voltaria ao que o
    // navegador reprovou em 03/10.
    expect(readFileSync(join(process.cwd(), 'app', 'js', 'ui', 'seat-hud.ts'), 'utf8'))
      .not.toMatch(/vphud-carga-nome/);
  });

  it('🔴 e desce em COLUNA, para a braçada não avançar sobre o relógio', () => {
    // Quatro ícones lado a lado atravessariam o topo até ao relógio, que está ao centro. Descendo pela borda
    // direita eles não disputam com nada — e a ordem de cima para baixo é a mesma da fila.
    expect(regra).toMatch(/flex-direction:\s*column/);
    expect(regra).toMatch(/align-items:\s*flex-end/);
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. `carga.hidden = c === null` → `= false`: cai o caso [Zero] e o do depósito.
// 2. Tirar o `setAttribute('aria-label', …)`: cai o caso do nome inteiro.
// 3. Tirar uma entrada de `ICONE_DO_LIXO`: cai o caso dos quatro materiais.
// 4. `right` → `left` na regra CSS: cai o caso do canto.
// 5. `top: max(.4em, var(--shoulders-right-reach))` → `top: .4em`: cai o caso do ombro (o ícone volta
//    para trás do botão R2 do pad) e o do recuo da engine.
// 6. Voltar a escrever o nome num `.vphud-carga-nome`: cai o caso do nome ao lado.
