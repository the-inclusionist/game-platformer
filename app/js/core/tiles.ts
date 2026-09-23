// SPDX-License-Identifier: AGPL-3.0-or-later
// core/tiles.ts — Legend de tiles + parser do mapa em texto-glifo (1 glifo significativo por tile). Módulo-folha,
// ZERO deps. O jogo NÃO lê Tiled/Aseprite em runtime — só este texto-glifo, legível/diffável como ascii art.

/* ===================== TILE_TYPES: o que cada tipo de tile É =====================
 *
 * 🔴 VEIO DA ENGINE EM 2026-09-23, e o fim estava escrito lá desde 07/09, ao lado da própria tabela: «o fim
 * honesto é a tabela mudar de casa e o jogo declarar os papéis pelo `core/contract` (`roleOf`)». O que a
 * segurava era UMA regra — o `isSolidType` do `core/collision`, que torna perigo e trampolim sólidos no modo
 * cadeira de rodas e perigo sólido no modo cego —, e essa regra veio para cá com a geometria que a consulta.
 *
 * 📌 A ENGINE NÃO FICA SEM SABER O QUE É PERIGO: ela pergunta ao CONTRATO, pelo `roleOf`, que é o mecanismo
 * que já existia para isso. O que ela deixou de ter é uma tabela de NÚMEROS DE TILE, que só é verdade neste
 * mapa — `t === 9` num segundo jogo com outra numeração herdaria física, alto contraste e sonar a apontar
 * para o tile errado, sem erro de tipo e sem teste vermelho.
 *
 * 📌 E é aqui que ela devia estar mesmo antes desse argumento: é a TERCEIRA tabela sobre os mesmos catorze
 * tipos, ao lado do glifo e do nome, e `tile-world-logic.node.test.js` já as cruza as quatro.
 */

/** O que um tipo de tile é. */
export type TileType = {
  solid?: boolean; bounce?: number; water?: boolean; jump?: boolean;
  ladder?: boolean; tramp?: boolean; hazard?: boolean; gate?: boolean; key?: boolean;
  /** Ar de REGIÃO SECRETA (o tile 0). A propriedade é nova; o significado não — `TILE_NAME[0]` já dizia
   *  "ar escuro/secreto". Estava só na tabela de NOMES, que ninguém consulta para decidir nada. */
  secreto?: boolean;
};

export const TILE_TYPES: Record<number, TileType> = {
  0:{solid:false,secreto:true}, 1:{solid:false}, 2:{solid:true,bounce:0.28}, 3:{solid:false,water:true,jump:true},
  4:{solid:false,ladder:true}, 5:{solid:true,bounce:1.1,tramp:true}, 6:{solid:true,bounce:0},
  7:{solid:false}, 8:{solid:false}, 9:{solid:false,hazard:true}, 10:{solid:true,gate:true},
  11:{solid:false,key:true}, 12:{solid:false}, 13:{solid:false}, 14:{solid:false},
};

/* ===================== as perguntas, com nome =====================
 * Uma função por propriedade, e não `TILE_TYPES[t]?.hazard` espalhado: o nome é o que torna a intenção legível
 * no ponto de uso (`ehPerigo(t)` contra `t === 9`) e é o que dá UM lugar para mudar no dia em que a resposta
 * deixar de vir de uma tabela global. Todas devolvem `false` para tipo desconhecido — um tile que ninguém
 * declarou não machuca e não é trampolim; inventar semântica para o desconhecido é pior que negá-la.
 * 📌 Os nomes são os que este repositório já usa (`ehAgua`, `ehEscada`, `ehPortao` em `game/tile-flags`), e não
 * os `isHazard`/`isTrampoline` da engine: quem chama são estes ficheiros, e uma palavra por conceito.
 */
const prop = (t: number, k: keyof TileType): boolean => !!TILE_TYPES[t]?.[k];
/** Machuca ao encostar (lava). */
export const ehPerigo = (t: number): boolean => prop(t, 'hazard');
/** Trampolim: arremessa para cima. */
export const ehTrampolim = (t: number): boolean => prop(t, 'tramp');

// tipo (0–14) → glifo. Terreno = símbolos; power-ups = LETRAS maiúsculas mnemônicas.
export const TYPE_GLYPH: Record<number, string> = {
  1: '.',  // ar (iluminado)
  0: ':',  // ar escuro / região secreta
  2: '#',  // pedra / chão sólido
  6: '=',  // parede dura (sem quicar)
  3: '~',  // água
  4: 'H',  // escada
  5: '^',  // trampolim
  9: 'x',  // lava / perigo
  10: '|', // portão
  11: '*', // chave
  7: 'S',  // power-up super-pulo
  8: 'F',  // power-up voo
  12: 'T', // power-up super-corrida (turbo)
  13: 'U', // power-up ultra-pulo
  14: 'C', // power-up ventosa (cling)
};

// tipo → nome legível (UI e editor de mapa). Uma verdade só.
export const TILE_NAME: Record<number, string> = {
  0: 'ar escuro/secreto', 1: 'ar', 2: 'pedra', 3: 'água', 4: 'escada', 5: 'trampolim', 6: 'parede',
  7: 'super-pulo', 8: 'voo', 9: 'lava/perigo', 10: 'portão', 11: 'chave', 12: 'super-corrida',
  13: 'ultra-pulo', 14: 'ventosa',
};

// glifo → tipo (inverso). Construído do TYPE_GLYPH para não divergir.
export const GLYPH_TYPE: Record<string, number> = Object.fromEntries(
  Object.entries(TYPE_GLYPH).map(([t, g]): [string, number] => [g, +t]),
);

const AIR = 1; // glifo desconhecido / vazio à direita → ar iluminado

// Texto-glifo → grid numérico. Preserva o comprimento de cada linha (mapa é irregular; o buildWorld preenche
// o vazio à direita com ar). Linhas iniciadas por "#!" são meta (nome/autor) e são ignoradas — "#" sozinho é
// parede, então o marcador de meta é "#!" no INÍCIO da linha.
export function parseLevel(text: string): number[][] {
  const rows: number[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('#!')) continue; // meta
    if (line.length === 0) continue;     // linha vazia (ex.: \n final) — nossos mapas não têm linha vazia
    const row: number[] = [];
    for (const ch of line) row.push(ch in GLYPH_TYPE ? GLYPH_TYPE[ch] : AIR);
    rows.push(row);
  }
  return rows;
}

// Grid numérico → texto-glifo (para gerar o .map.txt e para o teste de ida-e-volta). Sem newline final.
export function gridToGlyphs(grid: number[][]): string {
  return grid.map((row) => row.map((t) => TYPE_GLYPH[t] ?? '.').join('')).join('\n');
}

// Sanidade: o legend é uma bijeção sobre 0..14? (glifos únicos e todos os tipos mapeados). Prova que a
// conversão é sem perda para QUALQUER grid. Retorna {ok, unique, invertible, missing}.
export function selfTest() {
  const types = Array.from({ length: 15 }, (_, i) => i);
  const glyphs = types.map((t) => TYPE_GLYPH[t]);
  const missing = types.filter((t) => !(t in TYPE_GLYPH));
  const unique = new Set(glyphs).size === glyphs.length;
  const invertible = types.every((t) => GLYPH_TYPE[TYPE_GLYPH[t]] === t);
  return { ok: missing.length === 0 && unique && invertible, unique, invertible, missing };
}
