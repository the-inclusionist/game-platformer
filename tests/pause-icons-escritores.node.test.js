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
//
// 📌 ONDE A GARANTIA MORA AGORA (decisao A do Dev, 02/10). A raiz deixou de montar a barra a mao — o
// `initPauseIcons` daqui saiu, e a barra e o cartao sao os do `createGame`. A mesma pergunta passou para o
// CARTUCHO: a engine monta o 🌗 e o 🚥 so para quem entrega `hooks.setPlayerTheme`/`hooks.setPlayerCorrection`
// (`create-game.js:812,935,954`), e decide o ☝️ por `declaration.holdsKeys()` (`create-game.js:830`). Entao os
// casos `[Right]` perguntam ao cartucho, e nao mais a um bloco do `main.ts`.
import { describe, it, expect } from 'vitest';
import { iconsThatAct } from '@the-inclusionist/engine/ui/pause-icons.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GANCHOS_VIVOS, ligarGanchos, desligarGanchos, DEPS_VIVAS } from '../app/js/declaration/live.js';
import { createPlatformerDeclaration } from '../app/js/declaration/platformer-declaration.js';

// O `src/index.ts` nao entra num teste node: importa a fabrica, que importa o PixiJS e a folha de estilo. As duas
// leituras de fonte abaixo afirmam so a COSTURA — que o cartucho espalha os ganchos vivos e que a fabrica os liga
// aos escritores —; o comportamento de cada lado e' aferido pelos objetos de verdade.
const CARTUCHO = readFileSync(join(process.cwd(), 'src', 'index.ts'), 'utf8');
const FONTE = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');
const LIGACAO = FONTE.slice(FONTE.indexOf('ligarGanchos({'));
const HOOKS = CARTUCHO.slice(CARTUCHO.indexOf('export const hooks'));

describe('a barra de acessibilidade deste jogo aciona os dois eixos visuais', () => {
  it('[Right] o cartucho entrega `setPlayerTheme`, e ele chega ao escritor que a fabrica liga', () => {
    // a porta EXISTE antes de `create()` — e' a presenca dela que faz a engine montar o 🌗 no arranque
    expect(typeof GANCHOS_VIVOS.setPlayerTheme).toBe('function');
    const chamadas = [];
    ligarGanchos({ setPlayerTheme: (i, tema) => chamadas.push([i, tema]) });
    try { GANCHOS_VIVOS.setPlayerTheme(1, 'escuro'); } finally { desligarGanchos(); }
    expect(chamadas).toEqual([[1, 'escuro']]);
    expect(HOOKS).toMatch(/^\s*\.\.\.GANCHOS_VIVOS,/m);
    expect(LIGACAO.slice(0, LIGACAO.indexOf('\n});'))).toContain('setPlayerTheme:');
  });

  it('[Right] o cartucho entrega `setPlayerCorrection`, e ele chega ao escritor que a fabrica liga', () => {
    expect(typeof GANCHOS_VIVOS.setPlayerCorrection).toBe('function');
    const chamadas = [];
    ligarGanchos({ setPlayerCorrection: (i, c) => chamadas.push([i, c]) });
    try { GANCHOS_VIVOS.setPlayerCorrection(2, 'deutan'); } finally { desligarGanchos(); }
    expect(chamadas).toEqual([[2, 'deutan']]);
    expect(LIGACAO.slice(0, LIGACAO.indexOf('\n});'))).toContain('setPlayerCorrection:');
  });

  // ESTE CASO E' O PORQUE, e nao a repeticao dos de cima: ele afere, NA ENGINE, que os dois icones so
  // montam quando ha quem os accione — e e' exatamente essa a pergunta que `ui/pause-icons` faz aos campos
  // `setTemaDoJogador`/`setCorrecaoDoJogador` do ctx (`pause-icons.js:426-433`, `Boolean(ctx.setTema...)`).
  // Sem este caso, os dois de cima pareceriam zelo com um nome de campo.
  it('[Interface] os dois icones so existem quando ha quem os accione', () => {
    const chaves = (o) => iconsThatAct(o).map((i) => i.k);
    const sem = chaves({ theme: false, correction: false, holdsKeys: () => true });
    const com = chaves({ theme: true, correction: true, holdsKeys: () => true });
    // Os nomes das duas chaves estao escritos aqui como LITERAIS: le-los da propria engine faria a asserçao
    // andar junto com ela, e o caso ficaria verde a dizer que protege algo no dia em que deixasse de proteger.
    expect(sem).not.toContain('contrast');
    expect(sem).not.toContain('cvd');
    expect(com).toContain('contrast');
    expect(com).toContain('cvd');
  });

  // O IRMAO DA MESMA REGRA, e ele prende a resposta que o Dev deu em 11/09/2026. `holdsKeys` decide o
  // icone ☝️ da trava de marcha pelo mesmo mecanismo: quem responde `false` nao o esconde — REMOVE-O. Aqui a
  // resposta e' `true`, medida na fisica deste jogo (direcao, correr e pular sao segurados), e este caso e' o
  // que impede que ela seja mudada por distracao.
  it('[Interface] `holdsKeys` decide o icone da trava pelo mesmo mecanismo', () => {
    const chaves = (v) => iconsThatAct({ theme: true, correction: true, holdsKeys: () => v }).map((i) => i.k);
    expect(chaves(true)).toContain('altmove');
    expect(chaves(false)).not.toContain('altmove');
  });

  it("[Right] e a declaracao do cartucho responde `true`, que e o que mantem o ☝️ na barra", () => {
    // a MESMA construcao que `src/index.ts` exporta (`createPlatformerDeclaration(DEPS_VIVAS)`), e a mesma pergunta
    // que a engine lhe faz — e o que os tres icones pedem, perguntado a quem o cartucho entrega
    const declaracao = createPlatformerDeclaration(DEPS_VIVAS);
    expect(declaracao.holdsKeys()).toBe(true);
    expect(CARTUCHO).toMatch(/export const declaration = createPlatformerDeclaration\(DEPS_VIVAS\);/);
    const chaves = iconsThatAct({
      theme: Boolean(GANCHOS_VIVOS.setPlayerTheme),
      correction: Boolean(GANCHOS_VIVOS.setPlayerCorrection),
      holdsKeys: () => declaracao.holdsKeys(),
    }).map((i) => i.k);
    expect(chaves).toEqual(expect.arrayContaining(['contrast', 'cvd', 'altmove']));
  });
});
