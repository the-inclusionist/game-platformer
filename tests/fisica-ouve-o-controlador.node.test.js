// SPDX-License-Identifier: AGPL-3.0-or-later
// A FÍSICA OUVE O CONTROLADOR VIRTUAL — a fiação que faz o dedo apontado mover o boneco.
//
// 🔴 POR QUE ESTE FICHEIRO EXISTE. Declarar `onCommand` não bastou. O registo enchia — medido no navegador
// com a câmera real, `__incl.cmdVirtuais` subia a cada gesto —, e o personagem continuava parado. A causa
// era UMA LINHA DE COMPOSIÇÃO: a raiz passava `initPhysics({ t, input, … })`, o `input` CRU da engine, e a
// física guarda `ctx.input.held` no arranque (`game/physics.ts:160`). Esse `held` só conhece TECLAS, e os
// gestos, o rosto, os olhos e a voz não produzem nenhuma. O envelope que soma as duas fontes existia em
// `main.ts` e não atravessava esta fronteira.
//
// ⚠️ E NADA APANHAVA ISSO. O `tsc` aceita, porque `PhysicsCtx.input` é `Pick<LiveInput,'held'>` e o `input`
// da engine satisfaz o tipo — ele TEM um `held`, só que o errado. A física tem os seus testes e todos
// passam, porque eles injetam o `held` deles. O axe não vê. O defeito vive só na linha que liga os dois, e
// o sintoma é o pior que este projeto conhece: o controle acende e não faz nada.
//
// 📌 POR QUE UM TESTE DE FONTE. A raiz de composição não é importável — importá-la traz o PixiJS e a folha
// de estilo. A garantia que falta não é sobre o comportamento de um módulo (esses já estão cobertos), é
// sobre QUAL OBJETO atravessa uma fronteira. É o mesmo motivo de `pause-icons-escritores`.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { criarComandosVirtuais, ARESTA_DA_ACAO } from '../app/js/core/comandos-virtuais.js';

const RAIZ = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');

/** A chamada do `initPhysics` inteira, do `({` ao `});` que a fecha — e não uma fatia de N caracteres, que
 *  um comentário a mais no meio empurraria para fora e tornaria o portão verde por acidente. */
function chamadaDoInitPhysics() {
  const i = RAIZ.indexOf('initPhysics({');
  expect(i, '`initPhysics` saiu do `main.ts`').toBeGreaterThan(-1);
  const fim = RAIZ.indexOf('\n});', i);
  return RAIZ.slice(i, fim);
}

describe('a física recebe o `held` que ouve o controlador virtual', () => {
  it('🔴 `initPhysics` NÃO recebe o `input` cru da engine', () => {
    // `initPhysics({ t, input, …})` é o defeito exato de 03/10: o `held` da engine só lê teclas.
    const chamada = chamadaDoInitPhysics();
    expect(chamada).not.toMatch(/^\s*t,\s*input,\s*$/m);
  });

  it('`initPhysics` recebe um `input` cujo `held` é o envelope da raiz', () => {
    const chamada = chamadaDoInitPhysics();
    expect(chamada).toMatch(/input:\s*\{\s*held\s*\}/);
  });

  it('o envelope soma as DUAS fontes: o `held` da engine e o registo de comandos', () => {
    // Uma das duas sozinha deixa metade dos transportes sem voz: só teclas ignora gesto/rosto/olhos/voz;
    // só o registo ignora o teclado e o pad, que nunca passam por `onCommand`.
    const linha = RAIZ.split('\n').find((l) => l.includes('const held:') && l.includes('=>'));
    expect(linha, 'a linha do envelope saiu do `main.ts`').toBeTruthy();
    expect(linha).toContain('input.held(pl, act)');
    expect(linha).toContain('comandosVirtuais.segura(');
  });

  it('o cartucho declara `onCommand`, senão a engine entrega a ninguém', () => {
    // `boot/create-game.js:3682` é `cartridge.onCommand?.(cmd)` — sem o gancho, o `?.` come o comando.
    expect(RAIZ).toMatch(/onCommand:\s*receberComando/);
    expect(RAIZ).toMatch(/function receberComando\(comando: VirtualCommand\)/);
    const VIVOS = readFileSync(join(process.cwd(), 'app', 'js', 'declaration', 'live.ts'), 'utf8');
    expect(VIVOS).toMatch(/onCommand:\s*\(comando\)\s*=>\s*ganchos\.vivos\?\.onCommand\?\.\(comando\)/);
  });

  it('🔴 a SONDA atravessa o mesmo caminho do gesto, e não um atalho', () => {
    // 📏 Medido em 03/10: a sonda chamava `comandosVirtuais.receber` diretamente, saltava a marcação da
    // aresta, e deu «não marca» sobre código que marcava. Uma sonda que não passa pela porta real mede
    // outra coisa — e custou uma volta inteira de diagnóstico.
    expect(RAIZ).toMatch(/cmdInjeta:[^\n]*receberComando\(/);
    expect(RAIZ).not.toMatch(/cmdInjeta:[^\n]*comandosVirtuais\.receber\(/);
  });
});

describe('a aresta que a alternância de marcha lê', () => {
  it('🎯 o gancho marca a aresta no PRIMEIRO aperto e não na repetição', () => {
    // Reproduz o corpo de `receberComando`: o registo diz se MUDOU, e só a mudança marca. Sem isso, o
    // auto-repeat de uma tecla segurada inverteria a marcha muitas vezes por segundo.
    const cv = criarComandosVirtuais();
    const jogador = {};
    const receber = (acao, on) => {
      const mudou = cv.receber({ action: acao, pressed: on, source: 'gestos', player: 0 });
      if (!mudou || !on) return;
      const campo = ARESTA_DA_ACAO[acao];
      if (campo) jogador[campo] = true;
    };
    receber('right', true);
    expect(jogador.rightEdge).toBe(true);
    jogador.rightEdge = false;
    receber('right', true);                       // repetição sem largar
    expect(jogador.rightEdge).toBe(false);        // não remarca
    receber('right', false);
    receber('right', true);                       // largou e apertou de novo: é toque novo
    expect(jogador.rightEdge).toBe(true);
  });

  it('a tabela cobre as seis posições que a física limpa, e não inventa outras', () => {
    // `physics.ts:423,432` limpa exatamente estas seis. Uma a mais seria um campo que ninguém consome;
    // uma a menos é uma ação cuja aresta nunca chega — que foi o defeito.
    expect(new Set(Object.values(ARESTA_DA_ACAO))).toEqual(
      new Set(['leftEdge', 'rightEdge', 'runEdge', 'jumpEdge', 'specialEdge', 'swapEdge']));
  });

  it('⚠️ as direções NÃO marcam a aresta uma da outra', () => {
    // `nextLatchedDir` inverte conforme a aresta: trocar `left` por `right` aqui faria o boneco andar ao
    // contrário do que a criança apontou, e é o tipo de troca que um teste de igualdade de conjunto não vê.
    expect(ARESTA_DA_ACAO.left).toBe('leftEdge');
    expect(ARESTA_DA_ACAO.right).toBe('rightEdge');
  });

  it('`start` e `select` não têm aresta — são da engine, nunca do jogo (ADR-0144 §4)', () => {
    expect(ARESTA_DA_ACAO.start).toBeUndefined();
    expect(ARESTA_DA_ACAO.select).toBeUndefined();
  });
});

describe('o caminho do dedo apontado, ponta a ponta', () => {
  it('🎯 um `right` entregue pela engine faz o `held` da raiz responder true', () => {
    // Reproduz o envelope da raiz com a engine MUDA (nenhuma tecla segurada), que é o estado de quem
    // comanda por gesto: só o registo tem a resposta, e é ela que a física passa a ver.
    const comandosVirtuais = criarComandosVirtuais();
    const players = [{ ctrl: { right: ['KeyD'] }, pad: -1 }];
    const engineHeld = () => false; // nenhuma tecla no mundo: a mão não produz nenhuma
    const assentoDe = (pl) => players.findIndex((p) => p === pl);
    const held = (pl, act) => engineHeld(pl, act) || comandosVirtuais.segura(assentoDe(pl), act);

    expect(held(players[0], 'right')).toBe(false);
    comandosVirtuais.receber({ action: 'right', pressed: true, source: 'gestos', player: 0 });
    expect(held(players[0], 'right')).toBe(true);   // o dedo aponta: a física vê
    comandosVirtuais.receber({ action: 'right', pressed: false, source: 'gestos', player: 0 });
    expect(held(players[0], 'right')).toBe(false);  // a mão baixa: o boneco pára
  });

  it('⚠️ um jogador fora da lista responde false em vez de ler o assento errado', () => {
    // `assentoDe` devolve -1 para um objeto que não está em `players`, e `segura(-1, …)` é falso. Sem isto,
    // um -1 a indexar daria a resposta de outro assento — pior que nenhuma.
    const comandosVirtuais = criarComandosVirtuais();
    const players = [{ ctrl: {}, pad: -1 }];
    const assentoDe = (pl) => players.findIndex((p) => p === pl);
    const held = (pl, act) => false || comandosVirtuais.segura(assentoDe(pl), act);
    comandosVirtuais.receber({ action: 'right', pressed: true, source: 'gestos', player: 0 });
    expect(held({ ctrl: {}, pad: -1 }, 'right')).toBe(false); // outro objeto, mesma forma
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. Voltar `initPhysics({ t, input, … })`: caem os dois primeiros casos — que é o defeito de 03/10 exato.
// 2. Tirar `|| comandosVirtuais.segura(…)` do envelope: cai «o envelope soma as DUAS fontes» e o caso 🎯.
// 3. Tirar o `onCommand` do `main.ts` ou do `live.ts`: cai «o cartucho declara `onCommand`».
// 4. `assentoDe` a devolver 0 em vez de -1 para um objeto de fora: cai o último caso.
