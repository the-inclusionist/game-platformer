// SPDX-License-Identifier: AGPL-3.0-or-later
// A DECLARAÇÃO DESTE JOGO, aferida pela propria engine.
//
// 📌 O caso que vale mais e' o primeiro, e ele nao afirma nada de meu: `conformanceProblems` e' a funcao que
// o `createGame` chama no arranque para RECUSAR uma declaracao malformada. Um teste que repetisse a lista de
// campos aqui seria uma segunda copia do contrato, e as duas divergiriam no dia em que uma mudasse.
//
// Os outros prendem as duas RESPOSTAS — `holdsAtOnce` e `holdsKeys` —, que nao sao detalhes de forma: sao
// afirmacoes sobre a barreira que a crianca encontra, e o contrato aceita qualquer numero.
import { describe, it, expect } from 'vitest';
import { conformanceProblems } from '@the-inclusionist/engine/core/contract.js';
import { createPlatformerDeclaration } from '../app/js/declaration/platformer-declaration.js';

// Um mundo falso de 12x8 tiles: linha 6 solida, uma poca de agua em (3,5), uma escada em (8,4) e lava em
// (5,5). Basta para exercitar os quatro ramos do `roleAt` sem carregar um nivel de verdade.
const TILE = 16;
// Os numeros do mapa deste jogo, escritos como LITERAIS e nao lidos de `TILE_TYPES`: le-los da engine faria
// a asserçao andar junto com ela, e um caso que se move com aquilo que afere nao afere nada.
const AGUA = 3, ESCADA = 4, LAVA = 9, PEDRA = 6, AR = 1;
const GRADE = Array.from({ length: 8 }, (_, ty) => Array.from({ length: 12 }, (_, tx) => {
  if (ty === 6) return PEDRA;
  if (tx === 3 && ty === 5) return AGUA;
  if (tx === 8 && ty === 4) return ESCADA;
  if (tx === 5 && ty === 5) return LAVA;
  return AR;
}));

const arreio = (over = {}) => createPlatformerDeclaration({
  mundo: () => ({ larguraPx: 12 * TILE, alturaPx: 8 * TILE, tile: TILE }),
  tipoDoTile: (tx, ty) => (GRADE[ty] && GRADE[ty][tx] !== undefined ? GRADE[ty][tx] : null),
  ehSolido: (tx, ty) => (GRADE[ty] ? GRADE[ty][tx] === PEDRA : false),
  alvosDe: (i) => (i === 0 ? [{ x: 2 * TILE, y: 5 * TILE }] : []),
  jogadorEm: (i) => (i === 0 ? { x: 32, y: 96, facing: 1 } : null),
  progressoDe: () => ({ tem: 3, precisa: 10 }),
  t: (k) => k,
  seletorDoMundo: '#game-region',
  ...over,
});

describe('a engine aceita a declaracao deste jogo', () => {
  it('[Right] `conformanceProblems` nao tem nada a dizer', () => {
    expect(conformanceProblems(arreio())).toEqual([]);
  });
});

describe('as duas respostas sobre a barreira', () => {
  // A distincao em que o campo pega: o que o jogo EXIGE, e nao o que ele aceita. Correr para a direita e
  // saltar sao tres posicoes ao mesmo tempo; o acorde trocar+especial NAO levanta a conta, porque tem rota
  // alternativa (segurar trocar sozinho ~0,3s).
  it('[Right] exige TRES posicoes seguradas ao mesmo tempo', () => {
    const n = arreio().holdsAtOnce();
    expect(n).toBe(3);
    expect(Number.isInteger(n) && n >= 1).toBe(true);
  });

  // Segundo campo porque `holdsAtOnce` nao responde isto: aquele conta posicoes SIMULTANEAS e recusa zero.
  // Responder `false` REMOVE o ☝️ da barra em vez de o esconder — e este jogo segura direcao, correr e pular.
  it('[Right] declara que segura tecla, que e o que mantem a trava disponivel', () => {
    expect(arreio().holdsKeys()).toBe(true);
  });
});

describe('o papel de cada sitio, nos quatro ramos', () => {
  it('[Right] lava e perigo, agua e agua, escada e escalavel', () => {
    const d = arreio();
    expect(d.roleAt({ x: 5 * TILE, y: 5 * TILE })).toBe('hazard');
    expect(d.roleAt({ x: 3 * TILE, y: 5 * TILE })).toBe('water');
    expect(d.roleAt({ x: 8 * TILE, y: 4 * TILE })).toBe('climb');
  });

  it('[Right] pedra e estrutura e ar e livre', () => {
    const d = arreio();
    expect(d.roleAt({ x: 0, y: 6 * TILE })).toBe('structure');
    expect(d.roleAt({ x: 0, y: 0 })).toBe('free');
  });

  // ⚠️ O CASO QUE PROTEGE A CRIANCA CEGA, e por isso e' [Boundary] e nao zelo: fora da grade responde
  // ESTRUTURA. Se respondesse 'free', a bengala e o sonar diriam "espaco livre" para uma celula que nao
  // existe — um convite a andar para fora do mundo.
  it('[Boundary] fora da grade e estrutura, nunca espaco livre', () => {
    const d = arreio();
    expect(d.roleAt({ x: -1 * TILE, y: 0 })).toBe('structure');
    expect(d.roleAt({ x: 99 * TILE, y: 0 })).toBe('structure');
    expect(d.roleAt({ x: 0, y: 99 * TILE })).toBe('structure');
  });
});

describe('foco, alvos e objetivo', () => {
  it('[Right] o foco olha para leste ou oeste, nunca norte ou sul', () => {
    expect(arreio().focusOf(0).heading).toBe('e');
    expect(arreio({ jogadorEm: () => ({ x: 32, y: 96, facing: -1 }) }).focusOf(0).heading).toBe('w');
  });

  // Assento vazio devolve `null`, e isso nao e' falha: inventar um foco poria o sonar a medir de um sitio
  // onde nao ha ninguem.
  it('[Boundary] assento que nao entrou nao tem foco', () => {
    expect(arreio().focusOf(1)).toBeNull();
  });

  it('[Right] os alvos sao POR JOGADOR — em multi-tela cada crianca tem o seu conjunto', () => {
    expect(arreio().targetsOf(0)).toEqual([{ x: 2 * TILE, y: 5 * TILE }]);
    expect(arreio().targetsOf(1)).toEqual([]);
  });

  it('[Right] o objetivo diz quantos tem e quantos precisa', () => {
    const o = arreio().objectiveOf(0);
    // A chave e' a plural, e e' a MESMA que o HUD usa — uma segunda chave para o mesmo nome divergiria
    // na traducao seguinte.
    expect(o.name.text).toBe('hud.nome.moedas');
    expect(o.have).toBe(3);
    expect(o.need).toBe(10);
  });

  // Nomear tudo faria a palavra deixar de significar alguma coisa: so ha nome onde ha item.
  it('[Boundary] `nameAt` so nomeia onde ha item', () => {
    const d = arreio();
    expect(d.nameAt({ x: 2 * TILE, y: 5 * TILE })).not.toBeNull();
    expect(d.nameAt({ x: 10 * TILE, y: 0 })).toBeNull();
  });
});

describe('a topologia acompanha o mundo', () => {
  // FUNCAO e nao valor (ADR-0084): o mundo muda de tamanho ao trocar de cenario, e quem memorizasse a
  // topologia ficaria defasado em silencio.
  it('[Interface] responde o tamanho de AGORA, e nao o do arranque', () => {
    let largura = 12 * TILE;
    const d = createPlatformerDeclaration({
      mundo: () => ({ larguraPx: largura, alturaPx: 8 * TILE, tile: TILE }),
      tipoDoTile: () => 0, ehSolido: () => false, alvosDe: () => [], jogadorEm: () => null,
      progressoDe: () => ({ tem: 0, precisa: 1 }), t: (k) => k, seletorDoMundo: '#game-region',
    });
    expect(d.topology().size[0]).toBe(12 * TILE);
    largura = 40 * TILE;
    expect(d.topology().size[0]).toBe(40 * TILE);
  });

  // O relogio, e nao o jogador: a gravidade puxa e a lava queima quer a crianca toque em alguma coisa quer
  // nao. E' esta linha que torna a WCAG 2.2.1 APLICAVEL a este jogo.
  it('[Right] o tique e do relogio', () => {
    expect(arreio().tick).toBe('clock');
  });
});

// 🔴 O MUNDO VAZIO TEM DE PASSAR NO CONTRATO, e este caso nasceu de o jogo NAO ARRANCAR. A declaracao estatica
// (ADR-0253) responde antes de `create()` a partir do suporte de `declaration/live`, e o `createGame` le-a no
// arranque, antes da fabrica. Em 27/09 o mundo vazio media 0x0 — «nao ha mundo», verdade — e o contrato recusa
// extensao zero (`topology.size: every extent must be positive`): a pagina parava ali, e nenhum teste o via,
// porque todos os outros casos deste ficheiro montam um arreio com mundo de verdade.
describe('a declaracao do cartucho, antes de a fabrica correr', () => {
  it('[Right] o mundo vazio cumpre o contrato da engine', async () => {
    const { DEPS_VIVAS } = await import('../app/js/declaration/live.js');
    expect(conformanceProblems(createPlatformerDeclaration(DEPS_VIVAS))).toEqual([]);
  });
});
