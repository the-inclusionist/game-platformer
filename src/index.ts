// SPDX-License-Identifier: AGPL-3.0-or-later
// O CARTUCHO. Isto e' o que a plataforma importa, e nao tem efeito nenhum ao ser importado.
//
// ⚠️ A ORDEM IMPORTA MAIS DO QUE PARECE: `create` e' REEXPORTADO e nao chamado. Importar este ficheiro nao
// arranca jogo nenhum, nao cria PixiJS, nao toca no documento. Era exatamente o contrario ate a fabrica
// existir — `app/js/main.ts` bootava no import —, e e' a decisao D14 do spec: um cartucho e' INSTANCIADO, e
// estado de escopo de modulo sobrevive ao `teardown()` e vaza para o jogo seguinte na mesma pagina.
export { create } from '../app/js/main.js';
import { DICIONARIOS } from '../app/js/i18n/game-keys.js';
export type { GameCtx, GameInstance, CartuchoMontado, Cartridge, Dicionario, Traduzir } from './contract.js';

/**
 * Casa com o repositorio e com o `name` do pacote (ADR-0082 §1). Escrito como literal e nao lido do
 * `package.json`: o registro diz que os tres sao a MESMA palavra, e uma leitura faria este ficheiro concordar
 * automaticamente com um `package.json` errado em vez de discordar dele.
 */
export const slug = 'game-platformer';

/**
 * OS DICIONARIOS DESTE JOGO — e a nota que estava aqui ficou obsoleta da melhor maneira.
 *
 * Ela dizia «VAZIO, E ISSO E' UMA MEDICAO»: as frases deste jogo viviam DENTRO da engine, e o README
 * chamava-lhe divida. A divida foi paga — `refactor!: the platformer's title menu and 161 of its sentences
 * leave the engine` do lado do motor, e `feat(i18n): the title menu and 176 sentences become this game's
 * own` deste lado. Sao 176 frases em tres idiomas, e moram em `app/js/i18n/game-keys.ts`.
 *
 * ⚠️ O CARTUCHO EXPOE-OS E NAO OS REGISTA (ADR-0139): «registered by whichever shell loads this cartridge;
 * a cartridge never registers its own». Registá-los e' ato de quem possui o tradutor, e o tradutor e' do
 * shell — solto ou plataforma.
 */
export const dicts: Readonly<Record<string, Readonly<Record<string, string>>>> = DICIONARIOS;
