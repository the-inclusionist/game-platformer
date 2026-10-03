
// ⚠️ A POSIÇÃO É O CONTRATO. A primeira versão declarou isto 380 linhas abaixo, e o boot morreu com
// `Cannot read properties of undefined (reading 'gateOpen')`: o `initCollision` da linha ~162 já lê a
// instância. Sem minificar seria um erro de TDZ com nome; minificado, `const` de topo vira `var` e o erro
// vira um `undefined` silencioso. Terceira vez que esta armadilha morde este arquivo — as outras foram o
// `setPlayerViz` e os auxiliares `jogadores()`/`controlados()`.

/**
 * A RODADA (ADR-0038, Fase B). A raiz de composição POSSUI a instância; ninguém mais a alcança por
 * import. O genérico é `Powerup` porque o tipo do power-up é do JOGO — a engine declara a forma da lista
 * e quem cria diz de quê ela é. Era `readonly unknown[]` em `core/state`, e o `unknown` custava três
 * erros de tipo aqui embaixo.
 */

/* ===================== OS IMPORTS, TODOS AQUI EM CIMA =====================
 *
 * ⚠️ ESTAVAM INTERCALADOS COM O CODIGO — 125 declaracoes espalhadas ate a linha 608 —, e isso tinha de
 * acabar antes de este ficheiro poder virar a fabrica do cartucho: um `import` e' declaracao de MODULO e
 * nao pode viver dentro de uma funcao. Icar nao muda comportamento nenhum, porque o ES ja os iça; o que
 * muda e' tornar o passo seguinte possivel.
 *
 * 📌 Cada um veio com o bloco de comentario que estava colado a ele. Deixar as explicacoes para tras teria
 * sido a parte cara deste movimento, e e' a unica perda que um `git diff` nao mostraria como perda.
 */

// SPDX-License-Identifier: AGPL-3.0-or-later
// The Inclusionist v4 — port do Lúdico real sobre PixiJS.
// ESTE ARQUIVO CHAMAVA-SE game.js ate a etapa D2 da modularizacao. O nome mudou porque o conteudo mudou: o
// jogo saiu daqui para 55 modulos em core/game/input/platform/render/ui, e o que restou e COMPOSITION ROOT —
// cria as instancias, liga uma na outra e registra os ouvintes. Se voce veio procurar como o jogo funciona,
// nao e aqui: e a fisica em game/physics, o desenho em render/draw, a rodada em game/session, o teclado em
// input/keydown. Os cabecalhos dos modulos ainda dizem 'extraido do game.js', e devem continuar dizendo:
// aquele era o nome do arquivo quando cada um saiu de la.
// VERSIONAMENTO (recalculado do git em 2026-07-02): MINOR +1 a cada feature (patch zera);
// PATCH +1 a cada conserto/ajuste; docs/chore não mudam versão. INCL_VERSION agora é DISPLAY (bump em mudança relevante); o cache é por content-hash do vite-plugin-pwa (Estágio 1) — sem sw.js/bump manual.
// ⚠️ A FOLHA DE ESTILO DA ENGINE NÃO SE IMPORTA AQUI, e sim no SHELL (`src/standalone.ts`). Esta linha
// existia de quando `main.ts` era a raiz da página; num cartucho ela é defeito: a engine é externa no build do
// cartucho, então o `import` sobrevive em `cartridge.js`, e importar o cartucho fora de uma página rebenta
// («Unknown file extension .css») — o `inclusionist-check-cartridge` recusa-o (ADR-0139 §2: importar um
// cartucho não pode precisar de página). Quem tem a página traz a folha; na plataforma, é o shell dela.
import * as PIXI from 'pixi.js'; // PixiJS 7.4.2 via npm (Vite empacota; aposenta o <script> global vendor/pixi.min.js)
import * as tiles from './core/tiles.js'; // legend + parser do mapa em glifo
import { createStorage } from '@the-inclusionist/engine/platform/storage.js'; // camada de persistência
import { KEYS } from '@the-inclusionist/engine/platform/storage-keys.js'; // o registro de chaves saiu do `storage` (ADR-0232)
import type { GameEvent } from '@the-inclusionist/engine/core/state.js';
import { defaultReducedMotion } from '@the-inclusionist/engine/core/setting-defaults.js';
import { cenario as CENARIO, setCenarioValue, activity as ACTIVITY, setActivityValue } from './game/state.js'; // GAME (ADR-0038, Fase B)
import { JOGO } from './game/save-id.js'; // ADR-0080: o id deste jogo, que a engine deixou de guardar
import { createRunState } from './core/run-state.js'; // ADR-0038 Fase B: a RODADA como fábrica
import { criarCenasDoJogo, type Fase } from './game/cenas.js'; // as três cenas DESTE jogo (ADR-0030 C3)
import type { SceneFacts } from '@the-inclusionist/engine/core/scenes.js';
import type { Powerup } from './game/level-geometry.js'; // o tipo do power-up é do JOGO
import type { Player, PlayerView } from '@the-inclusionist/engine/core/entity.js'; // a entidade da ENGINE, e a vista mínima dela
import type { GamePlayer, ControlledGamePlayer } from './game/entity.js'; // as deste JOGO — ver `jogadores`/`controlados`
import type { ModalIntent, ControlsSnapshot } from '@the-inclusionist/engine/input/keydown.js'; // a intenção direcional do ADR-0033
import type { RenderTextureLike, SpriteLike, GraphicsLike } from '@the-inclusionist/engine/render/screen-pipeline.js'; // o ctx de lá declara estes
import type { MotionSceneKey, MotionSceneFlags } from '@the-inclusionist/engine/ui/settings-motion.js'; // as quatro chaves de movimento reduzido
import { quizLevel, setQuizLevelValue, coins, setCoins, initGameState } from './game/state.js'; // item 19: o estado DESTE jogo
import type { GameCtx, GameInstance } from '../../src/contract.js'; // o contrato do cartucho, deste lado
import { ligarDeclaracao, desligarDeclaracao, ligarGanchos, desligarGanchos, JOGADORES_VIVOS, soltarJogadores } from './declaration/live.js'; // o contrato do cartucho, deste lado
// `startLoop` e `criarAvisoDeQueda` sairam daqui com o laco: sao do SHELL (ADR-0139), e vivem em src/standalone.ts
import { initDebugPanel, type CharacterSample } from '@the-inclusionist/engine/ui/debug-panel.js'; // painel ?debug (Tier 1)
import { createAttract } from './game/attract.js'; // modo demonstração (Tier 1)
import { isValidActivityId, DEFAULT_ACTIVITY_ID, modeForActivity, type GameMode }
  from '@the-inclusionist/engine/educational/activities-registry.js'; // ADR-0040: o MODE deriva daqui, e a derivação mora no currículo
import { buildElevators, elevAt, getElevShafts, initElevators } from './game/elevators.js'; // Estágio 4 (Tier 2): geometria de elevador (cadeirante)
import { fmtFrac, fracGraphic, speakChoice } from './game/fractions.js'; // Estágio 4 (Tier 2): matemática/render de frações
import { brailleText } from './game/braille.js'; // Estágio 4 (Tier 2): cela braille + fala (atividade cego)
import { SOMASUB_SHAPES, WORD_INITIALS } from './game/activity-content.js'; // Estágio 4 (Tier 2): dados das atividades (formas + sílabas)
import { JUICE, saveJuice, puffDust, burstSparkle, addShake, addHitstop, setSquash, stepFx, initFx, tickHitstop, getParticles, getHitstopT, getShakeT } from './render/fx.js'; // Estágio 4 (Tier 2): juice (partículas/shake/hitstop/squash)
import { parallaxPlaceholder, themeSkyTexture, themeHillsTexture, themeCitySkyTexture, themeSkylineTexture } from './render/scene-parallax.js'; // Estágio 4 (Tier 2): geradores de textura do parallax
import { worldCanvas, initWorldTex } from './render/world-tex.js'; // Estágio 4 (Tier 2): builder da textura NORMAL do mundo
import { FONT_GROUPS } from '@the-inclusionist/engine/ui/fonts.js'; // Fase 2: tipografia (catálogo + persistência)

/*
 * OS DOIS SELETORES SAO DESTA RAIZ AGORA (ADR-0232 D4, nota DE). A engine tirou-os de `ui/dom` porque eram
 * a ultima leitura do `document` de PAGINA INTEIRA fora de uma raiz de composicao: todo modulo consulta o
 * documento que lhe entregam, e quem tem um documento e' quem compoe. A nota mede os sete jogos e diz que
 * este e' o unico que os importava.
 *
 * ⚠️ Eles olham o `document` e ainda nao a `ctx.region`, e a diferenca importa: 36 overlays deste jogo vivem
 * FORA do `#game-region`. No dia em que os paineis passarem a ser montados pelo `createGame`, estes dois
 * estreitam-se para a regiao — e ai deixam de poder alcançar o que nao e' deste cartucho.
 */
const $ = <T extends Element = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
// (o `$$` saiu com o `initSettingsPanel` desta raiz, o seu único leitor: a pilha de overlays é a da engine)
import { cityTiles } from './render/city-tiles.js'; // #16: os tiles da Cidade como dados, não como PNG // 7º menu: Comunicação Aumentada e Alternativa (ADR-0028)
import { initTitle } from '@the-inclusionist/engine/ui/title.js';
import { createTitleScene } from './render/title-scene.js'; // Fase 2.27: atalho de querySelector (Tier 1)
import { shortLabellerFrom, wordsOf, type Action } from '@the-inclusionist/engine/core/actions.js';
import { playerPrefix } from '@the-inclusionist/engine/ui/mobility-choices.js'; // o prefixo «Jogador N» dos anúncios em multi-tela
import { platformerPreset } from './game/platformer-preset.js';
import { isBlind, isLowVision, type VisualState } from '@the-inclusionist/engine/render/viz-axes.js'; // os dois eixos (8.0.0): quem responde ao sonar
import { VIZ_MODES, VIZ_BY_KEY, VIZ_CYCLE } from '@the-inclusionist/engine/render/viz-modes.js'; // Fase 2: modos visuais de a11y (dados)
import { gameSay, type GameVoice } from '@the-inclusionist/engine/platform/speech.js';
import { createAudioJingles } from '@the-inclusionist/engine/platform/audio-jingles.js'; // Tier 2 (áudio r1): jingles de vitória/enigma/fogos
import { createAudioEarcons } from '@the-inclusionist/engine/platform/audio-earcons.js'; // Tier 2 (áudio r2): earcons (sfx) + porta + legendas
import { createAudioNav } from './platform/audio-nav.js'; // Tier 2 (áudio r3): bengala e nado cego (a metade que le o mundo)
import { createAudioGuide } from './platform/audio-guide.js'; // the continuous sound guide — this game's own (ADR-0257)
import type { Topology } from '@the-inclusionist/engine/core/contract.js'; // the metric the sonar and the guide share
import { createAudioAmbient } from '@the-inclusionist/engine/platform/audio-ambient.js'; // Tier 2 (áudio r4): trilha de ambiente + trovão
import { SPR, TEX_IDLE, TEX_WALK, TEX_RUN, FLAVORS, TEX_JUMP_UP, TEX_JUMP_DOWN, TEX_CLIMB, TEX_FLY, TEX_CLING_WALL, TEX_CLING_CEIL, TEX_SWIM, TEX_SWIMIDLE, initCharacterSprites } from './render/sprites.js';
import { tex, pixelTexture } from '@the-inclusionist/engine/render/canvas.js'; // `makeCanvas` saiu junto: o painter é quem o chama agora
import { CENARIOS, THEME_FLORA, hexN } from './render/cenario-data.js'; // D2-b: catalogo dos cenarios (folha: dado puro, zero deps)
import { PARALLAX, createParallax } from './render/parallax.js'; // D2-b: as 3 camadas de fundo — fatores, rolagem e troca de tema
import { createSetCenario } from './render/set-cenario.js'; // D2-b: a troca de cenario (orquestracao; leva o loadTileImages)
import { createSceneSky } from './render/scene-sky.js'; // Tier 2 (#43): céu — nuvens (#21) + decor viva da v3
import { coinCanvas, treeCanvas, powerupCanvas } from './game/props.js'; // item 19: a arte dos props e do JOGO, nao da engine
import { createCityTextures } from './render/city-tex.js'; // D3-a: arte procedural da rua (bichos, pedestres, carros)
import * as weather from './render/weather.js'; // Onda A: clima visual (chuva/trovao/clarao)
import * as traffic from './game/traffic.js'; // Onda A: carros + semaforo da rua da frente
import * as life from './game/life.js'; // Onda A: vida ambiente (pombos/gatos/caes/adultos)
import { initSceneCity } from './render/scene-city.js'; // Onda A: deco da Cidade + fx de tiles vivos
import { initTextures, SHAPE_TEX, letterTexture, pupTexFor, resetPupTexCache } from './render/textures.js'; // Onda A: texturas de moeda/forma/letra + power-up
import { DIRECT_CFG, createHighContrast } from '@the-inclusionist/engine/render/high-contrast.js'; // Onda A: Renderizacao Direta (alto contraste)
import { initCoinSpawning, rebuildCoins, showPower, getCoinSprites } from './game/coin-spawning.js'; // Onda A: materializacao dos sprites de moeda
import { puTaken } from './game/powerups.js'; // item 19: a regra "chave e global, o resto e por jogador" saiu do render/draw
import { initKeydown } from '@the-inclusionist/engine/input/keydown.js'; // D2-a: o roteador de teclado (a cadeia de precedencia) // Onda A: esquema de teclas por jogador
import { initActivitiesMenu, attachAbbr, QL_NAME } from './ui/activities-menu.js'; // the title menu is this game's (engine ADR-0174)
// 📌 DECISÃO A DO DEV (02/10): a pausa, a barra, a navegação de menus, o toque e o gamepad são do `createGame`.
// Saíram daqui `initPauseIcons`, `initShell`, `initMenuNav`, `initHud`, `initTouchBindings` e `initGamepad`; ficam
// a TELA DE TÍTULO e o HUD das telas que a engine não desenha, que são deste jogo.
import { createTitleScreen } from './ui/title-screen.js';
import { createSeatHud } from './ui/seat-hud.js';
import { createPadWizardDemo } from './ui/pad-wizard-demo.js';
import { createBarraRecolhivel } from './ui/barra-recolhivel.js';
import { criarPadOpaco } from './ui/pad-opaco.js';
import { criarComandosVirtuais, ARESTA_DA_ACAO } from './core/comandos-virtuais.js';
import type { VirtualCommand } from '@the-inclusionist/engine/input/virtual-controller.js';
import { keyName } from '@the-inclusionist/engine/ui/control-choices.js';
import { createPadMaps } from '@the-inclusionist/engine/input/pad-wizard.js';
import { initScreenPipeline } from '@the-inclusionist/engine/render/screen-pipeline.js'; // D3-c: topologia do render por tela (grade, render-textures, molduras, bolinhas)
import { initSecretAreas } from './game/secret-areas.js'; // D3-c: area secreta revelada por presenca + anuncio ao leitor de tela
import { initPhysics, stepPlayer as stepPhysics } from './game/physics.js'; // B1: fisica do jogador (ancorada nas trajetorias-ouro)
import { initQuiz } from './game/quiz.js'; // B3: o desafio educativo (geracao + markup + efeito)
import { initViewports } from '@the-inclusionist/engine/render/viewports.js'; // B2: fabrica de imagem dos modos de visao
import { initSession } from './game/session.js'; // C2: o ciclo de vida da RODADA (MODE_LABELS/MODES saíram com o #opt-mode)
import { initDraw } from './render/draw.js'; // C1: camera + o quadro + a escolha de quadro do personagem
import { initVizSetters } from '@the-inclusionist/engine/render/viz-setters.js'; // Onda A: aplicacao dos modos de visao acessivel
import { roleOf } from './game/tile-roles.js'; // Passo 7: a tabela tile->papel e' do JOGO, nao do alto contraste
import { initLevelGeometry, buildRamps, buildRopes, drawElevators, buildDarkRegions, buildWcGeom as lgBuildWcGeom, rebuildExtras as lgRebuildExtras, setupExtras as lgSetupExtras } from './game/level-geometry.js'; // Onda A: rampas/cordas/elevador/escuridao/extras
// Constantes puras extraídas para core/constants.js (modularização Fase B).
import { LOGICAL_W, LOGICAL_H, TILE } from '@the-inclusionist/engine/core/constants.js';
// ANIM/EASY/TILE_COLOR vieram para casa: sao NUMEROS DESTE JOGO, e a engine nao descreve um jogo (nota 2).
import { ANIM } from './core/game-constants.js';
import { COIN_TARGET, TUNE } from './game/tuning.js';
import { TILE_TYPES } from './core/tiles.js'; // a tabela do que cada tile É — a reciclagem pergunta "isto é água?"
import { acaoDeCarga } from './game/carry.js'; // qual botão pega, solta e arremessa (ADR-0045)
import { MATERIAIS, travarNaPlaca } from './game/recycling.js'; // os quatro materiais, e a trava da placa
import { createRecycling } from './game/recycling-scene.js'; // a reciclagem: lixo, lixeiras e a placa (ADR-0049 §1)
import { createRecyclingTextures, LIXO_ART, LIXEIRA_W, LIXEIRA_H, PLACA_H } from './render/recycling-tex.js';
import { Z } from './core/layers.js'; // #69/ADR-0020: ordem-z canônica (nomeada) do render
import type { Rng } from '@the-inclusionist/engine/core/rng.js'; // Fase 2.26: RNG semeado (Tier 1)
import { initCollision, tileAt, solidAt, surfTop } from './core/collision.js'; // Estágio 4: colisão de grade (determinística; ctx por closures)
import { BOX, makePlayer } from './game/player.js'; // Estágio 4: entidade + geometria de colisão do jogador
import { initCoins, findCoinCandidates, pickCoins } from './game/coins.js'; // Estágio 4: posicionamento dos coletáveis (pools vêm daqui)
import { initMinimap, markSeen, redrawMinimapIfDirty, drawMinimapPlayer, resetMinimap, setMinimapVisible, getMinimap, minimapSeenCount, proximoCantoDoMinimapa } from './render/minimap.js'; // Estágio 4 (Tier 1): minimapa + fog-of-war
import { createLayout } from '@the-inclusionist/engine/ui/layout.js'; // Estágio 4 (Tier 1): escala do jogo (múltiplo inteiro de 320×180 em px reais)
// Mundo carregado do texto-glifo assets/levels/clarity.map.txt (Fase 1.2). Construtor em core/world.js.
import { buildWorldFromText } from './core/world.js';
// SFX (definicoes de som) extraido p/ platform/audio.js (Fase 2), e de la para game/earcons.js (item 19):
// sete dos dez earcons sao deste jogo, e as legendas eram pt-BR cru dentro da engine.
import { SFX } from './game/earcons.js';

/* ===================== A FABRICA DO CARTUCHO (ADR-0139, D14) =====================
 *
 * ⚠️ ESTE FICHEIRO DEIXOU DE BOOTAR NO IMPORT. Era um modulo com efeito de topo: importa-lo arrancava o
 * jogo. Um cartucho e' INSTANCIADO, e estado no escopo do modulo sobrevive ao `teardown()` e vaza para o
 * jogo seguinte na mesma pagina — que e' a decisao D14 e tambem a historia de utilizador da propria engine:
 * «quero que a engine nao carregue estado de jogo, para que dois jogos numa pagina nao colidam».
 *
 * 📌 O CORPO NAO FOI REINDENTADO, DE PROPOSITO. Deslocar 1900 linhas duas colunas faria o `git diff` deste
 * commit dizer que tudo mudou, e esconderia as poucas linhas que mudaram mesmo. A reindentacao cabe num
 * commit proprio, que nao muda mais nada e por isso se le sem esforco.
 *
 * ⚠️ O LACO NAO MORA MAIS AQUI. Um cartucho nunca chama `startLoop`: em modo solto quem o chama e' o shell,
 * e na plataforma e' UM laco a chamar o `update(dt)` de cada cartucho montado. Seis cartuchos a abrir cada
 * um o seu `requestAnimationFrame` seriam seis lacos a disputar o mesmo quadro.
 *
 * 📌 `dt` continua em QUADROS, e nao em segundos. E' a convencao herdada que mais se quebra.
 */
export async function create(ctx: GameCtx): Promise<GameInstance> {

// A ficha de cancelamento dos ouvintes GLOBAIS. Seis deles vivem na `window` e nao morrem com o DOM da
// regiao: um `signal` em cada registro e um `abort()` solta os seis de uma vez, o que e' a unica forma
// honesta de um `teardown()` existir num ficheiro que nunca teve um `removeEventListener`.
const CANCELAR = new AbortController();
const SOLTAR = { signal: CANCELAR.signal } as const;
// O MESMO, para as escutas na loja de ajustes da engine: ela sobrevive a este cartucho (é da página), então
// cada `on` devolve o seu desligar e o `teardown()` chama-os todos. Sem isto, o jogo seguinte na mesma página
// herdaria um ouvinte que refaz as moedas de um mundo que já não existe.
const DESLIGAR: (() => void)[] = [];


/*
 * A PERSISTENCIA E OS AJUSTES SAO CONSTRUIDOS AQUI (ADR-0232 D4, notas CT e CU). Nenhum modulo le
 * `localStorage` nem `core/state` por import: quem os tem e' quem compoe, e os entrega.
 *
 * 📌 O nome `store` fica: era um espaco de nomes (`import * as store`) e passa a ser a instancia, entao
 * todas as chamadas `store.get`/`store.setBool` continuam a ler exatamente igual. O registro de chaves é que
 * saiu dela: `KEYS` vem de `platform/storage-keys`.
 *
 * ⚠️ A LOJA DE AJUSTES JÁ NÃO SE CONSTRÓI AQUI — é a da engine, logo abaixo. Esta `store` crua fica para as
 * chaves que só este jogo grava; é um invólucro sem memória sobre o mesmo armazenamento, então ler pelas duas
 * dá a mesma resposta. Se o cartucho deve receber o armazenamento pelo `ctx` em vez de o abrir, é pergunta
 * de contrato, e está registada no plano como decisão do Dev.
 */
const store = createStorage(typeof localStorage === 'undefined' ? null : localStorage);

/*
 * A ENGINE, UMA SÓ, E É ELA QUEM POSSUI O QUE ERA SINGLETON DE MÓDULO (ADR-0232 D4).
 *
 * 🔴 `settingsStore` NÃO SE CONSTRÓI MAIS AQUI. Até 27/09 esta linha fazia `createSettingsStore(store)`, e
 * isso eram DUAS lojas de ajustes na mesma página: a da engine e esta. Cada uma guarda os valores em memória
 * — então a criança ligava o alto contraste na barra (que escreve na da engine) e o jogo, lendo a sua, não
 * via. Sem erro, sem teste vermelho: só um ajuste que não pega.
 *
 * 📌 Os nomes ficam iguais aos dos imports antigos (`srSay`, `ensureAC`, `tone`…), e de propósito: o que
 * mudou foi DE ONDE vêm, não o que fazem, e o diff deste passo deve mostrar só isso. Valores vivos — o
 * volume, o `AudioContext` — leem-se por `audio.X` a cada uso, porque um `const` copiaria o valor do
 * arranque para sempre.
 */
const engine = ctx.engine;
// O DOCUMENTO onde as telas se fazem: o que possui a região DESTE cartucho, e não o global `document`
// (ADR-0232 D4). Na plataforma são o mesmo objeto; num teste ou numa segunda raiz, não.
const doc = ctx.region.ownerDocument;
const settingsStore = engine.settings;
/** Escuta um ajuste da loja da engine e regista o desligar para o `teardown()` (ver `DESLIGAR`). */
/*
 * O ESTADO DESTE JOGO (nível, moedas, cenário, atividade) restaura-se AQUI, logo que há loja e barramento, e
 * não no import de `game/state` (ADR-0232 D4). E é o primeiro uso: o `setCoins` do arranque e a validação
 * da atividade escolhida vêm abaixo, e os setters recusam-se a correr antes disto.
 */
initGameState({ store, bus: settingsStore });
function ouvir<K extends keyof GameEvent>(evt: K, fn: (val: GameEvent[K]) => void): void { DESLIGAR.push(settingsStore.on(evt, fn)); }
const audio = engine.audio;
const input = engine.input;
const srSay = (texto: string): void => engine.say(texto);
const srAlert = (texto: string): void => engine.alert(texto);
const ensureAC = () => audio.ensureAC();
const audioOut = () => audio.audioOut();
const catNode = (cat: string) => audio.catNode(cat);
const tone: typeof audio.tone = (...a) => audio.tone(...a);
const tonePan: typeof audio.tonePan = (...a) => audio.tonePan(...a);
const noiseHit: typeof audio.noiseHit = (...a) => audio.noiseHit(...a);
const setHearingLossGraph = (on: boolean) => audio.setHearingLossGraph(on);
const setMasterMuted = (m: boolean) => audio.setMasterMuted(m);
/*
 * O ESTADO DO CONTROLADOR VIRTUAL DA ENGINE (ADR-0111, issue #197) — ver `core/comandos-virtuais`.
 * A engine entrega aqui cada posição que o aparelho da criança alcançou; o `held` abaixo soma-o ao dela.
 */
const comandosVirtuais = criarComandosVirtuais();
/*
 * ⚠️ OS DOIS, E NÃO UM: `input.held` da engine responde pelo TECLADO e pelo PAD, que produzem tecla; o
 * registo acima responde pelos transportes que não produzem nenhuma — gestos, rosto, olhos, voz, varrimento.
 * 📏 Medido em 03/10: o `virtualController.press` só segura tecla `if (code)`, isto é, se o esquema do
 * assento nomear uma para aquela posição; mas ENTREGA o comando sempre. Ler só as teclas deixava a câmera e
 * metade da voz a comandar coisa nenhuma, com o ícone aceso e o jogo parado.
 */
/* ⚠️ O ASSENTO SAI POR IDENTIDADE e nao por um campo: o `held` da engine recebe `HeldPlayer`, que e'
 * `Pick<ControlledPlayer,'ctrl'|'pad'>` — uma vista sem indice, e o `pad` que ela traz e' o do gamepad, nao
 * o do assento. Em tempo de execucao o objeto E' um dos de `players`, entao a comparacao por referencia
 * responde certo; um objeto de fora da lista da' -1, e `segura(-1, …)` e' falso, que e' a resposta certa. */
const assentoDe = (pl: object): number => players.findIndex((p) => p === pl);
const held: typeof input.held = (pl, act) => input.held(pl, act) || comandosVirtuais.segura(assentoDe(pl), act);
const setLq = (v: number) => engine.lq.set(v);
const getLqT = () => engine.lq.t();

/*
 * O TRADUTOR VEM DO SHELL, PELO `ctx` (ADR-0139 §4 e ADR-0232 D3, nota CV).
 *
 * ⚠️ ELE NAO SE CONSTROI AQUI, e a diferenca nao e' de estilo: um `createTranslator()` nesta linha daria
 * DOIS tradutores na mesma pagina — o do shell e o da fabrica —, cada um com o seu dicionario e o seu
 * idioma, e a crianca veria metade do jogo traduzida. Quem possui o tradutor e' quem carrega o cartucho.
 */
const t = ctx.t;

// `jogadores`: o MESMO array que a declaração estática entrega à engine como `hooks.players` (ver
// `declaration/live`). A rodada preenche-o no lugar, e a engine passa a ver os assentos em que escreve.
const rodada = createRunState<Powerup>({ jogadores: JOGADORES_VIVOS, aoTrocarJogadores: (n) => settingsStore.emit('numPlayers', n) });
// `players` é um APELIDO, não uma cópia: a lista da rodada nunca é reatribuída (só mutada no lugar), então
// um `const` aponta para o mesmo array para sempre — e as 44 leituras deste arquivo seguem escritas igual.
// Ver a nota do campo em `core/run-state`, que é onde essa garantia está declarada.
const players = rodada.players;
// A escala das telas lê a contagem da rodada: por isso o palco nasce logo abaixo, junto da criação dela.
/* ===================== AS CENAS (ADR-0030 C3, passo 3 da Fase B) =====================
   `phase: 'title'|'playing'|'paused'` SAIU de `core/state`. As três cenas e as regras de ir de uma para a
   outra moram em `game/cenas` — do lado do JOGO, porque o vocabulário é dele —, e o que atravessa de volta
   para a engine são três BOOLEANOS (`SceneFacts`). É a mesma correção que o `consumer-quiz` obrigou a
   fazer no `menu-nav` (`getPhase()` → `isNavigable()`), registrada em `core/constants` como o erro a não
   repetir.

   ⚠️ O QUE ESTE PASSO NÃO FAZ: as cenas ainda não têm CORPO. As três regras do `core/scenes` — update só no
   topo, draw de baixo para cima, input só no topo — continuam sendo os `if (!mundoRodando) return`
   espalhados. Encaminhar o quadro pela pilha muda o laço principal, e misturar isso com "quem pergunta o
   quê" tornaria qualquer regressão inatribuível. Fica para a fatia seguinte. */
// O `aoTrocar` é ARROW e não valor, e isso é o que o torna válido aqui: `telaDeTitulo` é um `const` declarado
// ~1.500 linhas abaixo, e só a resolução na hora da chamada o tira da TDZ. A primeira troca de cena é o
// `setPhase('title')` do boot, lá embaixo, depois de a tela de título existir.
const cenas = criarCenasDoJogo(() => telaDeTitulo.applyScene());
const fatosDaCena = (): SceneFacts => cenas.fatos();
// A ESCALA DO PALCO é uma instância desta raiz (`createLayout`), e não mais um singleton ligado por
// `initLayout`. `afterScale` é a ancoragem da scanline do CRT da engine, que o módulo antes chamava por import.
// 📌 O nome `layout` fica, como o `srSay` lá em cima: o resize, o ctx da sessão e o `__incl` seguem iguais.
// ⚠️ FICA AO LADO DA ESCALA DA ENGINE, e não é duplicata: as duas fazem a MESMA conta (`stageScale` sobre
// `screenBaseSize(n)`, escrita por `applyScale` no `#game-region`), mas a da engine (`applyResolution`,
// `create-game.js:2064`) só corre no arranque e no `resize` — e a base muda quando muda o número de telas
// (1 → 320×180, 2 → 640×180, 3–4 → 640×360). Quem entra no meio da partida (`joinPlayer`) chama esta, e sem ela o
// canvas de duas telas ficaria na escala de uma até a janela mudar de tamanho.
const palco = createLayout({ doc, win: window, numPlayers: () => rodada.numPlayers,
  afterScale: () => engine.crt.scanVars(), debug: () => /[?&]debug=true/.test(location.search) });
const layout = (): void => palco.layout();
// `a11yVisualAtiva`: ALGUM jogador fora do modo `normal`. O CRT é decoração GLOBAL — uma só para a tela
// inteira —, então não há como escurecer as bordas de meia tela; se decoração e acessibilidade de qualquer
// criança se contradizem, quem cede é a decoração (ADR-0020, "precedência a11y > estética").
// O CRT E DA ENGINE: `createGame` monta-o e devolve-o em `engine.crt`.


/**
 * As posições que ESTE jogo usa, com a palavra dele, no idioma de agora.
 *
 * ⚠️ Vive na raiz de composição e não no preset porque derivar a lista é trabalho de COMPOSIÇÃO: o preset
 * declara o vocabulário, e quem o transforma no que uma tela precisa é quem monta a tela. Pô-lo no preset
 * obrigaria os trezentos jogos a repetir a mesma derivação.
 */
// ⚠️ O preset devolve CHAVES (`labelKey`/`shortKey`) desde a engine 11: `wordsOf` resolve-as pelo `t` a cada
// chamada, e é o que mantém o rótulo no idioma de agora.
function rotuloCurto(acao: string): string | null {
  return shortLabellerFrom(wordsOf(platformerPreset(), t))(acao as Action);
}
// (`acoesDoJogo` saiu: alimentava o painel de controles desta raiz, e o painel é o da engine, que lê o `preset`.)
if(typeof window!=='undefined') window.__tiles = tiles; // hook de teste (Preview); world.js passa a usar na etapa 2
initCharacterSprites(doc); // cria as texturas do personagem no boot — o import de sprites.js é PURO (sem I/O). Fase 2.24
// O MIXER E DA ENGINE: `createGame` chama `initAudioMixer` e devolve o audio em `engine.audio`.
// Versão vem do CARIMBO DE BUILD (git describe → tag de marketing na produção; SHA nos demais). Injetado pelo
// Vite (__BUILD__, ver vite.config.ts). Tira o 'v' inicial da tag (o display já prefixa 'v'). Fallback defensivo.
const INCL_VERSION = String((typeof __BUILD__ !== 'undefined' && __BUILD__.version) || '6.36.1').replace(/^v/, '');
// Mundo autêntico (CLARITY_MAP+buildWorld portados do v3.1.100), spawn real de moedas,
// física com escada/água/trampolim, animações (idle/walk/climb). Texto/UI no DOM (a11y).

'use strict';

/* ===================== constantes ===================== */

/*
 * A CORRENTE DESTE CARTUCHO (ADR-0141), e a razão de ela ser criada em vez de importada.
 *
 * `core/rng` exporta DUAS coisas que se parecem no sítio do import: `createRng(semente)`, que devolve uma
 * corrente independente, e `rnd`/`randInt`/`shuffle`/`reseed`, que são atalhos ligados a uma corrente de
 * ESCOPO DE MÓDULO partilhada por quem quer que a importe. Este ficheiro importava a segunda.
 *
 * Sozinho na página isso é inofensivo: um jogo, uma corrente. Dentro da plataforma são dois cartuchos a
 * puxar da MESMA corrente, e um `reseed` num reposiciona o sorteio do outro — que é exatamente a história
 * do motor: «quero que a engine não carregue estado de jogo, para que dois jogos numa página não colidam».
 *
 * ⚠️ E A REGRA É NEGATIVA, não apenas positiva: usar `ctx.rng` em quase tudo e ir buscar o `shuffle`
 * importado uma vez só tem o defeito inteiro. Não há versão parcial disto — a lista proibida é a regra, e
 * o defeito é invisível onde os testes correm, porque um build solto tem uma corrente e passa de qualquer
 * maneira. Por isso o ADR pede um lint, e não só um cuidado.
 *
 * Sem semente explícita: `createRng()` nasce com a `SEMENTE_PADRAO` — a MESMA da corrente partilhada —,
 * então o comportamento sorteado deste jogo fica idêntico ao de antes desta mudança. Quem escolhe a semente
 * é o shell, e essa decisão ainda não foi tomada.
 */
// ⚠️ A CORRENTE VEM DO `ctx` E JA NAO E' CRIADA AQUI (ADR-0141 §1): quem a constroi e' o shell, um
// `createRng(semente)` por cartucho. Era `createRng()` nesta linha — correto enquanto este ficheiro era o
// unico dono da pagina, e errado no instante em que ele passou a ser um de varios.
const rng: Rng = ctx.rng;
const { rnd, randInt, shuffle } = rng;
// Empatia MOTORA (global, muda a jogabilidade): `oneButton`/`wheelchair` migraram para core/state.js (#50) —
// bindings vivos, escrita pelos setEfeito abaixo. isSolidType os usa, e continua vendo sempre o valor atual.
// Modo cego (A12e auditiva) migrou para core/state.js (#50): `modoCego` é binding vivo, escrita por setModoCego() abaixo.
// `caneBlockDiv` migrou para core/state.js (#50): 1 = 1 batida/bloco; 2 = 1 batida/meio bloco (por DISTÂNCIA pisada)
// caneBlockPx/isSolidType/tileAt/solidTile/solidAt/surfTop/isWcRampRiser/rampSurfaceY extraídos p/ core/collision.js
// (Estágio 4). Estado que a colisão lê (caneBlockDiv/wheelchair/modoCego/wcSolid/gateTiles/gateOpen) SEGUE aqui —
// a colisão o acessa por closures via initCollision(ctx), logo abaixo (após o WORLD ficar pronto).
// TILE_COLOR agora vem de core/constants.js (importado acima).

/* ===================== mundo ===================== */
// top-level await: main.js é módulo → o corpo abaixo só roda após o mapa carregar (pré-cacheado no SW).
/* ===================== O IDIOMA VEM ANTES DE QUALQUER COISA SER MONTADA =====================
   `initI18n()` era a ULTIMA linha do boot, e para pt isso nao custava nada. Para en/es custava metade da
   interface: o `applyDom` conserta o markup estatico (`data-i18n`), mas o que o JavaScript monta — os botoes
   de cenario, os de atividade — ja tinha capturado o texto de pt, e nada reconstruia. O sintoma era
   `t('cen.cidade')` devolver "City" com o botao na tela dizendo "Cidade".
   O `await` custa UM chunk, e so' para quem nao joga em portugues; em pt ele resolve na hora. */
// ⚠️ `import.meta.env.BASE_URL` e nao caminho relativo: a raiz vive em `/game-platformer/` em producao e
// o `<base href="/">` do `index.html` (pensado para a engine resolver `/heavy/*` na raiz) faria um
// `fetch('assets/...')` cair em `/assets/...`, fora do subpath. O Vite preenche `BASE_URL` no build com o
// `base` da config — em dev e' `/`, em producao e' `/game-platformer/` — e isto resolve sozinho.
const WORLD = buildWorldFromText(await (await fetch(`${import.meta.env.BASE_URL}assets/levels/clarity.map.txt`)).text());
const WORLD_W = WORLD[0].length, WORLD_H = WORLD.length;
const WORLD_PX_W = WORLD_W*TILE, WORLD_PX_H = WORLD_H*TILE;
initWorldTex({ world: WORLD, W: WORLD_W, H: WORLD_H }); // Estágio 4: liga o builder da textura do mundo ao mapa carregado
// E12: o portão dinâmico (gateTiles/gateOpen/gate) migrou para core/state.js (#50) — seus tiles são
// sólidos enquanto fechado.
// Cadeirante: sólidos SÓ-CADEIRANTE (pontes/plataformas que não existem no modo normal) — não altera CLARITY_MAP.
// `wcSolid` migrou para core/state.js (#50).
// Mundo + estado prontos → liga a colisão (core/collision.js). As closures leem o estado VIVO daqui:
// wheelchair/modoCego/caneBlockDiv/wcSolid/gateTiles/gateOpen mudam neste módulo e a colisão sempre vê o atual.
initCollision({ world: WORLD, W: WORLD_W, H: WORLD_H,
  isWheelchair: ()=>settingsStore.wheelchair, isModoCego: ()=>settingsStore.blindMode, caneDiv: ()=>settingsStore.caneBlockDiv,
  wcSolid: ()=>rodada.wcSolid, gateTiles: ()=>rodada.gateTiles, gateOpen: ()=>rodada.gateOpen });
initCoins({ rng, numJogadores: () => rodada.numPlayers, world: WORLD, W: WORLD_W, H: WORLD_H, anyEasy: ()=>anyEasy(), isWheelchair: ()=>settingsStore.wheelchair }); // Estágio 4: posicionamento de coletáveis (usa solidAt já ligado acima)
// Itens do mapa Clarity → viram ITENS/barreira (não tiles): 7=pulo-turbo, 8=voo, 11=chave; 10=portão.
// Removemos o tile do grid (vira ar) e o item/barreira é desenhado/colidido à parte; some ao pegar/abrir.
const MAP_ITEMS: { tx: number; ty: number; kind: string }[] = [], MAP_GATE: { tx: number; ty: number }[] = [];
for(let y=0;y<WORLD_H;y++)for(let x=0;x<WORLD_W;x++){ const tile=WORLD[y][x]; // `tile` e não `t`: o `t` local esconde o tradutor (ver tests/translator-shadow)
  if(tile===7){ MAP_ITEMS.push({tx:x,ty:y,kind:'superjump'}); WORLD[y][x]=1; }  // super-pulo (máximo)
  else if(tile===8){ MAP_ITEMS.push({tx:x,ty:y,kind:'fly'}); WORLD[y][x]=1; }    // voo
  else if(tile===11){ MAP_ITEMS.push({tx:x,ty:y,kind:'key'}); WORLD[y][x]=1; }   // chave
  else if(tile===12){ MAP_ITEMS.push({tx:x,ty:y,kind:'turbo'}); WORLD[y][x]=1; } // super-corrida
  else if(tile===13){ MAP_ITEMS.push({tx:x,ty:y,kind:'ultrajump'}); WORLD[y][x]=1; } // ultra-pulo
  else if(tile===14){ MAP_ITEMS.push({tx:x,ty:y,kind:'wallcling'}); WORLD[y][x]=1; } // ventosa
  else if(tile===10){ MAP_GATE.push({tx:x,ty:y}); WORLD[y][x]=1; } // portão
}
// regiões secretas = componentes conexos de tiles 0 (escuridão). Acendem ao entrar.
// buildDarkRegions migrou para game/level-geometry.ts (Onda A) — agora e puro e recebe as dimensoes.

/* ===================== sprite do personagem ===================== */
// PLAYER_IDLE/WALK/CLIMB/HURT (mapa de caracteres do sprite anterior ao PixelLab) migraram para
// render/textures.ts junto do TEX que os consumia — os dois ja nao tinham chamador. Ficavam aqui so
// como copia.
// (paleta APP movida p/ render/sprite-fx.js na Fase 2.21)

/* ===================== canvas → textura ===================== */
// makeCanvas/tex/pixDisc migrados p/ render/canvas.js (Fase 2.18).

// outlineCanvas/spriteToCanvas (+ _silhouette/OUTLINE_DARK/APP) migrados p/ render/sprite-fx.js (Fase 2.21)

// isGroundType/worldCanvas/worldToTexture extraídos p/ render/world-tex.js (Estágio 4). WORLD injetado por
// initWorldTex (logo após o mapa carregar). worldToTextureDirect/worldTexFor (alto contraste) + stepTileFx
// (água/lava animadas) ficam aqui.
// Renderizacao Direta (alto contraste de acessibilidade) migrou para render/high-contrast.ts (Onda A):
// _dimDesat, DIRECT_CFG, os 3 niveis de contraste e o repinte por papel vivem la. Aqui ficam so os dois
// contornos configuraveis, que os paineis mutam e o modulo le por getter.
// Dois contornos configuráveis (0=nenhum · 1=fino/1px · 2=grosso/2px):
//  fg = 1º plano (personagem/itens) — WCAG 2.4.7 foco visível; bg = 2º plano (perímetro externo de
//  plataforma/água/lava — delimita navegável × não-navegável) — WCAG 1.4.11 contraste ≥3:1.
// hcOutlineFg/hcOutlineBg migraram para core/state.js (#50), com a saturação 0..2 e a leitura do
// armazenamento numa passada só — aqui eram um `let` provisório seguido de duas reatribuições.
// HC_ROLE_DEF/HC_ROLE/saveHcRole (color-blocking por papel, customizavel e persistido) migraram para
// render/high-contrast.ts (Onda A). rgbHex foi junto e nao voltou: tinha ZERO chamadores aqui. O `hexRgb`
// também saiu: lia as cores por papel do painel de alto contraste desta raiz, que é o da engine agora.
// _roleOf/worldToTextureDirect/directBgTexture/directSpriteCanvas/directSpriteTexture migraram para
// render/high-contrast.ts (Onda A).
// Alto contraste (re-adicionado): recolore cada tile pela PALETA do grupo (gradient-map por matiz, mantém claro-escuro).
// coinCanvas/coinTexture/treeCanvas/treeTexture migrados p/ render/props.js (Fase 2.19), e de la para game/props.js (item 19)

/* ===================== moedas (spawn real) ===================== */
// findCoinCandidates/pickCoins/takeCoin extraídos p/ game/coins.js (Estágio 4, posicionamento).
// RNG semeado (rnd/randInt/shuffle/_seed) migrado p/ core/rng.js (Fase 2.26 / Tier 1)
// O MODO DE JOGO, DERIVADO — não armazenado (ADR-0040). Era um `let` com dois caminhos de escrita, e eles
// divergiam: ciclar o `#opt-mode` deixava o MODE em 'silabas' com `activity` ainda em 'ludico', as moedas
// nasciam como letras e o despacho do quiz continuava lendo a categoria da atividade antiga (issue #54,
// reproduzido no jogo publicado). `MODE === modeForCategory(activityCategory(activity))` valia para TODA
// atividade do catálogo, ou seja, o `let` não carregava informação nenhuma que o `activity` já não tivesse.
// Agora é uma função: um caminho de leitura, nenhum de escrita, e a divergência é impossível por construção.
const MODE = (): GameMode => modeForActivity(ACTIVITY);
// SOMASUB_SHAPES/somaSubName/SILABAS_WORDS/SILABA_POOL/WORD_INITIALS extraídos p/ game/activity-content.js (Estágio 4).
/* L3: quiz de alfabetização em 5 NÍVEIS (psicogênese da língua escrita — Ferreiro & Teberosky):
   1 pré-silábico — escolher a palavra BEM escrita entre 3 (2 malformadas); o jogo SOLETRA a opção sob o cursor.
   2 silábico c/ valor — montar por SÍLABAS; o jogo LÊ a sílaba sob o cursor.
   3 silábico-alfabético — montar por SÍLABAS; o jogo SOLETRA as letras da sílaba.
   4 escritor (alfabético) — montar por LETRAS numa grade; o jogo fala o NOME da letra.
   5 escritor cego — montar por LETRAS; o jogo dita a CELA BRAILLE de cada letra. */
// 'quizLevel' agora vem de core/state.js (Fase 2, mega-variável 2). Leitura = binding vivo; escrita via setQuizLevel().
// LETTER_NAME/soletra/ferreiroDistractors extraídos p/ game/literacy-distractors.js (Estágio 4).
// malform() REMOVIDO: era código morto (0 chamadas) — distrator de sílaba nunca ligado.
// `letterCase` migrou para core/state.js (#50) — 'mixed' | 'upper', escolha pedagógica, hoje feita no menu de
// CAA (ADR-0028). 'mixed' NÃO força minúscula: devolve o texto como ele é, que é o que "maiúsculas e
// minúsculas" quer dizer. Forçar minúscula num nome próprio ensinaria a criança a escrevê-lo errado.
const disp=(s: unknown)=> settingsStore.letterCase==='upper'?String(s).toUpperCase():String(s);
// E8: Braille (modo pessoa cega). Padrão de pontos da cela por letra (Grau 1, PT).
// BRAILLE/NUMW/brailleText extraídos p/ game/braille.js (Estágio 4).
// `blindMode` REMOVIDO: era escrito só por applyLetra a partir de `LETRA[i].blind`, e as duas entradas da
// tabela têm `blind:false` desde que o Braille saiu do ciclo do botão ABC (ver o comentário da LETRA). Nascia
// falso e nunca mudava. Quem decide o ditado passivo hoje é o Modo cego (a11y) e o nível 5.
// Lote C: cada jogador tem SEU conjunto de n itens em posições ALEATÓRIAS próprias e com a COR do dono
// (owner). Todos os itens de todos os jogadores existem no mundo; cada um coleta só os `owner===seu i`.
// pickCoins extraído p/ game/coins.js; aqui só o cálculo dos POOLS a partir do MODE (coins não conhece MODE/quiz).
const coinPools=()=>({ shapes: MODE()==='somasub'?SOMASUB_SHAPES.map(s=>s.id):[], letters: MODE()==='silabas'?WORD_INITIALS:[] });

/* ===================== estado ===================== */
// $ (querySelector) migrado p/ ui/dom.js (Fase 2.27 / Tier 1)
// BOX/SPAWN_X/SPAWN_Y/makePlayer + geometria de colisão do jogador (isBouncyGroundBelow/touchingWall/clingSides/
// firstClingSide/spiderReattach/wrapConvex) extraídos p/ game/player.js (Estágio 4). P1 = players[0] (compat solo).
/* ===================== o vocabulario dos PODERES (item 14: i18n) =====================
   ERAM DUAS TABELAS DE `const` COM TEXTO EM PORTUGUES, e por isso estavam CONGELADAS no idioma do boot: um
   `const` de modulo resolve UMA vez e nunca mais. Trocar de idioma no menu deixaria o poder falando portugues
   no meio do ingles — e `POWER_MSG` e' FALADO pelo leitor de tela quando o poder muda, ou seja, o defeito
   caia justamente em quem nao tem a tela para desempatar.
   Sao FUNCOES, e nao tabelas de chaves, de proposito: uma tabela de chaves obriga cada consumidor a lembrar
   de chamar `t()`, e esquecer e' silencioso (o HUD mostraria `hud.power.fly`). Uma funcao resolve no momento
   do uso e nao tem como ficar velha. Os quatro consumidores (ui/hud, game/coin-spawning, game/physics,
   game/session) recebem a funcao por injecao, como ja recebiam a tabela. */
const POWER_KINDS = ['superjump', 'ultrajump', 'turbo', 'fly', 'wallcling'];
const POWER_SHORT_KINDS = [...POWER_KINDS, 'runcane'];
/** Frase falada do poder. `off` tem frase propria; o que nao for poder conhecido cai no generico. */
// `botao` e' a CHAVE do nome do botao que a frase do poder deve citar. So a escalada cita botao, e ela cita
// um DIFERENTE conforme a alternancia do correr (ver game/run-toggle): a instrucao falada e' o unico canal de
// quem nao enxerga, e mandar apertar o botao errado e' a armadilha que o ADR-0044 desfaz.
const POWER_MSG = (k: string, botao?: string) => t(k === 'off' ? 'sr.power.none' : POWER_KINDS.includes(k) ? 'sr.power.' + k : 'sr.power.generic', botao ? { botao: t(botao) } : undefined);
// Ícones canônicos dos power-ups (decisão do José 2026-07-02): 👟 corrida/bengala · 🕷️ escalada · 🎈 voo (jetpack) · 🐇 super pulo · 🦘 ultra pulo
/** Rótulo curto do HUD. Desconhecido cai em `off` ('—'), que era o `|| '—'` de cada consumidor. */
const POWER_SHORT = (k: string) => t('hud.power.' + (POWER_SHORT_KINDS.includes(k) ? k : 'off'));
// showPower migrou para game/coin-spawning.ts (Onda A) — o HUD do poder ativo nasce do mesmo modulo que
// materializa os itens.
// jumpVel + isBouncyGroundBelow/touchingWall/clingSides/firstClingSide/spiderReattach/wrapConvex → game/player.js (Estágio 4)
// ↓ ESTES DOIS AUXILIARES SUBIRAM PARA CÁ, e a posição é o contrato: o `let player` logo abaixo é o
// primeiro consumidor deles. Enquanto ficavam mais embaixo, usá-los ali era TDZ — o `tsc` o disse com
// todas as letras (TS2448), e a versão minificada não diria: `const` de topo vira `var`, e o erro que
// seria um throw vira um `undefined` silencioso. Já aconteceu neste arquivo, com o `setPlayerViz`.
/**
 * OS JOGADORES DESTE JOGO, e o único lugar onde a vista se estreita.
 *
 * `core/state.players` é `Player[]` porque a engine não conhece `quiz` — foi exatamente isso que o ADR-0033
 * decidiu ao tirar o campo de `core/entity`. Quem PÕE `GamePlayer` naquele array é este arquivo, que é a raiz
 * de composição do jogo, então é aqui que ele volta a ser lido como tal. O `as` não afirma nada que este
 * arquivo já não garanta.
 *
 * É função e não constante DE PROPÓSITO: `players` é `export let`, e uma constante congelaria a referência no
 * instante do import. Hoje ninguém reatribui (conferido em toda a árvore) — mas "hoje ninguém" é a premissa
 * que envelhece pior, e a função custa uma chamada.
 */
const jogadores = (): GamePlayer[] => players as GamePlayer[];

/**
 * OS JOGADORES DEPOIS DE `assignControls`, que é a mesma vista com uma invariante a mais.
 *
 * `Player.ctrl` é `KeyScheme | null` porque ANTES do boot ele é mesmo nulo. `input/keyboard-runtime` e
 * `game/physics` declaram `ctrl` não-nulo porque só rodam depois — e o `core/entity` já dá nome a isso em
 * `ControlledPlayer`, dizendo que usá-lo é afirmar "eu só rodo depois do boot".
 *
 * Quem pode afirmar isso é a raiz de composição, porque é ela que chama `assignControls`. Então a afirmação
 * mora aqui, uma vez, em vez de cada módulo redeclarar `ctrl` como não-nulo e ninguém ler aquilo como
 * afirmação — que é exatamente o que o comentário do `core/entity` diz ter acontecido antes.
 */
const controlados = (): ControlledGamePlayer[] => players as ControlledGamePlayer[];

players.push(makePlayer(0));
// 'numPlayers' (Fase 2, mega-variável 3). Escrita via setNumPlayers()/joinPlayer.
setCoins(pickCoins(COIN_TARGET, coinPools())); // coins: mega-var 7 em core/state.js (reatribuição via setCoins)
// Itens INDIVIDUAIS por jogador (multiplayer em telas separadas): cada moeda/letra/forma é coletada
// independentemente por cada jogador. Só a CHAVE é compartilhada (ver powerups). taken = espelho do P1 (solo).
// takeCoin extraído p/ game/coins.js (Estágio 4)
// puTaken/takePu extraídos p/ game/powerups.js (Estágio 4). Estado/spawn/render (powerups/setupExtras/
// rebuildExtras/pupTexFor) + o portão seguem aqui por ora (acoplados a PIXI + textura + gate).
// 'phase' agora vem de core/state.js (Fase 2, mega-variável 1). Leitura = binding vivo; escrita só via setPhase().

/* ===================== input ===================== */
// O REGISTRO DE OVERLAYS É O DA ENGINE (`engine.overlays`): os painéis são dela, e o `initSettingsPanel` desta raiz
// — uma segunda pilha de z e uma segunda cadeia de Escape sobre o mesmo documento — saiu com a pausa por tela.
// O AVISO DE ALCANCE (issue #112) É DA ENGINE: o `createGame` mostra-o sozinho a partir do `preset` deste
// cartucho e do `holdsAtOnce()` da declaração (`create-game.js:2007-2020`), e apaga o anterior antes. Esta raiz
// chamava o seu, de quando NÃO passava pelo `createGame` — e o `showReachNotice` cria um `div` de id fixo, então
// eram dois avisos iguais na página. A conta dos TRÊS (direção + correr + pular, medida na física) mora agora
// onde a engine a lê: `declaration/platformer-declaration.holdsAtOnce`. A resposta ao aviso continua deste
// jogo: a trava do botão de correr, que `travaDeCorrerNoToque` liga sozinha no toque.
// A ARMADILHA DE FOCO E DA ENGINE (ADR-0253): o `createGame` chama `initFocusTrap` sozinho. Esta raiz
// montava a sua porque NAO passava por ele — a razao acabou, e com ela a chamada.

function ehToque(){ try{ return matchMedia('(pointer:coarse)').matches && matchMedia('(hover:none)').matches; }catch(e){ return 'ontouchstart' in window; } }
// As seis flags `*Open` que moravam aqui morreram: quem sabe se um painel esta aberto e o proprio DOM, e o
// registro de ui/settings-panel le de la (D1). `jumpEdge` estava nesta mesma linha e tambem morreu: era
// global sem leitor nenhum — a borda de pulo que o jogo usa e `p.jumpEdge`, campo do jogador, outra coisa.
// Gamepad (B3/L1): estado por controle. padCur[gi]=ações seguradas neste frame; associação pad↔jogador vive em p.pad.
// padCur/padPrevAct/padPrevStart + PAD_DEAD movidos p/ input/state.js (Fase 2.22)  // // zona morta = primeira METADE do curso (ergonomia — José 2026-07-02)
// Config de teclado extraída p/ input/keyboard.js (Fase 2): esquemas, defaults, loadKB/saveKB/resetKB.
// A CONFIG DE TECLADO E DA ENGINE: `createGame` chama `initKB` e devolve `engine.keyboardConfig`.
// saveKB agora vem de input/keyboard.js (recebe o KB como argumento)
// kbFor/actionOf/whichPlayer/assignControls/applyControls migraram para input/keyboard-runtime.ts (Onda A).
// KB fica aqui (o painel de controles o edita e persiste); o modulo o le fresco a cada chamada.

// O RUNTIME DE TECLADO É O DA ENGINE (`engine.keyboard`). Esta raiz montava o seu — e uma SEGUNDA cópia,
// sobre o esquema de fábrica, só para o painel de controles comparar «o teu mapa» com «o de origem». O
// painel é da engine agora, e com ele a comparação; dois runtimes sobre o mesmo teclado seriam duas
// respostas para «de quem é esta tecla».
const kbRuntime = engine.keyboard;
const kbFor = (i: number) => kbRuntime.kbFor(i);
// controls/KJUMP..KRUN/GAME_KEYS nao moram mais aqui (D1): eram oito copias de kbRuntime.computeControlsState().
// O gatilho de invalidacao que sobrava (`applyControls`) era do painel de controles desta raiz, que e o da engine.
// Tint distintivo por jogador (P1 = normal). L2: paleta CB-SAFE opcional (Okabe & Ito 2008 — laranja/azul-céu/
// amarelo distinguíveis em protan/deutan/tritan) SÓ para jogadores/itens/efeitos — o CENÁRIO fica com cores naturais.
const PCOLOR_DEF=[0xffffff,0xff9a9a,0x8affc0,0xffe08a], PCOLOR_CB=[0xffffff,0xe69f00,0x56b4e9,0xf0e442];
// `cbSafe` migrou para core/state.js (#50).
const PCOLOR=(settingsStore.cbSafe?PCOLOR_CB:PCOLOR_DEF).slice(); // mutável in-place (todos referenciam PCOLOR)
// `ownerColors` migrou para core/state.js (#50) — itens na cor do dono (padrão ligado).
const assignControls = () => kbRuntime.assignControls();
assignControls();
/* ===================== TECLADO -> input/keydown.ts (D2-a) =====================
   O roteador inteiro (a cadeia de nove guardas) migrou. O modulo separa DECIDIR de EXECUTAR:
   `decideKeydown(evento, estado)` e pura e roda no project `node`; so o envelope toca o mundo.
   `keyup` foi junto (e a outra metade do `keys.add`); `blur` NAO — ele limpa codigos que o toque e a webcam
   tambem injetam, e e rede de ciclo de vida da JANELA, nao do teclado.
   TODO o ctx e LAZY de proposito: attractCtl/seatHud/navTitle/activateScreens/
   hideTouchControls/quiz* sao `const`/`function` declarados centenas de linhas ABAIXO daqui. O ouvinte
   original so funcionava porque o corpo dele nunca era lido antes da primeira tecla, e e essa preguica que as
   setas preservam — passar qualquer um deles por VALOR derruba o boot em TDZ.
   Fica no lugar exato do ouvinte antigo, e nao mais abaixo: descer mudaria a ORDEM DE REGISTRO dos ouvintes
   de bolha da janela, e hoje este e o primeiro. */
// ⚠️ A ARESTA É A CRUA DA ENGINE (`input.playerEdge`), e a trava saiu daqui (engine 11). O `createLatchedEdge`
// pede agora loja e `holdsKeys`, e a engine já monta o SEU, único, na porta do controle virtual
// (`create-game.js:3790`, `pressedBy`): é lá que a trava de cada transporte se resolve. Uma segunda cópia
// aqui resolveria a mesma trava duas vezes por tecla. É também o que a engine entrega ao toque e ao pad dela.
// (`arestaDoJogador` saiu com os ctx do pad e do toque desta raiz: os dois transportes são da engine agora.)

/*
 * ⚠️ UMA ADAPTAÇÃO QUE EXISTE POR UMA COSTURA DA ENGINE, e não por desleixo daqui — medido na 9.0.0:
 * `input/keydown.ControlsSnapshot` CONSOME `string[]` mutável, enquanto `ControlsState` produz `readonly`.
 * Enquanto a engine não unifica, a conversão mora AQUI, num lugar só e com nome, em vez de um `as` espalhado.
 * (A segunda, `esquemaLargo`, saiu com o `initShell` desta raiz, o consumidor dela: a legenda do título lê o
 * `KeyScheme` como ele é.)
 */
function instantaneoDosControles(): ControlsSnapshot {
  const c = kbRuntime.controlsState();
  // `controls` NÃO entra: o `ControlsSnapshot` são as sete listas e mais nada — o `KeyScheme` inteiro é do
  // `ControlsState`, que é outro tipo. Passá-lo era excesso tolerado por vir de função, não campo pedido.
  return { gameKeys: c.gameKeys,
    action1: [...c.action1], action2: [...c.action2],
    left: [...c.left], right: [...c.right], up: [...c.up], down: [...c.down] };
}
const keydownApi = initKeydown({
  t,
  isTitleScreen: () => fatosDaCena().titleScreen,
  // VERBATIM do `phase === 'playing' || phase === 'paused'`: `!telaDeTitulo` NÃO seria a mesma coisa — numa
  // cena que ninguém previu (um mapa), Alt+N e a tecla de pausa devem ficar quietos, não agir.
  isInGame: () => { const f = fatosDaCena(); return f.worldRunning || f.pauseMenu; },
  attractOnInput: () => attractCtl.onInput(),
  // A CAPTURA DE TECLA é da engine: o painel de controles é dela, e o ouvinte de captura dela corre em fase de
  // captura antes deste (`create-game.js:3007`). Aqui nunca há o que capturar.
  handleCaptureKeydown: () => false,
  getNumPlayers: () => rodada.numPlayers, getPlayers: () => players,
  getControls: instantaneoDosControles,
  heldKeys: input.keys, isOneButton: () => settingsStore.oneButton,
  // As quatro portas que a engine 8.0.0 passou a exigir: quem marca, quem solta, e de QUE transporte veio
  // a tecla. Sem elas o teclado deixa de contar como aresta do jogador.
  markKey: (c, o) => input.markKey(c, o), markKeyWithoutSource: (c) => input.markKeyWithoutSource(c),
  releaseKey: (c) => input.releaseKey(c), playerEdge: (p, o) => input.playerEdge(p, o),
  actionOf: (code, i) => kbRuntime.actionOf(code, i),
  whichPlayer: (code) => kbRuntime.whichPlayer(code),
  // O Escape e o fecho por id perguntam ao registro de overlays da ENGINE, que é onde os painéis vivem agora.
  $, escapeTarget: () => engine.overlays.escapeTarget(), closeOverlayById: (id) => { engine.overlays.closeById(id); },
  // O assistente de mapeamento do pad é um overlay da engine (`padwiz`): fechar é pedir-lhe pelo id.
  closePadWiz: () => { engine.overlays.closeById('padwiz'); },
  hideTouchControls: (r) => hideTouchControls(r), srSay: (m) => srSay(m),
  navTitle: (k) => navTitle(k), activateScreens: (n) => activateScreens(n),
  // ⚠️ NADA, e de propósito (decisão A do Dev, 02/10): START (Enter), SELECT (F) e o Escape no cartão são da
  // ENGINE (`create-game.js:2545-2598`), que abre a pausa e pede `setPhase('paused')` ao jogo. Pausar daqui também
  // seria a mesma tecla a pausar duas vezes — e um Escape em jogo a abrir uma pausa que já não é deste jogo.
  togglePause: () => {},
  modalInput: (i, intent) => modalInput(i, intent), hasModal: (i) => temModal(i),
  clearWaitingBadge: (i) => seatHud.clearWaitingBadge(i),
  win: window,
});
keydownApi.attach();
addEventListener('blur',()=>input.keys.clear(), SOLTAR);
// held(pl,act) movido p/ input/state.js (Fase 2.22) // teclado OU gamepad do jogador

/* ===================== a11y ===================== */
// O MODO PESSOA SURDA é da engine (`engine.deafMode`): ela liga o intérprete à fala sozinha, então o
// `setVlibrasSay` que estava aqui não tem substituto — e não precisa de ter. (`vlibrasOpen`/`toggleLibras`
// saíram com o ctx da pausa por tela, o seu único leitor: o 🦻 da barra é da engine.)

/* ===== E9: áudio (WebAudio) + legendas (C1) + assistência (C2) ===== */
let capTimer: ReturnType<typeof setTimeout> | null = null; // `settingsStore.captionsOn` migrou para core/state.js (#50); soundOn/volume/audioCtx vêm de platform/audio.js
const anyEasy=()=>players.some(p=>p.easy); // efeitos de MUNDO do Fácil (moedas no chão) ligam se QUALQUER jogador usa Fácil
// Modo Fácil (deficiência motora): gravidade ×2/3, pulo ×8/7, andar ×0.7, sem perigos, sem correr,
// hitbox de coleta +4px, moedas no chão, proteção de borda, pula-pula suave (segurar = flutuar descendo).
// EASY (modo fácil) migrado p/ core/constants.js (Estágio 4, dado de dificuldade — junto de TUNE/ANIM).
// Movimento reduzido (WCAG 2.3.3 AA). 5 alvos; padrão herda prefers-reduced-motion; persistido.
// Hoje agem 'parallax' e 'walk'; 'decor/items/particles' ficam prontos e ligam quando a Cidade animar.
// `MotionSceneKey`, e não `string[]`: quem declara as quatro chaves é `ui/settings-motion`, que também as
// desenha. Como texto solto, um erro de digitação aqui só apareceria em execução — como uma linha de menu
// que simplesmente não aparece.
const RM_KEYS: readonly MotionSceneKey[] = ['parallax', 'decor', 'items', 'particles']; // animações de CENA (globais)
// (`RM_CHAR` e `saveRM` saíram com o ctx da pausa por tela, os seus leitores: os três alvos do PERSONAGEM e a
// gravação dos de cena são do painel de animação da engine.)
// O padrão ganhou nome em core/state (defaultReducedMotion) porque o reset do painel precisa do MESMO valor.
// O `as MotionSceneFlags` nos dois acumuladores abaixo: o laço preenche EXATAMENTE as quatro chaves de
// `RM_KEYS`, que é o que o tipo exige — mas o objeto nasce vazio, e o compilador não acompanha um
// preenchimento por laço. É afirmação sobre o laço logo ao lado, não sobre dado de fora.
const rm=(()=>{ const s=store.getJSON(KEYS.reducedMotion,null); if(s&&typeof s==='object'){ const o = {} as MotionSceneFlags; RM_KEYS.forEach(k=>o[k]=!!s[k]); return o; }
  const o = {} as MotionSceneFlags; RM_KEYS.forEach(k=>o[k]=defaultReducedMotion(matchMedia)); return o; })();
// Movimento por alternância (1 dedo): tocar a direção trava a marcha; segurar acelera; pulo não interrompe. Persistido.
function loadPlayerA11y(p: Player,i: number){ const v=store.get(KEYS.vizP(i)); if(v&&VIZ_BY_KEY[v])p.viz=v;
  p.audioSink=store.get(KEYS.sinkP(i))||null; // saída de áudio própria do jogador (setSinkId)
  p.easy=store.getBool(KEYS.easyP(i)); p.toggleMove=store.getBool(KEYS.toggleMoveP(i));
  p.toggleRun=store.getBool(KEYS.toggleRunP(i));
  // CONSERTO: os três alvos de PERSONAGEM nasciam SEMPRE `false`, embora o comentário do bloco acima diga
  // "5 alvos; padrão herda prefers-reduced-motion". Só os 4 de CENA herdavam. Quem pediu menos movimento no
  // sistema ganhava o parallax congelado e o personagem andando — metade do pedido, e a metade que se move
  // mais. Agora os cinco herdam, que é o que o código já dizia fazer.
  const rmDef=defaultReducedMotion(matchMedia);
  p.rmWalk=store.getBool(KEYS.rmWalkP(i),rmDef); p.rmBreath=store.getBool(KEYS.rmBreathP(i),rmDef); p.rmFlavor=store.getBool(KEYS.rmFlavorP(i),rmDef);
  if(i===0){ const ov=store.get(KEYS.viz); if(ov&&VIZ_BY_KEY[ov]&&store.get(KEYS.vizP(0))==null)p.viz=ov; // migra chaves antigas
    if(store.getBool(KEYS.toggleMoveLegacy)&&store.get(KEYS.toggleMoveP(0))==null)p.toggleMove=true; } }
// (`setToggleRun`/`setToggleMove` saíram: os escritores das duas travas eram dos painéis e da pausa desta raiz, e
// as travas moram no ☝️ e no painel motor da engine. A trava de correr AUTOMÁTICA no toque continua deste jogo —
// ver `travaDeCorrerNoToque`.)
function showCaption(txt: string){ const el=$('#caption'); if(!el||!txt)return; el.textContent=txt; el.classList.add('show'); if(capTimer!==null)clearTimeout(capTimer); capTimer=setTimeout(()=>{el.classList.remove('show'); el.textContent='';},1300); }
// Earcons + ponte com legendas extraídos p/ platform/audio-earcons.ts (Tier 2, áudio rodada 2). captionsOn/showCaption
// VIVEM aqui (UI alterna captionsOn; win() reusa showCaption) → entram por injeção. Chamado como earcons.sfx(...).
const earcons = createAudioEarcons({ t, SFX, ensureAC, catNode, audioOut, noiseHit,
  getSoundOn: () => audio.soundOn, getVolume: () => audio.volume, getCaptionsOn: () => settingsStore.captionsOn, showCaption });
// ===== Vitória: jingle 8-bit ascendente + fogos de artifício (assobio subindo → estouro/crepitar) =====
// ensureAC() (ciclo do AudioContext) extraído p/ platform/audio.js (Fase 2).
// Modo empatia — perda auditiva: passa-baixas (perda de agudos) + EXPANSÃO DESCENDENTE (frames fracos abafados → dificulta a fala).
// Todos os sons passam por um nó mestre; a cadeia é religada quando o modo liga/desliga.
// Nó mestre (hearingLoss/audioOut/buildHearingChain/wireMaster) extraído p/ platform/audio.js (Fase 2).
function setHearingLoss(on: boolean){ setHearingLossGraph(on); store.setBool('incl_hearingloss',on); // grafo em platform/audio.js; persistência via store
  srSay(t(on?'sr.empathy.hearingOn':'sr.empathy.hearingOff')); }
// ===== F1: barramento de áudio por CATEGORIA (cada uma: liga/desliga + volume). Pendura no nó mestre. =====
// AUDIO_CATS (categorias) + carga/persistência + default TTS-off extraídos p/ platform/audio-mixer.js (Fase 2).
// audioCat + catNode + setCatGain (mixer por categoria) extraídos p/ platform/audio.js (Fase 2).
// ===== F2: efeitos de interação com o ambiente (passos por superfície, portas, escada) — ruído filtrado sintetizado =====
// noiseBuffer + FOOT + noiseHit + _footCount (synth de ruído) extraídos p/ platform/audio.js (Fase 2). _noiseBuf era var morta.
// material sob os pés (Cidade = concreto → 'piso') — usado pelo som do PASSO (main.js); não é pista espacial, fica aqui.
function surfaceUnder(pl: PlayerView<'x' | 'y'>){ const tile=tileAt(Math.floor(pl.x/TILE),Math.floor((pl.y+1)/TILE)); if(tile!==2&&tile!==6&&tile!==5)return null; return CENARIO==='cidade'?'piso':'pedra'; }
// Tipado pelo que LÊ, não pelo que recebe: assim serve ao `Player` inteiro e às vistas estreitas que os
// módulos declaram (`PhysicsPlayer` é um `Pick`, e um `Player` inteiro não é atribuível a ele).
// A MESMA PERGUNTA QUE O SONAR FAZ, escrita uma vez. Era `VIZ_BY_KEY[pl.viz]` com os `kind` 'blind' e
// 'lowvision' atravessados à mão; a engine 8.0.0 publica os dois predicados e apagou a tabela do ctx do
// sonar (#104). A conta é idêntica — o que muda é que agora há UM sítio a errá-la, e não dois.
const visaoComprometidaDe=(v: VisualState)=> isBlind(v) || isLowVision(v);
// `caneOn` é a pergunta do DESENHO e soma o modo cego global; o sonar recebe o modo cego à parte, por
// isso lá vai só o predicado de cima. A diferença é real e está anotada dos dois lados.
const caneOn=(pl: PlayerView<'visual'>)=> settingsStore.blindMode || visaoComprometidaDe(pl.visual); // predicado de visão (movimento/render) — fica no main.js
// caneColor extraído p/ render/wheelchair-sprites.js (Estágio 4).
/*
 * A VOZ E O SONAR SÃO OS DA ENGINE (`engine.tts`, `engine.sonar`). Esta raiz construía os seus, e com o
 * `createGame` a montar os dele seriam duas vozes a narrar e dois sonares a apitar a mesma moeda.
 *
 * 🔴 A PORTA DO PIPER FECHA-SE AQUI. Era nesta linha que o fornecedor da voz neural era nomeado (ADR-0094), e o
 * `import()` lazy do `@mintplex-labs/piper-tts-web` vivia nela. A voz neural da engine 11 é o Kokoro, pedido por
 * `uses: { neuralVoice: true }` (ADR-0216) — e pedir ou não é decisão do Dev, registada no plano: sem o pedido,
 * a narração cai na voz do aparelho, que é o primário de verdade fora da nuvem.
 *
 * O sonar da engine pergunta à DECLARAÇÃO deste cartucho — `topology()`, `targetsOf(i)`, `nameAt(at)` —, que
 * responde com as mesmas medidas que o daqui usava (espaço contínuo, `unit = TILE`, só as moedas do próprio
 * jogador), e lê em voz o que está na tela (ADR-0234). As duas funções abaixo ficam porque o GUIA contínuo é
 * deste jogo (ADR-0257) e faz as mesmas perguntas.
 */
const tts = engine.tts;
const worldTopology = (): Topology => ({ kind: 'continuous', size: [WORLD_PX_W, WORLD_PX_H], unit: TILE, move: 'free', frame: 'clock' });
const coinTargetsOf = (i: number) => coins.filter((cn) => !cn.taken && cn.owner === i).map((cn) => ({ x: cn.x, y: cn.y }));
const sonarNav = engine.sonar;
// `held` adaptado: `input/state.held` estreitou para `Action` na 8.0.0 e `audio-nav` ainda declara
// `act: string` — a mesma costura do `kbFor` acima. O cast é seguro por medição: este módulo só passa
// 'up' e 'down' (audio-nav.js:64 e :75), duas ações reais.
const nav = createAudioNav({ tileAt, solidAt, held: (pl, act) => held(pl, act as Action), tonePan, noiseHit, BOX, TILE,
  getCenario: () => CENARIO, sonar: sonarNav });
// THE CONTINUOUS SOUND GUIDE (#84 item 2, ADR-0105) — this game's, by the Dev's decision (ADR-0257). It receives exactly
// what the engine's guide received from this root before the move: no `roleAt`, bus or master volume, so it keeps the
// straight-line distance and the `destination` it had.
const guide = createAudioGuide({ sonar: sonarNav, topology: worldTopology, targetsOf: coinTargetsOf,
  getPlayers: () => players, getAudioCtx: () => audio.audioCtx, getSoundOn: () => audio.soundOn, getAudioCat: () => audio.audioCat });
// ===== F4: camadas de AMBIENTE (loops sintetizados) + PISTA/GUIA auditivo (beacon em laço) =====
// Trilha de ambiente sintetizada + trovão extraídos p/ platform/audio-ambient.ts (Tier 2, áudio r4). O clima VISUAL fica no
// main.js (updateWeather/drawWeather) e migra p/ render depois. Uso: ambient.updateAmbient / ambient.thunder.
// A ÁGUA PERTO pergunta-se à DECLARAÇÃO (`roleAt`), e não ao número do tile: é a mesma tabela que pinta o alto
// contraste. O `noiseBuffer` saiu do ctx — o módulo já não o pede.
const ambient = createAudioAmbient({ ensureAC, getAudioCtx: () => audio.audioCtx, catNode, audioOut, roleAt: (at) => engine.declaration.roleAt(at), TILE,
  getSoundOn: () => audio.soundOn, getVolume: () => audio.volume, getAudioCat: () => audio.audioCat, getPlayers: () => players, getRainLevel: () => weather.getRainLevel() });
// ===== CLIMA: chuva de verdade (visual + trovão), o áudio segue o visual =====
let weatherLayer=null; // criado após o `app` existir; o ESTADO do clima (nivel/gotas/clarao) mora em render/weather
// thunder (rumor do trovão) extraído p/ platform/audio-ambient.ts (Tier 2, áudio r4). Chamado por updateWeather como ambient.thunder.
// updateWeather/drawWeather migraram para render/weather.ts (Onda A). A camada segue criada aqui.
// The guide's frame is `guide.updateGuide`, called in the loop (platform/audio-guide, ADR-0257).
// Narração TTS (Piper neural lazy + fallback Web Speech + estado) extraída p/ platform/tts.ts (Tier 2, #38). A instância `tts`
// é criada acima (antes do audio-nav, que injeta narrate). Uso: tts.narrate / tts.ttsSpeak / tts.loadTTS; o painel usa
// tts.get/setEngineSel + tts.get/setVoiceObj + tts.getEngine.
// Fala de JOGO essencial (nome da palavra/sílaba/letra/fonema nos desafios de alfabetização): SEMPRE toca, mesmo com
// o toggle 'Narração (TTS)' DESLIGADO — via voz nativa do navegador, fora do mixer (José 2026-07-04). Respeita o volume mestre.
// Escolhe uma voz pt-BR (Brasil), evitando pt-PT (José: sílabas soavam "estranhas / pt-pt?"). Não cacheia — getVoices é barato e carrega assíncrono.
// ptbrVoice + gameSay (voz do letramento) extraídos p/ platform/speech.js (Fase 2).
// tone (synth de oscilador básico) extraído p/ platform/audio.js (Fase 2).
// Jingles (vitória · enigma · fogos) extraídos p/ platform/audio-jingles.ts (Tier 2, áudio rodada 1). DI por closure:
// soundOn/volume vivos via getters (o mixer os reatribui). firework é interno ao módulo (só playVictory o usa).
const jingles = createAudioJingles({ tone, ensureAC, catNode, audioOut, getSoundOn: () => audio.soundOn, getVolume: () => audio.volume });

/* ===================== Pixi ===================== */
PIXI.settings.ROUND_PIXELS=true;
const app=new PIXI.Application({width:LOGICAL_W,height:LOGICAL_H,backgroundColor:0x05070f,
  antialias:false,resolution:1,powerPreference:'low-power'});
const pixiMount = $('#pixi-mount');
// Sem o ponto de montagem não existe jogo — então falha, e falha DIZENDO o quê. Hoje já quebrava nesta
// linha, com "Cannot read properties of null (reading 'appendChild')", que não ajuda quem editou o HTML.
// A MENSAGEM É O SELETOR, e a frase mora aqui. O gate do item 14 proíbe literal de prosa neste arquivo —
// em qualquer idioma — e a última porta dele, a lista de exceções, tem teto DEZ e está cheia, de
// propósito: "passar disso quer dizer que alguém está perdoando texto em vez de traduzi-lo". Subir o
// teto para caber uma mensagem minha seria afrouxar o gate para caber nele.
//
// E o resultado é melhor do que a frase seria: o seletor é a INFORMAÇÃO (o que falta no HTML), a pilha
// dá o lugar, e a explicação fica onde quem edita o código a encontra. Antes disto, a mesma falha vinha
// como "Cannot read properties of null (reading 'appendChild')", que não diz nem o quê nem onde.
if (!pixiMount) throw new Error('#pixi-mount');
/**
 * A TELA, uma vez, com o tipo que ela tem em EXECUÇÃO.
 *
 * No PixiJS 7 o `app.view` é `ICanvas` — uma interface que existe para o Pixi poder desenhar fora do DOM
 * (worker, OffscreenCanvas). Ela não é `Node` e não tem `setAttribute`, então `appendChild`, o atributo
 * `aria-hidden` e o `style.filter` do filtro de baixa qualidade não compilam contra ela. Mas o que este
 * arquivo cria é uma `PIXI.Application` de navegador, e ali o `view` É um `<canvas>` do DOM.
 *
 * A afirmação mora aqui, uma vez, em vez de três `as` espalhados — e o `aria-hidden` explica por que ela
 * importa: a tela é escondida do leitor de tela DE PROPÓSITO, porque o jogo fala pelo DOM (pilar 2), e um
 * `as` esquecido num desses pontos é uma regressão de acessibilidade, não um aviso de tipo.
 */
const view = app.view as unknown as HTMLCanvasElement;
pixiMount.appendChild(view);
view.setAttribute('aria-hidden','true');
const camera=new PIXI.Container(); app.stage.addChild(camera);
weatherLayer=new PIXI.Graphics(); app.stage.addChild(weatherLayer); // CLIMA (chuva/clarão) em tela-espaço, mantido no topo em draw
weather.initWeather({ mundoRodando: () => fatosDaCena().worldRunning, weatherLayer, stage: app.stage, screen: app.screen, getRm: () => rm, thunder: (i) => ambient.thunder(i),
  temChuva: () => !!(CENARIO && CENARIOS[CENARIO]?.chuva) }); // a PERGUNTA, não o id: o catálogo é daqui
/* Tela de título da v3 (render/title-scene.ts): céu em gradiente + nuvens andando dir→esq + grama pontilhada */
const titleG=new PIXI.Graphics(); app.stage.addChildAt(titleG, app.stage.getChildIndex(weatherLayer));
const titleScene = createTitleScene({ titleG, screen: app.screen, getRm: () => rm }); // cena PIXI: render/title-scene.ts (camada criada acima, injetada)
const titleUI = initTitle({ $ }); // navegacao dos submenus do titulo: ui/title.ts
/* ===================== ATTRACT MODE → extraído para game/attract.ts (Tier 1) =====================
   O controlador `attractCtl` é criado no fim do módulo (quando players/CENARIO/setCenario/restartGame/
   kbFor/etc. já existem). Aqui ficam só as chamadas: attractCtl.{isAttract,stepAttract,titleIdleTick,onInput,recordTick}. */

/* ===== Parallax: as 3 camadas de FUNDO atras do tileset -> render/parallax.ts (D2-b) =====
   Os fatores de profundidade (PARALLAX), a conta da rolagem (posicoesParallax/updateParallax) e o vestir das
   camadas por tema (aplicarTemaParallax) moram la. AQUI fica so a MONTAGEM no render-graph, e ela tem de ficar
   NESTE ponto: `camera` acabou de nascer, `starsG` (logo abaixo) e inserido relativo a parallaxLayers[1], e o
   setCenario do boot ja precisa das 3 camadas de pe para vesti-las com o tema salvo.
   `vp` (viewports) e as camadas de decor de TELA nascem DEPOIS deste ponto -> entram embrulhados em seta. */
const parallaxApi = createParallax({
  camera, criarAzulejo: (t, w, h) => new PIXI.TilingSprite(t as never, w, h), // a porta pede a fábrica
  placeholderTex: (i) => parallaxPlaceholder(doc, i), skyTex: (T) => themeSkyTexture(doc, T), hillsTex: (T, near, tema) => themeHillsTexture(doc, T, near, tema), // render/scene-parallax
  citySkyTex: (T) => themeCitySkyTexture(doc, T), skylineTex: (f, sem) => themeSkylineTexture(doc, f, sem), // ADR-0042: a Cidade é gerada, não baixada
  // `Imagem`/`texturaDeImagem`/`escalaNearest` saíram: eram a carga dos três PNG da Cidade, e com ela a
  // corrida que cada `onload` tinha de conferir (`getCenario() !== theme`). Não há mais o que baixar.
  rm, getCenario: () => CENARIO, getVizMode: () => settingsStore.vizMode,
  clearParallaxTexCache: () => vp.clearParallaxTexCache(), // `vp` e const declarado ABAIXO: seta resolve na chamada
  getDecorDeTela: () => [starsG, nuvemG, skyDecoG, fogG],  // `var` icados: undefined no boot, e o modulo guarda
});
const { layers: parallaxLayers, texNormal: parallaxTexNormal, updateParallax } = parallaxApi;
/* Tema de cenario: valida, persiste, veste o fundo e refaz a textura do mundo -> render/set-cenario.ts (D2-b).
   `loadTileImages` foi junto, virou `carregarTilesDoTema` e MORREU no item 17 (os tiles da Cidade sao dados
   agora, em render/city-tiles) — a troca de cenario e sincrona. `_vidaReady` FICA aqui: e a flag de boot da cena da
   cidade, escrita la embaixo. Tudo o que nasce depois deste ponto entra por getter/seta — o setCenario do boot
   roda dentro de um try/catch MUDO, e uma dependencia em TDZ aqui nao daria erro: daria "o tema salvo sumiu". */
/*
 * O ALTO CONTRASTE DESTE MUNDO, uma instância só (`createHighContrast`): paleta por papel, recolores e caches.
 * Lê as cores por papel da `store` NA CONSTRUÇÃO, e não mais no import.
 *
 * ⚠️ NASCE AQUI, ANTES das texturas normais, e é seguro: tudo o que lê delas entra por GETTER e só é lido no
 * primeiro recolor. Mais abaixo não dá — o `setCenario` do boot já chama `clearWorldTexCache`, síncrono e
 * dentro de um try/catch MUDO, e o `initViewports` já recebe a instância por valor.
 */
const hc = createHighContrast({ doc, W: WORLD_W, H: WORLD_H, tileAt, roleOf, store,
  outlineFg: () => settingsStore.hcOutlineFg, outlineBg: () => settingsStore.hcOutlineBg,
  getWorldCanvasNormal: () => worldCanvasNormal, getWorldTexNormal: () => worldTexNormal,
  // Os sprites que ESTE jogo quer recoloridos por modo. A engine cacheia por (id, modo) e nao sabe o que
  // 'coin' significa — outro jogo declara 'peca', 'silaba', o que for.
  sprites: () => ({ coin: { canvas: coinCanvasNormal, tex: coinTex } }) });
let _vidaReady=false; // camadas de vida/trafego/tema ja existem (applyCenarioVida pode rodar). CENARIO vem de core/state.js
const { setCenario } = createSetCenario({
  setCenarioValue, getCenario: () => CENARIO,
  aplicarTemaParallax: parallaxApi.aplicarTemaParallax,
  // Os tiles da Cidade vêm DESENHADOS (render/city-tiles); os outros temas caem nos blocos v3 com `null`.
  // Era `Imagem: Image` + download; virou uma função síncrona, e com ela foram embora a guarda de corrida e
  // os 404 de boot dos quatro temas que nunca tiveram arte própria.
  getTiles: (tema) => tema === 'cidade' ? cityTiles(doc) : null,
  worldCanvas: (tiles) => worldCanvas(doc, tiles), tex, clearWorldTexCache: () => hc.clearWorldTexCache(),
  // O `t` chega `unknown` — a `set-cenario` trata textura como handle opaco, e deve mesmo. A raiz e o
  // unico lugar que sabe o nome dele, e e aqui que ele o recupera.
  setWorldTextures: (cv, t) => { worldCanvasNormal = cv; worldTexNormal = t as PIXI.Texture; }, // `let` declarados ABAIXO (so escritos no .then)
  isVizReady: () => vizReady, reapplyVizAll: () => reapplyVizAll(),             // `reapplyVizAll` e const de viz-setters, la embaixo
  getWorldSprite: () => worldSprite,                                            // nasce depois; so lido no .then
  isVidaReady: () => _vidaReady, applyCenarioVida: () => sceneCity.applyCenarioVida(),
});
// Modos de cor. kind: normal=arte crua · hcnew=Renderização Direta (alto contraste, 3 níveis) ·
// filter=simulação/correção de daltonismo (SVG na canvas) · lowvision/blind=empatia.
// VIZ_MODES/VIZ_BY_KEY/VIZ_FILTER/VIZ_CYCLE extraídos p/ render/viz-modes.js (Fase 2, dados de a11y visual).
/* L2: Realce de contraste Linear→Quadrático (PESQUISA-ALTO-CONTRASTE §2.3, decisão do José: slider).
   Curva de tom POR PIXEL na tela inteira: I' = (1−t)·linear(I) + t·quadS(I), onde
   linear = α(I−μ)+μ (contrast stretching, α=1.3, μ=0.5) e quadS = curva S por partes (2I² | 1−2(1−I)²).
   GPU via SVG feComponentTransfer type=table (17 amostras, sRGB — mesma decisão da daltonização),
   composto com os filtros CVD no CSS filter do canvas. Global (tela toda; por-viewport = adiado). */
// lqT / lqCurve / ensureLqFilter / lqFilter / setLq migraram para render/lq-filter.ts (Onda A); lqName tambem,
// e ja nao tinha chamador aqui (o rotulo do painel vem de ui/settings-visual, que reexporta o do modulo).
// A RECOMPOSICAO do filtro CSS fica: ela mistura o modo de visao ativo e invalida caches de textura,
// coisas que nao sao do realce L->Q.
// O REALCE L->Q E DA ENGINE: `createGame` monta-o e devolve-o em `engine.lq`.
// vizMode vem de core/state.js (Fase 2, mega-var 6). Init de boot SEM persistir (preserva o rastreio de prefers-contrast):
settingsStore.initVizMode((()=>{ try{ const v=store.get('incl_viz',null); if(v&&VIZ_CYCLE.includes(v))return v; }catch(e){}
  // A guarda `window.matchMedia &&` saiu: o `tsc` acusa TS2774 porque ela testa uma função que SEMPRE existe
  // no DOM, e uma condição sempre verdadeira lida por quem revisa parece proteção contra algo. Ela vinha de
  // antes do TypeScript; `matchMedia` existe desde o IE10 e o alvo do pilar 1 é Chromium.
  return matchMedia('(prefers-contrast: more)').matches ? 'hc-direto' : 'normal'; })()); // prefere-contraste → alto contraste 3:1
let vizReady=false; // só após todas as dependências de applyViz existirem (evita TDZ no init via setCenario)
let worldCanvasNormal=worldCanvas(doc);
let worldTexNormal=tex(worldCanvasNormal);
const worldSprite=new PIXI.Sprite(worldTexNormal); camera.addChild(worldSprite);
// L6: camadas de decor de TELA da v3 (contra-posicionadas no updateParallax, como o parallax)
var starsG=new PIXI.Graphics();   camera.addChild(starsG);   // estrelas ATRÁS dos morros — pelo zIndex 3500 (bloco R1)
var nuvemG=new PIXI.Graphics();   camera.addChild(nuvemG);   // MANTA de nuvens: na frente do céu (esconde o sol), ATRÁS dos morros
var skyDecoG=new PIXI.Graphics(); camera.addChild(skyDecoG); // nuvens/pássaros à frente dos morros, atrás dos tiles — zIndex 6500
var fogG=new PIXI.Graphics();     camera.addChild(fogG);                                                // névoa: FRENTE (re-erguida com o carLayer)
/* ===== FABRICA de imagem dos modos de visao -> render/viewports.ts (B2) =====
   AQUI, e nao junto dos outros setters la embaixo: o setCenario logo abaixo ja chama
   vp.clearParallaxTexCache(), sincrono, DENTRO de um try/catch. Com o init mais tarde, quem tivesse
   'espaco' ou 'noite' salvo cairia em ReferenceError engolido pelo catch — o tema escolhido sumiria
   sem uma linha de log. treeTexNormal e lvOverlaySpr nascem depois: entram por getter, por isso.
   As seis matrizes de daltonismo agora tem UMA fonte (render/cvd-matrices) e o SVG do index.html e
   GERADO daqui, em vez de escrito a mao — antes eram duas copias, uma por caminho de render. */
const vp = initViewports({
  ColorMatrixFilter: PIXI.ColorMatrixFilter, BlurFilter: PIXI.BlurFilter,
  parallaxTexNormal, getTreeTexNormal: () => treeTexNormal,
  getLvOverlaySpr: () => lvOverlaySpr, renderInto: (o, alvo, limpar) => app.renderer.render(o as never, { renderTexture: alvo as never, clear: limpar }), getVpTex: () => vpTex,
  cvdDefsHost: $('#cvd-defs'), doc, hc,
});
const { parallaxTexFor, treeTexFor, playerVizTex, pixiFilterFor, renderVpOverlay } = vp;
// APLICA o cenário que `game/state` já leu do armazenamento (e já migrou de 'noite' para 'espaco'). Ler é
// de quem guarda o valor; aplicar — texturas, parallax, tema — é do composition root.
try{ setCenario(CENARIO); }catch(e){ setCenario('cidade'); } // herda a chave de escopo antigo; 'noite' e a migracao mais velha ainda
const coinCanvasNormal=coinCanvas(doc);
const coinTex=tex(coinCanvasNormal);
// O alto contraste (`hc`) ja existe desde antes do `setCenario`: worldCanvasNormal/worldTexNormal sao `let`
// (setCenario os reescreve ao trocar de tema), entao entraram la por getter e nao por valor.
// caches de modos acessíveis (preguiçosos), invalidados ao trocar de cenário (worldCanvasNormal muda)
let _lastSharedViz: string | null = null; // cache do modo aplicado (otimizacao do render MP) — NAO e do alto contraste:
// e escrito por rebuildCoins/rebuildExtras/applySharedTextures/setPlayerViz/reapplyVizAll. Fica aqui.
// _worldTexHC/_coinTexHC/worldTexFor/coinTexFor migraram para render/high-contrast.ts (Onda A).
// shapeTexture/SHAPE_TEX/letterTexture migraram para render/textures.ts (Onda A). O init vem AQUI porque
// o primeiro uso (rebuildCoins, logo abaixo) precisa dos caches ja preenchidos.
// OS SETE PODERES DESTE JOGO, com a arte deles. A lista era `PUP_KINDS` cravada dentro do `render/textures`
// e o desenho vinha por import de `render/props` — os dois sairam no item 19: a lista e do jogo, e a arte
// mudou de camada para `game/props`.
const PODERES = ['superjump', 'ultrajump', 'turbo', 'fly', 'wallcling', 'key', 'runcane'];
initTextures(doc, { shapes: SOMASUB_SHAPES.map(s => s.id), powerups: PODERES.map((kind) => ({ kind, canvas: powerupCanvas(doc, kind) })),
  disp, directCfg: DIRECT_CFG, directSpriteCanvas: (cv, m) => hc.directSpriteCanvas(cv, m) });
const coinContainer=new PIXI.Container(); camera.addChild(coinContainer);
// coinSprites/rebuildCoins migraram para game/coin-spawning.ts (Onda A). rebuildCoins mantem o contrato
// SEM argumentos: os nove chamadores (boot, novo round, quatro paineis de acessibilidade, Modo Facil,
// silabas, restart) nao mudam — so a definicao saiu daqui.
initCoinSpawning({ rng, getVizMode: () => settingsStore.vizMode, coinContainer, createSprite: (t) => new PIXI.Sprite(t as never), coinTexFor: (m) => hc.spriteTexFor('coin', m),
  shapeTexFor: (id) => SHAPE_TEX[id], letterTexFor: (ch) => letterTexture(doc, ch), pcolor: PCOLOR,
  getMode: () => MODE(), getOwnerColors: () => settingsStore.ownerColors, invalidateSharedViz: () => { _lastSharedViz=null; },
  powerShort: POWER_SHORT, $ });
rebuildCoins();

/* ===================== A RECICLAGEM (ADR-0049 §1) =====================
   Quatro objetos espalhados pelo trecho seco, quatro lixeiras no canto inferior esquerdo e a placa de
   PROIBIDO JOGAR LIXO antes da água. Acertar a cor vale UM PONTO DE COMPORTAMENTO — que registra que a
   criança fez uma boa ação e NÃO move nada: não pinta a barra de dez segmentos, não muda nível escolar, não
   alimenta a adaptação. É por isso que a lata pode valer ponto sem virar atalho para subir de série.

   ⚠️ O CONTADOR MORA AQUI, na raiz, e não no estado de RODADA — porque pelo ADR-0049 §7 a volta das dez
   moedas reinicia o mundo SEM prejuízo de pontos. Um ponto guardado na rodada zeraria junto com ela, que é
   exatamente o que aquela cláusula proíbe. Onde ele mora DE VERDADE (a pessoa, com o dia inteiro) ainda não
   existe — ADR-0049 §5b, e a issue que o liga ao HUD. */
/**
 * ONDE A PLACA DO `clarity` FICA. Dado de FASE, escrito à mão, porque é design de fase e não conta sobre
 * tiles — duas tentativas de derivá-la (do pula-pula, depois da água) puseram a placa no lugar errado, e
 * das duas vezes quem viu foi o Dev, na tela.
 *
 * A posição é a que ele indicou: "eu posicionei duas plataformas abaixo da lava. Pedi pra colocar a 15
 * blocos de altura do chão, 27ª coluna contando da esquerda para a direita." Em índices 0-based: coluna 26,
 * corpo da placa na linha 46, apoiada na plataforma da linha 47 — que é, de fato, a segunda abaixo da lava
 * das linhas 36 (colunas 25 a 27), e fica 15 linhas acima do chão da linha 61.
 *
 * ⚠️ QUANDO O MAPA MUDAR, ESTES DOIS NÚMEROS MUDAM JUNTO. É o preço de a placa não ter glifo próprio no
 * formato de nível — e é um preço menor do que o de uma fórmula que acerta o lugar por coincidência.
 */
const PLACA_DO_CLARITY = { col: 26, linha: 46 };

const recTex = createRecyclingTextures(doc);
const recContainer = new PIXI.Container(); camera.addChild(recContainer);
/** Pontos de COMPORTAMENTO por jogador. Sobrevive ao reinício da volta, de propósito (ADR-0049 §7). */
const pontosDeComportamento: number[] = [];
const reciclagem = createRecycling({
  camada: recContainer, criarSprite: (t) => new PIXI.Sprite(t as never),
  texturaDoLixo: (m) => recTex.lixo[m], texturaDaLixeira: (c) => recTex.lixeira[c], texturaDaPlaca: recTex.placa,
  // A consulta de mundo que a reciclagem faz, respondida pela tabela de tiles e não por número cru: um
  // segundo jogo com outra numeração poria a placa no lugar errado sem nenhum erro de tipo (ver constants).
  mundo: { tileEm: (c, l) => tileAt(c, l), colunas: WORLD_W, linhas: WORLD_H,
    solido: (ti) => !!TILE_TYPES[ti]?.solid, agua: (ti) => !!TILE_TYPES[ti]?.water, trampolim: (ti) => !!TILE_TYPES[ti]?.tramp },
  placaEm: PLACA_DO_CLARITY,
  // ⚠️ OS LUGARES SÃO OS DAS MOEDAS, filtrados por "tem chão logo abaixo". `findCoinCandidates` já sabe o que
  // a reciclagem tinha reescrito pior: nasce em ar ILUMINADO ou água, nunca na escada e nunca na REGIÃO
  // SECRETA — que deixaria de ser recompensa para virar rota obrigatória —, e nunca na zona de spawn. A
  // minha varredura perguntava só "é sólido?", e o Dev viu a caixa nascer dentro da área secreta.
  // "Feito moedas, mas na altura do chão" era literal, e agora está literal no código.
  candidatos: () => findCoinCandidates()
    .filter((c) => solidAt(c.tx, c.ty + 1))
    .map((c) => ({ x: c.tx * TILE, y: (c.ty + 1) * TILE })),
  // UMA UNIDADE DE CADA por volta — as palavras do Dev, e por isso `MATERIAIS.length` e não o número 4: se um
  // quinto material entrar um dia, "uma de cada" continua verdade sem ninguém lembrar de mexer aqui.
  quantosItens: MATERIAIS.length, escolherLugares: (total, n) => shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, n),
  lixeiraW: LIXEIRA_W, lixeiraH: LIXEIRA_H, placaH: PLACA_H,
  alturaDoLixo: (m) => LIXO_ART[m].h, larguraDoLixo: (m) => LIXO_ART[m].w, alturaDoJogador: BOX.h,
  // UM TILE E MEIO, e não um: a 16px — a criança em pé no tile do lado — o botão não fazia nada e não
  // avisava nada. Ver `alcance` em `game/recycling-scene`.
  alcance: TILE * 1.5,
  aoPontuar: (j) => { pontosDeComportamento[j] = (pontosDeComportamento[j] ?? 0) + 1; },
  // A CHAVE e os IDENTIFICADORES entram; a tradução acontece aqui. É o que mantém `game/recycling-scene` sem
  // língua nenhuma — o piso do projeto são três idiomas (pilar 3 do ADR-0010).
  anunciar: (chave, j, sobre) => {
    const msg = t(chave, { o: t('lixo.obj.' + sobre.material), cor: sobre.cor ? t('lixo.cor.' + sobre.cor) : '' });
    srSay(playerPrefix(t, j, rodada.numPlayers) + msg);
    if (settingsStore.captionsOn) showCaption(msg);
  },
});
reciclagem.montar();
// camada de escuridão das áreas secretas (acima de mundo/moedas, ABAIXO do player → player sempre visível)
const darkLayer=new PIXI.Container(); camera.addChild(darkLayer);
const darkRegions=buildDarkRegions(WORLD_W, WORLD_H).map(tiles=>{
  const gfx=new PIXI.Graphics(); gfx.beginFill(0x04060d,1);
  for(const [tx,ty] of tiles) gfx.drawRect(tx*TILE,ty*TILE,TILE,TILE);
  gfx.endFill(); darkLayer.addChild(gfx);
  return { set:new Set(tiles.map(([tx,ty])=>tx+','+ty)), gfx, announced:false };
});
// TEX (pipeline de sprite anterior ao PixelLab, ZERO chamadores) e o bloco PIP_* (conversao procedural
// adiada, tambem sem chamador) migraram para render/textures.ts (Onda A) — preservados la, nao apagados.
// FASE ATUAL: usa o PIXEL ART do PixelLab DIRETO (PNG, tamanho NATIVO de cada frame — aspect ratio
// próprio, sem padronizar). A conversão procedural (PIP_* acima) fica para uma fase posterior.
// E15: cadência de animação (ANIM) migrada p/ core/constants.js (Fase 2.16) — regulável no painel ?debug=true.
// Fonte única dos sprites: assets/sprites/menino/<animação>/<i>.png (cor, editado no Aseprite).
// Alto contraste: o quadro de cor é remapeado em tempo real para a PALETA do jogador da variação ativa (sem silhuetas _hc).
// Texturas do personagem (TEX_*/FLAVORS) migradas p/ render/sprites.js (Fase 2.17).
// E4: decoração de fundo (árvores) ATRÁS do jogador — sempre visível, NÃO some ao pular
const decoLayer=new PIXI.Container(); camera.addChild(decoLayer);
const treeCanvasNormal=treeCanvas(doc), treeTexNormal=tex(treeCanvasNormal); // árvore = grupo fundo (recolorida no alto contraste)
// _treeTexHC/treeTexFor migraram para render/viewports.ts (B2).
const decoSprites=[];
(function placeTrees(){ let last=-99; // R-cidade: árvores SÓ na parte mais baixa (por onde o personagem anda)
  for(let tx=2;tx<WORLD_W-2;tx++){
    for(let ty=WORLD_H-9;ty<WORLD_H-1;ty++){
      if(tileAt(tx,ty)===1 && solidAt(tx,ty+1) && tileAt(tx,ty+1)!==5 && tileAt(tx,ty-1)===1){ // NUNCA em cima de trampolim
        if(tx-last>=5){ const s=new PIXI.Sprite(treeTexNormal); s.anchor.set(0.5,1); s.x=tx*TILE+TILE/2; s.y=(ty+1)*TILE; decoLayer.addChild(s); decoSprites.push(s); last=tx; }
        break;
      }
    }
  }
})();
/* ===================== E12: power-ups + chave/portão ===================== */
// powerupCanvas migrado p/ render/props.js (Fase 2.20)
// PUP_CANVAS/PUP_TEX/_pupTexHC/pupTexFor migraram para render/textures.ts (Onda A); initTextures acima
// ja montou o cache.
const extraLayer=new PIXI.Container(); camera.addChild(extraLayer); // power-ups + portão (atrás do player)
// `powerups` migrou para core/state.js (#50) — nasce junto com o portão, em setLevelExtras.
// As camadas do modulo nascem AQUI, mas o addChild/addChildAT de cada uma continua exatamente onde estava:
// no PixiJS a ordem de insercao E a ordem de desenho, entao icar a construcao e seguro e icar a montagem
// no grafo NAO e. So o construtor subiu.
const rampLayer=new PIXI.Graphics();
const ropeLayer=new PIXI.Graphics();
initLevelGeometry({ W: WORLD_W, H: WORLD_H, getVizMode: () => settingsStore.vizMode, getPlayers: () => rodada.players, isWheelchair: () => settingsStore.wheelchair,
  rampLayer, ropeLayer, extraLayer,
  wcSolid: () => rodada.wcSolid, powerups: () => rodada.powerups, gateTiles: () => rodada.gateTiles,
  gate: () => rodada.gate, gateOpen: () => rodada.gateOpen,
  pupTexFor, isDirectMode: (mode) => !!DIRECT_CFG[mode], gateRoleColor: () => hc.role.gate });
// Envolucros finos: o modulo CALCULA e DESENHA; o estado compartilhado (powerups/gate/wcSolid) segue morando
// aqui porque colisao e o laco do jogador tambem o leem e escrevem.
function rebuildExtras(){ lgRebuildExtras(); _lastSharedViz=null; }
function setupExtras(){
  rodada.setDecorSeed((Math.random()*1e9)>>>0); // #69: nova semente por fase
  const _blind = settingsStore.blindMode || players.some(p=>{const m=VIZ_BY_KEY[p.viz];return m&&m.kind==='blind';});
  rodada.setLevelExtras(lgSetupExtras(MAP_ITEMS, MAP_GATE, { wheelchair: settingsStore.wheelchair, blind:_blind })); // era desestruturação em bloco; binding importado não se atribui
  rebuildExtras();
}
setupExtras();

// Fácil: retângulo translúcido mostrando a hitbox de coleta tolerante (sob o player)
const easyHitbox=new PIXI.Graphics(); camera.addChild(easyHitbox);
// Cadeirante: RAMPAS desenhadas sobre os degraus de 1 tile (sobre o mundo, abaixo do player)
camera.addChild(rampLayer);   // ordem pelo Z.SCENERY_INTERACT (bloco R1), não pela posição de inserção
// buildRamps + WC_BRIDGES migraram para game/level-geometry.ts (Onda A).
// WC_ELEVATORS (fossos só-cadeirante) movidos p/ game/elevators.js (Estágio 4).
function buildWcGeom(){ rodada.setWcSolid(lgBuildWcGeom(settingsStore.wheelchair)); } // o módulo calcula; a RODADA guarda
buildWcGeom();
buildRamps(); // desenha as rampas + coberturas (lava, pontes) se já iniciar em modo cadeirante
// CORDAS FLUTUANTES na superfície da água (o cego atravessa por elas; visual para todos)
camera.addChild(ropeLayer);   // ordem pelo Z.SCENERY_INTERACT+10 (bloco R1)
// buildRopes migrou para game/level-geometry.ts (Onda A).
buildRopes();
// ELEVADOR (cadeirante): trampolim = plataforma LARGA, escada = plataforma FINA. Toque ↑/↓ = viaja até a parada segura.
// ELEV_SPEED/elevShafts/buildElevators/elevAt extraídos p/ game/elevators.js (Estágio 4). drawElevators (cabine
// de vidro) fica aqui e lê os poços por getElevShafts(). WC_ELEVATORS foi p/ o módulo; WC_BRIDGES fica (ramps).
initElevators({ W: WORLD_W, H: WORLD_H, isWheelchair: () => settingsStore.wheelchair }); // liga o módulo às dims + estado
buildElevators();
const elevLayer=new PIXI.Graphics(); camera.addChild(elevLayer); // ordem pelo Z.SCENERY_INTERACT+20 (bloco R1)
// Estilo VIDRO PREDIAL (rodoviária/shopping/aeroporto): fosso de vidro translúcido (vê o background),
// moldura cinza/branco/azul, escada some virando blocos de elevador, e a cabine PERMANECE onde foi deixada.
// drawElevators migrou para game/level-geometry.ts (Onda A) — game/elevators ja registrava que quem desenha
// a cabine e quem escreve a posicao dela.
const caneLayer=new PIXI.Graphics(); camera.addChild(caneLayer); // bengala (modo cego)
// drawCane/drawRunCane extraídos p/ render/wheelchair-sprites.js (Estágio 4). caneLayer (acima) fica aqui.
const chairLayer=new PIXI.Graphics(); camera.addChild(chairLayer); // cadeira de rodas (modo cadeirante)
// drawChair extraído p/ render/wheelchair-sprites.js (Estágio 4). chairLayer (acima) fica aqui.

/* ===================== L5: VIDA AMBIENTE (Cidade) — pombos, gatos, cães e adultos, 100% procedural =====================
   Cosmético puro: sem colisão, sem dano (revoada de pombo ≠ susto de perigo). ATRÁS do player.
   Pool de 8, spawn perto da câmera, 2 quadros por bicho; rm.decor (Movimento Reduzido de cena) desliga tudo. */
const lifeLayer=new PIXI.Container(); camera.addChild(lifeLayer);
const CITY_TEX=createCityTextures(doc); // pombos/gatos/caes, silhuetas de adulto e carros (render/city-tex.ts) — I/O de canvas SO aqui, no boot
// LIFE_KINDS/creatures/_lifeSpawnT/spawnCreature/stepLife migraram para game/life.ts (Onda A).
// inDark/lifeSurfaceAt/lifeSurfaceLowAt/streetCols FICAM: render/scene-city usa lifeSurfaceAt tambem.
function inDark(tx: number,ty: number){ for(const r of darkRegions){ if(r.set.has(tx+','+ty))return true; } return false; } // célula de área secreta?
function lifeSurfaceAt(tx: number){ for(let ty=3;ty<WORLD_H-1;ty++){ if(solidAt(tx,ty)&&!solidAt(tx,ty-1)&&tileAt(tx,ty-1)!==3&&tileAt(tx,ty)!==9&&tileAt(tx,ty-1)!==9&&!inDark(tx,ty-1)) return ty; } return -1; } // superfície AO AR LIVRE (fora das secretas), a MAIS ALTA; ty-1!==9 = nada spawna DENTRO da lava
function lifeSurfaceLowAt(tx: number){ for(let ty=WORLD_H-2;ty>3;ty--){ if(solidAt(tx,ty)&&!solidAt(tx,ty-1)&&tileAt(tx,ty-1)!==3&&tileAt(tx,ty)!==9&&tileAt(tx,ty-1)!==9&&!inDark(tx,ty-1)) return ty; } return -1; } // idem, a MAIS BAIXA (calçada/fachada); ty-1!==9 = fora da lava
let _streetCols: [number, number][] | null = null; // colunas ABERTAS da rua/fachada (superfície mais baixa, fora das secretas) — computadas 1×
function streetCols(){ if(_streetCols)return _streetCols; _streetCols=[];
  for(let tx=2;tx<WORLD_W-2;tx++){ const ty=lifeSurfaceLowAt(tx); if(ty>0&&ty*TILE>WORLD_PX_H*0.55)_streetCols.push([tx,ty]); }
  return _streetCols; }
life.initLife({ rng, getPlayers: () => rodada.players, getNumPlayers: () => rodada.numPlayers, layer: lifeLayer, makeSprite: (t) => new PIXI.Sprite(t as never), lifeTex: CITY_TEX.lifeTex, adultTex: CITY_TEX.adultTex,
  lifeSurfaceAt, lifeSurfaceLowAt, streetCols, decoSprites, rm, W: WORLD_W, pxW: WORLD_PX_W, pxH: WORLD_PX_H });
/* ===================== L5: CARROS (camada da FRENTE) + SEMÁFORO funcional — procedural ===================== */
// Carros cruzam a rua À FRENTE do player (carLayer re-erguido em ensureSprites); param no vermelho/amarelo
// do semáforo e seguem no verde. Ciclo LENTO (verde 8s → amarelo 2s → vermelho 6s) — sem flashes (WCAG 2.3.1).
const carLayer=new PIXI.Container(); camera.addChild(carLayer);
// R-cidade (José 2026-07-03): o cenário é o INTERIOR de um prédio; a parte mais baixa é a FACHADA e a
// rua fica NA FRENTE dela → carros (3×) e placas de PARE vivem na BASE do mundo, na camada da frente.
// cars/_carT/STREET_Y/SEM/drawSemaforo/initTraffic/spawnCar/setFrontDim/stepTraffic migraram para
// game/traffic.ts (Onda A). carLayer FICA (o z-order dele e soldado aqui); a textura saiu para
// render/city-tex.ts (D3-a), junto com a dos bichos e a dos pedestres.
traffic.initTraffic({ rng, carLayer, CAR_TEX: CITY_TEX.carTex,
  criarSprite: (t) => new PIXI.Sprite(t as never), criarDesenho: () => new PIXI.Graphics(),
  WORLD_PX_W, WORLD_PX_H, WORLD_W, getRm: () => rm });
/* ===================== L5: DECORAÇÃO POR ZONA (procedural, desenhada UMA vez) =====================
   Rua: calçada+meio-fio, postes com brilho ESTÁVEL, placas (PARE/faixa), letreiros nas fachadas.
   Caixa d'água: paredes de tanque + linha d'água. Interior de prédio (alto): janelas.
   Secretas (darkRegions): entulho/viga/pichação — desenhados ABAIXO do darkLayer (só aparecem revelados). */
const cityDecoG=new PIXI.Graphics(); lifeLayer.addChildAt(cityDecoG,0); // atrás dos bichos, à frente do mundo
const abandonG=new PIXI.Graphics(); camera.addChild(abandonG); // SOB a escuridão — pelo Z.TILES+400 contra o TILES+500 do darkLayer
// buildCityDeco migrou para render/scene-city.ts (Onda A); a chamada de boot desceu para junto do init,
// depois que TODAS as camadas dele existem (lavaFxG/waterFxG nascem mais abaixo).
/* ===================== L5+: CÉU — nuvens à deriva + pássaros cruzando (procedural) =====================
   Atrás dos tiles (sobre o parallax). Nuvens derivam devagar e dão a volta; pássaros de 2 quadros cruzam
   o céu de vez em quando. rm.decor congela nuvens e remove pássaros. */
const skyLayer=new PIXI.Container(); camera.addChild(skyLayer); // ordem pelo zIndex 6700 (bloco R1)
// Estes dois usavam `makeCanvas` + `getContext('2d')` na mão — o par que `render/canvas.pixelTexture` existe
// para eliminar, e cujo comentário já cita "os três `mk` locais do main.js". Eram mais dois que ficaram para
// trás. Reusar o painter também resolve, de graça, onze avisos de `getContext` possivelmente nulo: o `!` mora
// num lugar só, dentro do helper, em vez de aparecer em cada bloco de arte.
const NUVEM = 'rgba(225,232,244,0.85)';
const CLOUD_TEX = [0, 1].map((v) => { const w = v ? 46 : 30, h = v ? 12 : 9;
  return pixelTexture(doc, w, h, (px) => {
    px(4, 4, w - 8, h - 5, NUVEM); px(0, 6, w, h - 7, NUVEM); px(8, 0, w - 20, 6, NUVEM); px(w - 16, 2, 10, 5, NUVEM);
  });
});
const PASSARO = '#20242e';
const BIRD_TEX = [0, 1].map((f) => pixelTexture(doc, 7, 4, (px) => {
  if (f === 0) { px(0, 0, 3, 1, PASSARO); px(4, 0, 3, 1, PASSARO); px(2, 1, 3, 1, PASSARO); }
  else { px(0, 2, 3, 1, PASSARO); px(4, 2, 3, 1, PASSARO); px(2, 1, 3, 1, PASSARO); }
}));
// clouds/birds + seedClouds + stepSky extraídos p/ render/scene-sky.ts (#43). skyLayer/CLOUD_TEX/BIRD_TEX ficam aqui
// (criação = z-order do render-graph) e são injetados. Uso no loop: sceneSky.stepSky(dt).
/* ===================== L6 (fiel à v3): decoração viva por tema — fórmulas COPIADAS da v3.1.100 =====================
   Tela: estrelas (starsG, atrás dos morros) · nuvens+pássaros (skyDecoG, à frente dos morros) · névoa (fogG, frente).
   Mundo: grama+flores c/ vento (grassG, atrás do player) · minhocas/vagalumes/borboletas (themeFxG, FRENTE, como na v3). */
const grassG=new PIXI.Graphics(); lifeLayer.addChildAt(grassG,0);
const themeFxG=new PIXI.Graphics(); camera.addChild(themeFxG);          // fauna à FRENTE do player (worms + metade das borboletas)
const themeFxBackG=new PIXI.Graphics(); camera.addChild(themeFxBackG);  // fauna ao FUNDO (vaga-lumes + metade das borboletas) — #69
// Lógica do céu (stepSky/stepV3Decor + nuvens/pássaros/estrelas/névoa/grama/bichos) extraída p/ render/scene-sky.ts (#43).
// As 6 camadas acima são criadas AQUI (z-order do render-graph, intocado) e INJETADAS; o módulo só as anima. getFxClock é lazy.
const sceneSky = createSceneSky({ skyLayer, starsG, skyDecoG, nuvemG, fogG, grassG, themeFxG, themeFxBackG, CLOUD_TEX, BIRD_TEX, criarSprite: (t) => new PIXI.Sprite(t as never),
  hexN, rnd, randInt, WORLD_PX_W, WORLD_PX_H, WORLD_W, WORLD_H, TILE, LOGICAL_W, LOGICAL_H, BOX,
  CENARIOS, THEME_FLORA, DIRECT_CFG, solidAt, tileAt,
  getCenario: () => CENARIO, getVizMode: () => settingsStore.vizMode, getPlayers: () => players, getFxClock: () => fxClock, getRm: () => rm,
  getAglomeracao: () => weather.getAglomeracao(), // o MESMO relógio da chuva: as nuvens fecham antes da 1ª gota
  getGrassDensity: () => rodada.grassDensity, getDecorSeed: () => rodada.decorSeed });
// drawV3Cloud + drawV3Grass extraídos p/ render/scene-sky.ts (#43) — funções de desenho puras usadas por stepV3Decor.
// stepV3Decor (decor viva da v3: estrelas/nuvens/pássaros/névoa/grama/minhocas/vagalumes/borboletas) extraído p/
// render/scene-sky.ts (#43). Camadas injetadas. Uso no loop: sceneSky.stepV3Decor().
// applyCenarioVida migrou para render/scene-city.ts (Onda A): la ele so mexe nas camadas dele e chama de
// volta o gancho onCenarioChange, por onde o transito reage. O estado inicial e ligado junto do init.
/* ===================== Tiles vivos da v3 (água FORE + lava) — drawTile animado, fiel ===================== */
const lavaFxG=new PIXI.Graphics(); lifeLayer.addChildAt(lavaFxG,0);   // tracinhos da lava (ATRÁS do player, como o map-back)
const waterFxG=new PIXI.Graphics(); decoLayer.addChild(waterFxG);     // corais/algas/peixes no BACKGROUND (camada das árvores — pedido do José; ficam atrás de player E carros)
const sceneCity = initSceneCity({ cityDecoG, abandonG, lavaFxG, waterFxG, skyLayer, darkRegions,
  solidAt, tileAt, lifeSurfaceAt, WORLD_W, WORLD_H, TILE, WORLD_PX_W, WORLD_PX_H, LOGICAL_W, LOGICAL_H, BOX,
  DIRECT_CFG, getCenario: () => CENARIO, getVizMode: () => settingsStore.vizMode, getPlayers: () => players,
  getFxClock: () => fxClock, getRm: () => rm,
  onCenarioChange: (city) => { carLayer.visible = city; if(!city) traffic.clearCars(); } });
sceneCity.buildCityDeco();
_vidaReady=true; sceneCity.applyCenarioVida(); // estado inicial (CENARIO já veio do setCenario do boot)
const playerSprite=new PIXI.Sprite(TEX_IDLE[0]); playerSprite.anchor.set(0.5,1); camera.addChild(playerSprite);
players[0].sprite=playerSprite;
// (re-add-ao-topo removido — carLayer/themeFxG/fogG posicionados pelo zIndex canônico do bloco R1, logo abaixo; #69)
/* ===================== L2: JUICE — micro-efeitos de resposta (toggles independentes no ?debug) =====================
   Cada efeito respeita o Movimento Reduzido do jogador: partículas→rm.particles, cintilar→rm.items,
   tremor de tela→rm.parallax (movimento de câmera), squash→rmWalk (personagem). Hit-stop é PAUSA, não movimento. */
// JUICE/saveJuice/easeOut3/particles/shake/hit-stop extraídos p/ render/fx.js (Estágio 4). fxClock FICA aqui
// (clock GERAL de animação — o cintilar das moedas + ctx o leem). initFx injeta fxG+rm logo após criar fxG.
let fxClock=0;
const fxG=new PIXI.Graphics(); camera.addChild(fxG); // acima dos players (re-erguida em ensureSprites)
initFx({ getPlayers: () => players, fxG, rm, store }); // Estágio 4: liga o módulo fx à camada PIXI + reduce-motion
// ===== R1 (#69, ADR-0020): ORDEM-Z CANÔNICA do MUNDO — zIndex declarativo (core/layers.ts) sobrepõe os
// addChildAt(getChildIndex) + os re-add-ao-topo (que ficam redundantes: o zIndex decide a ordem). Filhos ANINHADOS
// (grassG/cityDecoG/lavaFxG no lifeLayer; waterFxG no decoLayer) mantêm a ordem interna do pai. Alvo: no-op visual.
camera.sortableChildren = true;
parallaxLayers[0].zIndex = Z.PARALLAX_4; starsG.zIndex = 3500; parallaxLayers[1].zIndex = Z.PARALLAX_3; parallaxLayers[2].zIndex = Z.PARALLAX_2;
// A manta de nuvens entra em PARALLAX_4+600, que é o slot que core/layers já reservava para "nuvens de céu em
// PARALLAX_*+offset": à FRENTE do gradiente de céu (3000) — é assim que ela esconde o sol — e ATRÁS das duas
// bandas de morro (4000 e 5000), que é o que faz as árvores do fundo passarem na frente dela. Pedido do Dev.
nuvemG.zIndex = Z.PARALLAX_4 + 600;
skyDecoG.zIndex = 6500; skyLayer.zIndex = 6700; decoLayer.zIndex = Z.BG_DECOR;
// Área SECRETA (darkRegions): conteúdo (abandonG) + escuridão que o cobre — camada do MEIO, à frente dos tiles mas ATRÁS
// da fauna/itens/player (NÃO é o DARK_WORLD de modo cego). Senão a escuridão da região cobre borboletas/grama. (#69)
abandonG.zIndex = Z.TILES + 400; // 8400 — conteúdo secreto, sobre os tiles
worldSprite.zIndex = Z.TILES;
rampLayer.zIndex = Z.SCENERY_INTERACT; ropeLayer.zIndex = Z.SCENERY_INTERACT + 10; elevLayer.zIndex = Z.SCENERY_INTERACT + 20;
lifeLayer.zIndex = Z.FAUNA_BACK; extraLayer.zIndex = Z.ITEMS - 500; coinContainer.zIndex = Z.ITEMS;
// A reciclagem entra logo ATRÁS das moedas: lixeira e placa são mobiliário e o lixo é coletável, e os três
// ficam à frente dos tiles e atrás do jogador. Sem esta linha o contêiner nasce com zIndex 0 — e some
// atrás do parallax, que foi o que aconteceu na primeira vez que o Dev abriu a cidade para olhar.
recContainer.zIndex = Z.ITEMS - 200;
playerSprite.zIndex = Z.PLAYER; caneLayer.zIndex = Z.PLAYER + 10; chairLayer.zIndex = Z.PLAYER + 20;
fxG.zIndex = Z.VFX_FRONT; carLayer.zIndex = Z.VEHICLES; themeFxG.zIndex = Z.FAUNA_FRONT; themeFxBackG.zIndex = Z.FLORA_BACK + 500; fogG.zIndex = Z.WEATHER - 500;
darkLayer.zIndex = Z.TILES + 500; easyHitbox.zIndex = Z.WORLD_A11Y; // darkLayer = escuridão da área SECRETA (meio, atrás dos atores), NÃO DARK_WORLD (#69)
// spawnParticle/puffDust/burstSparkle/addShake/addHitstop/setSquash/stepFx/drawFx extraídos p/ render/fx.js
// (Estágio 4). Importados no topo; fxG+rm injetados por initFx; shake/hit-stop lidos por getters/shakeAmp/tickHitstop.
/* L2: Estética CRT (menu Sensibilidade visual) — scanlines/vinheta/cantos em 3 NÍVEIS (0=desligado,
   1=pequeno, 2=grande), só CSS. Cantos: 0=tela quadrada, 1=padrão de sempre (8px), 2=arredondadão (24px).
   Migra o formato booleano antigo (true→ligado; round true→2, false→1). */
// O CRT é da engine (`engine.crt`, montado pelo `createGame`). Boot: aplica as classes CSS agora, como antes.
engine.crt.apply();
/* E11: sprites por jogador + render multi-viewport (render-to-texture) */
let allPSprites=[playerSprite];
function ensureSprites(){
  for(let i=allPSprites.length;i<rodada.numPlayers;i++){ const s=new PIXI.Sprite(TEX_IDLE[0]); s.anchor.set(0.5,1); s.zIndex=Z.PLAYER; camera.addChild(s); allPSprites.push(s); }
  // (re-add-ao-topo removido — fxG/carLayer/themeFxG/fogG governados pelo zIndex canônico (bloco R1); sortableChildren re-ordena; #69)
  allPSprites.forEach((s,i)=>{ s.visible=i<rodada.numPlayers; s.tint=PCOLOR[i]||0xffffff; if(i<rodada.numPlayers)players[i].sprite=s; });
}
let vpTex: RenderTextureLike[] = [], vpSpr: SpriteLike[] = [], vpFrames: GraphicsLike | null = null, vpDots: GraphicsLike[] = [];
/* ===================== O HUD DAS TELAS -> ui/seat-hud.ts =====================
   📌 DECISÃO A DO DEV (02/10): a pausa por tela, a barra rápida por tela e o `ui/hud` da engine que as montava
   saíram (o `ui/hud` exigia `buildScreenPause`). A engine desenha as moedas do assento 0 na faixa da missão
   (gancho `hud`, em `src/index.ts`); daqui sai o resto do que cada tela mostrava: as moedas dos assentos 1–3, o
   poder de todos, o selo de abandono e o de «aperte para entrar» — e a `.player-screen` onde o desafio multi-tela
   se pendura (`getScreen`, lido por `game/quiz`). */
/**
 * O ÍCONE DE CADA MATERIAL NO HUD — o que o canto superior direito mostra enquanto a criança carrega.
 *
 * 📌 EMOJI E NÃO A TEXTURA, pela mesma razão por que o 🪙 e o ✨ são emoji: o HUD é DOM sobre o canvas, e
 * trazer a arte procedural do lixo (`render/recycling-tex`) para cá pedia um segundo caminho de render —
 * uma render-texture, um `<img>` por material e um cache — para desenhar algo de 16 px. Os quatro emoji
 * dizem o mesmo e seguem o tamanho da letra que a criança escolheu, inclusive na fonte grande.
 * ⚠️ O NOME NÃO ENTRA AQUI: ele é `t('lixo.obj.' + material)`, como em `anunciar` acima — três idiomas, uma
 * fonte só.
 */
const ICONE_DO_LIXO: Readonly<Record<string, string>> = Object.freeze({
  papel: '📦', plastico: '🧴', metal: '🥫', vidro: '🫙',
});

const seatHud = createSeatHud({
  t, $,
  getPlayers: () => players, getNumPlayers: () => rodada.numPlayers,
  // O OBJETIVO deste jogo, resolvido a CADA quadro: uma tabela lida uma vez ficaria no idioma do arranque.
  objective: (i) => ({
    name: { text: t('hud.nome.moedas'), gender: 'f', plural: true },
    have: (players[i] && players[i].collected) || 0,
    need: COIN_TARGET,
  }),
  icon: '🪙',
  powerShort: POWER_SHORT,
  // ⚠️ LIDO A CADA QUADRO e não guardado: a carga muda por botão (`game/carry`) e o nome muda de idioma a
  // meio da partida, como o objetivo logo acima — uma tabela resolvida uma vez ficaria no idioma do arranque.
  carga: (i) => {
    const it = reciclagem.itens().find((x) => x.dono === i && !x.descartado);
    return it ? { icone: ICONE_DO_LIXO[it.material] ?? '🗑️', rotulo: t('lixo.obj.' + it.material) } : null;
  },
});
// ⚠️ O `applyLetra()` depois de remontar NÃO é enfeite: ele vinha no `onScreensBuilt` do `ui/hud` da engine. Remontar
// apaga as `.player-screen`, e com elas o desafio multi-tela pendurado nelas; o `applyLetra` re-renderiza o desafio
// de quem tem um aberto, agora na tela nova. O `try/catch` de antes protegia o TDZ do primeiro build, que hoje
// acontece depois de tudo declarado (ver a nota junto de `buildGameHud()`, lá embaixo).
const buildGameHud  = () => { seatHud.buildGameHud(); applyLetra(); };
const updateGameHud = () => seatHud.updateGameHud();
/* ===================== O PIPELINE DE RENDER POR TELA -> render/screen-pipeline.ts (D3-c) =====================
   A TOPOLOGIA do render saiu inteira (quantas render-textures, onde cada tela fica, moldura e bolinha). Aqui
   fica so o ENVOLUCRO — declaracao de funcao, portanto icada, porque initSession o recebe por REFERENCIA.
   applyVpFilters/updateVpDots sao const ~280 linhas ABAIXO: entram como setas preguicosas, e isso e seguro
   porque configureRender NUNCA roda no boot (so por setNumPlayers/joinPlayer/restartGame). Os quatro `let`
   (vpTex/vpSpr/vpFrames/vpDots) FICAM aqui, porque viewports/viz-setters/draw ja os leem por getter — dai o
   ctx trazer o par getter+setter de cada um, em vez de o modulo ser dono dos arrays. */
const screenPipeline = initScreenPipeline({
  RenderTexture: PIXI.RenderTexture, NEAREST: PIXI.SCALE_MODES.NEAREST,
  createSprite: (t) => new PIXI.Sprite(t as never), createDrawing: () => new PIXI.Graphics(),
  stage: app.stage, renderer: app.renderer, camera, // aqui é o `ResizableRenderer` (só `resize`), não a captura
  getNumPlayers: ()=>rodada.numPlayers,
  getVpTex: ()=>vpTex, setVpTex: (a)=>{ vpTex=a; },
  getVpSpr: ()=>vpSpr, setVpSpr: (a)=>{ vpSpr=a; },
  getVpFrames: ()=>vpFrames, setVpFrames: (g)=>{ vpFrames=g; },
  getVpDots: ()=>vpDots, setVpDots: (a)=>{ vpDots=a; },
  setMinimapVisible, buildGameHud: ()=>buildGameHud(),
  applyVpFilters: ()=>applyVpFilters(), updateVpDots: ()=>updateVpDots(), // LAZY: consts de viz-setters (TDZ)
});
function configureRender(){ screenPipeline.configureRender(); }

// E5: minimapa estilo Metroid (canto inferior esquerdo, fixo na tela, fog-of-war)
initMinimap(app.stage, WORLD_W, WORLD_H); // render/minimap (Estágio 4, Tier 1): container + fog-of-war (markSeen/redrawMinimapIfDirty/drawMinimapPlayer/resetMinimap/proximoCantoDoMinimapa/…)
// A MONTAGEM DO HUD (`buildGameHud()`) mora lá embaixo, junto da tela de título — ver a nota lá.

/* ===================== física (por jogador — E11) -> game/physics.ts (B1) =====================
   sampleFeatures/resolveX/resolveY/triggerLava e o CORPO de fisica do stepPlayer moram no modulo, ancorados
   nos 600 quadros de tests/fixtures/physics-golden.json. O QUE FICA aqui e a outra metade do stepPlayer:
   coleta de moeda, quiz, power-ups, chave/portao e a animacao do sprite — dependem de MODE, coins, powerups,
   gate e texturas, que sao render/estado do monolito.
   `dir` e a unica variavel local que atravessa a fronteira, e por isso stepPlayer devolve {ran, dir}:
   `ran:false` reproduz o return seco de quiz/quit/waiting, que abortava a funcao INTEIRA, animacao inclusive. */
initPhysics({
  // 🔴 `{ held }` E NÃO `input`: a física guarda `ctx.input.held` no arranque (`game/physics.ts:160`), e o
  // `held` da engine só conhece TECLAS. Passar o `input` cru aqui deixava a física surda ao controlador
  // virtual — 📏 medido em 03/10 com a câmera: a criança apontava o dedo, o comando chegava ao registo
  // (`__incl.cmdVirtuais` subia) e o boneco não andava, porque quem o move lia outra fonte. O envelope da
  // linha 263 é o que soma as duas, e tem de ser ELE a atravessar esta fronteira.
  t, input: { held },
  rng,
  getPlayers: () => rodada.players,
  isWheelchair: ()=>settingsStore.wheelchair, isModoCego: ()=>settingsStore.blindMode, caneOn, WORLD_PX_H: ()=>WORLD_PX_H,
  sfx: (n)=>earcons.sfx(n), srSay, srAlert, hideTips, showPower, nav,
  tonePan, noiseHit, surfaceUnder,
  puffDust, setSquash, addShake, addHitstop, POWER_MSG,
  coinPools: ()=>coinPools(), rebuildCoins, updateHud,
});
// `GamePlayer` e não `Player`: as três chamadas abaixo — física, coleta e animação — leem `quiz`, e `quiz`
// é do JOGO (ADR-0033). Declarar o tipo da engine aqui obrigava cada uma delas a um cast, e era o mesmo
// defeito do `modalInput`: a assinatura contradizendo o que a função faz na primeira linha.
function stepPlayer(pl: ControlledGamePlayer,dt: number){
  const _p=stepPhysics(pl,dt); if(!_p.ran)return; const dir=_p.dir; // fisica em game/physics.ts
  sessionApi.collectFor(pl); // moeda/quiz, power-up/chave e portao -> game/session.ts (C2)
  // E15/E16/E17/E19/E20: a escolha do quadro (decisao PURA em render/player-anim.ts) e a aplicacao dela no
  // sprite (com o recolor do modo de visao) moram em render/draw.ts (C1). `dir` vem da fisica, acima.
  drawApi.animatePlayer(pl,dt,dir);
}
/* ===================== AREA SECRETA: presenca -> revelacao + anuncio -> game/secret-areas.ts (D3-c) =====
   `darkRegions` e const declarado LA EM CIMA e entra por VALOR (o modulo muta gfx.alpha/announced dos
   objetos, nunca troca o array) — por isso este init tem de vir DEPOIS daquela declaracao. `players` entra
   por getter: e a lista viva de core/state.ts, que cresce e encolhe. */
const secretAreas = initSecretAreas({ regions: darkRegions, getPlayers: ()=>players, box: BOX, tile: TILE, srSay });
function update(dt: number){
  if(!fatosDaCena().worldRunning)return; // E14: congelado no título e na pausa
  if(tickHitstop(dt)) return; // JUICE: hit-stop congela o mundo por alguns ticks
  fxClock+=dt; // clock GERAL de animação (o stepFx não o incrementa mais — extraído p/ render/fx)
  stepFx(dt); // partículas + decaimento de tremor/squash (roda até no fim de jogo → confete da vitória anima)
  attractCtl.stepAttract(dt); // attract: robô/replay dirige o P1 (ANTES da física)
  attractCtl.recordTick(); // ?record=1: grava o P1 (fora da demo, jogando) em localStorage
  life.stepLife(dt); // L5: vida ambiente (pombos/gatos/cães/adultos) — cosmética, atrás do player
  traffic.stepTraffic(dt); // L5: carros (frente, na rua da base) + semáforo
  sceneSky.stepSky(dt); // L5: nuvens + pássaros no céu
  sceneSky.stepV3Decor(); // L6: decoração viva da v3 (estrelas/nuvens/pássaros/névoa/grama/minhocas/vagalumes/borboletas)
  sceneCity.stepTileFx(); // tiles vivos da v3: água (ondas/corais/algas/peixes, FORE) + lava (tracinhos)
  if(rodada.ended)return;
  players.forEach((p,i)=>{ if(p.quit&&p.jumpEdge){ p.jumpEdge=false; respawnPlayer(i); } }); // L1: quem saiu re-entra pelo PULO do teclado (ou START do pad, no pollPads)
  // `controlados()` e não `jogadores()`: a física e a animação leem `ctrl`, e esta é a vista que afirma o
  // que já é verdade aqui — o laço só roda DEPOIS de `assignControls`, então `ctrl` não é mais nulo.
  // A RECICLAGEM, e ela roda ANTES do `stepPlayer` de propósito: `physics` zera `jumpEdge`/`runEdge` no fim
  // de cada passo (physics.ts:393), então quem olhar depois nunca vê borda nenhuma. Foi assim que o primeiro
  // teste no navegador apareceu: o botão não pegava, e não havia nada de errado com o botão.
  //
  // ⚠️ E QUANDO A AÇÃO ACONTECE, A BORDA É CONSUMIDA. É a consequência que o ADR-0045 já escreveu com todas as
  // letras — "com a alternância ligada e um objeto por perto, o pulo PEGA em vez de pular" —, e ela vale nos
  // dois caminhos: o botão que carrega não faz a sua outra função naquele quadro. Sem consumir, pegar o lixo
  // também pularia, e a criança perderia o objeto no ar toda vez.
  // A lista sai INTEIRA numa chamada só: o sprite de um item carregado procura o dono DENTRO da lista que
  // recebeu, e um jogador por vez faria o item do jogador 2 perder o dono e voltar para a posição do chão.
  reciclagem.atualizar(controlados().map((pl) => {
    const direcao = held(pl, 'left') ? -1 : held(pl, 'right') ? 1 : 0;
    const carregando = reciclagem.itens().some((it) => it.dono === pl.i && !it.descartado);
    const objetoPerto = reciclagem.temItemPerto(pl.i, pl.x, pl.y);   // UM alcance só — ver a API da cena
    const acao = acaoDeCarga({ objetoPerto, carregando, bordaDeInteracao: pl.runEdge, direcao,
      // Hoje a única coisa carregável do jogo é lixo. Semente, bola e objeto perdido já estão decididos
      // (`game/carry.PODE`) e ainda não existem no mundo — quando existirem, é este campo que muda.
      tipoDaCarga: carregando ? 'lixo' : null });
    // ⚠️ E A BORDA É CONSUMIDA QUANDO A AÇÃO ACONTECE, porque o botão age POR CONTEXTO. O Dev: "se não há
    // nada para pegar, ele alterna a corrida. Por isso é botão de interação: sua ação, a forma com que
    // interage, funciona pelo contexto." Então há uma coisa só por aperto — pegou a lata, não alternou a
    // corrida; não havia nada para pegar, alternou. Sem consumir, um aperto faria as duas, e a criança que
    // usa a alternância é justamente quem tem mais dificuldade de desfazer um toque acidental.
    if (acao !== 'nada') pl.runEdge = false;
    return { i: pl.i, x: pl.x, y: pl.y, olhandoPara: pl.facing < 0 ? -1 as const : 1 as const, acao, direcao };
  }));
  for(const pl of controlados()) stepPlayer(pl,dt);
  // A PLACA BARRA A CRIANÇA, e é aqui — DEPOIS da física — porque é a posição final do quadro que interessa:
  // barrar antes deixaria o passo seguinte atravessar. Com lixo na mão ela para na linha; de mãos livres, ou
  // com o lixo já na lixeira, passa como sempre. Ver `game/recycling`, que explica por que a barreira é sobre
  // ELA e não sobre o objeto.
  for (const pl of controlados()) {
    const carregandoLixo = reciclagem.itens().some((it) => it.dono === pl.i && !it.descartado);
    const travado = travarNaPlaca(pl.x, pl.y, reciclagem.barreira(), carregandoLixo);
    if (travado !== pl.x) { pl.x = travado; if (pl.vx > 0) pl.vx = 0; }
  }
  secretAreas.stepSecretAreas(dt); // E1: revela a area secreta enquanto houver jogador dentro, re-escurece ao sair e anuncia (game/secret-areas.ts, D3-c)
}
/* ===================== camera + quadro -> render/draw.ts (C1) =====================
   placeCam, draw e a cauda de animacao do stepPlayer moram no modulo. Aqui fica so o ENVOLUCRO de `draw` —
   declaracao de funcao, portanto icada, porque startLoop e window.__incl o capturam pelo NOME, mais abaixo.
   placeCam NAO ganha envolucro: fora do proprio draw ele nao tinha chamador nenhum.
   O ctx segue a regra da casa: o que o main.js REATRIBUI (vpTex, wheelchair: settingsStore.wheelchair, fxClock, powerups) entra por
   GETTER; camadas, camera e renderer entram por valor. `applySharedTextures` e `const` declarado ABAIXO
   (viz-setters), por isso entra embrulhado numa seta — passado direto, cairia em TDZ e derrubaria o boot. */
const drawApi = initDraw({
  getPlayers: () => players, getNumPlayers: () => rodada.numPlayers,
  camera, renderizarEm: (o, alvo, limpar) => app.renderer.render(o as never, { renderTexture: alvo as never, clear: limpar }),
  BOX, // a caixa do jogador ENTRA (como ja entrava em scene-city/scene-sky/audio-nav), nao e' importada la
  caneLayer, chairLayer, easyHitbox,
  getVpTex: ()=>vpTex, isWheelchair: ()=>settingsStore.wheelchair, getFxClock: ()=>fxClock, getPowerups: ()=>rodada.powerups,
  // OS ITENS DECLARADOS (item 19). O `render/draw` importava `getCoinSprites` de `game/coin-spawning` e
  // `puTaken` de `game/powerups` — as duas ultimas arestas de importacao da engine para o jogo. E trazia
  // junto TRES regras que sao deste jogo: item coletado some, item de outro dono fica esmaecido, e a chave
  // vale para todos enquanto os demais poderes sao por jogador. As tres moram aqui agora.
  getItemSprites: () => getCoinSprites(),
  itemVisibleTo: (j, _i) => !coins[j]?.taken, // `_i`: o item sumir é por ITEM, não por jogador
  itemOwnedBy: (j, i) => coins[j]?.owner === i,
  powerupVisibleTo: (pu, i) => !puTaken(pu, i),
  rm, WORLD_PX_W: ()=>WORLD_PX_W, WORLD_PX_H: ()=>WORLD_PX_H,
  caneOn, updateParallax,
  drawElevators: ()=>drawElevators(elevLayer),
  markSeen, redrawMinimapIfDirty, drawMinimapPlayer,
  applySharedTextures: (viz)=>applySharedTextures(viz),
  renderVpOverlay, playerVizTex,
  updateGameHud: ()=>updateGameHud(),
  playerTextures: ()=>({ idle:TEX_IDLE, walk:TEX_WALK, run:TEX_RUN, jumpUp:TEX_JUMP_UP, jumpDown:TEX_JUMP_DOWN,
    climb:TEX_CLIMB, fly:TEX_FLY, clingWall:TEX_CLING_WALL, clingCeil:TEX_CLING_CEIL,
    swim:TEX_SWIM, swimIdle:TEX_SWIMIDLE, flavors:FLAVORS }),
  held,
});
function draw(){ drawApi.drawFrame(); }

/* ===================== quiz -> game/quiz.ts (B3) =====================
   As 29 funcoes do desafio moram no modulo, em tres camadas: geracao (pura, so RNG), apresentacao
   (string->string) e efeito. Aqui ficam so os ENVOLUCROS — declaracao de funcao, portanto icados, para que
   os chamadores de cima (update, keydown, o gancho do gamepad, restartGame, applyLetra, window.__incl) nao mudem.
   respawnFigure NAO foi junto: apesar de colada ao bloco e chamada so pelo quiz, ela re-sorteia a posicao
   da moeda — e do slice de moedas, e entra no quiz por injecao. */
function openQuiz(pl: Parameters<typeof quizApi.openQuiz>[0],coinIndex: number,shapeId: Parameters<typeof quizApi.openQuiz>[2]){ quizApi.openQuiz(pl,coinIndex,shapeId); }
function openSilabas(pl: Parameters<typeof quizApi.openSilabas>[0],coinIndex: number,letter: Parameters<typeof quizApi.openSilabas>[2]){ quizApi.openSilabas(pl,coinIndex,letter); }
function renderQuiz(pl: Parameters<typeof quizApi.renderQuiz>[0]){ quizApi.renderQuiz(pl); }
function closeQuiz(pl: Parameters<typeof quizApi.closeQuiz>[0]){ quizApi.closeQuiz(pl); }
// A INTENCAO chega da engine; QUEM DECIDE o que ela significa e este jogo (ADR-0033). A grade de tres
// colunas e o desvio de Braille moravam dentro do `input/keydown` e do `input/gamepad`, em duas COPIAS —
// que e a pior forma de ter uma regra. Agora ela existe uma vez, aqui, do lado de quem e dono do desafio.
function modalInput(i: number, intent: ModalIntent) {
  const pl = jogadores()[i];
  if (!pl) return; // a guarda que vivia no input/keydown: quem resolve o índice é quem o valida
  if (pl.quiz && pl.quiz.kind === 'braille') {   // cego: cima DITA a cela, confirmar responde. Nada mais anda.
    if (intent === 'up') announceBraille(pl);
    else if (intent === 'confirm') quizConfirm(pl);
    return;
  }
  if (intent === 'left') quizMove(pl, -1);
  else if (intent === 'right') quizMove(pl, 1);
  else if (intent === 'up') quizMove(pl, -3);    // a GRADE e de 3 colunas — e e deste jogo
  else if (intent === 'down') quizMove(pl, 3);
  else if (intent === 'confirm') quizConfirm(pl);
  else if (intent === 'erase') quizErase(pl);
}
const temModal = (i: number) => !!(jogadores()[i] && jogadores()[i].quiz);
function quizMove(pl: Parameters<typeof quizApi.quizMove>[0],d: Parameters<typeof quizApi.quizMove>[1]){ quizApi.quizMove(pl,d); }
function quizConfirm(pl: Parameters<typeof quizApi.quizConfirm>[0]){ quizApi.quizConfirm(pl); }
function quizErase(pl: Parameters<typeof quizApi.quizErase>[0]){ quizApi.quizErase(pl); }
function announceBraille(pl: Parameters<typeof quizApi.announceBraille>[0]){ quizApi.announceBraille(pl); }
function respawnFigure(i: number){
  const occ=new Set(); coins.forEach((c,j)=>{ if(j!==i)occ.add(c.x+','+c.y); });
  for(const cand of shuffle(findCoinCandidates())){ const x=cand.tx*TILE+3,y=cand.ty*TILE+3;
    if(!occ.has(x+','+y)){ coins[i].x=x;coins[i].y=y;coins[i].taken=false; // dono (owner) preservado
      const s=getCoinSprites()[i]; s.x=(MODE()==='somasub')?x-3:x; s.y=(MODE()==='somasub')?y-3:y; s.visible=true; return; } }
}

/* ===================== vitória ===================== */
/* ===================== rodada -> game/session.ts (C2) =====================
   updateHud/win/restartGame, setMode, o numero de telas (setNumPlayers/fitsN/isMobile/activateScreens), a vida
   de UM jogador (resetPlayerState/respawnPlayer/joinPlayer), o abandono (releaseKey/quitGame) e o BLOCO DE
   COLETA que morava dentro do stepPlayer moram no modulo. Aqui ficam so os ENVOLUCROS — declaracao de funcao,
   portanto icados, porque os chamadores estao ACIMA: initPhysics captura `updateHud`, o keydown de Alt+1..4
   chama `activateScreens`, update() chama `respawnPlayer` e initActivitiesMenu captura isMobile/fitsN/
   setNumPlayers/restartGame. resetPlayerState e releaseKey NAO ganham envolucro: fora do modulo nao tinham
   chamador nenhum. MODE_LABELS/MODES desceram junto e voltam por import: eram `const` declarados ABAIXO deste
   ponto, e passa-los por valor cairia em TDZ no boot.
   O ctx segue a regra da casa: o que o main.js REATRIBUI (MODE, collected, ended, powerups, gate, gateOpen,
   pauseActor, ownerColors: settingsStore.ownerColors, captionsOn: settingsStore.captionsOn, player) entra por GETTER/SETTER; PCOLOR, darkRegions e os callbacks
   estaveis entram por valor. `reapplyVizAll` e `const` declarado ABAIXO (viz-setters), por isso vem embrulhado
   numa seta — passado direto, cairia em TDZ e derrubaria o boot. */
const sessionApi = initSession({
  t,
  getPlayers: () => players, getNumPlayers: () => rodada.numPlayers, setNumPlayers: (n) => rodada.setNumPlayers(n),
  $, librasReserve: ()=>0, // o intérprete NÃO empurra mais a tela (ver ui/vlibras + ui/layout); fica p/ o overlay sob demanda
  isCoarsePointer: ()=>{ try{ return matchMedia('(pointer:coarse)').matches && matchMedia('(hover:none)').matches; }catch(e){ return 'ontouchstart' in window; } },
  getMode: ()=>MODE(), // sem `setModeValue`: o MODE deriva de `activity` e não tem caminho de escrita (ADR-0040)
  setEnded: (v) => rodada.setEnded(v),
  getPowerups: ()=>rodada.powerups, getGate: ()=>rodada.gate, isGateOpen: ()=>rodada.gateOpen,
  setGateOpen: (v) => rodada.setGateOpen(v),
  getPauseActor: ()=>rodada.pauseActor, ownerColors: ()=>settingsStore.ownerColors, captionsOn: ()=>settingsStore.captionsOn,
  // `setPlayerRef` SAIU: o `let player` que ele reatribuía era sempre `players[0]`, e `players[0]` não
  // muda de identidade — nem quando o array cresce nem quando encolhe (n ≥ 1 sempre). A dança de
  // referência vinha do monólito e não movia nada. Agora é derivado, como o MODE (ADR-0040).
  PCOLOR, darkRegions, getPlayerRef: ()=>jogadores()[0]!,
  srSay, srAlert, narrate: (t)=>tts.narrate(t),
  sfx: (n)=>earcons.sfx(n), doorSound: (m)=>earcons.doorSound(m), playVictory: ()=>jingles.playVictory(),
  showCaption,
  burstSparkle, addShake, addHitstop, rnd,
  POWER_MSG,
  coinPools: ()=>coinPools(), setupExtras, rebuildExtras, resetMinimap,
  aoReiniciarRodada: ()=>reciclagem.montar(), // ADR-0049 §7: a volta recomeça e o lixo volta ao chão
  // A PONTE ENTRE DUAS VISTAS QUE NÃO SE FALAM. `game/session` declara o que ELE lê do jogador
  // (`SessionPlayer`) e `game/quiz` declara o que ELE lê (`QuizPlayer`). O objeto que atravessa é o mesmo
  // `GamePlayer`, e as duas são DESCRIÇÕES PARCIAIS dele — o `session` aqui só REPASSA um jogador que não
  // interpreta, e declarar uma vista para um valor repassado é o que produz o conflito.
  //
  // ⚠️ O `as` NÃO CONSERTA O ERRO, e está aqui de propósito: ele troca um erro que ENGANA ("SessionPlayer
  // não é QuizPlayer", que soa como vista mal escolhida) por um que APONTA A CAUSA ("GamePlayer não é
  // QuizPlayer, porque `PlayerQuiz` não é `Quiz`"). O defeito real é que `game/entity` redescreve como
  // `PlayerQuiz` o que `game/quiz` já possui como união `Quiz` — issue #79, mesmo formato do #78.
  openQuiz: (pl,i,sh)=>openQuiz(pl as GamePlayer,i,sh),
  openSilabas: (pl,i,l)=>openSilabas(pl as GamePlayer,i,l),
  closeQuiz: (pl)=>closeQuiz(pl as GamePlayer),
  loadPlayerA11y, assignControls, ensureSprites, configureRender,
  reapplyVizAll: ()=>reapplyVizAll(), layout, hideTouchControls, updateGameHud,
  voltarAoTitulo: () => setPhase('title'), entrarNoJogo: () => setPhase('playing'),
  titleShowMain: () => titleUI.show('tm-main'), // qual submenu é decisão da casca, não do jogo
});
function updateHud(){ sessionApi.updateHud(); }
// Os invólucros que só REPASSAM tomam o tipo do delegado. O passe mecânico tinha posto `Player` neles pela
// tabela de nomes, enquanto os OUTROS parâmetros dos mesmos invólucros já usavam `Parameters<>` — a
// inconsistência era minha, e é ela que produzia metade dos conflitos `XPlayer` ↔ `Player`.
function win(pl: Parameters<typeof sessionApi.win>[0]){ sessionApi.win(pl); }
function restartGame(){ sessionApi.restartGame(); }
function setNumPlayers(n: number){ sessionApi.setNumPlayers(n); }
function fitsN(n: number){ return sessionApi.fitsN(n); }
function isMobile(){ return sessionApi.isMobile(); }
function activateScreens(n: number){ sessionApi.activateScreens(n); }
function respawnPlayer(k: Parameters<typeof sessionApi.respawnPlayer>[0]){ sessionApi.respawnPlayer(k); }
function joinPlayer(padIdx: Parameters<typeof sessionApi.joinPlayer>[0]){ return sessionApi.joinPlayer(padIdx); }
function quitGame(){ sessionApi.quitGame(); }
$('#btn-again')?.addEventListener('click',()=>{ restartGame(); $('#game-region')?.focus(); });
/* ===================== ATIVIDADES (menu inicial) -> ui/activities-menu.ts =====================
   O menu do titulo, a escolha de atividade e o inicio da partida moram no modulo. Fica aqui so a
   composicao: MODE entra como ATRIBUICAO NUA (setMode() tambem reinicia a rodada e move o foco, que
   nao e o que escolher atividade faz), e CENARIOS entra reduzido a {id,nome} — o resto e dado de
   textura de parallax e nao tem o que fazer dentro de um menu. */
if(!isValidActivityId(ACTIVITY)) setActivityValue(DEFAULT_ACTIVITY_ID); // valida o valor inicial contra o catalogo
const activitiesMenu = initActivitiesMenu({
  t, store, menuIndexOn: () => settingsStore.menuIndexOn,
  gameId: JOGO, // ADR-0080: quem sabe o id do jogo e o jogo; a engine so o recebe
  getPlayers: () => players, getNumPlayers: () => rodada.numPlayers,
  $, getActiveElement: () => document.activeElement, srSay, srAlert,
  titleShow: titleUI.show,
  cenarios: Object.keys(CENARIOS).map(c => ({ id: c, nome: CENARIOS[c].nome })),
  setCenario,
  getActivityId: () => ACTIVITY, setActivityId: setActivityValue, // estado do JOGO, entregue pela raiz
  setQuizLevel, isMobile, fitsN, setNumPlayers, restartGame, setPhase, hideTips,
  enterFullscreen: () => { try{ const el=document.documentElement, rf=el.requestFullscreen||el.webkitRequestFullscreen; if(rf)rf.call(el); }catch(e){} },
});
// Só o que a raiz de fato usa. `startActivity`, `reallyStart`, `titleButtons`, `buildTitleMenus` e
// `menuItems` saíram em 2026-08-26: eram desestruturados e nunca lidos — resto da migração para
// `ui/activities-menu`, que hoje os chama por dentro. `noUnusedLocals` os encontrou.
const { actCat, setActivity, navTitle, tabSel, fracNot } = activitiesMenu;
// B3: o desafio educativo. So entra aqui o que um import nao alcanca: as `let` do main.js, as instancias
// criadas no boot (audio/HUD/menu) e os efeitos de outros slices (moeda, HUD, vitoria, toque). Os
// callbacks sao arrows de proposito: respawnFigure, win e updateHud nascem mais abaixo.
// A VOZ DO LETRAMENTO: o `gameSay` já não segura nada e pede a voz e a LÍNGUA da palavra (engine 11, nota DS).
// As palavras dos desafios deste jogo são pt-BR — a língua da palavra, não a da página.
const vozDoLetramento: GameVoice = { synth: () => window.speechSynthesis ?? null,
  utterance: (tx) => new SpeechSynthesisUtterance(tx), soundOn: () => audio.soundOn, volume: () => audio.volume };
const quizApi = initQuiz({
  t, rng,
  $, getScreen: (i) => seatHud.getScreen(i),
  getNumPlayers: () => rodada.numPlayers,
  disp, isModoCego: () => settingsStore.blindMode,
  actCat, tabSel, fracNot, QL_NAME,
  srSay, srAlert, gameSay: (tx) => gameSay(vozDoLetramento, tx, 'pt-BR'), narrate: (t) => tts.narrate(t),
  sfx: (n) => earcons.sfx(n), playPuzzleSolved: () => jingles.playPuzzleSolved(),
  burstSparkle,
  hideTouchControls: () => hideTouchControls(),
  updateHud: () => updateHud(), win: (pl) => win(pl),
  respawnFigure: (i) => respawnFigure(i),
});
// fmtFrac/fracGraphic/fracSpeak/speakChoice + _pieUnit/_sqGrid/FRAC_GFX extraidos p/ game/fractions.js (Estagio 4).
// fmtFrac/fracGraphic/fracSpeak/speakChoice + _pieUnit/_sqGrid/FRAC_GFX extraídos p/ game/fractions.js (Estágio 4).
// O `#opt-mode` SAIU (ADR-0040). Ele ciclava o MODE sem tocar em `activity` — era o segundo caminho de
// escrita, e o que a issue #54 reproduziu. Com o MODE derivado ele não teria o que ciclar. Era superfície
// de depuração, dentro de `#topbar-tools hidden`, revelada só por `?debug=true`; quem troca de atividade é
// o menu de atividades, que grava `activity` e reinicia a rodada — e o MODE segue sozinho.
// O GAMEPAD É DA ENGINE (ADR-0224): o `createGame` monta o transporte, lê os pads no próprio quadro e conduz o
// assistente de mapeamento. O `initGamepad` desta raiz e o `pollPads` do quadro saíram — dois leitores do mesmo pad
// dariam duas arestas por botão. O que só este jogo sabe (título, demonstração, desafio, entrar, renascer, o selo e o
// desenho do assistente) vai pelo gancho `gamepad`, ligado em `ligarGanchos` no fim desta fábrica.
//
// A DEMONSTRAÇÃO DO ASSISTENTE (`ui/pad-wizard-demo`, nota CD): o menino a fazer o que cada posição faz. A caixa
// `#padwiz-demo` saiu do `index.html` com o resto do painel (o `#padwiz` é montado pela engine com a marcação dela),
// então ela nasce aqui, dentro do cartão da engine, na primeira vez que o assistente pede um passo.
const demoDoAssistente = createPadWizardDemo({ $, spriteBase: SPR });

// A BARRA DE ACESSIBILIDADE RECOLHE-SE EM JOGO (pedido do Dev, 03/10). 🔴 PALIATIVO: a barra é da engine e o
// comportamento serve a todos os jogos — ver o cabeçalho de `ui/barra-recolhivel`, que diz o que apagar daqui
// quando a engine o absorver. O `mundoRodando` é a regra inteira: fora do mundo a correr a barra fica.
/*
 * O QUE O CARTUCHO FAZ COM UM COMANDO DA ENGINE (ADR-0111) — uma função com nome, e não um literal no
 * `ligarGanchos`, porque a sonda `__incl.cmdInjeta` tem de atravessar ESTE caminho e não outro.
 * 📏 Medido em 03/10: a sonda chamava o registo diretamente e saltava a marcação da aresta, então media um
 * caminho que o gesto nunca toma — e deu «não marca» sobre código que marcava. Uma sonda que não passa pela
 * porta real mede outra coisa.
 */
function receberComando(comando: VirtualCommand): void {
  const mudou = comandosVirtuais.receber(comando);
  if (!mudou || !comando.pressed) return;
  // A ARESTA: a alternância de marcha conta TOQUES, e é aqui que o toque existe (ver `core/comandos-virtuais`).
  const campo = ARESTA_DA_ACAO[comando.action];
  const jogador = players[comando.player] as unknown as Record<string, unknown> | undefined;
  if (campo && jogador) jogador[campo] = true;
  /*
   * 🔴 O R2 ADIANTA O CANTO DO MAPA (pedido do Dev, 03/10). Aqui e não na física, por dois motivos:
   *
   *  · é UM TOQUE e não uma tecla segurada — a física lê `held()` a cada quadro, e o mapa saltaria três
   *    cantos por segundo enquanto o dedo estivesse no gatilho. A aresta existe exatamente neste ponto;
   *  · e é desenho, não mundo. A física não sabe que existe um minimapa, e é bom que continue sem saber.
   *
   * 📌 QUALQUER ASSENTO SERVE porque o mapa é UM só, partilhado pela tela toda — e em multijogador ele nem
   * se desenha (`setMinimapVisible`), de modo que não há canto para dois pedirem ao mesmo tempo.
   */
  if (comando.action === 'rightTrigger') proximoCantoDoMinimapa();
}

/*
 * O PAD DE TOQUE NASCE SÓLIDO E ESMAECE AOS 5 s (pedido do Dev, 03/10) — ver `ui/pad-opaco` para a regra
 * inteira, incluindo a parte que vive no CSS: nos três modos de alto contraste ele não esmaece.
 */
const padOpaco = criarPadOpaco({ $, signal: CANCELAR.signal });

const barraRecolhivel = createBarraRecolhivel({
  $, signal: CANCELAR.signal, mundoRodando: () => fatosDaCena().worldRunning,
});
function caixaDaDemo(): void {
  if ($('#padwiz-demo')) return;
  const cartao = $('#padwiz .overlay__card') ?? $('#padwiz');
  if (!cartao) return; // sem o painel da engine não há onde desenhar — e o assistente fala sozinho, que é o padrão dele
  const caixa = doc.createElement('div'); caixa.id = 'padwiz-demo'; caixa.setAttribute('aria-hidden', 'true');
  const fx = doc.createElement('span'); fx.id = 'padwiz-demo-fx';
  const img = doc.createElement('img'); img.id = 'padwiz-demo-img'; img.alt = '';
  caixa.append(fx, img);
  // antes da frase do assistente, como estava no `index.html`: primeiro o que se vê, depois o que se pede
  const frase = cartao.querySelector('#padwiz-prompt');
  if (frase) cartao.insertBefore(caixa, frase); else cartao.prepend(caixa);
}
// Desconectar NÃO abandona o jogo: o teclado é sempre fallback. Só solta a associação do pad.
addEventListener('gamepaddisconnected',(e)=>{ try{ const owner=players.findIndex(p=>p.pad===e.gamepad.index);
  if(owner>=0){ players[owner].pad=-1; srAlert(t('sr.pad.disconnected',{n:owner+1})); }
  delete input.padCur[e.gamepad.index]; }catch(err){} }, SOLTAR);

const optTelasBtn=$('#opt-telas'); // botão único: cicla 1→2→3→4 telas
// Pelo activateScreens, e nao pelo setNumPlayers cru: o botao e o Alt+N sao o MESMO pedido por dois caminhos,
// e so um deles checava se as telas cabem. Pelo botao dava para pedir 2 telas numa janela pequena e o canvas
// saia pela borda, cortado. Vem junto a recusa no celular (1 tela, decisao registrada) e o crescer sem
// reiniciar a rodada — quem entra, entra no jogo em andamento. O anuncio agora e do proprio activateScreens.
if(optTelasBtn)optTelasBtn.addEventListener('click',()=>{ activateScreens((rodada.numPlayers%4)+1); });
// Botão único de LETRAS: ABC (padrão) → abc → Braille
// L3: nível do quiz de alfabetização (1..5), persistido; rótulo vivo nos menus de pausa
function setQuizLevel(n: number, announce: boolean){ setQuizLevelValue(n); // core/state.js: clampa 1..5, persiste e emite; a reflexão de UI fica aqui
  // `QL_NAME` atravessa por PARAMETRO e NAO vira chave: sao os niveis da psicogenese de Ferreiro, e o pilar 3
  // do ADR-0010 diz que curriculo de alfabetizacao nao se traduz — reescreve-se por idioma. A moldura traduz.
  document.querySelectorAll('.pm-nivel').forEach(x=>{ x.textContent=t('pause.level',{n:quizLevel,v:QL_NAME[quizLevel]}); });
  if(announce) srSay(t('sr.quiz.levelSet',{n:quizLevel,v:QL_NAME[quizLevel]})); } // QL_NAME é CURRÍCULO: atravessa sem traduzir
// A TABELA `LETRA` E O CICLO MORRERAM (ADR-0028). Eram duas posições — ABC/abc — num botão da pausa, e a
// caixa da letra virou UMA escolha dentro do menu de Comunicação Aumentada e Alternativa, ao lado dos
// conjuntos de pictogramas. Um ciclo de duas posições não comporta nove opções, e o motivo de o menu existir
// é que para algumas crianças o pictograma É a escrita.
//
// `applyLetra` fica, sem a parte que era do ciclo: ela REFLETE a escolha no jogo (re-render do quiz, moedas
// do modo sílabas, rótulo do atalho). Quem MUDA agora é o painel; quem ANUNCIA também é ele, com o nome do
// conjunto escolhido — daí o `announce` sair daqui.
function applyLetra(){
  // O DOM (menus, HUD, legendas) via CSS; a canvas via `disp()`, que a PIXI usa ao desenhar. São dois caminhos
  // de texto no jogo, e o botão só ligava um deles — daí "letras maiúsculas" não alcançar os menus.
  document.documentElement.dataset.letras = settingsStore.letterCase;
  if(typeof rebuildCoins==='function' && MODE()==='silabas') rebuildCoins();
  jogadores().forEach(p=>{ if(p.quiz)renderQuiz(p); }); // L3: re-renderiza o quiz de quem estiver num
}
applyLetra(); // estado inicial: reflete a caixa persistida no atributo que o CSS lê
/*
 * 🔴 OS PAINÉIS SÃO DA ENGINE, E ESTA RAIZ SÓ REAGE (ADR-0253, ADR-0151).
 *
 * Até aqui esta raiz montava À MÃO o que o `createGame` monta sozinho: o painel de ajustes, os sete painéis
 * (visual, empatia, tipografia, áudio, controles, movimento, CAA), a barra de ícones, a navegação de menus, o
 * pad e o gamepad. Com o shell a chamar `createGame`, ficar com as duas cópias seriam DUAS barras e dois de
 * cada painel na mesma página — a verificação do plano diz «uma barra e um cartão de pausa, não dois».
 *
 * O que FICA é o que só este jogo sabe fazer quando um ajuste muda: refazer as moedas na cor do dono,
 * refazer a geometria do nível no modo cadeirante, re-renderizar o quiz na caixa de letra nova. Era o corpo
 * dos `set*` que os painéis daqui chamavam; agora o painel da engine escreve na loja e esta raiz ESCUTA a
 * loja (`settings.on`). A guarda de igualdade continua do lado da loja: ela só avisa quando o valor muda.
 *
 * ⚠️ DOIS PAINÉIS QUE NÃO VOLTAM, e por decisão registrada, não por esquecimento: o motor velho
 * (`initSettingsMotor`) — o ADR-0151 tirou dele o Modo Fácil («dificuldade é opção do jogo») e as duas
 * travas (que moram no ☝️), e a engine monta o painel novo `#motora` —; e o de CAA, que perdeu a porta (a
 * caixa de letra anda com o 11º botão da barra, o ciclo de COMUNICAÇÃO).
 */
ouvir('letterCase', () => applyLetra());

/* Modos de visualização: Normal + Alto contraste + simulações/correções. A FABRICA (parallaxTexFor,
   treeTexFor, playerVizTex, pixiFilterFor, o overlay de baixa visao e as matrizes CVD) migrou para
   render/viewports.ts (B2); a POLITICA ja estava em render/viz-setters.ts (Onda A). */
// (`vpDot` saiu em 2026-08-26: era um `PIXI.Graphics` construído no boot e nunca usado — as bolinhas de
//  viewport são criadas por `render/screen-pipeline`. Objeto alocado que ninguém desenha.)
const lvOverlaySpr=new PIXI.Sprite(PIXI.Texture.EMPTY);
// _playerDirect/playerVizTex migraram para render/viewports.ts (B2).
/* ===================== MODOS DE VISAO ACESSIVEL -> render/viz-setters.ts =====================
   Saiu a POLITICA (qual modo vale onde); a FABRICA (como um modo vira pixel) ja mora em
   render/viewports.ts, extraida no B2. _lastSharedViz fica: nao e cache de visao, e o registro
   de qual modo o pipeline estatico aplicou por ultimo, escrito de sete lugares.
   Init AQUI porque empathy/visual recebem renderVizGroup/setPlayerViz POR REFERENCIA logo abaixo, e
   declaracao icada virou const. Tudo no ctx e arrow preguicosa: nada e avaliado no init. */
const viz = initVizSetters({
  $, body: document.body, srSay, t, store, hc,
  // `applyCssFilter` no lugar de `app`: o `view.style` do PixiJS e `ICanvasStyle`, que nem TEM `filter`
  // (ele existe para a OffscreenCanvas, onde nao ha CSS). Em producao o `view` e uma canvas do DOM de
  // verdade — e saber disso e trabalho da raiz, nao do `viz-setters`.
  // DUAS SUPERFÍCIES, e é a raiz que sabe quais são: a canvas (o mundo) e o `#dom-layer` (os menus).
  // MELHORIA cai nas duas; EMPATIA só no mundo — e o menu, que é o instrumento de sair da simulação, fica
  // legível. Ver `AlcanceDoFiltro` em `render/port` e a issue #82.
  applyCssFilter: (css, alcance) => {
    const v = app.view as unknown as HTMLCanvasElement | null;
    if (v && v.style) v.style.filter = css;
    const dom = $<HTMLElement>('#dom-layer');
    if (dom) dom.style.filter = alcance === 'mundo-e-menus' ? css : '';
  },
  applyHighContrastToDom: (ligado) => { const d = $<HTMLElement>('#dom-layer'); if (d) d.classList.toggle('hc', ligado); },
  camera, worldSprite, parallaxLayers, decoSprites,
  getVpSpr: () => vpSpr, getVpDots: () => vpDots,
  getItemSprites: getCoinSprites, itemTexId: 'coin', // item 19: o NOME dos itens e do jogo, nao do render
  getPowerups: () => rodada.powerups,
  getPlayers: () => players, getNumPlayers: () => rodada.numPlayers,
  getSelVizPlayer: () => rodada.selVizPlayer, setSelVizPlayer: (i) => rodada.setSelVizPlayer(i),
  getSharedViz: () => _lastSharedViz, setSharedViz: (m) => { _lastSharedViz = m; },
  invalidateSharedViz: () => { _lastSharedViz = null; },
  parallaxTexFor, treeTexFor, playerVizTex, pixiFilterFor,
  clearPlayerDirectCache: vp.clearPlayerDirectCache,
  // O cache de power-up recolorido é do `render/textures` DESTE jogo; o módulo pede para o invalidar ao re-assar.
  pupTexFor, resetPupTexCache,
  lqFilter: () => engine.lq.filter(),
  setFrontDim: (on) => traffic.setFrontDim(on),
  rebuildExtras: () => rebuildExtras(), rebuildCoins: () => rebuildCoins(),
  // Os dois escritores de estado eram imports de `core/state`; agora são a loja de ajustes da engine.
  setBlindMode: (on) => setModoCego(on), setVizMode: (m) => settingsStore.setVizModeValue(m),
  hideTouchControls: (r) => hideTouchControls(r),
  reflectVizButtons: () => reflectVizButtons(),
  // Os painéis visual e de empatia são da engine e redesenham-se sozinhos: aqui não há o que redesenhar.
  renderVisualPanel: () => {}, renderEmpathyPanel: () => {},
});
// `updateVizIndicator` saiu: desestruturado e nunca lido desde que migrou para `render/viz-setters`.
// `renderVizGroup`/`renderVisualAxes` também: desenhavam os painéis visual e de empatia desta raiz, que são da
// engine agora.
const { applySharedTextures, updateVpDots, applyVpFilters, setPlayerViz,
        applyVizGlobal, reapplyVizAll, setPlayerTheme, setPlayerCorrection } = viz;
const _rebakeDirect = viz.rebakeDirect;
// renderVpOverlay migrou para render/viewports.ts (B2).
// updateVpDots/applyVpFilters migraram para render/viz-setters.ts (Onda A).
// O ESTADO mora em core/state (setModoCegoValue: grava, persiste, avisa). Aqui ficam só os EFEITOS — refazer
// os extras do nível, refletir o painel, anunciar —, que são reação e pertencem ao composition root. A guarda
// de igualdade também está no setter: se o valor não mudou, ele não avisa e nada disto roda.
// O MODO CEGO: o estado é da loja e o anúncio é do painel da engine; daqui sai só o efeito no NÍVEL — os
// extras (bengala, guarda de beirada) que o modo liga e desliga. `viz-setters` pede um escritor quando a
// simulação de cegueira o liga, e escreve na MESMA loja: a reação abaixo cobre os dois caminhos.
const setModoCego = (on: boolean): void => settingsStore.setBlindModeValue(on);
ouvir('blindMode', () => setupExtras());
// setPlayerViz/applyVizGlobal migraram para render/viz-setters.ts (Onda A).
// updateVizIndicator/reapplyVizAll migraram para render/viz-setters.ts (Onda A).
// Simulações de empatia: o predicado mora em render/viz-modes (simulatesDisability), fonte única. A cópia
// local respondia pelo `kind` e contava as 3 correções de daltonismo como simulação (#60); `VIZ_SIM`, derivada
// dela, era declarada e nunca lida — a terceira cópia do mesmo erro, e morta.
// renderVizGroup migrou para render/viz-setters.ts (Onda A).
// As cores do dono e a paleta segura para daltonismo: o painel visual da engine escreve, e o jogo refaz o
// que pinta com elas. O anúncio era desta raiz e passou a ser do painel, que é quem sabe que mudou.
ouvir('ownerColors', () => rebuildCoins());
ouvir('cbSafe', (on) => {
  const src=on?PCOLOR_CB:PCOLOR_DEF; PCOLOR.length=0; src.forEach(c=>PCOLOR.push(c)); // troca IN-PLACE (todos referenciam PCOLOR)
  rebuildCoins(); ensureSprites(); });
// Os dois contornos (1º plano personagem/itens · 2º plano perímetro de plataforma/água/lava): o painel da
// engine escreve o nível, e o jogo re-assa as texturas de renderização direta que os desenham.
ouvir('hcOutlineFg', () => _rebakeDirect());
ouvir('hcOutlineBg', () => _rebakeDirect());
// ⚠️ AS CORES POR PAPEL do alto contraste não têm evento na loja (`GameEvent` não as lista): eram escritas
// por `setRoleColor`, que o painel DESTA raiz chamava. Com o painel da engine, quem as escreve e como o jogo
// fica a saber está por medir no navegador — registado no plano, e não adivinhado aqui.
// `reflectVizButtons` acendia `#opt-visual`/`#opt-empathy`, botões da barra que esta raiz montava. A barra é
// da engine e reflete-se sozinha; o `viz-setters` ainda pede o gancho, e a resposta honesta é nada a fazer.
const reflectVizButtons = (): void => {};
// "tela = canvas": reparenta os diálogos de a11y para dentro do #game-region (ficam presos ao canvas)
// e empilha o último aberto por cima (z crescente). frontOverlay é chamado em cada open*.
// _ovZ/fillExplain/frontOverlay migraram para ui/settings-panel.ts (B4).
(function inCanvasMenus(){ const gr=document.getElementById('game-region'); if(!gr)return;
  // NENHUMA tela fora do canvas (decisão definitiva do José — splash incluso). A regra agora é ESTRUTURAL:
  // todo `.overlay` que ainda esteja fora do #game-region entra. Era uma lista de 11 ids escrita à mão, e ela
  // já tinha esquecido DOIS — o menu de CAA, que por isso abria do tamanho da janela em vez do tamanho do
  // jogo, e o #win-overlay, que nunca esteve na lista. Uma lista que precisa ser lembrada esquece em silêncio:
  // não há erro, só uma tela no lugar errado, e ninguém liga uma coisa à outra.
  // O alvo é a CAMADA DOM, não o `#game-region`: é ela que recebe o filtro de acessibilidade (issue #82), e
  // um modal que ficasse fora dela seria o único pedaço de menu sem correção de daltonismo. A regra segue
  // ESTRUTURAL — `.overlay`, não uma lista de ids —, que é o que impediu os dois esquecimentos de antes.
  const camada=document.getElementById('dom-layer')||gr;
  document.querySelectorAll('.overlay').forEach(el=>{ if(!camada.contains(el))camada.appendChild(el); });
  // Botões puramente on/off viram TOGGLE (switch) — o texto "Ligado/Desligado" fica oculto (font-size:0).
  ['opt-facil','opt-altmove','opt-togglerun','opt-hearing','opt-onebtn','opt-settingsStore.wheelchair','opt-modocego','opt-tts','audio-master','opt-captions','motion-master'].forEach(id=>{ const b=document.getElementById(id); if(b)b.classList.add('switch'); });
})();
// O MODO CADEIRANTE: a loja é da engine, a REAÇÃO é deste jogo, e ela é grande — refaz a geometria do nível
// inteiro. Só voo/super-corrida; moedas no chão; escada/trampolim viram elevador; rampas+pontes; lava vira chão.
ouvir('wheelchair', (on) => {
  players.forEach(p=>{ if(on && p.activePower!=='fly' && p.activePower!=='turbo') p.activePower='off'; if(on) p.owned=p.owned.filter(k=>k==='fly'||k==='turbo'); showPower(p); });
  setupExtras(); rebuildCoins(); buildWcGeom(); buildRamps(); buildElevators(); });
// bolinha indicadora: duplo toque/clique → volta às cores padrão (em cegueira é a única saída visível)
(function vizIndicator(){ const el=$('#viz-indicator'); if(!el)return; let last=-9999;
  // `agora` e não `t`: o local chamava-se `t` e SOMBREAVA o tradutor — `t('sr.visual...')` virou "chamar um
  // número". Quinta vez que este nome de uma letra morde neste arquivo; aqui doeria mais que nas outras,
  // porque este duplo-toque é a ÚNICA saída visível de quem ligou a simulação de cegueira.
  el.addEventListener('pointerdown',(e)=>{ e.preventDefault(); const agora=e.timeStamp||0; if(agora-last<450){ setPlayerViz(0,'normal'); last=-9999; srSay(t('sr.visual.defaultColors')); } else last=agora; }); })();
/*
 * A TRAVA DO BOTÃO DE CORRER LIGA-SE SOZINHA NO TOQUE — e continua a ser deste jogo, porque nada na engine
 * escreve `toggleRun`. O pad virtual é da engine (`createGame` monta o `initTouch`), e ela não avisa o
 * cartucho quando o mostra; então a pergunta passou a ser a do APARELHO: é um ecrã táctil? — no arranque e
 * no primeiro toque na região, que é quando um portátil com ecrã táctil passa a ser jogado com o dedo.
 *
 * 🔴 É LOAD-BEARING, e a razão é a mesma de antes: a rota padrão pede três posições seguradas (direção,
 * correr, pular) e o toque segura duas. Esta trava põe a criança de telemóvel em duas sem lhe pedir que
 * descubra o painel motor primeiro. A trava de MARCHA (`toggleMove`) é outra coisa, e é da engine (nota DU).
 *
 * O valor SALVO vence: quem a desligou de propósito não a vê voltar.
 */
function travaDeCorrerNoToque(): void {
  players.forEach((p,i)=>{ if(store.get(KEYS.toggleRunP(i))==null && !p.toggleRun) p.toggleRun=true; });
}
if (ehToque()) travaDeCorrerNoToque();
ctx.region.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') travaDeCorrerNoToque(); }, { ...SOLTAR, once: true });
loadPlayerA11y(players[0],0); // carrega viz/easy/alternância persistidos do jogador 1 (migra chaves antigas)
vizReady=true; applyVizGlobal(players[0].visual); // estado inicial (solo) — o EIXO, e já não a chave legada

// Botões abreviados: hover/foco DESCOMPACTA o número em letras (o "12" vira as 12 letras contando p/ baixo), suave;
// recomprime ao sair. Genérico: varre a barra (.mode-btn) E o menu de pausa (.pm-btn) casando A12e/S11e.
// ABBR_MID/attachAbbr migraram para ui/activities-menu.ts (Onda A). A VARREDURA abaixo fica onde
// esta: ela e sensivel a quando os .pm-btn existem.
document.querySelectorAll<HTMLElement>('.mode-btn, .pm-btn').forEach(attachAbbr); // `attachAbbr` lê `.title`/`.dataset`
// A LEGENDA SIM/NÃO DO CARTÃO (`renderPauseLegend`) saiu: escrevia no `.pause-legend` de cada pausa por tela, e o
// cartão é o da engine, que diz os botões na própria legenda de rodapé (ADR-0164 regra 3). Escrever no cartão dela
// seria um módulo a desenhar na tela de outro.

/* ===================== FPS ===================== */
let fpsAccum=0,fpsFrames=0,fpsMin=Infinity,fpsWarm=0;
function fpsTick(){ const fps=app.ticker.FPS; fpsWarm++; fpsAccum+=fps; fpsFrames++;
  if(fpsWarm>60&&fps<fpsMin)fpsMin=fps;
  // O HUD de FPS vive na barra de depuração (`?debug=true`). Ele existe no HTML de hoje, mas isto roda a
  // cada 30 quadros: um `?.` custa nada e tira o loop de dependeder de um elemento opcional.
  if(fpsFrames>=30){ const f=$('#hud-fps'); if(f)f.textContent=String(Math.round(fpsAccum/fpsFrames));
    const fm=$('#hud-fpsmin'); if(fm)fm.textContent=fpsMin===Infinity?'–':String(Math.round(fpsMin));
    fpsAccum=0;fpsFrames=0; }
}

/* ===================== loop ===================== */
// O QUADRO DESTE CARTUCHO. Era o corpo do `startLoop`; agora e' o `update(dt)` que a instancia devolve, e
// quem o chama e' o shell — ver a nota no topo da fabrica.
// O `pollPads` saiu do quadro: quem lê os pads é a engine, no quadro dela (`create-game.js:3955-3977`).
function quadro(dt: number): void { update(dt); draw();
  titleG.visible=fatosDaCena().titleScreen; if(titleG.visible)titleScene.draw(); // cena do título da v3 cobre o mundo
  attractCtl.titleIdleTick(titleG.visible); // attract após 60s parado no menu (José)
  setMinimapVisible(!titleG.visible&&rodada.numPlayers<=1); document.body.classList.toggle('at-title',titleG.visible); // HUD/minimapa não vazam no menu
  barraRecolhivel.tick(); // a barra de acessibilidade some aos 5s em jogo e volta no pico/foco (paliativo, ver o módulo)
  padOpaco.tick();        // o pad de toque nasce sólido e esmaece aos 5s, salvo em alto contraste
  fpsTick();
  if(fatosDaCena().worldRunning){ weather.updateWeather(); ambient.updateAmbient(); guide.updateGuide(); } } // F4: clima + ambiente + guia auditivo (só durante o jogo)
  // ⚠️ O 2 E O `aoFalhar` FALTAVAM AQUI: a chamada tinha DOIS argumentos (ADR-0054, issue #109). O laço já
  // parava quando um quadro lançava — isso o `core/loop` sempre fez —, mas parava EM SILÊNCIO. Tela congelada
  // é sintoma VISUAL: no modo cego, um jogo parado e um jogo pensando produzem a mesma coisa, e a criança
  // fica a esperar por um jogo que já morreu. O `2` é o `maxDt` que já era o padrão, e vai escrito porque um
  // argumento posicional omitido no meio é exatamente como o `aoFalhar` ficou de fora sem ninguém reparar.
// ⚠️ O `maxDt` E O `aoFalhar` SAIRAM COM O LACO, e nao foram perdidos: o ADR-0054 poe o aviso de queda no
// shell, que e' quem sabe que o laco parou. Um cartucho que rebenta tem de parar a si proprio sem parar a
// plataforma, e isso so quem corre o laco pode garantir.
window.__incl={app,get player(){return players[0];},players,get numPlayers(){return rodada.numPlayers;},setNumPlayers,activateScreens,fitsN,isMobile,update,get phase(){return cenas.fase();},get padPrev(){return input.padPrevAct;},get coins(){return coins;},get lixo(){return reciclagem.itens();},get placaX(){return reciclagem.placaX();},get barreiraDaPlaca(){return reciclagem.barreira();},get lixeiras(){return reciclagem.lixeiras();},get pontosDeComportamento(){return pontosDeComportamento;},get collected(){return players[0].collected;},get powerups(){return rodada.powerups;},get gateOpen(){return rodada.gateOpen;},get gate(){return rodada.gate;},get ended(){return rodada.ended;},restartGame,get hcMode(){return (VIZ_BY_KEY[settingsStore.vizMode]||{}).kind==='hcnew';} /* derivado de settingsStore.vizMode (D1); era `let` espelho */,setHC(v: boolean){setPlayerViz(0,v?'hc-direto':'normal');},get vizMode(){return players[0].viz;},applyViz(v: Parameters<typeof setPlayerViz>[1]){setPlayerViz(0,v);},setPlayerViz,VIZ_MODES,get footCount(){return audio.footCount;},get sonarCount(){return nav.sonarCount;},get guideCount(){return guide.guideCount;},get narrateCount(){return tts.narrateCount;},sonar:()=>nav.sonar(controlados()[0]!),setHearingLoss,darkRegions,decoLayer,get minimap(){return getMinimap();},parallaxLayers,PARALLAX,setCenario,get cenario(){return CENARIO;},
  get mmSeen(){return minimapSeenCount();},get MODE(){return MODE();},get letterCase(){return settingsStore.letterCase;},brailleText,tileAt,WORLD_W,WORLD_H,TUNE,
  JUICE,addShake,addHitstop,burstSparkle,puffDust,draw,get particles(){return getParticles();},get hitstopT(){return getHitstopT();},get shakeT(){return getShakeT();},get CRT(){return engine.crt.cfg;},applyCrt:()=>engine.crt.apply(),setLq,get lqT(){return getLqT();},
  // As cores por papel (`setRoleColor`/`resetRoleColors`) e a tipografia (`setGameFont`/`openTypo`/`fontKey`) saíram com
  // os painéis desta raiz; nenhum teste os lia. Os escritores de ajuste apontam para a loja da engine.
  setOwnerColors:(on: boolean)=>settingsStore.setOwnerColorsValue(on),setCbSafe:(on: boolean)=>settingsStore.setCbSafeValue(on),PCOLOR,HC_ROLE:hc.role,get ownerColors(){return settingsStore.ownerColors;},get cbSafe(){return settingsStore.cbSafe;},
  setQuizLevel,get quizLevel(){return quizLevel;},openSilabas,quizMove,quizConfirm,quizErase,get quiz(){return jogadores()[0].quiz;},INCL_VERSION,fmtFrac,fracGraphic,speakChoice,get fracNot(){return fracNot;},
  FONT_GROUPS,get mmSeen2(){return minimapSeenCount();},
  // O CONTROLADOR VIRTUAL, PELA JANELA (ADR-0111): quantas posições a engine entregou e estão seguradas, e a
  // pergunta por assento. É por aqui que se mede se um gesto, um olhar ou uma palavra chegou ao jogo.
  get cmdVirtuais(){return comandosVirtuais.tamanho();},cmdSegura:(i: number,a: string)=>comandosVirtuais.segura(i,a),
  // SONDA DO CAMINHO: injeta um comando como a engine o entrega, e responde o que cada degrau vê. Existe
  // porque o degrau que falha não se alcança de fora — nem com a câmera, que exige um gesto humano.
  cmdInjeta:(a: string,on: boolean,i=0)=>receberComando({action:a as Action,pressed:on,source:'gestos',player:i}),
  cmdDiag:(a: string)=>{const p0=players[0] as unknown as Parameters<typeof input.held>[0];
    return {assento:assentoDe(players[0]),registo:comandosVirtuais.segura(0,a),
      engine:input.held(p0,a as Action),envelope:held(p0,a as Action)};},
  startAttract:()=>attractCtl.startAttract(),stopAttract:()=>attractCtl.stopAttract(),get attract(){return attractCtl.isAttract();}, // attract → game/attract.ts
  loadTTS:tts.loadTTS,ttsSpeak:tts.ttsSpeak,narrate:tts.narrate,get ttsEngine(){return tts.getEngine();},get ttsLoading(){return tts.loading;},get ttsFailed(){return tts.failed;},setTtsEngineSel(v: Parameters<typeof tts.setEngineSel>[0]){tts.setEngineSel(v);},
  updateWeather:weather.updateWeather,get rainLevel(){return weather.getRainLevel();},set weatherT(v){weather.setWeatherT(v);},get weatherT(){return weather.getWeatherT();},rm,
  spawnCreature:life.spawnCreature,stepLife:life.stepLife,get creatures(){return life.getCreatures();},spawnCar:traffic.spawnCar,get cars(){return traffic.getCars();},SEM:traffic.SEM,get STREET_Y(){return traffic.getStreetY();},
  get elevShafts(){return getElevShafts();},elevAt,get BOX(){return BOX;},get wheelchair(){return settingsStore.wheelchair;},setWheelchair:(on: boolean)=>settingsStore.setWheelchairValue(on),buildElevators,buildRamps,solidAt,surfTop, // debug cadeirante
  get clouds(){return sceneSky.getClouds();},get birds(){return sceneSky.getBirds();},stepSky:(dt: number)=>sceneSky.stepSky(dt),CENARIOS,stepV3Decor:()=>sceneSky.stepV3Decor(),
  get grassDensity(){return rodada.grassDensity;},setGrassDensity:(v: number)=>rodada.setGrassDensity(v), // o clamp mora no setter da RODADA
  get decorCounts(){ const n=(g: PIXI.Graphics)=>g.geometry&&g.geometry.graphicsData?g.geometry.graphicsData.length:0; return {stars:n(starsG),skyDeco:n(skyDecoG),fog:n(fogG),grass:n(grassG),front:n(themeFxG)}; }};
{ const v='v'+INCL_VERSION; document.title=`The Inclusionist · ${v} (PixiJS)`; // versão: fonte única = INCL_VERSION
  const e1=document.querySelector('h1 .ver'); if(e1)e1.textContent='· '+v;
  const e2=document.getElementById('title-ver'); if(e2)e2.textContent=v; }
srSay(t('sr.boot.loaded',{n:COIN_TARGET})); // o "10" era cravado; agora é o alvo de verdade

/* dicas de início: somem ao pular ou após 8s */
function hideTips(){} // dicas de início REMOVIDAS (José 2026-07-04); stub mantém os call-sites

/* ===== Layout: jogo em múltiplos inteiros de 320x180, centralizado ===== */
// A escala é a instância `palco` (ui/layout), criada junto da rodada. A SONDAGEM DO VLIBRAS SAIU (o `vlTick` a
// cada 250ms e o reflow ao abrir/fechar): o intérprete é do modo pessoa surda da engine, que o põe sozinho e
// não empurra a tela. O `get_librasOpen` do `__incl` foi junto — nenhum teste o lia.
addEventListener('resize', layout, SOLTAR);
layout(); requestAnimationFrame(layout); setTimeout(layout, 1500);
window.__incl.layout=layout;

/* ===================== A TELA DE TÍTULO -> ui/title-screen.ts =====================
   📌 DECISÃO A DO DEV (02/10): a pausa é a da ENGINE — um cartão (`#vp-pause-0`), aberto por START/SELECT/☰ e
   fechado por «Continuar»/Escape, e a engine pede a este jogo `setPhase('paused'|'playing'|'title')` (o gancho, em
   `ligarGanchos`). O `initShell` daqui fazia isso E projetava a cena; ficou só a projeção, que é deste jogo: o
   `#title-overlay`, o som calado fora do jogo, o foco, e a legenda dos botões do título.
   Saíram com a pausa por tela: `initPauseIcons` (o cartão, a barra rápida e a barra do splash — o `#title-icons`
   é preenchido pela engine), `initMenuNav` e os seus invólucros (a navegação é a `engine.nav`), os
   `overlays.register` (os painéis registam-se sozinhos no `engine.overlays`) e a tabela `pauseActs`. */
const telaDeTitulo = createTitleScreen({
  t, $,
  sceneFacts: fatosDaCena,
  setMasterMuted,
  getNumPlayers: () => rodada.numPlayers,
  padOfPlayer1: () => { const p = players[0]; return p && typeof p.pad === 'number' && p.pad >= 0 ? p.pad : -1; },
  getGamepads: () => (navigator.getGamepads ? navigator.getGamepads() : []),
  // ⚠️ UMA LEITURA FRESCA a cada legenda, e não uma instância guardada: o `createPadMaps` guarda os mapas em memória,
  // e o assistente que os grava é o da ENGINE, sobre a instância DELA. Uma cópia feita aqui responderia o mapa de
  // antes do assistente — e só a legenda do título lê isto, nunca o quadro do jogo.
  padMapFor: (id) => createPadMaps(store).padMap(id),
  keysOfPlayer1: () => kbFor(0),
  keyName: (code) => keyName(t, code),
  shortLabel: (acao) => rotuloCurto(acao),
  isTouchMode: () => document.body.classList.contains('touch-mode'),
});
/* `setPhase` é ENVELOPE IÇADO sobre `game/cenas`. Continua `function` e não `const` pelo motivo de sempre: já está
   nos ctx de game/session, game/attract e ui/activities-menu, montados acima desta linha — só o içamento faz
   aquelas fiações valerem sem serem tocadas. A REGRA de cada transição (pausar empilha, sair da pausa desempilha)
   mora lá, onde tem teste; aqui fica só o encaminhamento.
   ⚠️ É o caminho do PRÓPRIO jogo e nunca chama a engine de volta: quem abre e fecha o cartão é ela, e é ela quem
   pede a fase — ver o `setPhase` de `ligarGanchos`. */
function setPhase(p: Fase){ cenas.irPara(p); }
function updateTitleLegend(){ telaDeTitulo.updateTitleLegend(); }

// O HUD das telas no arranque (uma tela; `configureRender` só o refaz ao trocar o número de telas).
// 📌 A POSIÇÃO DEIXOU DE SER CONTRATO: ela existia porque o `buildScreenPause` da pausa por tela lia `pauseActs`
// ao construir o cartão (TDZ). Sem cartão por tela, o HUD não lê nada declarado abaixo dele.
buildGameHud();
// A legenda do título descreve o aparelho: um pad que liga ou desliga troca as duas linhas.
addEventListener('gamepadconnected',()=>{ if(fatosDaCena().titleScreen)updateTitleLegend(); }, SOLTAR);
addEventListener('gamepaddisconnected',()=>{ if(fatosDaCena().titleScreen)updateTitleLegend(); }, SOLTAR);
/*
 * O "VOLTAR" DE QUEM NAVEGA O TÍTULO PELA ENGINE. O `#title-overlay` é um `.overlay` dentro do `#game-region`, e a
 * engine trata o `.overlay` visível do topo como diálogo: o gamepad dela o conduz (`menuWithDpad`,
 * `create-game.js:2634`) e o «não» de um diálogo SEM registro faz `menu.hidden = true` (`ui/menu-nav` `dialogBack`) —
 * esconderia a tela de título e deixaria a criança diante da cena vazia. Registado, o «não» é o voltar DESTE menu:
 * o mesmo botão «voltar» do submenu aberto que o `navTitle` aperta. Fora da cadeia do Escape, que é a dos painéis.
 */
engine.overlays.register('title-overlay', {
  close: () => navTitle({ no: true }),
  inEscapeChain: false,
});
(function shellSetup(){
  // Barra de topo (título da PÁGINA + ferramentas): só com ?debug=true. O jogo já mostra o título no splash,
  // então a barra fica oculta por padrão (CSS body:not(.dbg) .topbar) e libera a vertical p/ o canvas.
  if(/[?&]debug=true/.test(location.search))document.body.classList.add('dbg');
  const tools=$('#topbar-tools'); if(tools){ if(/[?&]debug=true/.test(location.search))tools.hidden=false;
    const db=$('#btn-debug'); if(db)db.addEventListener('click',()=>{ const p=$('#debug-panel'); if(p){ p.hidden=!p.hidden; db.setAttribute('aria-pressed',String(!p.hidden)); } }); } // abre/fecha o painel de afinação
  setPhase('title'); // estado inicial: tela de título
})();

/* ===================== O CONTROLE DE TOQUE É DA ENGINE =====================
   O pad na tela é pedido pelo gancho `onScreenPad` (`src/index.ts`) e desenhado pelo `createGame` no
   `#touch-controls`; as amarras dele (`initTouchBindings`) e o START/SELECT por toque são dela. O `touchCtl` e as
   amarras desta raiz saíram — duas amarras no mesmo pad seriam dois dedos por toque. */
// ⚠️ NADA A FAZER, e os chamadores ficam: a sessão (quem entra), o desafio e o teclado pedem «esconda o pad», e a
// engine não abre essa porta — a política dela já o esconde com o cartão, com qualquer overlay e com mais de um
// assento. É declaração de função (içada) porque os ctx acima a recebem por referência.
function hideTouchControls(_motivo?: string): void {}

/* ===================== ATTRACT: cria o controlador (deps já definidas) → game/attract.ts ===================== */
const attractCtl = createAttract({
  t, store,
  CENARIOS, keys: input.keys,
  getPlayers: () => players, getCenario: () => CENARIO, // bindings vivos (reatribuídos)
  mundoRodando: () => fatosDaCena().worldRunning,
  entrarNoJogo: () => setPhase('playing'), voltarAoTitulo: () => setPhase('title'),
  setCenario, setActivity, restartGame, randInt, kbFor, srSay, srAlert, $,
});

/* ===================== ?debug=true: painel de afinação ao vivo (extraído → ui/debug-panel.ts) ===================== */
/* ===================== A SONDA DO PERSONAGEM (painel de debug) =====================
   O Dev relatou várias cópias do personagem em posições diferentes, e eu não reproduzo no meu ambiente —
   todas as minhas medições encontram UMA. A sonda existe para que a medição ande na tela dele.

   O PixiJS fica AQUI, e o painel recebe DADOS. Mesma razão do `RenderInto` em render/port: pedir o verbo
   cabe onde emprestar o objeto não cabe, e é isso que mantém `ui/debug-panel` testável sem navegador.

   AS BASES CONHECIDAS SE ACUMULAM entre chamadas, e essa linha é o conserto de um erro MEU: eu procurava
   cópias comparando com a base da textura ATUAL do jogador, e os quatro quadros de idle têm QUATRO bases
   distintas (cada um vira uma tela própria no tapa-costuras). Uma cópia exibindo outro quadro escapava do
   filtro — foi por isso que eu medi "uma" três vezes seguidas enquanto a tela dele mostrava dezenas. */
const _basesDoPersonagem = new Set<unknown>();
function _amostrarPersonagem(): CharacterSample | null {
  // `PlayerSpriteLike` é a fatia ESTREITA que o jogo declara do sprite (ADR-0039), e a sonda precisa de
  // campos que ela não promete (`texture.frame`, `scale`). A conversão passa por `unknown` porque é isso que
  // ela é: a raiz de composição sabe que ali mora um `PIXI.Sprite`, e é o único lugar que sabe.
  const spr = (players[0] as unknown as { sprite?: PIXI.Sprite }).sprite;
  if (!spr || !spr.texture) return null;
  const t = spr.texture;
  _basesDoPersonagem.add(t.baseTexture);
  // Varre a CENA INTEIRA, e não só os irmãos da câmera: uma cópia pode estar aninhada em qualquer camada.
  // Conta também quem exibe uma base grande demais para um quadro (o atlas tem 256×207): desenhar o atlas
  // inteiro produz exatamente "o personagem repetido em poses diferentes", que é o que o print mostrou.
  const posicoes: string[] = [];
  let irmaos = 0;
  const varrer = (no: PIXI.Container, prof: number): void => {
    if (!no || prof > 8) return;
    for (const c of no.children as PIXI.Container[]) {
      const ct = (c as unknown as { texture?: PIXI.Texture }).texture;
      const cb = ct && ct.baseTexture;
      // A FAIXA DO ATLAS, e ela é estreita de propósito: 256×207. A primeira versão desta linha dizia
      // "≥200×150" e a própria sonda a reprovou na primeira execução — acusou QUATRO irmãos numa tela sadia,
      // que eram o mundo (896×992) e as três camadas de parallax (1280×180). Uma sonda que grita numa tela
      // sadia é pior que sonda nenhuma: ensina a ignorá-la. O teto de 400 exclui os dois legítimos.
      const atlasInteiro = !!cb && cb.width >= 200 && cb.width <= 400 && cb.height >= 150 && cb.height <= 400;
      if (c !== spr && cb && (_basesDoPersonagem.has(cb) || atlasInteiro) && c.visible) {
        irmaos++;
        if (posicoes.length < 6) posicoes.push(Math.round(c.x) + ',' + Math.round(c.y));
      }
      varrer(c, prof + 1);
    }
  };
  varrer(app.stage, 0);
  return {
    textureId: [..._basesDoPersonagem].indexOf(t.baseTexture),
    crop: t.frame.x + ',' + t.frame.y + ' ' + t.frame.width + 'x' + t.frame.height,
    base: t.baseTexture.width + 'x' + t.baseTexture.height,
    position: Math.round(spr.x) + ',' + Math.round(spr.y),
    scale: spr.scale.x.toFixed(2) + ',' + spr.scale.y.toFixed(2),
    siblingsDrawing: irmaos,
    siblingPositions: posicoes.join(' '),
  };
}
initDebugPanel({
  TUNE, ANIM, JUICE, saveJuice,
  sampleCharacter: _amostrarPersonagem,
  onFrame: (fn) => { app.ticker.add(fn); return () => app.ticker.remove(fn); },
  // Os três que o módulo lia sozinho (ADR-0232 D4): a query, o documento e o global da gravação crua.
  search: location.search, doc,
  expose: (amostras) => { (window as unknown as { __sonda?: unknown }).__sonda = amostras; },
});

/* ===================== PWA ===================== */
// PWA/SW agora gerados pelo vite-plugin-pwa (Estágio 1); registro injetado no build. Ver vite.config.ts.

/* ===================== O QUE A FABRICA DEVOLVE =====================
 *
 * ⚠️ O `teardown` E' HONESTO SOBRE O QUE AINDA NAO SOLTA, e a lista importa mais que o codigo:
 *
 *  · SOLTA os seis ouvintes globais (`window`), por `AbortController` — antes desta mudanca este ficheiro
 *    nao tinha um unico `removeEventListener`, entao nao havia sobre o que construir.
 *  · SOLTA o PixiJS, com `destroy` a alcancar os filhos: e' ele que segura a tela, as texturas e o ticker.
 *  · NAO SOLTA os ouvintes dos paineis, e a razao nao e' esquecimento: 36 overlays deste jogo vivem FORA do
 *    `#game-region` — a regiao e' 1% do documento —, entao o shell esvaziar a regiao nao os alcanca. Eles so
 *    desaparecem quando os paineis passarem a ser da plataforma, que e' o achado nº 1 entregue a engine.
 *  · NAO LIMPA o estado de escopo de modulo dos vizinhos (`coins`, `life`, `traffic`, `quiz`…): cada `initX`
 *    reescreve o seu na montagem seguinte, mas `_recentWords` do quiz e a lista de itens atravessariam um
 *    `unmount`. Enquanto a engine monta UM cartucho de cada vez isso nao colide; no dia em que montar dois,
 *    colide — e e' por isso que esta lista esta escrita e nao suposta.
 */
function teardown(): void {
  CANCELAR.abort();
  comandosVirtuais.soltarTudo(); // nenhuma posição fica segurada para o próximo `mount()` herdar
  DESLIGAR.splice(0).forEach((desligar) => desligar());
  // A declaração volta a dizer a verdade do mundo vazio, que é o que ela é depois de um `unmount`.
  desligarDeclaracao();
  desligarGanchos();
  soltarJogadores();
  try { app.destroy(true, { children: true }); } catch (e) { /* ja destruido */ }
  try { delete (window as unknown as Record<string, unknown>).__incl; } catch (e) { /* nao enumeravel */ }
}

/* ===================== A DECLARACAO, LIGADA AO JOGO DE VERDADE =====================
 *
 * ⚠️ ELA NASCE AQUI DENTRO, e nao no escopo do modulo, porque le o estado da RODADA — as moedas, os
 * jogadores, o tamanho do mundo. No escopo do modulo seria a declaracao de um jogo, partilhada por dois.
 *
 * 📌 `tipoDoTile` poe os limites a MAO em vez de confiar no `tileAt`: aquele devolve `2` — um tile SOLIDO —
 * para fora da grade (`core/collision.js:38`), e a declaracao precisa de distinguir `fora` de `pedra`. As
 * duas respostas dao 'structure' hoje, mas por motivos diferentes, e confundi-las esconderia o dia em que
 * uma delas mudasse.
 */
/* ===================== A RODADA LIGA-SE À DECLARAÇÃO E AOS GANCHOS =====================
 *
 * ⚠️ A DECLARAÇÃO JÁ NÃO NASCE AQUI, e isso é o ADR-0253: o export padrão do cartucho tem de carregá-la,
 * porque o `inclusionist-check-cartridge` a lê NO IMPORT, como o `createGame` faz no arranque. Ela é
 * construída em `declaration/live` sobre um suporte, e o que esta fábrica faz é LIGAR a rodada a ele.
 *
 * 📌 Antes desta chamada a declaração responde a verdade do mundo vazio — sem alvos, sem foco, mundo de
 * tamanho zero. Depois dela, responde o jogo. Nenhuma das duas é espera-reservada.
 */
ligarDeclaracao({
  mundo: () => ({ larguraPx: WORLD_PX_W, alturaPx: WORLD_PX_H, tile: TILE }),
  tipoDoTile: (tx, ty) => (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) ? null : tileAt(tx, ty),
  ehSolido: (tx, ty) => solidAt(tx, ty),
  alvosDe: (i) => coins.filter((cn) => !cn.taken && cn.owner === i).map((cn) => ({ x: cn.x, y: cn.y })),
  jogadorEm: (i) => { const p = players[i]; return p ? { x: p.x, y: p.y, facing: p.facing } : null; },
  progressoDe: (i) => ({ tem: (players[i] && players[i].collected) || 0, precisa: COIN_TARGET }),
  t,
  seletorDoMundo: '#game-region',
});

// A metade dos ganchos que LÊ A RODADA. A outra — acomodações, dicionários, preset, o pad na tela e o HUD do
// assento 0 — é dado do cartucho e mora em `src/index.ts`, resolvida uma vez e sem suporte nenhum.
//
// 📌 DECISÃO A DO DEV (02/10): a pausa é a da ENGINE. Ela abre e fecha o cartão e PEDE a fase; este jogo só move as
// cenas (congela o mundo, retoma, volta ao título) e nunca a chama de volta.
/** O jogo fecha o cartão da engine e retoma pelo caminho dele — o que o «Continuar» dela faria. */
function retomarDoCartao(): void { engine.pause.hide(0); setPhase('playing'); }
ligarGanchos({
  /*
   * ⚠️ FALSE SÓ QUANDO O DIÁLOGO DO TOPO É UMA TELA DESTE JOGO (o título ou a vitória), e é a leitura do
   * `ui/menu-nav` que o pede. A navegação da engine conduz o `.overlay` visível do topo do `#game-region`
   * (`menusTake`: `isNavigable() && menuUnderKeys`), e o `#title-overlay` é um deles — a engine moveria o foco num
   * anel genérico em vez do `navTitle` (que tem o ◀▶ do nº de jogadores e os seletores de números), e o «não» do
   * diálogo sem registro faria `menu.hidden = true`. Com `false` ali, a tecla chega ao roteador deste jogo, como
   * sempre chegou. Em qualquer outro momento — o cartão, um painel aberto por cima do título, o jogo a correr — é
   * true: com nada aberto a engine não consome tecla nenhuma, e a barra rápida é perguntada antes deste guarda.
   */
  isNavigable: () => { const topo = engine.overlays.topVisibleOverlay();
    return !(topo && (topo.id === 'title-overlay' || topo.id === 'win-overlay')); },
  // A engine pede; as cenas obedecem só ao que faz sentido AGORA: pausar um mundo que corre, retomar um pausado.
  // Um pedido fora disso (um «playing» com o título no ecrã) não arranca uma rodada que ninguém escolheu.
  setPhase: (f) => {
    const agora = fatosDaCena();
    if (f === 'paused' && agora.worldRunning) setPhase('paused');
    else if (f === 'playing' && agora.pauseMenu) setPhase('playing');
    else if (f === 'title') setPhase('title');
  },
  isBlindMode: () => settingsStore.blindMode,
  /*
   * SÓ O QUE PEDE TRABALHO DESTE JOGO. «Continuar», «Sair»→título, ajuda, impressão e os painéis a engine aciona
   * sozinha (a tabela dela vem antes, e esta vence onde repete um id).
   * · `addplayer` — a engine não o aciona. É o «mais um jogador» de sempre: a tela nova ESPERA o dono apertar um
   *   botão (o selo de espera), e o jogo volta a correr.
   * · `quit` — sair não é só ir ao título: sozinho, a rodada recomeça e o menu volta ao início; em várias telas,
   *   a tela de quem saiu fica preta e os outros seguem (`game/session.quitGame`). ⚠️ Com um cartão só, quem «sai»
   *   é o assento que a engine passa ao `setPauseActor` — o 0.
   */
  getPauseActs: () => ({
    addplayer: () => {
      if (!joinPlayer(null)) return; // ela própria diz por que não: celular, quatro jogadores, não cabe
      const i = rodada.numPlayers - 1;
      players[i].waiting = true;
      seatHud.showWaitingBadge(i);
      retomarDoCartao();
      srAlert(t('sr.player.pressToJoin', { n: i + 1 }));
    },
    quit: () => { engine.pause.hide(0); quitGame(); },
  }),
  setPauseActor: (i: number) => rodada.setPauseActor(i),
  /*
   * O NOME VIRTUAL DO BOTÃO (ADR-0111): a engine entrega, o registo guarda, e o `held` acima lê junto com o
   * `input.held` dela. É por aqui — e só por aqui — que os gestos, o rosto, os olhos e a voz comandam o jogo.
   *
   * 🔴 E A ARESTA MARCA-SE AQUI TAMBÉM, pelo mesmo motivo de ser este o lugar: a alternância de marcha lê
   * `pl.leftEdge`/`pl.rightEdge` e nenhum transporte as marcava (ver `core/comandos-virtuais`). Como o
   * teclado, o pad e o toque também atravessam o `virtualController`, marcá-las aqui conserta os seis
   * transportes de uma vez — e não só os que não produzem tecla.
   *
   * ⚠️ SÓ NA TRANSIÇÃO (`mudou`): a aresta conta um TOQUE. Numa tecla segurada o auto-repeat do sistema
   * entrega muitos apertos por segundo, e marcar a aresta em cada um inverteria a marcha a cada repetição.
   */
  onCommand: receberComando,
  setPlayerTheme: (...a: Parameters<typeof setPlayerTheme>) => setPlayerTheme(...a),
  setPlayerCorrection: (...a: Parameters<typeof setPlayerCorrection>) => setPlayerCorrection(...a),
  // O que só este jogo sabe do gamepad (o transporte é da engine — ver a nota junto de `demoDoAssistente`).
  gamepad: {
    worldRunning: () => fatosDaCena().worldRunning,
    navTitle: (k) => navTitle(k),
    attractActive: () => attractCtl.isAttract(), stopAttract: () => attractCtl.stopAttract(),
    hasModal: (i) => temModal(i), modalInput: (i, intent) => modalInput(i, intent),
    joinPlayer: (pad) => joinPlayer(pad), respawnPlayer: (i) => respawnPlayer(i),
    clearWaitingBadge: (i) => seatHud.clearWaitingBadge(i),
    wizardStep: (posicao) => { caixaDaDemo(); demoDoAssistente.step(posicao); },
    wizardTick: () => demoDoAssistente.tick(),
  },
});

return { update: quadro, teardown };
}
