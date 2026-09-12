// SPDX-License-Identifier: AGPL-3.0-or-later
// O CONTRATO DO CARTUCHO, do lado deste jogo.
//
// ⚠️ ESTES TIPOS MORAM AQUI PORQUE A ENGINE NAO OS PUBLICA, e isso foi MEDIDO e nao suposto. Da 9.0.0 ela
// exporta `GanchosDoCartucho` — a metade do jogo das opcoes de `createGame` — e e' esse que se importa abaixo.
// O que ela nao exporta e' `Dict` nem `Translate`: `core/i18n.d.ts` declara `type LocaleDict` SEM `export`, e
// um tipo `Translate` nao existe de todo. Entao os aliases daqui sao ESTRUTURAIS, e nao copias: no dia em que
// a engine os publicar, apagam-se e importam-se.
//
// 📌 A forma vem de `the-inclusionist-site/docs/cartridge-contract.md`, que a deriva do que `createGame` ja
// recebe. Onde este ficheiro se afasta do documento, ele diz porque — ha exatamente um sitio.
import type { Engine, GanchosDoCartucho } from '@the-inclusionist/engine';
import type { Rng } from '@the-inclusionist/engine/core/rng.js';
import type { GameDeclaration } from '@the-inclusionist/engine/core/contract.js';

/** O dicionario de um idioma: a forma que `core/i18n.registerDict` aceita. */
export type Dicionario = Readonly<Record<string, string>>;

/** O tradutor ja resolvido para o idioma vigente. */
export type Traduzir = (chave: string, params?: Record<string, string | number>) => string;

export interface GameCtx {
  /** Exatamente o que `createGame` devolveu. UMA instancia, haja quantos cartuchos houver. */
  readonly engine: Engine;
  /** O elemento DESTE cartucho. Ele escreve dentro dele e em mais nada. */
  readonly region: HTMLElement;
  /**
   * A corrente DESTE cartucho (ADR-0141).
   *
   * ⚠️ Nao e' ergonomia: `core/rng` exporta `rnd`/`randInt`/`shuffle`/`reseed` ligados a uma corrente de
   * ESCOPO DE MODULO, partilhada por quem quer que a importe — dois cartuchos numa pagina mexem um no
   * sorteio do outro, e um `reseed` reposiciona os dois.
   */
  readonly rng: Rng;
  /** Traduzir, ja no idioma vigente. */
  readonly t: Traduzir;
  /** O que o shell decidiu que este cartucho pode ler do endereco — na plataforma o endereco e' um so. */
  readonly params: URLSearchParams;
}

export interface GameInstance {
  /** ⚠️ `dt` conta-se em QUADROS, e nao em segundos. */
  update(dt: number): void;
  /** Solta tudo. Depois disto o shell esvazia a `region`. */
  teardown(): void;
}

/**
 * O que a fabrica deste jogo devolve: a instancia MAIS a declaracao e os ganchos.
 *
 * 🔴 SEGUNDO AFASTAMENTO DO DOCUMENTO, e pela mesma causa do primeiro. O `cartridge-contract.md` poe
 * `declaration` e `hooks` como campos ESTATICOS do cartucho, lidos antes de `create()`. Aqui eles nao podem
 * ser: a declaracao deste jogo le a RODADA — onde estao as moedas, onde esta cada crianca, que tamanho tem o
 * mundo carregado do ficheiro —, e nada disso existe antes de a fabrica correr.
 *
 * Estaticos, teriam de fechar sobre um `let` de escopo de modulo preenchido por `create()`, que e' exatamente
 * o estado partilhado que a D14 proibe: dois cartuchos na mesma pagina escreveriam no mesmo sitio.
 *
 * 📌 E NAO E' PRECISO INVENTAR NADA PARA RESOLVER: a engine 9.0.0 ganhou `mount(declaration, ganchos)`
 * (ADR-0142) exatamente para uma declaracao chegar DEPOIS do `createGame`. O shell cria a engine, cria o
 * cartucho e monta-o; e' a sequencia que aquele registro desenhou.
 */
export interface CartuchoMontado extends GameInstance {
  readonly declaration: GameDeclaration;
  readonly hooks: GanchosDoCartucho;
}

export interface Cartridge {
  /** Casa com o repositorio e com o nome do pacote (ADR-0082 §1). */
  readonly slug: string;
  /** O objeto de contrato da engine, inalterado. */
  readonly declaration: GameDeclaration;
  /** Registados por quem carregar este cartucho; um cartucho nunca regista os seus. */
  readonly dicts: Readonly<Record<string, Dicionario>>;
  /** A metade do jogo das opcoes de `createGame` — o tipo e' o da engine, e nao uma copia local. */
  readonly hooks: GanchosDoCartucho;
  /**
   * Nada corre ate isto ser chamado. Sem efeito no escopo do modulo (D14).
   *
   * 🔴 E DEVOLVE UMA PROMESSA, ONDE O DOCUMENTO ESCREVE `GameInstance` DIRETO. O afastamento e' obrigado e
   * nao preferido: este jogo espera o idioma (`i18n.idiomaPronto()`) e BUSCA o seu mapa da rede
   * (`fetch('assets/levels/clarity.map.txt')`) antes de existir mundo nenhum. Uma fabrica sincrona so serve
   * um jogo cujo nivel ja esta em codigo — que e' o caso do 15-puzzle e do 2048, e nao o de um jogo com
   * niveis em ficheiro. Qualquer cartucho que carregue recursos cai aqui, entao a forma assincrona e' a
   * geral e a sincrona e' o caso particular.
   */
  create(ctx: GameCtx): Promise<CartuchoMontado>;
}
