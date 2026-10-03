// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * O QUE O CONTROLADOR VIRTUAL DA ENGINE MANDA, GUARDADO PARA O QUADRO LER (ADR-0111, issue #197).
 *
 * 🔴 ESTE MÓDULO EXISTE PORQUE O CARTUCHO NÃO OUVIA. A engine entrega cada posição que o aparelho da criança
 * alcançou pelo gancho `onCommand` — «a engine lida com o hardware e passa para o jogo o nome virtual do
 * botão», o Dev no contrato do `createGame`. O cartucho não o declarava, e o `cartridge.onCommand?.(cmd)` da
 * engine (`boot/create-game.js:3682`) deixava cada comando cair no chão, em silêncio. O contrato diz a
 * consequência em letra: *«Absent = the game hears commands only through what it reads itself.»*
 *
 * 📌 POR QUE O TECLADO FUNCIONAVA E O RESTO NÃO. O `virtualController.press` faz duas coisas (`input/
 * virtual-controller.js:51-54`): segura a TECLA do esquema — mas só `if (code)`, e só o teclado tem sempre
 * uma — e ENTREGA o comando, sempre. O teclado é o único transporte cuja moeda nativa é a tecla, então ele
 * chegava ao jogo pelo `input.held()` de qualquer maneira. Os gestos, o rosto, os olhos, a voz e o
 * varrimento só chegam por aqui.
 *
 * ⚠️ ISTO NÃO SUBSTITUI O `input.held()` DA ENGINE, SOMA-SE A ELE. A engine continua a ser a fonte de
 * verdade do teclado e do pad; este registo cobre as posições que nenhuma tecla do esquema representa. Ler
 * os dois é o que torna o jogo surdo a nenhum transporte.
 */
import type { Action } from '@the-inclusionist/engine/core/actions.js';
import type { VirtualCommand } from '@the-inclusionist/engine/input/virtual-controller.js';

export interface ComandosVirtuais {
  /** O gancho que vai no `onCommand` do cartucho: a engine chama-o a cada aperto e a cada largada. */
  receber(comando: VirtualCommand): void;
  /** O assento `i` está a segurar `acao` AGORA, por um transporte que não produz tecla? */
  segura(i: number, acao: string): boolean;
  /** Larga tudo do assento `i` — a tela dele fechou, ou a rodada recomeçou. */
  soltarAssento(i: number): void;
  /** Larga tudo. O `teardown()` chama isto. */
  soltarTudo(): void;
  /** Quantas posições estão seguradas agora (para o `__incl`, em teste e em medição). */
  tamanho(): number;
}

export function criarComandosVirtuais(): ComandosVirtuais {
  // `${assento}:${acao}` — a mesma chave que o `virtualController` usa para não largar o que não segurou.
  const segurados = new Set<string>();
  const chave = (i: number, acao: string): string => `${i}:${acao}`;

  return {
    receber(comando: VirtualCommand): void {
      const k = chave(comando.player, comando.action as Action);
      // ⚠️ A LARGADA CHEGA MESMO COM MENU ABERTO, de propósito da engine: *«delivered even if a menu opened
      // meanwhile: a game must never be left believing a button is still down»* (`virtual-controller.js:65`).
      // Por isso o `delete` nunca é condicional — é essa entrega que impede o boneco de andar para sempre.
      if (comando.pressed) segurados.add(k);
      else segurados.delete(k);
    },
    segura: (i, acao) => segurados.has(chave(i, acao)),
    soltarAssento(i): void {
      const prefixo = `${i}:`;
      for (const k of segurados) if (k.startsWith(prefixo)) segurados.delete(k);
    },
    soltarTudo: () => segurados.clear(),
    tamanho: () => segurados.size,
  };
}
