// SPDX-License-Identifier: AGPL-3.0-or-later
// OS DOIS ESCRITORES DE EIXO VISUAL, e o controle morto que a falta deles produz.
//
// 🔴 POR QUE ESTE FICHEIRO EXISTE. Na subida de `@the-inclusionist/engine` 7.0.1 -> 9.0.0 os icones 🌗 (alto
// contraste) e 🚥 (correcao de daltonismo) continuaram a APARECER na barra de acessibilidade e deixaram de
// FAZER QUALQUER COISA. Medido no navegador contra o `dist/`: dois cliques reais em cada um, e nem
// `players[0].visual` nem o `aria-label` mudavam.
//
// A causa foi a divisao do eixo visual em dois (#104 da engine). Ate a 7.0.1 o icone chamava
// `ctx.setPlayerViz`, que esta raiz passa desde sempre; da 8.0.0 em diante ele chama `setTemaDoJogador` e
// `setCorrecaoDoJogador`, e `ui/pause-icons` sai em silencio quando o campo nao esta la.
//
// ⚠️ E NADA APANHAVA ISSO. Os dois campos sao OPCIONAIS no `PauseIconsCtx`, entao o `tsc` nao diz nada; nao
// ha teste de navegador sobre a barra; e o axe nao reprova um botao que responde — ele responde, so nao faz
// nada. Um controle que a crianca ve, aciona e nao obtem resposta e' PIOR que um ausente: ela desiste
// achando que o jogo nao tem a acomodacao. E' o que o ADR-0106 §5 proibe.
import { describe, it, expect } from 'vitest';
import { iconsThatAct } from '@the-inclusionist/engine/ui/pause-icons.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Ler o fonte pelo mesmo motivo do `reach-notice`: `main.ts` arranca PixiJS, audio e o documento inteiro e
// nao entra num teste — mas e' ele quem monta a engine a mao, e a alternativa era nao aferir nada.
const FONTE = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');
const BLOCO = FONTE.slice(FONTE.indexOf('const pauseIcons = initPauseIcons({'));

describe('a barra de acessibilidade deste jogo aciona os dois eixos visuais', () => {
  it('[Right] a raiz passa `setTemaDoJogador` ao `initPauseIcons`', () => {
    expect(BLOCO.slice(0, BLOCO.indexOf('});'))).toContain('setTemaDoJogador:');
  });

  it('[Right] a raiz passa `setCorrecaoDoJogador` ao `initPauseIcons`', () => {
    expect(BLOCO.slice(0, BLOCO.indexOf('});'))).toContain('setCorrecaoDoJogador:');
  });

  // ESTE CASO E' O PORQUE, e nao a repeticao dos de cima: ele afere, NA ENGINE, que os dois icones so
  // montam quando ha quem os accione — e e' exatamente essa a pergunta que `ui/pause-icons` faz aos campos
  // `setTemaDoJogador`/`setCorrecaoDoJogador` do ctx (`pause-icons.js:426-433`, `Boolean(ctx.setTema...)`).
  // Sem este caso, os dois de cima pareceriam zelo com um nome de campo.
  it('[Interface] os dois icones so existem quando ha quem os accione', () => {
    const chaves = (o) => iconsThatAct(o).map((i) => i.k);
    const sem = chaves({ tema: false, correcao: false, seguraTeclas: () => true });
    const com = chaves({ tema: true, correcao: true, seguraTeclas: () => true });
    // Os nomes das duas chaves estao escritos aqui como LITERAIS: le-los da propria engine faria a asserçao
    // andar junto com ela, e o caso ficaria verde a dizer que protege algo no dia em que deixasse de proteger.
    expect(sem).not.toContain('contrast');
    expect(sem).not.toContain('cvd');
    expect(com).toContain('contrast');
    expect(com).toContain('cvd');
  });

  // O IRMAO DA MESMA REGRA, e ele prende a resposta que o Dev deu em 11/09/2026. `seguraTeclas` decide o
  // icone ☝️ da trava de marcha pelo mesmo mecanismo: quem responde `false` nao o esconde — REMOVE-O. Aqui a
  // resposta e' `true`, medida na fisica deste jogo (direcao, correr e pular sao segurados), e este caso e' o
  // que impede que ela seja mudada por distracao.
  it('[Interface] `seguraTeclas` decide o icone da trava pelo mesmo mecanismo', () => {
    const chaves = (v) => iconsThatAct({ tema: true, correcao: true, seguraTeclas: () => v }).map((i) => i.k);
    expect(chaves(true)).toContain('altmove');
    expect(chaves(false)).not.toContain('altmove');
  });

  it("[Right] e a raiz responde `true`, que e o que mantem o ☝️ na barra", () => {
    expect(BLOCO.slice(0, BLOCO.indexOf('});'))).toMatch(/seguraTeclas:\s*\(\)\s*=>\s*true/);
  });
});
