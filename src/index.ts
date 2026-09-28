// SPDX-License-Identifier: AGPL-3.0-or-later
// O CARTUCHO. Isto e' o que a plataforma importa, e nao tem efeito nenhum ao ser importado.
//
// ⚠️ A ORDEM IMPORTA MAIS DO QUE PARECE: `create` e' REEXPORTADO e nao chamado. Importar este ficheiro nao
// arranca jogo nenhum, nao cria PixiJS, nao toca no documento. Era exatamente o contrario ate a fabrica
// existir — `app/js/main.ts` bootava no import —, e e' a decisao D14 do spec: um cartucho e' INSTANCIADO, e
// estado de escopo de modulo sobrevive ao `teardown()` e vaza para o jogo seguinte na mesma pagina.
import { create } from '../app/js/main.js';
import { createPlatformerDeclaration } from '../app/js/declaration/platformer-declaration.js';
import { DEPS_VIVAS, GANCHOS_VIVOS } from '../app/js/declaration/live.js';
import { ACOMODACOES } from '../app/js/declaration/accommodations.js';
import { platformerPreset } from '../app/js/game/platformer-preset.js';
import type { CartridgeHooks } from '@the-inclusionist/engine';
export { create };
import { DICIONARIOS } from '../app/js/i18n/game-keys.js';
export type { GameCtx, GameInstance, Cartridge, Dicionario, Traduzir } from './contract.js';

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

/**
 * A DECLARACAO, ESTATICA — e ela responde mesmo antes de a fabrica correr.
 *
 * O `inclusionist-check-cartridge` le-a NO IMPORT (ADR-0253), como o `createGame` faz no arranque, e a nota
 * DV nomeia este jogo entre os que a tinham so na instancia. As dependencias delegam ao suporte de
 * `declaration/live`: antes de `create()` respondem a verdade do mundo vazio; depois, a rodada.
 */
export const declaration = createPlatformerDeclaration(DEPS_VIVAS);

/**
 * A METADE DO JOGO das opcoes do `createGame` (`CartridgeHooks = Omit<GameHalf, 'declaration'>`), e a
 * composicao diz o que e' o que: o que LE A RODADA delega ao suporte, e o que e' DADO deste cartucho esta
 * aqui, resolvido uma vez.
 *
 * 📌 `dictionaries` entra por aqui e nao por um `registerDict` do shell: o contrato chama este campo «THE
 * ONE PLACE A GAME'S WORDS LIVE», e todo termo que este jogo declara — o preset, as acomodacoes, o HUD —
 * e' chave dele.
 */
export const hooks: CartridgeHooks = {
  ...GANCHOS_VIVOS,
  accommodations: ACOMODACOES,
  dictionaries: dicts,
  preset: platformerPreset(),
};

/**
 * O CARTUCHO, no export PADRAO — exigido pelo ADR-0253 passo 2, porque o checador le `declaration` e
 * `hooks` daqui, no import. Antes desta versao este ficheiro exportava membros nomeados, e a nota DV conta
 * este jogo entre os cinco que precisavam de os mudar de lugar.
 */
export default { slug, declaration, dicts, hooks, create };