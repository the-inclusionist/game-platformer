// SPDX-License-Identifier: AGPL-3.0-or-later
// O CARTUCHO. Isto e' o que a plataforma importa, e nao tem efeito nenhum ao ser importado.
//
// ⚠️ A ORDEM IMPORTA MAIS DO QUE PARECE: `create` e' REEXPORTADO e nao chamado. Importar este ficheiro nao
// arranca jogo nenhum, nao cria PixiJS, nao toca no documento. Era exatamente o contrario ate a fabrica
// existir — `app/js/main.ts` bootava no import —, e e' a decisao D14 do spec: um cartucho e' INSTANCIADO, e
// estado de escopo de modulo sobrevive ao `teardown()` e vaza para o jogo seguinte na mesma pagina.
import { create } from '../app/js/main.js';
import { createPlatformerDeclaration } from '../app/js/declaration/platformer-declaration.js';
import { DEPS_VIVAS, GANCHOS_VIVOS, JOGADORES_VIVOS } from '../app/js/declaration/live.js';
import { ACOMODACOES } from '../app/js/declaration/accommodations.js';
import { platformerPreset } from '../app/js/game/platformer-preset.js';
import { COIN_TARGET } from '../app/js/game/tuning.js';
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
/**
 * ESTE JOGO LE EM VOZ ALTA — a atividade de alfabetizacao fala cada letra, silaba e palavra — e o Dev decidiu
 * em 02/10: usar a voz do APARELHO quando houver, cair no Kokoro quando nao houver (ADR-0216 §3). A engine ja
 * prefere a Web Speech do navegador; declarar `neuralVoice: true` so acrescenta o Kokoro COMO ALTERNATIVA
 * para o caso de o aparelho nao ter voz na lingua da crianca. Os 371 MiB vem no `heavy/` da entrega e ficam no
 * cache verificado — a crianca so os paga uma vez, e nunca entre as cartuchos (ADR-0117: a plataforma e' que
 * paga a conta de banda).
 */
/**
 * ⚠️ `reading` TAMBEM, pedido do Dev (02/10): este jogo precisa de reconhecimento de fala em pt-BR, en-US e
 * es (MX/AR). Com `reading: true` a engine carrega o modelo de LEITURA do idioma vigente MAIS os de todos os
 * idiomas que o cartucho declara em `dicts` — e este cartucho declara pt, en e es. Os modelos de COMANDO
 * (vocabulario curto, navegacao por voz) vem sempre, para os tres («Toda crianca vai experimentar as tres
 * linguas imediatamente», o Dev no `create-game.js:3408`). O custo em bytes paga-se uma so vez pela origem
 * (ADR-0117): mesma origem, mesmo `CacheStorage('incl-pesados-v2')`, mesmo ficheiro no cache de qualquer
 * numero de jogos.
 */
export const uses = { neuralVoice: true, reading: true } as const;

export const hooks: CartridgeHooks = {
  // a pausa (`setPhase`, `getPauseActs`, `setPauseActor`), os dois eixos visuais e o `gamepad` leem a rodada: delegam
  ...GANCHOS_VIVOS,
  accommodations: ACOMODACOES,
  dictionaries: dicts,
  preset: platformerPreset(),
  // OS ASSENTOS, vazios no import e preenchidos pela rodada no lugar (ver `declaration/live`).
  // ⚠️ O `as`: o gancho pede `ctrl: KeyScheme` e o jogador deste jogo declara `KeyScheme | null`, porque nasce
  // sem esquema e o recebe no `assignControls` do arranque — que corre dentro do `create()`, antes de a
  // rodada pôr o primeiro jogador ao alcance de quem lê. É afirmação sobre ESSA ordem, não sobre dado de fora.
  players: JOGADORES_VIVOS as unknown as NonNullable<CartridgeHooks['players']>,
  /*
   * 📌 A DECISÃO A DO DEV (02/10): a pausa e o HUD são os da ENGINE. A raiz do `createGame` desenha UMA tela — o
   * cartão `#vp-pause-0`, a barra e o HUD do assento 0 —, e este jogo, de tela dividida, deixa de desenhar a sua.
   *
   * O PAD NA TELA, pedido (ADR-0166): o jogo segura direção, correr e pular, e num tablet sem teclado é a única
   * forma de jogar. A política é da engine — só com um assento, e some com o cartão ou qualquer overlay aberto.
   */
  onScreenPad: true,
  /*
   * AS MOEDAS DO ASSENTO 0, na faixa da missão («tem de precisa»). ⚠️ Só o assento 0: a engine monta o HUD de uma
   * tela (`create-game.js:2133`). As moedas dos assentos 1–3 e o poder de todos continuam deste jogo, em
   * `ui/seat-hud`, cada um na própria tela — o poder é um rótulo, e a faixa `power` só mostra número.
   * Lido a cada quadro, então lê o array estável dos assentos: vazio no import, «zero de dez» antes de haver jogo.
   */
  hud: [{
    band: 'mission',
    nameKey: 'hud.nome.moedas',
    value: (assento: number) => ({ have: JOGADORES_VIVOS[assento]?.collected ?? 0, need: COIN_TARGET }),
  }],
};

/**
 * O CARTUCHO, no export PADRAO — exigido pelo ADR-0253 passo 2, porque o checador le `declaration` e
 * `hooks` daqui, no import. Antes desta versao este ficheiro exportava membros nomeados, e a nota DV conta
 * este jogo entre os cinco que precisavam de os mudar de lugar.
 */
export default { slug, declaration, dicts, hooks, uses, create };