// SPDX-License-Identifier: AGPL-3.0-or-later
// A DECLARAÇÃO DESTE JOGO — os sete campos do `core/contract` da engine, e mais os dois que a 8.0.0 tornou
// obrigatórios.
//
// ⚠️ ESTE FICHEIRO É NOVO E O JOGO É O MAIS VELHO DA COLEÇÃO, e a contradição tem explicação: esta raiz nunca
// passou por `createGame`, então nunca houve onde entregar uma declaração. O que ela afirma já era afirmado —
// espalhado pelo contexto do sonar (`topology`, `targetsOf`, `nameAt`), pelo `tile-roles` (o papel de cada
// tile) e pelo HUD (o objetivo). O que muda é passar a ser UM objeto, que é o que a pilha de acessibilidade
// lê e a única coisa que ela lê.
//
// 📌 AS DEPENDÊNCIAS ENTRAM POR PARÂMETRO e nenhuma delas é do PixiJS. É o que torna esta declaração aferível
// num teste de `node`, e é também a razão de ela não importar `main.ts`: quem sabe onde está a moeda é a
// rodada, e a rodada é da raiz.
import type { GameDeclaration, Topology, WorldScope, Spot, Role, Speakable, Focus, Objective, Heading } from '@the-inclusionist/engine/core/contract.js';
import { roleOf } from '../game/tile-roles.js';

export interface DeclarationDeps {
  /** As medidas do mundo em píxeis, e o lado do tile — a `unit` da topologia contínua. */
  readonly mundo: () => { readonly larguraPx: number; readonly alturaPx: number; readonly tile: number };
  /** O tipo do tile naquela célula. Fora da grade devolve `null`. */
  readonly tipoDoTile: (tx: number, ty: number) => number | null;
  /** Aquela célula bloqueia a passagem? */
  readonly ehSolido: (tx: number, ty: number) => boolean;
  /** Os itens que ESTE jogador ainda tem de colher, em píxeis. */
  readonly alvosDe: (jogador: number) => readonly { readonly x: number; readonly y: number }[];
  /** Onde está este jogador e para onde olha (`1` direita, `-1` esquerda). `null` = assento vazio. */
  readonly jogadorEm: (jogador: number) => { readonly x: number; readonly y: number; readonly facing: number } | null;
  /** Quantos itens já colheu e quantos precisa. */
  readonly progressoDe: (jogador: number) => { readonly tem: number; readonly precisa: number };
  /** O tradutor, resolvido a cada chamada para acompanhar o idioma vigente. */
  readonly t: (chave: string, params?: Record<string, string | number>) => string;
  /** O elemento que É o mundo. A engine aplica ali o que é do mundo, e só ali. */
  readonly seletorDoMundo: string;
}

export function createPlatformerDeclaration(deps: DeclarationDeps): GameDeclaration {
  const emTiles = (at: Spot): { tx: number; ty: number } => {
    const { tile } = deps.mundo();
    return { tx: Math.floor(at.x / tile), ty: Math.floor(at.y / tile) };
  };

  return {
    /**
     * CONTÍNUO, e não uma grade: aqui anda-se em píxeis e a física resolve subpíxel. Uma grade diria que a
     * distância entre dois pontos se conta em casas, e neste mundo ela é a reta — que é o que `move: 'free'`
     * declara.
     *
     * `frame: 'clock'` porque isto é uma PLATAFORMA 2D vista de lado, e norte/sul não querem dizer nada para
     * quem olha de lado (ADR-0089). A mesma escolha que o contexto do sonar já fazia; agora mora aqui.
     *
     * FUNÇÃO e não valor, como manda o ADR-0084: o mundo muda de tamanho ao trocar de cenário, e quem
     * memorizasse a topologia ficaria defasado em silêncio.
     */
    topology(): Topology {
      const { larguraPx, alturaPx, tile } = deps.mundo();
      return { kind: 'continuous', size: [larguraPx, alturaPx], unit: tile, move: 'free', frame: 'clock' };
    },

    world(): WorldScope {
      return { kind: 'element', selector: deps.seletorDoMundo };
    },

    /**
     * TRÊS, e o número é o mesmo que a raiz passa ao `alcance()` — ver a nota longa lá, em `main.ts`.
     *
     * Correr para a direita e saltar são `right` + `action1` + `action2` ao mesmo tempo. A conta é da ROTA
     * PADRÃO de propósito: com a trava de corrida cai para dois, com as duas travas para um, mas declarar
     * dois seria declarar como exigência o que só é verdade depois de a criança ACHAR e LIGAR a acomodação.
     *
     * ⚠️ Só o toque declara teto (`SEGURA_TOQUE = 2`), então este número FAZ o aviso de alcance disparar num
     * telemóvel. Isso é a barreira a ser dita, e não um defeito a ser escondido.
     */
    holdsAtOnce(): number {
      return 3;
    },

    /**
     * VERDADE, medido na física deste jogo e não estimado: a direção segura-se (`physics.ts:194,197`), correr
     * segura-se (`:359,:362,:390`) e pular segura-se (`:290` flutuar no modo fácil, `:292` a braçada na água,
     * `:167` o trampolim).
     *
     * ⚠️ E `holdsAtOnce` ACIMA NÃO RESPONDE ISTO: aquele conta posições SIMULTÂNEAS e recusa zero, então um
     * jogo que não segura nada declara um à mesma. Responder `false` aqui não esconderia o ☝️ — REMOVÊ-LO-IA,
     * e com ele a acomodação de quem não consegue manter uma tecla pressionada, que este jogo implementa em
     * `#opt-altmove` e `#opt-togglerun`.
     */
    seguraTeclas(): boolean {
      return true;
    },

    /**
     * DO RELÓGIO, e é esta linha que torna a WCAG 2.2.1 (Timing Adjustable) APLICÁVEL a este jogo — ao
     * contrário do 15-puzzle, que declara `'player'` e fica de fora dela.
     *
     * Não é escolha de estilo: a gravidade puxa, a água arrasta e o carro atravessa a rua quer a criança toque
     * em alguma coisa quer não. Declarar `'player'` aqui seria dizer que ela pode demorar o que quiser, e a
     * lava não concordaria.
     */
    tick: 'clock',

    /**
     * O papel semântico do sítio, e ele reaproveita o `roleOf` que o jogo já tinha — a mesma tabela que pinta
     * o alto contraste. Duas respostas para a mesma pergunta divergiriam no dia em que uma delas mudasse.
     *
     * FORA DA GRADE É `'structure'`, e não `'free'`: o sonar e a bengala varrem com o sítio em que estão, e
     * responder "espaço livre" para uma célula que não existe convidaria a criança a andar para fora do mundo.
     */
    roleAt(at: Spot): Role {
      const { tx, ty } = emTiles(at);
      const tipo = deps.tipoDoTile(tx, ty);
      if (tipo === null) return 'structure';
      const papel = roleOf(tipo);
      if (papel) return papel;
      return deps.ehSolido(tx, ty) ? 'structure' : 'free';
    },

    /**
     * O NOME do que está naquele sítio. Hoje o que se nomeia é o item colecionável, que é o que o sonar
     * persegue; o terreno fala pelo `roleAt`, que a engine já traduz.
     *
     * `null` onde não há item: dizer "moeda" em toda parte faria a palavra deixar de significar alguma coisa.
     */
    nameAt(at: Spot): Speakable | null {
      const { tile } = deps.mundo();
      const perto = (a: { x: number; y: number }): boolean => Math.abs(a.x - at.x) < tile && Math.abs(a.y - at.y) < tile;
      for (let i = 0; i < 4; i++) if (deps.alvosDe(i).some(perto)) return { text: deps.t('hud.nome.moeda'), gender: 'f', plural: false };
      return null;
    },

    /**
     * Onde está esta criança e para onde olha. `null` quando o assento não entrou — e isso não é um erro: uma
     * tela em espera não tem foco nenhum, e inventar um poria o sonar a medir de um sítio onde não há ninguém.
     *
     * ⚠️ A `Heading` é LESTE ou OESTE, e nunca norte/sul. Num jogo de plataforma visto de lado o personagem não
     * se vira para o fundo da tela; oferecer as oito direções seria descrever um mundo que não existe.
     */
    focusOf(playerIndex: number): Focus | null {
      const p = deps.jogadorEm(playerIndex);
      if (!p) return null;
      const heading: Heading = p.facing < 0 ? 'w' : 'e';
      return { id: 'p' + playerIndex, at: { x: p.x, y: p.y }, heading };
    },

    objectiveOf(playerIndex: number): Objective {
      const { tem, precisa } = deps.progressoDe(playerIndex);
      return { name: { text: deps.t('hud.nome.moeda'), gender: 'f', plural: true }, have: tem, need: precisa };
    },

    /**
     * POR JOGADOR, e é esta a razão de os itens deste jogo serem individuais: em multi-tela cada criança tem o
     * seu conjunto, e devolver os de todos poria o sonar de uma a apontar para a moeda da outra.
     */
    targetsOf(playerIndex: number): readonly Spot[] {
      return deps.alvosDe(playerIndex).map((a) => ({ x: a.x, y: a.y }));
    },
  };
}
