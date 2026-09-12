// SPDX-License-Identifier: AGPL-3.0-or-later
// O CARTUCHO. Isto e' o que a plataforma importa, e nao tem efeito nenhum ao ser importado.
//
// ⚠️ A ORDEM IMPORTA MAIS DO QUE PARECE: `create` e' REEXPORTADO e nao chamado. Importar este ficheiro nao
// arranca jogo nenhum, nao cria PixiJS, nao toca no documento. Era exatamente o contrario ate a fabrica
// existir — `app/js/main.ts` bootava no import —, e e' a decisao D14 do spec: um cartucho e' INSTANCIADO, e
// estado de escopo de modulo sobrevive ao `teardown()` e vaza para o jogo seguinte na mesma pagina.
export { create } from '../app/js/main.js';
export type { GameCtx, GameInstance, CartuchoMontado, Cartridge, Dicionario, Traduzir } from './contract.js';

/**
 * Casa com o repositorio e com o `name` do pacote (ADR-0082 §1). Escrito como literal e nao lido do
 * `package.json`: o registro diz que os tres sao a MESMA palavra, e uma leitura faria este ficheiro concordar
 * automaticamente com um `package.json` errado em vez de discordar dele.
 */
export const slug = 'game-platformer';

/**
 * ⚠️ VAZIO, E ISSO E' UMA MEDICAO E NAO UM ESQUECIMENTO. Este jogo nao regista dicionario nenhum: as chaves
 * que ele usa — `hud.nome.moeda`, `hud.objective.ludico` e as outras — vivem DENTRO da engine, medido em
 * `dist-pkg/i18n/pt.js`. Nao ha `registerDict` em parte nenhuma de `app/js`.
 *
 * 📌 Isso e' divida e nao virtude, e o README deste repositorio ja lhe da nome: texto de PRODUTO de um jogo
 * a morar no motor e' o contrario de «esvaziar a engine». Fica declarado como vazio para que o dia em que
 * essas chaves voltarem para casa seja uma mudanca visivel, e nao uma linha que ninguem reparou que faltava.
 */
export const dicts: Readonly<Record<string, Readonly<Record<string, string>>>> = {};
