// SPDX-License-Identifier: AGPL-3.0-or-later
// O QUE O CONTROLADOR VIRTUAL MANDA (core/comandos-virtuais) — o registo que faltava ao cartucho.
//
// ========================= POR QUE ESTE ARQUIVO EXISTE =========================
// A engine entrega cada posição que o aparelho da criança alcançou por `cartridge.onCommand?.(cmd)`
// (`boot/create-game.js:3682`). O cartucho não declarava o gancho, e o `?.` fazia cada comando cair no
// chão — sem erro, sem linha em `problems`, sem nada em `axe`. O sintoma que chegou ao Dev foi «a câmera
// liga e não comanda», e o mesmo valia para metade da voz.
//
// ⚠️ UM TESTE QUE SÓ AFIRMASSE «guarda e devolve» NÃO SERVIRIA DE PORTÃO. O que torna este registo correto
// é o contrato da engine em dois pontos que não são óbvios:
//
//   1. A LARGADA CHEGA MESMO COM MENU ABERTO, de propósito: *«delivered even if a menu opened meanwhile: a
//      game must never be left believing a button is still down»* (`input/virtual-controller.js:65`). Um
//      registo que ignorasse largadas «fora de jogo» deixaria o boneco a andar para sempre.
//   2. O ASSENTO FAZ PARTE DA CHAVE. Dois jogadores seguram a mesma posição ao mesmo tempo, e largar a de um
//      não pode largar a do outro.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect } from 'vitest';
import { criarComandosVirtuais } from '../app/js/core/comandos-virtuais.js';

/** Um comando como a engine o entrega (`VirtualCommand`). */
const cmd = (action, pressed, player = 0, source = 'gestos') => ({ action, pressed, source, player });

describe('core/comandos-virtuais — o que a engine entrega', () => {
  it('[Zero] nasce sem nada segurado', () => {
    const c = criarComandosVirtuais();
    expect(c.tamanho()).toBe(0);
    expect(c.segura(0, 'action2')).toBe(false);
  });

  it('um aperto fica segurado; a largada solta', () => {
    const c = criarComandosVirtuais();
    c.receber(cmd('action2', true));
    expect(c.segura(0, 'action2')).toBe(true);
    expect(c.tamanho()).toBe(1);
    c.receber(cmd('action2', false));
    expect(c.segura(0, 'action2')).toBe(false);
    expect(c.tamanho()).toBe(0);
  });

  it('🔴 o ASSENTO faz parte da chave: largar a de um não larga a do outro', () => {
    const c = criarComandosVirtuais();
    c.receber(cmd('right', true, 0));
    c.receber(cmd('right', true, 1));
    expect(c.tamanho()).toBe(2);
    c.receber(cmd('right', false, 0));
    expect(c.segura(0, 'right')).toBe(false);
    expect(c.segura(1, 'right')).toBe(true); // o jogador 2 continua a andar
  });

  it('posições diferentes do mesmo assento convivem', () => {
    const c = criarComandosVirtuais();
    c.receber(cmd('right', true));
    c.receber(cmd('action2', true)); // a correr e a saltar ao mesmo tempo
    expect(c.segura(0, 'right')).toBe(true);
    expect(c.segura(0, 'action2')).toBe(true);
    expect(c.tamanho()).toBe(2);
  });

  it('a FONTE não muda o registo — o mesmo botão por outra via é o mesmo botão', () => {
    // A engine carimba quem produziu (`gestos`, `voz`, `olhos`…), e isso serve à aresta e à trava, não a
    // esta pergunta: o jogo quer saber se a posição está em baixo, não por quem.
    const c = criarComandosVirtuais();
    c.receber(cmd('up', true, 0, 'gestos'));
    c.receber(cmd('up', false, 0, 'voz')); // a voz larga o que o gesto segurou
    expect(c.segura(0, 'up')).toBe(false);
  });

  it('🔴 uma largada SEM aperto anterior não rebenta nem cria estado', () => {
    // A engine entrega a largada mesmo com menu aberto, e pode chegar sem o aperto correspondente ter
    // passado por aqui (o aperto foi para o menu). Soltar o que não se segurou é um nada, não um erro.
    const c = criarComandosVirtuais();
    expect(() => c.receber(cmd('action1', false))).not.toThrow();
    expect(c.tamanho()).toBe(0);
  });

  it('apertos repetidos da mesma posição não se acumulam', () => {
    const c = criarComandosVirtuais();
    c.receber(cmd('left', true));
    c.receber(cmd('left', true));
    expect(c.tamanho()).toBe(1); // uma largada basta para soltar
    c.receber(cmd('left', false));
    expect(c.segura(0, 'left')).toBe(false);
  });

  it('`soltarAssento` larga só o assento pedido', () => {
    const c = criarComandosVirtuais();
    c.receber(cmd('up', true, 0));
    c.receber(cmd('down', true, 0));
    c.receber(cmd('up', true, 1));
    c.soltarAssento(0);
    expect(c.segura(0, 'up')).toBe(false);
    expect(c.segura(0, 'down')).toBe(false);
    expect(c.segura(1, 'up')).toBe(true);
  });

  it('⚠️ `soltarAssento(1)` não larga o assento 10 — o prefixo é a chave inteira até os dois pontos', () => {
    // `'10:up'.startsWith('1')` é verdade; `startsWith('1:')` não é. O jogo chega a quatro assentos hoje,
    // mas um prefixo frouxo é o tipo de defeito que só aparece quando alguém sobe o número.
    const c = criarComandosVirtuais();
    c.receber(cmd('up', true, 1));
    c.receber(cmd('up', true, 10));
    c.soltarAssento(1);
    expect(c.segura(1, 'up')).toBe(false);
    expect(c.segura(10, 'up')).toBe(true);
  });

  it('`soltarTudo` esvazia — o `teardown()` não deixa posição herdada para o próximo `mount()`', () => {
    const c = criarComandosVirtuais();
    c.receber(cmd('up', true, 0));
    c.receber(cmd('right', true, 2));
    c.soltarTudo();
    expect(c.tamanho()).toBe(0);
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. `if (comando.pressed) add else delete` → sempre `add`: cai «a largada solta» e mais quatro.
// 2. Chave sem o assento (`${acao}` só): cai «o ASSENTO faz parte da chave» e `soltarAssento`.
// 3. `startsWith(`${i}:`)` → `startsWith(String(i))`: cai o caso do assento 10, e só ele.
// 4. `delete` condicionado a estar presente antes: o caso da largada órfã continua verde (não morde), mas o
//    caso 1 morde na mesma — a guarda é redundante, não é cobertura em falta.
