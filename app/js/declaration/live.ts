// SPDX-License-Identifier: AGPL-3.0-or-later
// O SUPORTE QUE TORNA A DECLARAÇÃO ESTÁTICA POSSÍVEL — e a razão de ele existir.
//
// O `ADR-0253` exige que o **export padrão** do cartucho carregue `declaration` e `hooks`, porque o
// `inclusionist-check-cartridge` os lê NO IMPORT, como o `createGame` faz no arranque. A nota DV nomeia este
// jogo entre os que os tinham só na instância que `create()` devolve.
//
// ⚠️ E ISSO CONTRARIA O QUE ESTE REPOSITÓRIO ESCREVEU EM 11/09, em `src/contract.ts`: que eles **não podiam**
// ser estáticos, porque a declaração lê a RODADA — onde estão as moedas, onde está cada criança, que tamanho
// tem o mundo carregado do ficheiro. O argumento não estava errado sobre o fato; estava errado sobre a
// conclusão. A saída não é fingir que a rodada existe antes de existir: é **responder a verdade do mundo
// vazio**.
//
// 📌 ANTES DE `create()`, ESTAS SÃO RESPOSTAS HONESTAS e não espera-reservada: não há alvo nenhum, não há
// criança em nenhum assento, e o mundo tem o tamanho de um nível que ainda não foi carregado. É exatamente
// o que o checador precisa de poder perguntar, e é o que ele vai ouvir.
//
// ⚠️ O SUPORTE É ÚNICO, e isso é coerente com o `ADR-0142` e não apesar dele: a engine monta UM cartucho de
// cada vez (`mount`/`unmount`). Dois cartuchos simultâneos na mesma página não são o que aquele registro
// desenhou, e o dia em que forem, é o `mount` que decide qual declaração está viva — não este ficheiro.
import type { CartridgeHooks } from '@the-inclusionist/engine';
import type { Player } from '@the-inclusionist/engine/core/entity.js';
import type { DeclarationDeps } from './platformer-declaration.js';

/** As medidas de um mundo que ainda não foi carregado. O lado do tile é o deste jogo e não muda com o nível. */
const TILE_DO_JOGO = 16;

/**
 * O que este jogo responde ANTES de a fábrica correr. Cada linha é uma afirmação verdadeira sobre o estado
 * «nada montado», e nenhuma é um valor de enchimento:
 *
 * · o mundo tem tamanho zero porque o ficheiro do nível ainda não chegou da rede;
 * · não há tile em lado nenhum, e `null` é como esta declaração diz «fora da grade»;
 * · não há alvo a colher nem criança a olhar para lado nenhum;
 * · o progresso é zero de zero — e não zero de dez, que seria inventar um objetivo.
 */
const MUNDO_VAZIO: DeclarationDeps = {
  mundo: () => ({ larguraPx: 0, alturaPx: 0, tile: TILE_DO_JOGO }),
  tipoDoTile: () => null,
  ehSolido: () => false,
  alvosDe: () => [],
  jogadorEm: () => null,
  progressoDe: () => ({ tem: 0, precisa: 0 }),
  t: (chave) => chave,
  seletorDoMundo: '#game-region',
};

const suporte: { vivo: DeclarationDeps | null } = { vivo: null };

/** A fábrica chama isto quando a rodada existe. A partir daqui a declaração fala do jogo de verdade. */
export function ligarDeclaracao(deps: DeclarationDeps): void {
  suporte.vivo = deps;
}

/** O `teardown()` chama isto: depois dele a declaração volta a dizer a verdade do mundo vazio. */
export function desligarDeclaracao(): void {
  suporte.vivo = null;
}

/**
 * As dependências que a declaração estática usa: cada uma pergunta ao suporte NO MOMENTO da chamada.
 *
 * ⚠️ Delegar chamada a chamada, e não copiar o objeto, é o que impede a defasagem silenciosa — o mesmo
 * motivo pelo qual o `ADR-0084` transformou `topology` de valor em função. Uma cópia feita no arranque
 * responderia para sempre sobre o mundo que existia naquele instante.
 */
export const DEPS_VIVAS: DeclarationDeps = {
  mundo: () => (suporte.vivo ?? MUNDO_VAZIO).mundo(),
  tipoDoTile: (tx, ty) => (suporte.vivo ?? MUNDO_VAZIO).tipoDoTile(tx, ty),
  ehSolido: (tx, ty) => (suporte.vivo ?? MUNDO_VAZIO).ehSolido(tx, ty),
  alvosDe: (i) => (suporte.vivo ?? MUNDO_VAZIO).alvosDe(i),
  jogadorEm: (i) => (suporte.vivo ?? MUNDO_VAZIO).jogadorEm(i),
  progressoDe: (i) => (suporte.vivo ?? MUNDO_VAZIO).progressoDe(i),
  t: (chave, params) => (suporte.vivo ?? MUNDO_VAZIO).t(chave, params),
  seletorDoMundo: MUNDO_VAZIO.seletorDoMundo,
};

/* ===================== OS ASSENTOS =====================
 *
 * O ARRAY QUE A ENGINE LÊ COMO `cartridge.players`, e é um só durante a vida do cartucho. A engine relê-o a
 * cada chamada (`create-game.js:770`), então a declaração estática pode entregá-lo vazio no import e a rodada
 * preenchê-lo no lugar — o mesmo truque do suporte acima, mas por identidade em vez de por delegação, porque o
 * campo é um VALOR e não uma função. Por ele chegam à engine os jogadores em que ela escreve: a trava de marcha
 * de cada transporte (`pressedBy`, ADR-0249), a saída de áudio própria e o ☝️ da barra.
 *
 * ⚠️ Esvaziá-lo no `teardown()` é o que impede o cartucho seguinte de herdar assentos de um mundo morto.
 */
export const JOGADORES_VIVOS: Player[] = [];
export function soltarJogadores(): void { JOGADORES_VIVOS.length = 0; }

/* ===================== A MESMA COISA PARA OS GANCHOS =====================
 *
 * `CartridgeHooks` e' `Omit<GameHalf, 'declaration'>`: a metade do jogo das opcoes do `createGame`. Metade
 * dela e' DADO estatico — as acomodacoes, os dicionarios, o preset —, e essa parte mora no cartucho e nao
 * precisa de suporte nenhum. A outra metade LE A RODADA, e e' esta.
 */
/** A METADE VIVA: tudo menos `accommodations`, que e' dado do cartucho e nao da rodada. */
export type GanchosVivos = Omit<CartridgeHooks, 'accommodations'>;

const ganchos: { vivos: GanchosVivos | null } = { vivos: null };

/** A fabrica chama isto quando a rodada existe. */
export function ligarGanchos(h: GanchosVivos): void {
  ganchos.vivos = h;
}

/** O `teardown()` chama isto. */
export function desligarGanchos(): void {
  ganchos.vivos = null;
}

/**
 * Os ganchos que LEEM a rodada, delegando chamada a chamada.
 *
 * ⚠️ As respostas do mundo vazio nao sao zeros de enchimento. `isNavigable` responde TRUE porque antes de
 * haver jogo so ha menu, e menu navega-se; `isBlindMode` responde FALSE porque nenhuma crianca escolheu
 * ainda; `getPauseActs` devolve um objeto vazio porque nao ha acao de pausa a accionar — e a engine esconde
 * o item que ninguem aciona, que e' a resposta certa para um cartucho que ainda nao arrancou.
 */
export const GANCHOS_VIVOS: GanchosVivos = {
  isNavigable: () => ganchos.vivos?.isNavigable?.() ?? true,
  setPhase: (f) => ganchos.vivos?.setPhase?.(f),
  isBlindMode: () => ganchos.vivos?.isBlindMode?.() ?? false,
  getPauseActs: () => ganchos.vivos?.getPauseActs?.() ?? {},
  setPauseActor: (i, ...resto) => ganchos.vivos?.setPauseActor?.(i, ...resto),
  setPlayerTheme: (i, tema) => ganchos.vivos?.setPlayerTheme?.(i, tema),
  setPlayerCorrection: (i, correcao) => ganchos.vivos?.setPlayerCorrection?.(i, correcao),
  /*
   * O QUE SÓ ESTE JOGO SABE DO GAMEPAD (`GamepadGameHooks`): a engine monta o transporte e lê os pads sozinha; daqui
   * saem o título, a demonstração, o desafio, quem entra e quem renasce, o selo e o desenho do assistente.
   *
   * ⚠️ DECLARADOS TODOS, e o mundo vazio responde por cada um: nada corre, ninguém entra, não há desafio aberto.
   * Um campo ausente teria o significado escrito pela engine («o mundo corre sempre que o cartão não está aberto»),
   * e antes de `create()` isso seria mentira.
   */
  gamepad: {
    worldRunning: () => ganchos.vivos?.gamepad?.worldRunning?.() ?? false,
    navTitle: (k) => ganchos.vivos?.gamepad?.navTitle?.(k),
    attractActive: () => ganchos.vivos?.gamepad?.attractActive?.() ?? false,
    stopAttract: () => ganchos.vivos?.gamepad?.stopAttract?.(),
    hasModal: (i) => ganchos.vivos?.gamepad?.hasModal?.(i) ?? false,
    modalInput: (i, intent) => ganchos.vivos?.gamepad?.modalInput?.(i, intent),
    joinPlayer: (pad) => ganchos.vivos?.gamepad?.joinPlayer?.(pad) ?? false,
    respawnPlayer: (i) => ganchos.vivos?.gamepad?.respawnPlayer?.(i),
    clearWaitingBadge: (i) => ganchos.vivos?.gamepad?.clearWaitingBadge?.(i),
    wizardStep: (posicao) => ganchos.vivos?.gamepad?.wizardStep?.(posicao),
    wizardTick: () => ganchos.vivos?.gamepad?.wizardTick?.(),
  },
};