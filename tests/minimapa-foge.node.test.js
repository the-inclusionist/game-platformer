// SPDX-License-Identifier: AGPL-3.0-or-later
// O MINIMAPA FOGE DO PERSONAGEM (render/minimap) — pedido do Dev em 03/10.
//
// ========================= POR QUE ISTO EXISTE =========================
// *«Se o personagem "toca" no minimapa, ele deve mudar de posição para a direita da tela.»* Um mapa num
// canto fixo acaba por tapar o chão onde a criança está a pisar, e aí ele atrapalha mais do que informa.
//
// ⚠️ ESTE FICHEIRO NÃO IMPORTA O MÓDULO, e a ausência é declarada: `render/minimap` importa o PixiJS no
// topo, e o projeto `node` do Vitest não o carrega (é a mesma razão por que `src/index.ts` fica fora dos
// testes node — ver o cabeçalho de `pause-icons-escritores`). O que se prende aqui é a REGRA GEOMÉTRICA,
// reproduzida com os mesmos números do módulo, mais a fiação que a alimenta.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MAPA = readFileSync(join(process.cwd(), 'app', 'js', 'render', 'minimap.ts'), 'utf8');
const DRAW = readFileSync(join(process.cwd(), 'app', 'js', 'render', 'draw.ts'), 'utf8');

/** Os números do módulo, lidos do fonte para o caso não poder divergir em silêncio. */
const num = (nome) => Number(MAPA.match(new RegExp(`${nome}\\s*=\\s*(\\d+)`))?.[1]);
const MM_VIEW_W = num('MM_VIEW_W'), MM_VIEW_H = num('MM_VIEW_H'), MM_PAD = num('MM_PAD'), MM_FOLGA = num('MM_FOLGA');
const LOGICAL_W = 320; // `core/constants` da engine; o minimapa desenha no mundo lógico de 320×180

/** A mesma conta de `tocaOMinimapa`, com o mapa no canto `naDireita`. */
const toca = (telaX, telaY, naDireita) => {
  const x = naDireita ? LOGICAL_W - MM_VIEW_W - MM_PAD : MM_PAD;
  const y = 180 - MM_VIEW_H - MM_PAD;
  return telaX >= x - MM_FOLGA && telaX <= x + MM_VIEW_W + MM_FOLGA
      && telaY >= y - MM_FOLGA && telaY <= y + MM_VIEW_H + MM_FOLGA;
};

describe('a regra geométrica da fuga', () => {
  it('os números existem no módulo — se um sair, este portão cai em vez de medir nada', () => {
    for (const [nome, v] of Object.entries({ MM_VIEW_W, MM_VIEW_H, MM_PAD, MM_FOLGA })) {
      expect(v, `${nome} saiu de \`render/minimap\``).toBeGreaterThan(0);
    }
  });

  it('🎯 o personagem sobre o mapa à esquerda é um toque; do outro lado da tela não é', () => {
    expect(toca(MM_PAD + MM_VIEW_W / 2, 180 - MM_PAD - MM_VIEW_H / 2, false)).toBe(true);
    expect(toca(LOGICAL_W - 10, 180 - MM_PAD - MM_VIEW_H / 2, false)).toBe(false);
  });

  it('e com o mapa à direita é o espelho — senão a fuga só valia num sentido', () => {
    const meioDireito = LOGICAL_W - MM_PAD - MM_VIEW_W / 2;
    expect(toca(meioDireito, 180 - MM_PAD - MM_VIEW_H / 2, true)).toBe(true);
    expect(toca(MM_PAD + 2, 180 - MM_PAD - MM_VIEW_H / 2, true)).toBe(false);
  });

  it('⚠️ a ALTURA conta: quem passa por cima do mapa, no céu, não o empurra', () => {
    // Sem a verificação vertical o mapa fugiria de um personagem a saltar no topo do ecrã, longe dele.
    expect(toca(MM_PAD + MM_VIEW_W / 2, 10, false)).toBe(false);
  });

  it('a folga conta como toque — a criança não precisa de encostar para o mapa já atrapalhar', () => {
    const logoAcima = 180 - MM_PAD - MM_VIEW_H - Math.floor(MM_FOLGA / 2);
    expect(toca(MM_PAD + MM_VIEW_W / 2, logoAcima, false)).toBe(true);
  });
});

describe('a fiação que alimenta a regra', () => {
  it('🔴 o módulo alterna o lado e recoloca, em vez de o fixar à direita', () => {
    // «Muda para a direita» sem regresso deixaria a criança sem o canto esquerdo depois de atravessar a tela
    // uma vez. O módulo inverte, e é isso que o faz FUGIR em vez de se mudar.
    expect(MAPA).toMatch(/_mmNaDireita\s*=\s*!_mmNaDireita/);
    expect(MAPA).toMatch(/function colocarNoCanto/);
  });

  it('🎯 o `draw` passa a CÂMARA, sem a qual não há posição de tela para comparar', () => {
    expect(DRAW).toMatch(/drawMinimapPlayer\([^)]*camX,\s*camY\)/);
    expect(DRAW).toMatch(/drawMinimapPlayer\(worldX: number, worldY: number, camX\?: number, camY\?: number\)/);
  });

  it('🔴 o módulo compara TAMBÉM a vertical — a conta reproduzida acima não o prova sozinha', () => {
    // 📏 Os casos geométricos deste ficheiro reproduzem a fórmula, então mutar o módulo não os move: tirar
    // `telaY` de `tocaOMinimapa` deixava-os todos verdes e o mapa passava a fugir de quem salta no céu, a
    // meia tela de distância. Quem prende a comparação vertical ao módulo é esta linha, e só ela.
    const corpo = MAPA.slice(MAPA.indexOf('function tocaOMinimapa'));
    expect(corpo.slice(0, corpo.indexOf('\n}'))).toMatch(/telaY\s*>=\s*y0\s*&&\s*telaY\s*<=\s*y1/);
  });

  it('⚠️ `setMinimapCorner` escreve o lado, senão as duas regras discordam', () => {
    // 📏 Sem esta linha, o modo toque punha o mapa à direita e o estado da fuga continuava em «esquerda»:
    // o primeiro encontro mandava-o para onde ele já estava, e a fuga não fugia.
    const corpo = MAPA.slice(MAPA.indexOf('export function setMinimapCorner'));
    expect(corpo.slice(0, corpo.indexOf('\n}'))).toMatch(/_mmNaDireita\s*=\s*touch/);
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. `MM_FOLGA` 6 → 0: cai o caso da folga.
// 2. `_mmNaDireita = !_mmNaDireita` → `= true`: cai o caso da alternância.
// 3. Tirar `camX, camY` da chamada do `draw.ts`: cai o caso da fiação.
// 4. Tirar `_mmNaDireita = touch` do `setMinimapCorner`: cai o caso das duas regras.
// 5. Tirar `telaY >= y0 && telaY <= y1` de `tocaOMinimapa`: cai o caso da vertical.
//
// ⚠️ E O QUE ESTA LISTA NÃO PROMETE: os casos geométricos (o `toca` local) reproduzem a fórmula do módulo,
// e por isso NÃO caem quando ela muda lá dentro — eles medem a regra, não a implementação. Quem prende a
// implementação é o bloco «a fiação», por leitura do fonte. A mutação 1 só morde porque `MM_FOLGA` é lido
// do ficheiro; se um número passar a ser literal aqui, deixa de haver portão para ele.
