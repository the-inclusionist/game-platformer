// SPDX-License-Identifier: AGPL-3.0-or-later
// O SHELL SOLTO — a casca que este repositorio poe a volta do proprio cartucho para se poder desenvolver,
// testar, auditar e demonstrar sem plataforma nenhuma a existir (ADR-0140 §2 e §3).
//
// ⚠️ ELE NAO E' UMA ROTA DE ENTREGA. O ADR-0140 §3 escreve isso como LIMITE e nao como permissao: um build
// solto que existe para quem trabalha neste repositorio nao e' unidade de instalacao de ninguem; um build
// solto IMPLANTADO PARA CRIANCAS e', e ai vale cada palavra do ADR-0117 — o cache parte-se por origem e as
// preferencias de acessibilidade deixam de seguir a crianca de um jogo para o outro.
//
// 📌 E E' A UNICA DIFERENCA entre os dois modos. A plataforma e' outro shell a volta da MESMA fabrica, e
// nada dentro do jogo sabe qual deles o carregou.
import '@the-inclusionist/engine/style.css';
import * as PIXI from 'pixi.js';
import { startLoop } from '@the-inclusionist/engine/core/loop.js';
import { criarAvisoDeQueda } from '@the-inclusionist/engine/ui/loop-crash.js';
import { createRng } from '@the-inclusionist/engine/core/rng.js';
import { t } from '@the-inclusionist/engine/core/i18n.js';
import { srAlert } from '@the-inclusionist/engine/core/a11y-sr.js';
import { create } from './index.js';

const regiao = document.querySelector<HTMLElement>('#game-region');
if (!regiao) throw new Error('standalone: sem `#game-region` nao ha onde o cartucho viver');

/*
 * A CORRENTE DESTE CARTUCHO (ADR-0141 §1). O shell constroi UM `createRng` por cartucho e entrega-o; o jogo
 * nunca importa `rnd`/`randInt`/`shuffle`/`reseed`, que sao atalhos ligados a uma corrente partilhada.
 *
 * 📌 SEM SEMENTE EXPLICITA, e a omissao e' deliberada: `createRng()` nasce com a `SEMENTE_PADRAO`, a MESMA
 * que a corrente partilhada usava, entao o comportamento sorteado deste jogo e' identico ao de antes da
 * mudanca. QUEM ESCOLHE A SEMENTE e' a unica pergunta que o `cartridge-contract.md` deixa em aberto e que a
 * leitura do codigo nao resolveu — e este jogo nao le `?seed=` nenhum (le `?record=1` e `?debug=true`), entao
 * nao ha aqui evidencia que decida. Fica por decidir, e nao por inventar.
 */
const rng = createRng();

/*
 * ⚠️ O QUE ESTE SHELL AINDA NAO FAZ, e a ausencia esta escrita porque e' a parte que falta do ADR-0139:
 *
 * ELE NAO CHAMA `createGame`. Deveria — e' o shell quem possui a raiz de composicao, e o cartucho nunca a
 * chama. Nao chama hoje porque a engine montaria a SUA barra de acessibilidade (`#title-icons`) e o SEU
 * cartao de pausa por cima dos que este jogo desenha a mao: duas barras, dois cartoes, dois donos das mesmas
 * teclas. Nao ha meio-termo silencioso entre os dois.
 *
 * A causa esta medida e entregue a quem cuida da engine: dos nove modulos de painel de `ui/`, OITO criam zero
 * elementos e exigem 63 ids de marcacao ja prontos, e o `ui/panel-shell` — que construiria essa marcacao —
 * nao tem chamador nenhum dentro do pacote. Enquanto isso nao mudar, os 36 overlays deste jogo tem de
 * continuar a viver fora do `#game-region`, que e' 1% do documento, e um cartucho nao pode entregar a pagina.
 *
 * 📌 A SEQUENCIA JA ESTA DESENHADA para o dia em que der: `createGame(...)` com uma declaracao minima do
 * shell, depois `engine.mount(inst.declaration, inst.hooks)` — o `mount` da 9.0.0 existe (ADR-0142) para uma
 * declaracao poder chegar DEPOIS do arranque, que e' o caso de qualquer jogo que carregue o nivel da rede.
 */

const inst = await create({
  // `engine` fica por preencher pela razao acima; ver `src/contract.ts`.
  engine: undefined as never,
  region: regiao,
  rng,
  t,
  // Na plataforma ha UM endereco para todos os cartuchos, entao um cartucho que lesse `location.search`
  // direto leria os parametros de outro jogo. Aqui o shell e' dono do endereco e entrega-o inteiro.
  params: new URLSearchParams(location.search),
});

/*
 * O LACO E' DO SHELL, e nao do cartucho (ADR-0139). Seis cartuchos a abrir cada um o seu `requestAnimationFrame`
 * seriam seis lacos a disputar o mesmo quadro; na plataforma ha UM laco a chamar o `update(dt)` de cada
 * cartucho montado.
 *
 * ⚠️ `dt` VAI EM QUADROS porque o `deltaTime` do ticker do PixiJS vai — fisica copiada de um tutorial em
 * segundos corre errada, e e' a convencao herdada que mais se quebra.
 *
 * E o `aoFalhar` e' onde vive a decisao D16: «um jogo partido tem de continuar distinguivel de um motor
 * partido». Um cartucho que rebenta para a si proprio, DIZENDO que parou, em vez de parar a plataforma em
 * silencio — tela congelada e' sintoma visual, e no modo cego um jogo parado e um jogo a pensar produzem
 * exatamente a mesma coisa.
 */
startLoop(
  PIXI.Ticker.shared,
  (dt: number) => inst.update(dt),
  2,
  {
    aoFalhar: criarAvisoDeQueda({
      procurar: (sel: string) => document.querySelector<HTMLElement>(sel),
      criar: (tag: string) => document.createElement(tag),
      // `srAlert` e nao a voz neural, e o contrato diz exatamente isto: «the shell wires it to `srAlert`
      // and to something visible». O canal do leitor de tela e' SEM ESTADO e existe sempre; a voz neural
      // e' do host e pode nao ter sido carregada — e o momento em que o laco cai e' o pior possivel para
      // depender de algo que talvez nao esteja la.
      narrar: (texto: string) => srAlert(texto),
    }),
  },
);
