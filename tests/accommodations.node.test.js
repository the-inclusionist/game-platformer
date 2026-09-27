// SPDX-License-Identifier: AGPL-3.0-or-later
// AS DEZOITO RESPOSTAS DESTE JOGO, aferidas pela propria engine.
//
// 📌 O primeiro caso nao afirma nada de meu: `accommodationAnswersProblems` e' a funcao que o `createGame`
// usa para RECUSAR o arranque de um cartucho cuja resposta esteja malformada. Repetir a lista das dezoito
// aqui seria uma segunda copia do contrato, e as duas divergiriam no dia em que uma mudasse.
//
// O segundo e' o que nenhum tipo alcanca: uma chave declarada que o dicionario nao tem deixa a linha do menu
// SEM NOME, e a engine escreve isso em `problems` em vez de rebentar. Um `labelKey` com erro de digitacao
// compila, passa no validador dela, e chega a crianca como um controle sem palavra.
import { describe, it, expect } from 'vitest';
import { accommodationAnswersProblems, GAME_KEYED } from '@the-inclusionist/engine/core/accommodations.js';
import { ACOMODACOES } from '../app/js/declaration/accommodations.js';
import { DICIONARIOS } from '../app/js/i18n/game-keys.js';

describe('a engine aceita as respostas deste jogo', () => {
  it('[Right] `accommodationAnswersProblems` nao tem nada a dizer', () => {
    expect(accommodationAnswersProblems(ACOMODACOES)).toEqual([]);
  });

  // A resposta e' COMPLETA e nao parcial, e a engine recusa o arranque sem isso: um mapa parcial deixa o
  // silencio responder, e aqui o silencio decide pela crianca.
  it('[Boundary] responde TODAS as dezoito, nenhuma por omissao', () => {
    for (const k of GAME_KEYED) expect(Object.prototype.hasOwnProperty.call(ACOMODACOES, k), k).toBe(true);
    expect(Object.keys(ACOMODACOES).length).toBe(GAME_KEYED.length);
  });
});

describe('cada chave declarada tem palavra nos tres idiomas', () => {
  const declaradas = Object.entries(ACOMODACOES)
    .filter(([, v]) => v !== false)
    .flatMap(([k, v]) => [[k, 'labelKey', v.labelKey], ...(v.hintKey ? [[k, 'hintKey', v.hintKey]] : [])]);

  // Sem este caso o de baixo ficaria verde com zero chaves declaradas — a forma mais comum de um portao morrer.
  it('[Zero] ha chaves declaradas para aferir', () => {
    expect(declaradas.length).toBeGreaterThan(10);
  });

  // ⚠️ OS TRES IDIOMAS, e nao so o portugues: uma chave que existe em `pt` e falta em `es` deixa a crianca
  // que joga em espanhol com a linha sem nome, e isso e' uma linha de `problems` que ninguem le ate alguem
  // trocar de idioma.
  it('[Right] nenhuma chave declarada falta em pt, en ou es', () => {
    const buracos = [];
    for (const [acom, campo, chave] of declaradas) {
      for (const idioma of ['pt', 'en', 'es']) {
        if (!DICIONARIOS[idioma] || !DICIONARIOS[idioma][chave]) buracos.push(`${acom}.${campo} -> ${chave} (${idioma})`);
      }
    }
    expect(buracos).toEqual([]);
  });
});

describe('as sete que este jogo oferece, e as onze que nao', () => {
  // Os numeros estao escritos como LITERAIS de proposito: contá-los a partir do proprio objeto faria a
  // asserçao andar junto com ele, e um caso que se move com o que afere nao afere nada. Sao a decisao do Dev
  // de 2026-09-27, medida no codigo deste jogo antes de lhe ser levada.
  it('[Right] sete tem palavra e onze sao `false`', () => {
    const comPalavra = Object.values(ACOMODACOES).filter((v) => v !== false);
    const semSujeito = Object.values(ACOMODACOES).filter((v) => v === false);
    expect(comPalavra.length).toBe(7);
    expect(semSujeito.length).toBe(11);
  });

  // As sete, nomeadas. Uma delas virar `false` por distracao tira da crianca um controle que este jogo TEM,
  // e e' o unico caso que o apanha.
  it('[Right] as sete sao exatamente estas', () => {
    const oferecidas = Object.entries(ACOMODACOES).filter(([, v]) => v !== false).map(([k]) => k).sort();
    expect(oferecidas).toEqual([
      'caneSpacing',
      'contrastOutlines',
      'easyMode',
      'lexicalDifficulty',
      'ownerColors',
      'reducedCharacterMotion',
      'wheelchairMode',
    ]);
  });
});
