// SPDX-License-Identifier: AGPL-3.0-or-later
// game/state — o estado que é DESTE JOGO, e não da engine (item 19, regra do ADR-0033).
//
// ========================= A MESMA REGRA, APLICADA AO ESTADO =========================
// O ADR-0033 fixou a regra para a entidade:
//
//     A entidade da engine pode declarar o que a ENGINE possui. Não pode declarar o que o JOGO possui.
//
// Estado obedece à mesma frase, e `core/state` tinha duas exceções. Nenhuma delas é ajuste de acessibilidade,
// de idioma ou de dispositivo — que é o que o estado COMPARTILHADO existe para guardar:
//
//   · `coins`     — os coletáveis. Já estava tipado como `unknown[]`, e o comentário de lá explicava por quê:
//                   `core/` não pode conhecer o tipo. Um estado que não pode declarar o próprio tipo é um
//                   estado que está na camada errada; o `unknown` era o sintoma, não a solução.
//   · `quizLevel` — o nível da atividade de alfabetização, de 1 a 5. É conteúdo pedagógico, e nem sequer é
//                   da engine no sentido de "mecânica": é do currículo que este jogo hospeda.
//
// ========================= O QUE NÃO MUDOU, E POR QUÊ =========================
// A FORMA é a mesma de antes: binding vivo exportado + setter que persiste e emite. Quem lê continua lendo por
// importação (`coins.ts`, `life.ts`, `physics.ts`, `quiz.ts`, `session.ts`, `traffic.ts` e a raiz) — trocar
// seis leitores para uma fábrica no mesmo passo em que a persistência muda de forma tornaria impossível saber
// qual metade quebrou, se quebrasse.
//
// ========================= O QUE MUDOU COM A ENGINE 11 (ADR-0232 D4) =========================
// O ARMAZENAMENTO E O BARRAMENTO CHEGAM POR INJEÇÃO, em `initGameState({ store, bus })`, que a RAIZ chama.
// Antes este módulo lia `localStorage` no IMPORT (via `platform/storage`) e emitia pelo `emit` de módulo de
// `core/state`; a engine 11 apagou os dois: `platform/storage` virou a fábrica `createStorage(backend)` e o
// barramento mora no `SettingsStore` que a raiz constrói (`settings.emit`).
//
// ⚠️ OS BINDINGS FICAM NO ESCOPO DO MÓDULO, e isso é uma exceção consciente à regra D14 do cartucho (estado de
// módulo sobrevive ao `teardown()` e vaza para o próximo jogo da mesma página). O preço de trocá-los por uma
// fábrica é reescrever os seis leitores acima, que não são deste passo. O que se faz em troca: `initGameState`
// RELÊ tudo do store injetado e ESVAZIA as moedas a cada chamada — então o segundo jogo da página, cuja raiz
// chama o init de novo, nasce com o que o SEU store guarda, e não com o que o primeiro deixou.
//
// ⚠️ ANTES DO INIT, os bindings têm os PADRÕES (nível 2, cenário 'cidade', atividade 'ludico', sem moedas), e
// os setters LANÇAM. Lançar e não engolir é de propósito: um setter que gravasse no nada perderia a escolha da
// criança em silêncio — o defeito que a engine evita tornando cada porta de store OBRIGATÓRIA (ADR-0224/0227).
//
// AS CHAVES vêm de `platform/storage-keys` (`KEYS`), que é o lar do registro desde a engine 11 (nota CS/CT do
// Breaking-Changes): um nome de chave é string pura, e importar o nome não alcança `localStorage`. As strings
// gravadas são BYTE A BYTE as de antes — `tests/state-bus.node.test.ts` crava os literais, porque uma chave que
// muda de nome faz a criança perder o que salvou sem erro nenhum.
import type { Store } from '@the-inclusionist/engine/platform/storage.js';
import { KEYS } from '@the-inclusionist/engine/platform/storage-keys.js';
import type { SettingsStore } from '@the-inclusionist/engine/core/state.js';
import { JOGO } from './save-id.js';
// O TIPO DA MOEDA, e por que ele só pôde chegar aqui agora. Enquanto `coins` morava em `core/state`, ele era
// obrigatoriamente `unknown[]` — a engine não pode conhecer uma moeda, e o comentário de lá dizia isso. O item
// 19 trouxe o binding para cá, que é do JOGO, e deixou o `unknown` para trás; este import é o resto daquela
// mudança. É `import type` porque `game/coins` importa o binding `coins` DAQUI: o tipo é apagado na compilação,
// então não há aresta em tempo de execução e o ciclo não existe.
import type { Coin } from './coins.js';

/* ===================== a injeção ===================== */

/**
 * O que a raiz entrega. Fatias MÍNIMAS de propósito: um teste passa `createStorage(memoryBackend())` e um
 * `{ emit }` falso, e a raiz passa o seu `store` e o seu `SettingsStore` (ou `ctx.engine.settings`) inteiros.
 *
 * 📌 `bus` é o barramento DA RAIZ, não um segundo. Os quatro eventos deste jogo viajam nele por aumento de
 * `GameEvent` (fim do arquivo); um barramento próprio seria um segundo mapa de assinantes, e quem assinasse no
 * errado simplesmente nunca ouviria — sem erro, sem teste vermelho.
 */
export interface GameStateDeps {
  store: Pick<Store, 'getWithLegacy' | 'set'>;
  bus: Pick<SettingsStore, 'emit'>;
}

let deps: GameStateDeps | null = null;
function need(): GameStateDeps {
  if (!deps) throw new Error('game/state: initGameState({ store, bus }) não foi chamado pela raiz');
  return deps;
}

/* ===================== quizLevel: 1..5 (nível da atividade de alfabetização) ===================== */
//
// Lê pelo registro, com herança da chave antiga (`getWithLegacy`), e escreve só na nova.
function readQuizLevel(store: GameStateDeps['store']): number {
  const bruto = store.getWithLegacy(KEYS.quizlevel(JOGO), KEYS.quizlevelLegado, null);
  const v = bruto == null ? 2 : parseFloat(bruto);       // o padrão é 2, e é VERBATIM: mudar de camada não é
  return isFinite(v) && v >= 1 && v <= 5 ? v : 2;        // hora de mudar o nível em que a criança começa
}
export let quizLevel: number = 2;

export function setQuizLevelValue(n: number): void {
  const d = need();
  quizLevel = Math.max(1, Math.min(5, n | 0));
  d.store.set(KEYS.quizlevel(JOGO), String(quizLevel));
  d.bus.emit('quizLevel', quizLevel);
}

/* ===================== coins[]: os coletáveis ===================== */
//
// Mutado IN-PLACE (push/forEach — usa a referência importada) mas TAMBÉM reatribuído, por `setCoins`. As duas
// coisas ao mesmo tempo são o motivo de o setter existir: quem só muta veria a troca de array como um sumiço.
export let coins: Coin[] = [];
export function setCoins(arr: Coin[]): void { const d = need(); coins = arr; d.bus.emit('coins', arr); }

/* ===================== cenario e activity (ADR-0038, Fase B) ===================== */
//
// Chegaram de `core/state` em 2026-08-26. São GAME pelo critério do ADR-0038 — persistidos em chave de escopo
// do jogo (`incl.<jogo>.*`) —, e a forma veio inteira: binding vivo + setter que grava, persiste e emite.

/**
 * O CENÁRIO ativo. `string` e não `string | null`: ninguém usa nulo como "ainda não escolhido", e o
 * `render/cenario-data` já cai em 'cidade' para tema desconhecido.
 *
 * LIDO NO `initGameState`, como o `activity` logo abaixo; a raiz só APLICA o que já foi lido, que é trabalho dela.
 *
 * A MIGRAÇÃO `'noite' → 'espaco'` mora na leitura porque ela é parte de LER a chave, não de aplicá-la: um valor
 * salvo por uma versão antiga precisa virar um valor válido antes de qualquer um o consultar.
 */
function readCenario(store: GameStateDeps['store']): string {
  const v = store.getWithLegacy(KEYS.cenario(JOGO), KEYS.cenarioLegado, 'cidade');
  return v === 'noite' ? 'espaco' : v;
}
export let cenario: string = 'cidade';
export function setCenarioValue(theme: string): void {
  const d = need();
  cenario = theme; d.store.set(KEYS.cenario(JOGO), theme); d.bus.emit('cenario', theme);
}

/** O ID DA ATIVIDADE escolhida. A validação contra o catálogo fica em `ui/activities-menu`; aqui é só o
 *  valor cru, a persistência e o evento. */
export let activity: string = 'ludico';
export function setActivityValue(id: string): void {
  const d = need();
  activity = id; d.store.set(KEYS.activity(JOGO), id); d.bus.emit('activity', id);
}

/**
 * LIGA o estado deste jogo ao store e ao barramento da raiz, e RESTAURA o que a criança guardou.
 *
 * A raiz chama UMA vez por jogo montado, ANTES de qualquer leitor consultar os bindings ou qualquer setter
 * rodar — na raiz atual, logo depois de `createSettingsStore(store)`. Não emite nada: restaurar não é mudar,
 * e o import antigo também não emitia.
 *
 * 📌 As moedas voltam a `[]` aqui (D14): o primeiro jogo da página não tem nada a perder, e o segundo não herda
 * as moedas do primeiro.
 */
export function initGameState(d: GameStateDeps): void {
  deps = d;
  quizLevel = readQuizLevel(d.store);
  cenario = readCenario(d.store);
  activity = d.store.getWithLegacy(KEYS.activity(JOGO), KEYS.activityLegado, 'ludico');
  coins = [];
}

/* ===================== OS EVENTOS DESTE JOGO (Fase C) ===================== */
//
// O barramento é da engine e é TIPADO: `core/state.GameEvent` mapeia nome → carga, e o `emit`/`on` do
// `SettingsStore` são genéricos sobre ele. Nome inexistente não compila; carga errada não compila.
//
// Mas quatro eventos são DESTE JOGO, e a engine não pode nomear as cargas — `coins` é `Coin[]`, um tipo do
// jogo, e o ADR-0033 proíbe a entidade da engine declarar o que o jogo possui. A saída não é afrouxar o
// mapa: é AUMENTÁ-LO daqui. Quem é dono do evento declara o evento, que é a mesma regra do ADR-0039 aplicada
// a um canal em vez de a um campo.
//
// O aumento é resolvido em tempo de compilação e não gera import de execução: nenhuma aresta nova.
// ⚠️ O ALVO DO AUMENTO É O NOME DO PACOTE, e não um caminho relativo — era `'../core/state.js'` enquanto os
// dois viviam na mesma árvore. A augmentação é resolvida pelo NOME do módulo, então um caminho que já não
// existe não dá erro de import: dá `TS2664 Invalid module name in augmentation`, e o efeito visível são
// QUATRO erros noutro lugar («'coins' is not assignable to keyof GameEvent»), porque o mapa de eventos
// simplesmente não foi estendido. Foi assim que a separação de 06/09 o encontrou.
// ⚠️ E O NOME DA INTERFACE TAMBÉM: era `EventoDoJogo` até a engine falar inglês (ADR-0219). Aumentar um nome
// que já não existe CRIA uma interface nova e solitária — compila, e não estende nada.
declare module '@the-inclusionist/engine/core/state.js' {
  interface GameEvent {
    /** O tema ativo. Muda quando a criança escolhe outro cenário no menu. */
    cenario: string;
    /** O id da atividade escolhida. */
    activity: string;
    /** O nível da alfabetização, 1..5 (as hipóteses da psicogênese). */
    quizLevel: number;
    /** As moedas da rodada, inteiras — quem assina redesenha a lista, não um item. */
    coins: Coin[];
  }
}
