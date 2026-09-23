// SPDX-License-Identifier: AGPL-3.0-or-later
// game/tile-flags — AS PERGUNTAS QUE SÓ ESTE JOGO FAZ A UM TILE. Vieram da engine em 2026-09-07.
//
// ========================= POR QUE MUDARAM DE CASA =========================
// `ehAgua`, `ehEscada`, `ehPortao` e `ehSecreto` estavam em `core/constants.ts` da engine e tinham **zero
// importadores lá dentro** — todos estavam aqui. Água, escada, portão e região secreta são vocabulário de
// PLATAFORMA: um quiz não tem escada, um jogo de tabuleiro não tem região secreta. Uma engine que publica
// `ehEscada` está a afirmar que todo jogo tem escadas.
//
// ⚠️ E DUAS IRMÃS DELAS FICARAM LÁ, o que parece incoerente e não é — é a fronteira real, e vale escrita:
//
//     `ehPerigo` e `ehTrampolim` continuam a ser importados da engine, porque a engine LÊ-OS, e não por
//     geometria: `core/collision.isSolidType` torna perigo e trampolim SÓLIDOS no modo cadeira de rodas, e
//     perigo sólido no modo cego. É uma regra de ACESSIBILIDADE — a criança em cadeira de rodas não cai no
//     fosso —, e essa é da engine, não deste jogo.
//
// Ou seja: a engine precisa de saber que um tile é PERIGO; não precisa de saber que ele é ESCADA.
//
// ========================= O QUE FICA POR DECIDIR, E ESTÁ NA ISSUE #63 =========================
// A tabela `TILE_TYPES` continua na engine, e ela carrega as bandeiras `water`, `ladder`, `gate`, `key` e
// `secreto` que nenhum módulo de engine lê. Estes predicados são, por enquanto, perguntas deste jogo sobre
// uma tabela que a engine publica. O fim honesto é a tabela mudar de casa e o jogo declarar os papéis pelo
// `core/contract` (`roleOf`) — que é o mecanismo que a engine já tem para isso. Fica registado, não feito.
import { TILE_TYPES } from '../core/tiles.js';

/** Uma propriedade da tabela de tiles. Cópia da forma que a engine usava — uma função, não um `?.` espalhado. */
const prop = (t: number, k: 'water' | 'ladder' | 'gate' | 'secreto'): boolean => !!TILE_TYPES[t]?.[k];

/** Água: nada-se, e a queda é lenta. */
export const ehAgua = (t: number): boolean => prop(t, 'water');
/** Escada: sobe-se. */
export const ehEscada = (t: number): boolean => prop(t, 'ladder');
/** Portão: abre com a chave. */
export const ehPortao = (t: number): boolean => prop(t, 'gate');
/** Ar de região secreta: o que a escuridão cobre até alguém entrar. */
export const ehSecreto = (t: number): boolean => prop(t, 'secreto');
