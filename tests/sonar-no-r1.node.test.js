// SPDX-License-Identifier: AGPL-3.0-or-later
// O SONAR É O R1, E SÓ O R1 — decisão do Dev em 03/10.
//
// ========================= POR QUE ISTO EXISTE =========================
// *«A partir de agora, sonar somente R1, como na Engine (verifique se é este mesmo o padrão da engine).»*
//
// 📏 VERIFICADO ANTES DE MEXER, e o padrão é mesmo esse: `ui/screen-text` da engine fixa
// `MENU_SONAR = 'rightShoulder'` para o sonar com um menu aberto, e o cabeçalho cita o próprio Dev — «Tecla
// padrão para o sonar deve ser R1» —, dizendo que EM JOGO a posição é a do preset DO JOGO. Esta plataforma
// não declarava ombro nenhum, e por isso tinha um ACORDE onde a engine tem um botão: segurar «trocar» uns
// 0,3 s, ou trocar+especial (`game/physics.updatePowerSwap`).
//
// 🔴 E O ACORDE SAIU, em vez de ficar «também». Dois gatilhos para a mesma coisa tornam um deles invisível —
// e quem mais precisa do sonar é exatamente quem não vê a tela para descobrir um acorde. Quem o perde ganha
// um botão que o assistente de controle pergunta, a tela de remapeamento mostra e a legenda nomeia.
//
// ⚠️ NADA COBRIA `updatePowerSwap` ATÉ AQUI, e foi por isso que tirar o sonar de lá não pôs um só caso
// vermelho. Este ficheiro fecha esse buraco pelos dois lados: a física não sonda, e a raiz sonda no R1.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as COL from '../app/js/core/collision.js';
import { initElevators, buildElevators } from '../app/js/game/elevators.js';
import { makePlayer, BOX } from '../app/js/game/player.js';
import { createInputState } from '@the-inclusionist/engine/input/state.js';
import { KB_DEFAULTS } from '@the-inclusionist/engine/input/keyboard.js';
import * as PHY from '../app/js/game/physics.js';
import { createRng } from '@the-inclusionist/engine/core/rng.js';
import { initGameState } from '../app/js/game/state.js';
import { createStorage, memoryBackend } from '@the-inclusionist/engine/platform/storage.js';

initGameState({ store: createStorage(memoryBackend()), bus: { emit() { /* ninguém assina */ } } });

const input = createInputState();
const { keys } = input;
const noop = () => { /* stub */ };

/** Quantas vezes o sonar tocou — é a única coisa que este ficheiro mede na física. */
let sondagens = 0;

function arreio() {
  sondagens = 0;
  const grade = Array.from({ length: 6 }, () => new Array(8).fill(1));
  grade[5] = new Array(8).fill(2);                       // chão de pedra na última linha
  COL.initCollision({
    world: grade, W: 8, H: 6, isWheelchair: () => false, isModoCego: () => false,
    caneDiv: () => 1, wcSolid: () => new Set(), gateTiles: () => new Set(), gateOpen: () => true,
  });
  initElevators({ W: 8, H: 6, isWheelchair: () => false }); buildElevators();
  PHY.initPhysics({
    rng: createRng(), t: (k) => k, input,
    getPlayers: () => [],
    isWheelchair: () => false, isModoCego: () => false, caneOn: () => false, WORLD_PX_H: () => 10000,
    sfx: noop, srSay: noop, srAlert: noop, hideTips: noop, showPower: noop,
    nav: { sonar: () => { sondagens++; }, caneTap: noop, waterNav: noop,
      needsAudioCues: () => false, panFor: () => 0, playerCtx: () => null },
    tonePan: noop, noiseHit: noop, surfaceUnder: () => null,
    puffDust: noop, setSquash: noop, addShake: noop, addHitstop: noop, POWER_MSG: () => '',
    coinPools: () => ({ shapes: [], letters: [] }), rebuildCoins: noop, updateHud: noop, setCollected: noop,
  });
  const pl = makePlayer(0);
  pl.ctrl = JSON.parse(JSON.stringify(KB_DEFAULTS.solo)); pl.pad = -1;
  pl.x = 64; pl.y = 5 * 16 - BOX.h / 2 + BOX.h / 2;      // em pé no chão
  pl.y = 80; pl.onGround = true;
  pl.owned = ['jump', 'turbo'];                           // há poder para trocar
  return pl;
}

beforeEach(() => { keys.clear(); });

describe('a física já não sonda — o acorde saiu', () => {
  it('🔴 SEGURAR «trocar» não toca o sonar, por mais tempo que se segure', () => {
    // 📏 O acorde disparava a `_swapT > 18` (uns 0,3 s a 60 quadros). Sessenta quadros é mais do triplo.
    const pl = arreio();
    keys.add('KeyI');                                     // action4 — «trocar poder» no esquema solo
    for (let q = 0; q < 60; q++) PHY.stepPlayer(pl, 1);
    expect(sondagens).toBe(0);
  });

  it('🔴 nem o acorde trocar+especial, que era a outra porta', () => {
    const pl = arreio();
    keys.add('KeyI'); keys.add('KeyK');                   // action4 + action3
    for (let q = 0; q < 30; q++) PHY.stepPlayer(pl, 1);
    expect(sondagens).toBe(0);
  });

  it('🎯 e segurar «trocar» voltou a TROCAR ao soltar — deixou de significar «não trocar»', () => {
    // 📌 O que o acorde cobrava: `_swapSonar` engolia a troca depois de uma sondagem, então segurar o botão
    // por mais de 0,3 s não trocava poder nenhum. Sem sonar aqui, não há o que engolir.
    const pl = arreio();
    const antes = pl.activePower;
    keys.add('KeyI');
    for (let q = 0; q < 60; q++) PHY.stepPlayer(pl, 1);
    expect(pl.activePower, 'ainda a segurar, nada mudou').toBe(antes);
    keys.delete('KeyI');
    PHY.stepPlayer(pl, 1);
    expect(pl.activePower, 'ao soltar, trocou').not.toBe(antes);
  });

  it('⚠️ e o toque curto continua a trocar, como sempre fez', () => {
    const pl = arreio();
    const antes = pl.activePower;
    keys.add('KeyI'); PHY.stepPlayer(pl, 1);
    keys.delete('KeyI'); PHY.stepPlayer(pl, 1);
    expect(pl.activePower).not.toBe(antes);
    expect(sondagens).toBe(0);
  });
});

describe('e o R1 é a porta, nomeada', () => {
  const RAIZ = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');
  const PRESET = readFileSync(join(process.cwd(), 'app', 'js', 'game', 'platformer-preset.ts'), 'utf8');
  const FISICA = readFileSync(join(process.cwd(), 'app', 'js', 'game', 'physics.ts'), 'utf8');

  it('🎯 a raiz toca o sonar quando o `rightShoulder` é pressionado', () => {
    // 📌 Por leitura do fonte porque a raiz arranca o PixiJS de verdade e não entra num teste — a mesma razão
    // que `reach-notice-plataforma` já regista.
    const corpo = RAIZ.slice(RAIZ.indexOf('function receberComando'));
    expect(corpo.slice(0, corpo.indexOf('\n}'))).toMatch(/rightShoulder'[\s\S]{0,160}nav\.sonar\(/);
  });

  it('⚠️ o preset DECLARA o R1, senão o botão existiria sem nome em lado nenhum', () => {
    expect(PRESET).toMatch(/rightShoulder:\s*\{\s*labelKey:\s*'act\.sonar',\s*shortKey:\s*'legend\.sonar'\s*\}/);
  });

  it('🔴 e `updatePowerSwap` não chama o sonar — uma segunda porta tornaria a primeira invisível', () => {
    const corpo = FISICA.slice(FISICA.indexOf('function updatePowerSwap'));
    expect(corpo.slice(0, corpo.indexOf('\n}'))).not.toMatch(/nav\.sonar/);
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. Repor `if (!pl._swapSonar && (pl._swapT > 18 …)) C.nav.sonar(pl)` em `updatePowerSwap`: caem os três
//    primeiros casos (as duas portas do acorde e a troca ao soltar).
// 2. Tirar a chamada do `rightShoulder` em `main.ts`: cai o caso da raiz.
// 3. Tirar `rightShoulder` do preset: cai o caso da declaração.
