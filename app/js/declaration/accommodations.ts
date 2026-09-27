// SPDX-License-Identifier: AGPL-3.0-or-later
// AS DEZOITO RESPOSTAS DESTE JOGO — `CreateGameOptions.acomodacoes`, obrigatório desde a engine 10.
//
// 🔴 COMPLETA, E NÃO PARCIAL, e a engine recusa o arranque de um cartucho que deixe uma de fora. A razão está
// escrita no contrato dela e é a mesma de todo este projeto: um mapa parcial deixa o SILÊNCIO responder, e
// aqui o silêncio decide pela criança — montaria uma cadeira de rodas num xadrez, ou esconderia uma de um
// jogo de plataforma, sem nada em lado nenhum a dizer qual dos dois aconteceu.
//
// ⚠️ E `false` NÃO É AUSÊNCIA: é alguém a escrever «este jogo não tem sujeito para isto». A assimetria das
// duas respostas é o que torna cada linha uma decisão e não um preenchimento:
//
//   · dizer `false` numa acomodação que o jogo TEM **remove** da criança um controle que existia;
//   · dar palavra a uma que ele NÃO tem cria o controle morto que o ADR-0106 §5 proíbe — ela aciona, nada
//     acontece, e ela conclui que o jogo não a atende em vez de procurar noutro lado.
//
// 📌 AS RESPOSTAS SÃO CHAVES E NÃO PALAVRAS (ADR-0232 D3, errata de 2026-09-25). Uma palavra fixada aqui
// ficaria na língua em que foi escrita quando a criança trocasse de idioma; a chave resolve-se a cada
// desenho, contra `CreateGameOptions.dictionaries` — que é o dicionário deste jogo, em `i18n/game-keys`.
//
// Medido em 2026-09-27 lendo o código deste jogo, e aprovado pelo Dev linha a linha.
import type { AccommodationAnswers } from '@the-inclusionist/engine/core/accommodations.js';

export const ACOMODACOES: AccommodationAnswers = {
  // ───────────────────────── as sete que este jogo oferece ─────────────────────────

  /** `#opt-facil`, as constantes `EASY` e `reflectFacil`: gravidade, salto e velocidade mudam de verdade. */
  easyMode: { labelKey: 'accom.easyMode', hintKey: 'accom.easyMode.hint' },

  /** `#opt-wheelchair` e `setWheelchairValue`: sem pulo, a rampa guia o Y e o trampolim vira elevador. */
  wheelchairMode: { labelKey: 'accom.wheelchair', hintKey: 'accom.wheelchair.hint' },

  /** `RM_CHAR` — respiração, caminhada e trejeito, por personagem. É a irmã POR PERSONAGEM da acomodação
   *  geral de movimento de cena, que a engine monta sozinha com as chaves `parallax/decor/items/particles`. */
  reducedCharacterMotion: { labelKey: 'accom.characterMotion', hintKey: 'accom.characterMotion.hint' },

  /** `caneBlockDiv`/`setCaneBlockDivValue`: de quanto em quanto a bengala bate, para quem joga de olhos
   *  fechados. Não é volume nem velocidade — é a distância entre duas batidas. */
  caneSpacing: { labelKey: 'accom.caneSpacing', hintKey: 'accom.caneSpacing.hint' },

  /** `quizLevel` 1–5: de reconhecer a letra a montar a palavra. É a atividade de alfabetização deste jogo. */
  lexicalDifficulty: { labelKey: 'accom.readingLevel', hintKey: 'accom.readingLevel.hint' },

  /** `setOwnerColorsValue`: cada criança tem a sua cor nos itens, para não disputar os do vizinho. */
  ownerColors: { labelKey: 'accom.ownerColors', hintKey: 'accom.ownerColors.hint' },

  /** `#opt-outline-fg` e `#opt-outline-bg`. ⚠️ A chave é a que o jogo JÁ tinha (`a11y.outlines`), e não uma
   *  nova: duas chaves para a mesma palavra divergem na tradução seguinte. */
  contrastOutlines: { labelKey: 'a11y.outlines', hintKey: 'accom.contrastOutlines.hint' },

  // ───────── as onze que este jogo não tem, e os dois motivos diferentes de não ter ─────────

  // (a) NÃO EXISTEM DE TODO neste jogo — não há o quê ajustar.
  /** Não há peças: os alvos são moedas, formas e letras, e nenhum conjunto se troca. */
  pieceSets: false,
  /** Não há naipes. */
  distinguishableSuits: false,
  /** Não se mira nada: pula-se, corre-se e colhe-se por contato. */
  aimAssist: false,
  /** Nenhum texto deste jogo avança sozinho — o desafio espera a criança, e a legenda é da engine. */
  textPace: false,

  // (b) EXISTEM COMO NÚMERO FIXO OU EFEITO INTERNO, e é por isso que a resposta é `false` e não uma palavra:
  //     dar-lhes nome ofereceria à criança um controle que não há como acionar.

  /** O `coyote time` é constante de física (`COYOTE`), igual para todos. Nada o afrouxa por ajuste. */
  detectionLeniency: false,
  /** O `jumpBuffer` é igualmente fixo: a janela do salto não se abre nem se fecha por escolha. */
  timingWindow: false,
  /** O `guideIntensity` é CALCULADO a cada quadro pela distância, e o `JUICE` só se mexe por `?debug=true`,
   *  que é ferramenta de quem desenvolve e não controle de quem joga. */
  intensity: false,
  /** ⚠️ As chaves de movimento reduzido deste jogo são `parallax`, `decor`, `items` e `particles` — CENA, e
   *  não câmera. Cena é acomodação GERAL, que a engine monta sempre; balanço de câmera não existe aqui. */
  cameraSway: false,
  /** A dica do desafio aparece SEMPRE (`quiz-hint`), e não se liga nem desliga. Oferecer o interruptor seria
   *  prometer um ajuste sobre algo que já está sempre ligado. */
  hints: false,
  /** O «realce» deste código é o contraste L→Q da imagem, outra coisa: não há palavra a destacar-se enquanto
   *  se lê. */
  wordHighlight: false,
  /** O que este jogo tem são as TRAVAS (`toggleRun`, `toggleMove`), e essas respondem pelas acomodações de
   *  contrato `moveLatch` e `holdLatch` — do outro lado da lista, derivadas e não perguntadas aqui.
   *  Respondê-las duas vezes deixaria as duas respostas discordarem. */
  repeatedInput: false,
};
