// SPDX-License-Identifier: AGPL-3.0-or-later
// O ESTADO DO LIXO NO MUNDO — quem está no chão, quem está na mão, e o que a lixeira faz.
//
// A terceira peça da reciclagem, e a única com estado. As outras duas são funções sobre números; esta MUTA uma
// lista, e é por isso que os casos aqui são quase todos sobre o que acontece DEPOIS: pegou e a mão ficou cheia,
// errou a cor e o item continuou na mão, passou da placa e o item voltou ao chão.
//
// ⚠️ E DOIS CASOS AQUI NÃO SÃO SOBRE MECÂNICA, SÃO SOBRE PEDAGOGIA, e por isso ficam explicados no próprio teste:
// o rodízio dos materiais (um mapa nunca nasce sem vidro) e o item que VOLTA PARA A MÃO quando a cor está errada
// (errar a cor não pode custar refazer o percurso). Os dois são decisões do Dev que uma "simplificação" futura
// desfaria sem perceber, porque nenhuma das duas parece regra de jogo olhando só para o código.
//
// MUTAÇÕES CONFERIDAS (no fim do arquivo).
import { describe, it, expect } from 'vitest';
import {
  montarItens, cargaDe, cargasDe, pegarPerto, depositar, faltamDescartar, lixeiraSob, entrouNaLixeira,
} from '../app/js/game/recycling-world.js';
import { MATERIAIS, LIXEIRA_DE } from '../app/js/game/recycling.js';
import { PODE } from '../app/js/game/carry.js';

/** Quantas cabem na mão — LIDO de quem decide (`game/carry.PODE`), nunca repetido aqui. */
const CABEM = PODE.lixo.cabem;

/** Escolhedor determinístico: os `n` primeiros, na ordem. É por onde o produto injeta o embaralhamento. */
const emOrdem = (total, n) => Array.from({ length: Math.min(n, total) }, (_, i) => i);
/** Pontos alinhados numa fileira, 10px de distância entre eles. */
const fileira = (n) => Array.from({ length: n }, (_, i) => ({ x: i * 10, y: 100 }));
/** Um item solto no chão, para os casos que não precisam do `montarItens`. */
const solto = (x, material) => ({ x, y: 100, material, descartado: false, dono: null, pegoEm: null });

describe('reciclagem · o mundo', () => {
  /* ===================== nascimento ===================== */

  it('[Right] os quatro materiais aparecem em RODÍZIO, nunca sorteados', () => {
    // Com sorteio, um mapa pode nascer sem vidro nenhum — e a criança que precisa treinar vidro joga a fase
    // inteira sem encontrar um. O rodízio garante os quatro sempre que houver quatro lugares.
    const itens = montarItens(fileira(8), 8, emOrdem);
    expect(itens.map((i) => i.material)).toEqual([...MATERIAIS, ...MATERIAIS]);
  });

  it('[Boundary] pedindo mais itens do que há lugar, nasce um por lugar e nada além', () => {
    const itens = montarItens(fileira(3), 99, emOrdem);
    expect(itens).toHaveLength(3);
    expect(new Set(itens.map((i) => i.x)).size, 'nenhum item em cima de outro').toBe(3);
  });

  it('[Zero] sem lugar ou sem pedido, não nasce nada — e não estoura', () => {
    expect(montarItens([], 4, emOrdem)).toEqual([]);
    expect(montarItens(fileira(4), 0, emOrdem)).toEqual([]);
    expect(montarItens(fileira(4), -3, emOrdem)).toEqual([]);
  });

  it('[Right] o item nasce no chão, de ninguém e por descartar', () => {
    const [it] = montarItens(fileira(1), 1, emOrdem);
    expect(it).toMatchObject({ x: 0, y: 100, dono: null, descartado: false });
  });

  /* ===================== pegar ===================== */

  it('[Right] pega o item mais PRÓXIMO dentro do alcance, e ele passa a ter dono', () => {
    const itens = [solto(0, 'metal'), solto(30, 'vidro'), solto(8, 'papel')];
    const pego = pegarPerto(itens, 0, 10, 100, 20, CABEM);
    expect(pego.material, 'o de x=8 está a 2px; o de x=0 está a 10').toBe('papel');
    expect(pego.dono).toBe(0);
    expect(cargaDe(itens, 0)).toBe(pego);
  });

  it('[Boundary] fora do alcance não pega, e no limite exato pega', () => {
    const itens = [solto(20, 'metal')];
    expect(pegarPerto(itens, 0, 0, 100, 19.9, CABEM), 'a 20px de distância, alcance 19,9').toBe(null);
    expect(pegarPerto(itens, 0, 0, 100, 20, CABEM), 'alcance exatamente 20').toBeTruthy();
  });

  it('🔴 [Right] A BRAÇADA: mãos ocupadas pegam o segundo, e a fila guarda a ordem', () => {
    // 🔴 ESTE CASO DIZIA O CONTRÁRIO ATÉ 03/10 — «[Zero] MÃOS OCUPADAS NÃO PEGAM O SEGUNDO» —, e a
    // justificação escrita nele era que o descarte tem de ser uma escolha POR ITEM. O Dev reprovou a trava
    // a jogar: «bloquear para um de cada vez tornou o jogo "chato" e "menos interessante"». A metade certa
    // do argumento antigo não caiu, MUDOU-SE: quem desce para a lixeira é o item da FRENTE da fila
    // (`cargaDe`), um de cada vez, com a cor que ELE pede. Ver o caso da fila, logo abaixo.
    const itens = [solto(0, 'metal'), solto(2, 'vidro')];
    pegarPerto(itens, 0, 0, 100, 20, CABEM);
    expect(pegarPerto(itens, 0, 0, 100, 20, CABEM), 'o segundo também vem').toBeTruthy();
    expect(itens.filter((i) => i.dono === 0)).toHaveLength(2);
  });

  it('⚠️ [Boundary] e a mão tem teto: cheia, não entra mais nada', () => {
    const itens = Array.from({ length: CABEM + 1 }, (_, k) => solto(k, 'metal'));
    for (let k = 0; k < CABEM; k++) expect(pegarPerto(itens, 0, 0, 100, 99, CABEM), 'a ' + (k + 1)).toBeTruthy();
    expect(pegarPerto(itens, 0, 0, 100, 99, CABEM), 'a seguinte').toBe(null);
    expect(itens.filter((i) => i.dono === 0)).toHaveLength(CABEM);
  });

  it('🎯 [Right] A FILA É A ORDEM EM QUE APANHOU, e não a ordem do chão', () => {
    // 📏 O `itens[]` está na ordem em que a volta os espalhou. Se `cargaDe` lesse essa ordem, a lixeira
    // receberia um item que a criança não escolheu — e ela ouviria «essa não é a lixeira do vidro» depois
    // de ter ido à lixeira da lata que acabou de apanhar.
    const itens = [solto(0, 'metal'), solto(2, 'vidro')];
    pegarPerto(itens, 0, 2, 100, 1, CABEM);    // o VIDRO primeiro, que está longe do início da lista
    pegarPerto(itens, 0, 0, 100, 1, CABEM);    // a lata depois
    expect(cargasDe(itens, 0).map((i) => i.material)).toEqual(['vidro', 'metal']);
    expect(cargaDe(itens, 0).material, 'o da frente é o que vai para a lixeira').toBe('vidro');
  });

  it('🔴 [Interface] a mão cabe UM DE CADA MATERIAL — os dois números são lidos, não repetidos', () => {
    // «Uma braçada cheia» é um de cada cor, e é também o que a volta põe no chão (`quantosItens` na raiz).
    // Os dois números vivem em ficheiros diferentes e podem divergir em silêncio: um material novo faria a
    // mão deixar de caber a volta inteira, sem nada ficar vermelho.
    expect(PODE.lixo.cabem).toBe(MATERIAIS.length);
  });

  it('⚠️ depositar TIRA DA FILA, e o seguinte passa à frente', () => {
    const itens = [solto(0, 'metal'), solto(2, 'vidro')];
    pegarPerto(itens, 0, 0, 100, 1, CABEM);
    pegarPerto(itens, 0, 2, 100, 1, CABEM);
    expect(depositar(itens, 0, LIXEIRA_DE.metal).pontos, 'a lata, que estava à frente').toBe(1);
    expect(cargasDe(itens, 0).map((i) => i.material)).toEqual(['vidro']);
    expect(itens[0].pegoEm, 'quem saiu perde o lugar na fila').toBe(null);
  });

  it('[Zero] item de outro jogador e item já descartado ficam invisíveis para quem pega', () => {
    const itens = [solto(0, 'metal'), solto(2, 'vidro')];
    itens[0].dono = 1;
    itens[1].descartado = true;
    expect(pegarPerto(itens, 0, 0, 100, 50, CABEM)).toBe(null);
  });

  /* ===================== a placa e o arremesso saíram daqui ======================
     `passarPelaPlaca` e `arremessar` foram embora em 2026-08-28, e os casos deles com elas. A regra que as
     duas implementavam estava invertida: soltar e lançar o lixo SÃO a desobediência à placa, não o conserto
     dela. Quem barra agora é `game/recycling.travarNaPlaca` (barra a CRIANÇA) e `game/carry.PODE` (com lixo
     na mão não há soltar nem arremessar). Os casos moraram em `tests/reciclagem.node.test.js`. */

  /* ===================== descarte ===================== */

  it('[Right] lixeira CERTA: um ponto de comportamento e o item sai do mundo', () => {
    const itens = [solto(0, 'metal')];
    pegarPerto(itens, 0, 0, 100, 20, CABEM);
    const acao = depositar(itens, 0, LIXEIRA_DE.metal);
    expect(acao).toEqual({ pontos: 1, fala: 'sr.lixo.acertou' });
    expect(itens[0].descartado).toBe(true);
    expect(cargaDe(itens, 0), 'mãos livres de novo').toBe(null);
  });

  it('[Right] LIXEIRA ERRADA: o item VOLTA PARA A MÃO, não para o chão', () => {
    // Devolver ao chão faria a criança refazer o percurso inteiro por ter errado uma COR — punição disfarçada
    // de física, e cobrada justamente de quem ainda está aprendendo a diferença entre as cores.
    const itens = [solto(0, 'metal')];
    pegarPerto(itens, 0, 0, 100, 20, CABEM);
    const acao = depositar(itens, 0, LIXEIRA_DE.vidro);
    expect(acao).toEqual({ pontos: 0, fala: 'sr.lixo.errou' });
    expect(cargaDe(itens, 0), 'continua na mão para tentar de novo').toBeTruthy();
    expect(itens[0].descartado).toBe(false);
  });

  it('[Zero] depositar de mãos vazias não pontua', () => {
    expect(depositar([], 0, 'azul')).toEqual({ pontos: 0, fala: null });
  });

  it('[Interface] cada material tem UMA lixeira certa e três erradas', () => {
    for (const m of MATERIAIS) {
      const certas = ['azul', 'vermelha', 'amarela', 'verde'].filter((cor) => {
        const itens = [solto(0, m)];
        pegarPerto(itens, 0, 0, 100, 20, CABEM);
        return depositar(itens, 0, cor).pontos === 1;
      });
      expect(certas, `${m}`).toEqual([LIXEIRA_DE[m]]);
    }
  });

  /* ===================== a lixeira sob o jogador ===================== */

  it('[Right] `lixeiraSob` acha a lixeira em que o jogador encostou, e devolve -1 fora de todas', () => {
    const ls = [{ x: 0, y: 100, cor: 'azul' }, { x: 14, y: 100, cor: 'vermelha' }];
    expect(lixeiraSob(2, 105, ls, 12, 15)).toBe(0);
    expect(lixeiraSob(20, 105, ls, 12, 15)).toBe(1);
    expect(lixeiraSob(60, 105, ls, 12, 15)).toBe(-1);
    expect(lixeiraSob(2, 40, ls, 12, 15), 'lá em cima, longe do chão').toBe(-1);
  });

  it('[Boundary] a folga deixa encostar AO LADO, sem precisar pisar em cima', () => {
    const ls = [{ x: 20, y: 100, cor: 'verde' }];
    expect(lixeiraSob(17, 105, ls, 12, 15), 'três pixels à esquerda, com a folga padrão').toBe(0);
    expect(lixeiraSob(15, 105, ls, 12, 15), 'cinco pixels: fora').toBe(-1);
  });

  it('[Boundary] ENTRE DUAS LIXEIRAS, vale a MAIS PRÓXIMA — nunca a primeira da lista', () => {
    // As quatro ficam a 2px uma da outra, então com folga as caixas se sobrepõem. Uma varredura que parasse
    // na primeira escolheria sempre a da esquerda, e a criança parada entre duas depositaria na errada sem
    // entender por quê — aprendendo que a cor não importa, que é o oposto do conteúdo.
    const ls = [{ x: 0, y: 100, cor: 'azul' }, { x: 14, y: 100, cor: 'vermelha' }];
    expect(lixeiraSob(15, 105, ls, 12, 15), 'centros em 6 e 20: 15 está mais perto de 20').toBe(1);
    expect(lixeiraSob(11, 105, ls, 12, 15), 'e 11 está mais perto de 6').toBe(0);
  });

  it('[Zero] O DESCARTE DISPARA NA ENTRADA, nunca enquanto se está dentro', () => {
    // Sem esta guarda, uma criança parada na lixeira errada ouviria "não é essa" sessenta vezes por segundo —
    // e quem usa leitor de tela ouviria a fala reiniciando sem parar, o que na prática tranca o jogo.
    expect(entrouNaLixeira(-1, 2), 'chegou').toBe(true);
    expect(entrouNaLixeira(2, 2), 'continua parada na mesma').toBe(false);
    expect(entrouNaLixeira(2, 3), 'passou para a lixeira do lado').toBe(true);
    expect(entrouNaLixeira(2, -1), 'saiu de todas').toBe(false);
  });

  /* ===================== o que falta ===================== */

  it('[Right] `faltamDescartar` conta só o que ainda está no mundo', () => {
    const itens = montarItens(fileira(4), 4, emOrdem);
    expect(faltamDescartar(itens)).toBe(4);
    pegarPerto(itens, 0, 0, 100, 5, CABEM);
    expect(faltamDescartar(itens), 'na mão ainda é do mundo').toBe(4);
    depositar(itens, 0, LIXEIRA_DE[itens[0].material]);
    expect(faltamDescartar(itens)).toBe(3);
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
//   · tirando o teto de `pegarPerto` → "[Boundary] e a mão tem teto" reprova, e o efeito real é uma pilha sem
//     fim, que o canto do HUD não desenha e o tronco do personagem não mostra.
//   · fazendo `cargaDe` voltar a um `find` sobre `itens` → "[Right] A FILA É A ORDEM EM QUE APANHOU" reprova, e
//     o efeito real é a lixeira receber um item que a criança não escolheu.
//   · fazendo `depositar` escolher o item que COMBINA com a lixeira → "[Right] A FILA" continua verde, mas o
//     conteúdo do jogo some: com um de cada cor na mão, QUALQUER lixeira passa a estar certa. É a razão de
//     `cargaDe` dizer «o da frente» e não «o que combina», e está escrita lá.
//   · fazendo `depositar` soltar o item no chão quando a cor está errada → "[Right] LIXEIRA ERRADA" reprova, e
//     o efeito real é refazer o percurso como preço de errar uma cor.
//   · trocando o rodízio de `montarItens` por um material fixo → "[Right] os quatro materiais em RODÍZIO"
//     reprova, e o efeito real é um mapa nascer sem vidro nenhum.
//   · fazendo `depositar` pontuar 1 em qualquer lixeira → "[Interface] cada material tem UMA lixeira certa"
//     reprova, e o efeito real é a criança aprender que qualquer cor serve, e levar isso para a rua.
