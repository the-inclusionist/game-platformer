// ⚠️ ESTE FICHEIRO VEIO DA ENGINE NA SEPARACAO DO CARTUCHO (issue #111).
// Afere o barramento de eventos com as cargas DESTE jogo (`game/state` aumenta o mapa).
// SPDX-License-Identifier: AGPL-3.0-or-later
// A PROVA DE COMPILAÇÃO do barramento tipado (Fase C do plano).
//
// O barramento era `emit(evt: string, val: unknown)`, e as duas frouxidões custavam a mesma coisa: SILÊNCIO.
// Um `emit('viz', …)` em vez de `'vizMode'` não é erro em lugar nenhum — o assinante certo simplesmente
// nunca é chamado, nada fica vermelho, e a única pista é um painel que parou de se atualizar.
//
// Este arquivo trava as duas garantias onde elas valem: no `tsc`, que o gate `typecheck` roda com ZERO
// tolerância, em qualquer arquivo. A metade de execução mora em `tests/state.node.test.js`.
//
// ENGINE 11 (ADR-0232 D4, nota CZ): o barramento deixou de ser singleton de módulo (`on`/`emit`/`off` de
// `core/state`) e passou a morar no `SettingsStore` que a raiz constrói. O teste constrói o SEU, sobre um
// `memoryBackend()` — nenhuma chave entra ou sai do `localStorage` de outro arquivo (F9 da suíte de navegador).
//
// MUTAÇÕES CONFERIDAS antes de este arquivo valer:
//   · `emit('viz', mode)` no lugar de `'vizMode'`  →  "Argument of type '"viz"' is not assignable to
//     parameter of type 'keyof GameEvent'".
//   · `emit('numPlayers', String(n))`              →  "Argument of type 'string' is not assignable to
//     parameter of type 'number'".
//
// E, desde a engine 11, a metade de PERSISTÊNCIA de `game/state`: as chaves gravadas, com os literais escritos
// à mão (ver o bloco «as chaves gravadas» abaixo).
import { describe, it, expect } from 'vitest';
import { createSettingsStore, type GameEvent, type SettingsStore } from '@the-inclusionist/engine/core/state.js';
import { createStorage, memoryBackend, type Store } from '@the-inclusionist/engine/platform/storage.js';
import { KEYS } from '@the-inclusionist/engine/platform/storage-keys.js';
// o aumento de módulo com os eventos do JOGO mora lá — e, desde a engine 11, o `initGameState` também
import * as gameState from '../app/js/game/state.js';
import type { Coin } from '../app/js/game/coins.js';

/** `true` só quando A é atribuível a B. Mesma ferramenta do teste de supertipo do quiz. */
type Estende<A, B> = A extends B ? true : false;

// A ENGINE declara os seus eventos, e cada carga tem o tipo certo.
// (`phase` SAIU do mapa em 2026-08-26, junto com o binding: ele virou a pilha de `core/scenes`, e os três
//  nomes moram na raiz de composição — a engine não tem mais vocabulário de cenas. Ver ADR-0030 C3.)
const _numPlayers: Estende<GameEvent['numPlayers'], number> = true;
const _blindMode: Estende<GameEvent['blindMode'], boolean> = true;
const _contorno: Estende<GameEvent['hcOutlineFg'], 0 | 1 | 2> = true;

// E o JOGO AUMENTA a interface com os dele. Se o `declare module` de `game/state` sumir — ou mirar um nome que
// a engine já não publica, como `EventoDoJogo` depois do ADR-0219 —, estas quatro caem, e caem AQUI, com nome,
// em vez de virarem um `emit` que ninguém recebe.
const _cenario: Estende<GameEvent['cenario'], string> = true;
const _activity: Estende<GameEvent['activity'], string> = true;
const _quizLevel: Estende<GameEvent['quizLevel'], number> = true;
const _coins: Estende<GameEvent['coins'], unknown[]> = true;

void [_numPlayers, _blindMode, _contorno, _cenario, _activity, _quizLevel, _coins];

/** O store de ajustes de uma raiz, sobre um armazenamento só deste teste. A porta é `{ ...store, KEYS }` (nota CS). */
function novaRaiz(entries: [string, string][] = []): { store: Store; settings: SettingsStore } {
  const store = createStorage(memoryBackend(entries));
  return { store, settings: createSettingsStore({ ...store, KEYS }) };
}

describe('barramento tipado — o que só o compilador podia garantir', () => {
  it('o nome do evento é uma CHAVE do mapa, não uma string qualquer', () => {
    // Em execução isto é trivial; o valor está em não compilar com um nome inventado. O caso existe para que
    // o arquivo apareça na suíte e alguém o abra quando o `tsc` reclamar daqui.
    const nomes: (keyof GameEvent)[] = ['numPlayers', 'vizMode', 'cenario', 'coins'];
    expect(nomes).toHaveLength(4);
  });

  it('a carga chega com o TIPO declarado, não como `unknown` para o assinante converter', () => {
    const { settings } = novaRaiz();
    let visto = -1;
    const cancelar = settings.on('numPlayers', (n) => { visto = n + 1; }); // `n` é `number` sem conversão nenhuma
    settings.emit('numPlayers', 3);
    cancelar();
    expect(visto).toBe(4);
  });

  it('assinante que estoura não impede os outros de receber', () => {
    // Um painel quebrado derruba o painel; não derruba o jogo. É a razão do `try` em volta de cada ouvinte.
    const { settings } = novaRaiz();
    const recebidos: boolean[] = [];
    const explode = (): void => { throw new Error('painel'); };
    const anota = (v: boolean): void => { recebidos.push(v); };
    settings.on('blindMode', explode);
    settings.on('blindMode', anota);
    settings.emit('blindMode', true);
    settings.off('blindMode', explode);
    settings.off('blindMode', anota);
    expect(recebidos).toEqual([true]);
  });
});

// ========================= as chaves gravadas =========================
//
// ⚠️ OS LITERAIS ESTÃO ESCRITOS À MÃO DE PROPÓSITO. Ler a chave por `KEYS.quizlevel(JOGO)` nos dois lados — no
// semear e no conferir — faria o teste andar junto com qualquer renomeação e passar verde enquanto a criança
// perde o nível que salvou. As strings abaixo são as que a engine ≤ 10 gravava, conferidas no histórico do
// repositório da engine (`app/js/platform/storage.ts` antes de e622b515: `kJogo(jogo, nome)` =
// `'incl.' + jogo + '.' + nome`, `quizlevelLegado: 'incl_quizlevel'`, `juice: 'incl_juice'`,
// `attractLegado: (cen) => 'incl_attract_' + cen`), com `JOGO = 'inclusionist'` de `game/save-id`.
describe('as chaves gravadas são BYTE A BYTE as de antes da engine 11', () => {
  it('o registro da engine ainda produz as mesmas strings para as chaves deste jogo', () => {
    expect(KEYS.quizlevel('inclusionist')).toBe('incl.inclusionist.quizlevel');
    expect(KEYS.quizlevelLegado).toBe('incl_quizlevel');
    expect(KEYS.cenario('inclusionist')).toBe('incl.inclusionist.cenario');
    expect(KEYS.cenarioLegado).toBe('incl_cenario');
    expect(KEYS.activity('inclusionist')).toBe('incl.inclusionist.activity');
    expect(KEYS.activityLegado).toBe('incl_activity');
    expect(KEYS.tabsel('inclusionist')).toBe('incl.inclusionist.tabsel');
    expect(KEYS.tabselLegado).toBe('incl_tabsel');
    expect(KEYS.fracnot('inclusionist')).toBe('incl.inclusionist.fracnot');
    expect(KEYS.fracnotLegado).toBe('incl_fracnot');
    expect(KEYS.attract('inclusionist', 'praia')).toBe('incl.inclusionist.attract_praia');
    expect(KEYS.attractLegado('praia')).toBe('incl_attract_praia');
    expect(KEYS.juice).toBe('incl_juice');
  });
});

// ========================= game/state: o store e o barramento por injeção =========================
//
// ⚠️ A ORDEM DOS CASOS IMPORTA: o primeiro roda ANTES de qualquer `initGameState`, e os bindings são de módulo.
describe('game/state — restaura do store injetado e emite no barramento da raiz', () => {
  it('antes do init: os bindings têm os PADRÕES e os setters LANÇAM em vez de gravar no nada', () => {
    expect(gameState.quizLevel).toBe(2);
    expect(gameState.cenario).toBe('cidade');
    expect(gameState.activity).toBe('ludico');
    expect(() => gameState.setQuizLevelValue(3)).toThrow(/initGameState/);
    expect(() => gameState.setCoins([])).toThrow(/initGameState/);
  });

  it('store vazio: nível 2, cenário cidade, atividade lúdico — o padrão VERBATIM', () => {
    const { store, settings } = novaRaiz();
    gameState.initGameState({ store, bus: settings });
    expect([gameState.quizLevel, gameState.cenario, gameState.activity]).toEqual([2, 'cidade', 'ludico']);
  });

  it('lê a chave NOVA quando ela existe, e a nova vence a legada', () => {
    const { store, settings } = novaRaiz([
      ['incl.inclusionist.quizlevel', '4'], ['incl_quizlevel', '1'],
      ['incl.inclusionist.cenario', 'praia'], ['incl_cenario', 'cidade'],
      ['incl.inclusionist.activity', 'alf3'], ['incl_activity', 'mat5'],
    ]);
    gameState.initGameState({ store, bus: settings });
    expect([gameState.quizLevel, gameState.cenario, gameState.activity]).toEqual([4, 'praia', 'alf3']);
  });

  it('HERDA da chave legada quando a nova não existe — ninguém perde o que salvou numa versão antiga', () => {
    const { store, settings } = novaRaiz([['incl_quizlevel', '5'], ['incl_cenario', 'praia'], ['incl_activity', 'mat5']]);
    gameState.initGameState({ store, bus: settings });
    expect([gameState.quizLevel, gameState.cenario, gameState.activity]).toEqual([5, 'praia', 'mat5']);
  });

  it("migra o 'noite' guardado para 'espaco' na LEITURA, e nível fora de 1..5 cai no 2", () => {
    const { store, settings } = novaRaiz([['incl.inclusionist.cenario', 'noite'], ['incl.inclusionist.quizlevel', '9']]);
    gameState.initGameState({ store, bus: settings });
    expect(gameState.cenario).toBe('espaco');
    expect(gameState.quizLevel).toBe(2);
  });

  it('os setters gravam SÓ na chave nova e emitem no barramento injetado', () => {
    const { store, settings } = novaRaiz();
    gameState.initGameState({ store, bus: settings });
    const ouvidos: [string, unknown][] = [];
    const soltar = [
      settings.on('quizLevel', (v) => ouvidos.push(['quizLevel', v])),
      settings.on('cenario', (v) => ouvidos.push(['cenario', v])),
      settings.on('activity', (v) => ouvidos.push(['activity', v])),
      settings.on('coins', (v) => ouvidos.push(['coins', v.length])),
    ];
    gameState.setQuizLevelValue(7); // satura em 5
    gameState.setCenarioValue('praia');
    gameState.setActivityValue('alf2');
    const moedas: Coin[] = [{ x: 1, y: 2, owner: 0, taken: false, shape: '', letter: '' }];
    gameState.setCoins(moedas);
    soltar.forEach((f) => f());
    expect(ouvidos).toEqual([['quizLevel', 5], ['cenario', 'praia'], ['activity', 'alf2'], ['coins', 1]]);
    expect(store.get('incl.inclusionist.quizlevel')).toBe('5');
    expect(store.get('incl.inclusionist.cenario')).toBe('praia');
    expect(store.get('incl.inclusionist.activity')).toBe('alf2');
    expect(store.get('incl_quizlevel')).toBeNull(); // a legada é só lida, nunca escrita
    expect(gameState.coins).toBe(moedas);
  });

  it('um SEGUNDO init (outro jogo na mesma página, D14) relê o SEU store e não herda as moedas do primeiro', () => {
    const a = novaRaiz([['incl.inclusionist.quizlevel', '3']]);
    gameState.initGameState({ store: a.store, bus: a.settings });
    gameState.setCoins([{ x: 0, y: 0, owner: 0, taken: false, shape: '', letter: '' }]);
    const b = novaRaiz();
    gameState.initGameState({ store: b.store, bus: b.settings });
    expect(gameState.quizLevel).toBe(2);
    expect(gameState.coins).toEqual([]);
    // e o setter grava no store do SEGUNDO, não no do primeiro
    gameState.setQuizLevelValue(4);
    expect(b.store.get('incl.inclusionist.quizlevel')).toBe('4');
    expect(a.store.get('incl.inclusionist.quizlevel')).toBe('3');
  });
});
