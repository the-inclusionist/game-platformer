// SPDX-License-Identifier: AGPL-3.0-or-later
// O SHELL SOLTO — a casca que este repositório põe à volta do próprio cartucho para se poder desenvolver,
// testar, auditar e demonstrar sem plataforma nenhuma a existir (ADR-0140 §2 e §3).
//
// ⚠️ ELE NÃO É UMA ROTA DE ENTREGA. O ADR-0140 §3 escreve isso como LIMITE e não como permissão: um build
// solto que existe para quem trabalha neste repositório não é unidade de instalação de ninguém; um build
// solto IMPLANTADO PARA CRIANÇAS é, e aí vale cada palavra do ADR-0117 — o cache parte-se por origem e as
// preferências de acessibilidade deixam de seguir a criança de um jogo para o outro.
//
// 📌 E É A ÚNICA DIFERENÇA entre os dois modos. A plataforma é outro shell à volta da MESMA fábrica, e nada
// dentro do jogo sabe qual deles o carregou.
import '@the-inclusionist/engine/style.css';
import * as PIXI from 'pixi.js';
import { createGame } from '@the-inclusionist/engine';
import { startLoop } from '@the-inclusionist/engine/core/loop.js';
import { createCrashNotice } from '@the-inclusionist/engine/ui/loop-crash.js';
import { createRng } from '@the-inclusionist/engine/core/rng.js';
import cartucho from './index.js';

const regiao = document.querySelector<HTMLElement>('#game-region');
if (!regiao) throw new Error('standalone: sem `#game-region` não há onde o cartucho viver');

/*
 * A CORRENTE DESTE CARTUCHO (ADR-0141 §1). O shell constrói UM `createRng` por cartucho e entrega-o; o jogo
 * nunca importa `rnd`/`randInt`/`shuffle`/`reseed`, que são atalhos ligados a uma corrente partilhada.
 *
 * 📌 SEM SEMENTE EXPLÍCITA, e a omissão é deliberada: `createRng()` nasce com a `DEFAULT_SEED`, a MESMA que
 * a corrente partilhada usava, então o comportamento sorteado deste jogo é idêntico ao de antes. QUEM
 * ESCOLHE A SEMENTE continua a ser a única pergunta que o `cartridge-contract.md` deixa em aberto e que a
 * leitura do código não resolveu — e este jogo não lê `?seed=` nenhum. Fica por decidir, não por inventar.
 */
const rng = createRng();

/*
 * A RAIZ DE COMPOSIÇÃO, CHAMADA UMA VEZ — e é isto que faltava desde 11/09.
 *
 * O cartucho NUNCA chama `createGame` (ADR-0139): seis cartuchos a chamá-lo dentro de uma plataforma
 * deduplicariam os bytes e multiplicariam o que corre — N barras de acessibilidade, N instâncias de TTS e N
 * teclados a disputar o mesmo documento, que é falha pior do que embarcar a engine duas vezes, porque
 * aparece como defeito e não como peso.
 *
 * ⚠️ A METADE DO JOGO ENTRA ESPALHADA (`...cartucho.hooks`) e não como um campo: `CartridgeHooks` é
 * literalmente `Omit<GameHalf, 'declaration'>`, ou seja, as opções que só o jogo sabe responder. Espalhar é
 * o que torna o corte visível aqui — o que vem de `hooks` é do cartucho, o que está escrito abaixo é do host.
 *
 * 📌 `host.storage` fica de fora de propósito: a engine constrói a sua sobre o `localStorage` do `win`, e
 * uma segunda instância seriam duas verdades sobre o que a criança guardou.
 */
const engine = createGame({
  declaration: cartucho.declaration,
  host: { doc: document, win: window },
  ...cartucho.hooks,
});

/*
 * A FÁBRICA, DEPOIS DA ENGINE, porque o `ctx` carrega o que ela devolve.
 *
 * ⚠️ `await` porque este jogo espera o idioma e BUSCA o mapa do nível da rede antes de existir mundo nenhum.
 * Uma fábrica síncrona só serve um jogo cujo nível já está em código — o 15-puzzle e o 2048 —, e não um com
 * níveis em ficheiro. Ver o desvio registado em `src/contract.ts`.
 */
const inst = await cartucho.create({
  engine,
  region: regiao,
  rng,
  // O tradutor é o DA ENGINE, e não um segundo: ela constrói-o, regista nele os `dictionaries` que o
  // cartucho declarou, e resolve cada chave na língua da página. Dois tradutores numa página dariam à
  // criança metade do jogo traduzido.
  t: engine.t,
  // Na plataforma há UM endereço para todos os cartuchos, então um cartucho que lesse `location.search`
  // direto leria os parâmetros de outro jogo. Aqui o shell é dono do endereço e entrega-o inteiro.
  params: new URLSearchParams(location.search),
});

/*
 * O LAÇO É DO SHELL, e não do cartucho (ADR-0139). Seis cartuchos a abrir cada um o seu
 * `requestAnimationFrame` seriam seis laços a disputar o mesmo quadro; na plataforma há UM laço a chamar o
 * `update(dt)` de cada cartucho montado.
 *
 * ⚠️ `dt` VAI EM QUADROS porque o `deltaTime` do ticker do PixiJS vai — física copiada de um tutorial em
 * segundos corre errada, e é a convenção herdada que mais se quebra.
 *
 * 📌 `speed` vem da engine e não daqui: a velocidade do jogo é uma acomodação que a criança ajusta, e lê-la
 * a cada quadro é o que faz o ajuste chegar sem reiniciar nada.
 *
 * E o `onFailure` é onde vive a decisão D16: «um jogo partido tem de continuar distinguível de um motor
 * partido». Um cartucho que rebenta para a si próprio, DIZENDO que parou, em vez de parar a plataforma em
 * silêncio — tela congelada é sintoma visual, e no modo cego um jogo parado e um jogo a pensar produzem
 * exatamente a mesma coisa.
 */
const avisoDeQueda = createCrashNotice({
  t: engine.t,
  find: (sel: string) => document.querySelector<HTMLElement>(sel),
  create: (tag: string) => document.createElement(tag),
  // `engine.alert` e não a voz neural: o canal do leitor de tela existe sempre e não tem estado, e o instante
  // em que o laço cai é o pior possível para depender de algo que talvez não tenha carregado.
  narrate: (texto: string) => engine.alert(texto),
});

startLoop(PIXI.Ticker.shared, (dt: number) => inst.update(dt), 2, {
  speed: () => engine.gameSpeed(),
  onFailure: (falha: unknown) => avisoDeQueda(falha),
});
