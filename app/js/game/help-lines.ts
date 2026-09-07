// SPDX-License-Identifier: AGPL-3.0-or-later
// game/help-lines — AS LINHAS DA TELA DE AJUDA, moldadas à parte do DOM.
//
// ========================= POR QUE ISTO SAIU DO `main.ts` =========================
// A tela de ajuda do menu de pausa listava posição ↔ tecla a partir do `ACT_LABEL` da engine — uma tabela de
// OITO posições, com as chaves de i18n das palavras deste jogo, a viver dentro do motor.
//
// ⚠️ ELA ERA O ÚLTIMO LEITOR DESSE `ACT_LABEL`, e foi o que fez a issue #125 da engine dizer, ao ser medida,
// que remover aquela tabela é «migração e não limpeza». Esta é a migração: o mesmo dado sai de
// `acoesDoJogo()`, que este ficheiro já derivava do preset — e derivar do preset é melhor por dois motivos,
// não por gosto:
//
//   · são as posições que ESTE jogo declara, e não oito fixas. O vocabulário passou a catorze (ADR-0085), e
//     uma tabela de oito mostra a criança um controle que não é o dela;
//   · a palavra vem do preset do jogo, que é quem sabe como a posição se chama (ADR-0086).
//
// ========================= E POR QUE É FUNÇÃO PURA =========================
// O molde do `ui/reach-notice` da engine: o texto é a parte que precisa de ser lida com cuidado, e o project
// `node` afere-o sem navegador. O `openHelp` fica só com o desenho.
//
// Devolve DADO e não markup — os `code` das teclas saem crus, porque quem os traduz para o nome visível é o
// `keyName` da engine, no ponto de desenho.

/** Uma linha da tabela de ajuda: como a ação se chama, e que teclas a alcançam. */
export interface LinhaDaAjuda {
  readonly rotulo: string;
  /** Os `KeyboardEvent.code` desta posição, na ordem do esquema. VAZIO = o transporte não a alcança. */
  readonly teclas: readonly string[];
}

/**
 * As linhas da ajuda, para as ações que ESTE jogo declara.
 *
 * ⚠️ Uma posição sem tecla devolve lista VAZIA em vez de sumir da tabela, e a diferença é o ponto: a criança
 * que procura «correr» na ajuda precisa de saber que ela existe e não tem tecla — sumir com a linha faz a
 * ação parecer inexistente, que é a mesma mentira que o `null` do `KeyScheme` existe para não contar.
 */
export function linhasDaAjuda(
  acoes: readonly { readonly acao: string; readonly rotulo: string }[],
  esquema: Readonly<Record<string, readonly string[] | null | undefined>>,
): LinhaDaAjuda[] {
  return acoes.map(({ acao, rotulo }) => ({ rotulo, teclas: [...(esquema[acao] ?? [])] }));
}
