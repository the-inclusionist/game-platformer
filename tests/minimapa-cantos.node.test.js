// SPDX-License-Identifier: AGPL-3.0-or-later
// ONDE O MINIMAPA FICA (render/minimap) — as duas regras que o movem, pedidas pelo Dev em 03/10.
//
// ========================= AS DUAS REGRAS =========================
//  1. A FUGA — *«se o personagem "toca" no minimapa, ele deve mudar de posição para a direita da tela»*. Um
//     mapa num canto fixo acaba por tapar o chão onde a criança está a pisar, e aí atrapalha mais do que
//     informa. Ele troca de LADO e mantém a altura.
//  2. O R2 — *«botão R2 altera a disposição do mapa na tela, entre canto inferior esquerdo, canto inferior
//     direito e canto superior direito»*. Três cantos, na ordem que ele deu.
//
// 🔴 ESTE FICHEIRO SUBSTITUI `minimapa-foge.node.test.js`, que media a regra por uma CÓPIA da fórmula: ele
// reproduzia a conta de `tocaOMinimapa` localmente, e por isso mutar o módulo não o movia — media o meu
// raciocínio, não o código. O `vi.mock('pixi.js')` que `recycling-tex` já usava desfaz a desculpa: com um
// `Container` de mentira o módulo corre inteiro no project `node`, e o que se afere é a posição que ele
// escreve de facto.
//
// ⚠️ E AS ASSERÇÕES SÃO POR CANTO, não por pixel: `x < metade da tela` é a esquerda. Comparar com
// `LOGICAL_W - MM_VIEW_W - MM_PAD` repetiria a aritmética do módulo e voltaria ao mesmo vício — além de
// ficar vermelho no dia em que a folga mudasse, que não é defeito nenhum. «Canto inferior esquerdo» é o que
// o Dev pediu, e é o que se mede.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** O mínimo de PixiJS que o módulo toca: um nó com posição e filhos. */
class NoFalso {
  constructor() { this.x = 0; this.y = 0; this.alpha = 1; this.visible = true; this.mask = null; this.filhos = []; }
  addChild(...fs) { this.filhos.push(...fs); return fs[0]; }
  removeChildren() { const f = this.filhos; this.filhos = []; return f; }
  beginFill() { return this; } drawRect() { return this; } endFill() { return this; } clear() { return this; }
}
vi.mock('pixi.js', () => ({ Container: NoFalso, Graphics: NoFalso }));

const { LOGICAL_W, LOGICAL_H } = await import('@the-inclusionist/engine/core/constants.js');
const { initMinimap, drawMinimapPlayer, proximoCantoDoMinimapa, getMinimap } =
  await import('../app/js/render/minimap.js');

/** O canto em que o mapa está AGORA, em palavras — metade da tela para cada lado. */
function canto() {
  const mm = getMinimap();
  return (mm.y < LOGICAL_H / 2 ? 'superior ' : 'inferior ') + (mm.x < LOGICAL_W / 2 ? 'esquerdo' : 'direito');
}

/** O personagem no ponto da TELA `(x, y)`: com a câmara em (0,0), mundo e tela coincidem. */
const andarAte = (x, y) => drawMinimapPlayer(x, y, 0, 0);

/** Um ponto logo dentro do retângulo do mapa, seja qual for o canto e o tamanho dele. */
const dentroDoMapa = () => [getMinimap().x + 1, getMinimap().y + 1];

beforeEach(() => { initMinimap(new NoFalso(), 20, 10); });

describe('o R2 percorre os três cantos que o Dev nomeou', () => {
  it('[Zero] o mapa nasce no canto inferior esquerdo', () => {
    expect(canto()).toBe('inferior esquerdo');
  });

  it('🎯 inferior esquerdo → inferior direito → superior direito → e volta ao primeiro', () => {
    // A ORDEM É O PEDIDO, literalmente nesta sequência. Trocar dois cantos de lugar não quebra nada no
    // produto — e é exatamente por isso que tem de quebrar aqui.
    proximoCantoDoMinimapa(); expect(canto()).toBe('inferior direito');
    proximoCantoDoMinimapa(); expect(canto()).toBe('superior direito');
    proximoCantoDoMinimapa(); expect(canto()).toBe('inferior esquerdo');
  });

  it('⚠️ e continua a girar — o ciclo não tem fim nem canto preso', () => {
    const vistos = [];
    for (let i = 0; i < 7; i++) { proximoCantoDoMinimapa(); vistos.push(canto()); }
    expect(vistos).toEqual([
      'inferior direito', 'superior direito', 'inferior esquerdo',
      'inferior direito', 'superior direito', 'inferior esquerdo', 'inferior direito',
    ]);
  });

  it('🔴 de um canto FORA da lista, o R2 recomeça do primeiro', () => {
    // O superior ESQUERDO só existe pela fuga (ver o bloco seguinte) e não está no ciclo. Sem uma resposta
    // para ele, o `findIndex` devolvia -1 e um `CANTOS[i + 1]` cru daria `undefined` — o mapa ficaria preso
    // ali, e o botão que o Dev acabou de pedir não faria nada justamente depois de o personagem o empurrar.
    proximoCantoDoMinimapa(); proximoCantoDoMinimapa();   // superior direito
    andarAte(...dentroDoMapa());                           // a fuga leva-o ao superior esquerdo
    expect(canto()).toBe('superior esquerdo');
    proximoCantoDoMinimapa();
    expect(canto()).toBe('inferior esquerdo');
  });
});

describe('a fuga tira o mapa de cima do personagem', () => {
  it('🎯 tocado à esquerda, o mapa vai para a direita', () => {
    andarAte(...dentroDoMapa());
    expect(canto()).toBe('inferior direito');
  });

  it('🔴 e tocado à direita VOLTA — senão a criança perdia o canto esquerdo para sempre', () => {
    // O Dev nomeou só o primeiro sentido, que é o do canto onde o mapa nasce. Sem o regresso, quem
    // atravessasse a tela uma vez empurrava o mapa e ele nunca mais voltava.
    andarAte(...dentroDoMapa());
    expect(canto()).toBe('inferior direito');
    andarAte(...dentroDoMapa());
    expect(canto()).toBe('inferior esquerdo');
  });

  it('⚠️ longe do mapa, nada se mexe', () => {
    andarAte(LOGICAL_W - 1, LOGICAL_H - 1);   // canto oposto, no chão
    expect(canto()).toBe('inferior esquerdo');
  });

  it('⚠️ a ALTURA conta: quem salta no céu, por cima do mapa, não o empurra', () => {
    // Sem a comparação vertical o mapa fugiria de um personagem a meia tela de distância, no ar.
    andarAte(getMinimap().x + 1, 0);
    expect(canto()).toBe('inferior esquerdo');
  });

  it('a folga conta como toque — não é preciso encostar para o mapa já atrapalhar', () => {
    const mm = getMinimap();
    andarAte(mm.x + 1, mm.y - 2);   // dois pixels ACIMA da borda de cima
    expect(canto()).toBe('inferior direito');
  });

  it('🔴 SEM a câmara o mapa não se mexe, e é assim que o resto do jogo o desenha', () => {
    // `camX`/`camY` são opcionais: sem eles não há posição de tela para comparar, e a resposta certa é não
    // decidir. Um módulo que adivinhasse a câmara faria o mapa saltar fora da partida — nos testes de
    // render, por exemplo, que chamam esta função com dois argumentos.
    drawMinimapPlayer(...dentroDoMapa());
    expect(canto()).toBe('inferior esquerdo');
  });

  it('a fuga mantém a ALTURA do canto — ela resolve o chão, não o céu', () => {
    proximoCantoDoMinimapa(); proximoCantoDoMinimapa();   // superior direito
    andarAte(...dentroDoMapa());
    expect(canto()).toBe('superior esquerdo');
  });
});

describe('e o R2 chega lá', () => {
  // 📌 POR LEITURA DO FONTE porque a raiz arranca o PixiJS de verdade e não entra num teste — a mesma razão
  // que `reach-notice-plataforma` já regista. O que se prende é a LIGAÇÃO: o módulo acima pode estar
  // perfeito e o botão não chamar ninguém.
  const RAIZ = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');
  const PRESET = readFileSync(join(process.cwd(), 'app', 'js', 'game', 'platformer-preset.ts'), 'utf8');

  it('🎯 a raiz adianta o canto quando o `rightTrigger` é pressionado', () => {
    const corpo = RAIZ.slice(RAIZ.indexOf('function receberComando'));
    expect(corpo.slice(0, corpo.indexOf('\n}'))).toMatch(/rightTrigger'\s*\)\s*proximoCantoDoMinimapa\(\)/);
  });

  it('🔴 e no PRESSIONAR, não no soltar — senão o mapa andava dois cantos por toque', () => {
    // `receberComando` sai cedo quando o comando não é uma aresta de pressão (`!mudou || !comando.pressed`).
    // Sem essa saída, pressionar e soltar contariam duas vezes e o canto do meio nunca se veria.
    const corpo = RAIZ.slice(RAIZ.indexOf('function receberComando'));
    expect(corpo.slice(0, corpo.indexOf('\n}'))).toMatch(/if\s*\(!mudou\s*\|\|\s*!comando\.pressed\)\s*return;/);
  });

  it('⚠️ o preset DECLARA a posição, senão ela não tem nome em lado nenhum', () => {
    // Um `rightTrigger` ligado e não declarado funcionaria — em silêncio, para quem o descobrisse por acaso.
    // O assistente de controle não o perguntaria, o remapeamento não o mostraria, a ajuda não o listaria.
    expect(PRESET).toMatch(/rightTrigger:\s*\{\s*labelKey:\s*'act\.mapa',\s*shortKey:\s*'legend\.mapa'\s*\}/);
  });
});

describe('antes do boot', () => {
  it('[Zero] o R2 e a fuga são inertes sem minimapa montado, em vez de rebentarem', async () => {
    vi.resetModules();
    const m = await import('../app/js/render/minimap.js');   // módulo novo, sem `initMinimap`
    expect(() => { m.proximoCantoDoMinimapa(); m.drawMinimapPlayer(0, 0, 0, 0); }).not.toThrow();
    expect(m.getMinimap()).toBeNull();
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. Trocar a ordem de dois cantos em `CANTOS`: cai a sequência do R2.
// 2. `CANTOS[(i + 1) % CANTOS.length]` → `CANTOS[i + 1]`: cai o caso do canto fora da lista.
// 3. `_mmNaDireita = !_mmNaDireita` → `= true`: cai o regresso da fuga.
// 4. Tirar `telaY >= y0 && telaY <= y1` de `tocaOMinimapa`: cai o caso do céu.
// 5. `MM_FOLGA` 6 → 0: cai o caso da folga.
// 6. Tirar a guarda `camX !== undefined`: cai o caso de desenhar sem câmara.
// 7. Fazer a fuga escrever também `_mmEmCima`: cai o caso da altura mantida.
// 8. Tirar a chamada do `rightTrigger` em `main.ts`: cai o caso da ligação.
// 9. Tirar `rightTrigger` do preset: cai o caso da declaração.
