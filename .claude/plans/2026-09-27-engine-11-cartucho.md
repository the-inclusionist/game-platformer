# `game-platformer` → engine 11.0.0, e o cartucho que o CI passa a exigir

> 📌 **Destino deste ficheiro:** `game-platformer/.claude/plans/`. Está aqui só porque o modo de plano não
> deixa escrever no repositório. Não há `.claude/plans/` nesse repo ainda — nada a versionar antes.

## Contexto

A engine publicou **11.0.0 hoje** (27/09, 21:31), depois da **10.0.0** (25/09). O `game-platformer` pede
`^9.0.0` e tem 9.0.0 instalada: **dois majores de distância**, com 185 rubricas de quebra nas duas entradas
do CHANGELOG.

Mudou o que faltava em setembro: existe **`docs/6-DevOps-SRE/Breaking-Changes.md`**, 4341 linhas escritas
*para quem consome*, com notas nomeadas (A … EB) e o passo a passo de cada uma. **Quarenta e quatro delas
mencionam este jogo.** O plano abaixo não re-deriva a migração — ele trabalha as notas, e deixa o
compilador enumerar o resto.

⚠️ **E o jogo já andou na direção certa sozinho.** Onze commits desde 23/09, com o tema *«comes home»*: ele
tirou **29 módulos da engine v9.0.0** e passou a possuí-los — colisão de grade, tabela de tipos de tile,
bengala e nado do cego, demonstração do assistente de pad, guia sonoro contínuo. Três voltaram («they were
accessibility, not furniture»). Isso já cumpre as notas **BY, CA, CB, CC, CD, DZ** e a **Y**. Não se
re-migra o que já está feito.

⚠️ **Há 1 commit não empurrado** (`7fb2e57`, de outra sessão). Não mexo nele.

---

## O que muda a FORMA do cartucho (e não só os nomes)

### DV · ADR-0253 — o build e o checador passam a ser da engine, e o CI fica vermelho sem eles

O workflow compartilhado corre `vite build --mode cartridge` e `npx inclusionist-check-cartridge` **sem
entrada para desligar**. A nota mede os sete jogos e diz: *«None of the seven passes the gate as it
stands»*. A engine publica `./build` (`defineGameBuild`), `CARTRIDGE_DIR = 'dist-lib'`,
`CARTRIDGE_FILE = 'cartridge.js'` e o binário `inclusionist-check-cartridge`.

```ts
import { defineGameBuild } from '@the-inclusionist/engine/build';
export default defineGameBuild({ cartridge: 'src/index.ts', config: { /* a config do app, como está */ } });
```

🔴 **E o passo 2 da nota nomeia este jogo, contra uma decisão que eu escrevi aqui em 11/09.** O export
**padrão** da entrada tem de ser o cartucho — `{ slug, declaration, hooks, create(ctx) }` — porque **o
checador lê `declaration` e `hooks` no import**, como o `createGame` faz no arranque. Hoje o
`src/index.ts` exporta membros nomeados, e o `src/contract.ts` argumenta, em letras garrafais, que
`declaration` e `hooks` **não podem** ser estáticos porque leem a rodada.

**O argumento perdeu, e o conserto não é revertê-lo: é responder a verdade do mundo vazio.** A declaração
passa a ser estática sobre um suporte que a fábrica preenche, e antes de `create()` responde o que é
verdade — `targetsOf` vazio, `focusOf` nulo, `topology()` com a medida do mundo ainda não carregado. Isso
é o que `conformanceProblems` vai invocar no checador, e é uma afirmação honesta, não um remendo. O
comentário de `src/contract.ts` reescreve-se para dizer que a engine decidiu e por quê.

### O cartucho passa a ser publicável

`package.json`: `build:lib` vira `vite build --mode cartridge` (ou sai), o `tsconfig` próprio do cartucho e
qualquer checador próprio saem, e `exports["."]` aponta para `./dist-lib/cartridge.js` com `types`
`./dist-lib/cartridge.d.ts`. Com isso `private: false` deixa de ser promessa vazia — em 11/09 não publiquei
justamente porque a página ainda era do jogo.

---

## As notas que exigem uma RESPOSTA deste jogo

| nota | o que o jogo tem de responder |
|---|---|
| **G / AC** | as acomodações `GAME_KEYED`, incluindo `ownerColors` e `contrastOutlines` — o arranque **recusa** um cartucho que não responda |
| **DW** (ADR-0255) | a biblioteca de fontes saiu do pacote: `uses: { fonts: [...] }` e `inclusionist-heavy dist --fonts "…"`. ⚠️ Medir primeiro se este jogo desenha com alguma família fora das da engine — não achei prova de que sim, e declarar por precaução carregaria peso que ninguém usa |
| **DS** (ADR-0243) | `gameSay(voice, text, language)` com o idioma **obrigatório**; a nota nomeia as palavras da alfabetização deste jogo → `'pt-BR'` |
| **DU** (ADR-0249) | a regra de trava recebe a resposta do jogo: `LatchReading.gameHoldsKeys`, `LatchedEdgeOptions.holdsKeys` — é o `seguraTeclas: true` já decidido em 11/09, agora por outra porta |
| **DN** | o jogo declara as CHAVES das suas palavras (preset, acomodações) — ele já tem `app/js/i18n/game-keys.ts` |
| **DT** | `GamepadCtx.wizardClosed()`, obrigatório |
| **DG / DM** | não há modo Libras, há **modo surdo**: `Engine.libras` → `Engine.deafMode`; o sonar lê o que está na tela |
| **EB / DZ** | `sonarPlayers` sai, e as categorias `guide`/`guard` do mixer somem — o guia já veio para casa em `69d2a06` |
| **AS** | existe `Engine.dispose()`: o `teardown()` do cartucho passa a ter em que se apoiar, em vez do `AbortController` sozinho |

## As ondas mecânicas (grandes, mas sem decisão)

- **AL–AR, AT–AW, CI–CP, CW, CX** — a superfície pública e os **nomes de ficheiro** falam inglês. `CAA` vira
  `AAC` em nomes, caminhos e chaves de i18n. Em 23/09 medi 40 símbolos e 6 módulos; hoje é maior, e é 1:1.
- **CS–DE (ADR-0232 D4)** — **nenhum módulo lê `localStorage`, `core/state` ou `core/i18n` por import**: a
  raiz constrói e injeta. Esta é a onda mais funda: alcança os 96 subcaminhos que este jogo importa, e não
  é renomeação — é mudar quem é dono do quê.
- **A, H, J–T** — os painéis, a pausa, o pad virtual e o rodapé mudaram de forma; boa parte já não é deste
  jogo se o passo de adotar `createGame` for feito junto.

---

## O que a execução de 27/09 descobriu, e o plano não sabia

🔴 **O contrato FOI renomeado, e eu disse o contrário ao ler a engine.** O pacote **instalado** declara
`holdsKeys()`, `keyboardMapping?` e `padMapping?`. Eu tinha lido o `dist-pkg` do repositório da engine, que
discordava do pacote — e estado de outro repositório não é premissa. Quem apanhou não foi o `tsc`, foi o
`conformanceProblems` da engine dentro do portão deste repositório. A resposta (`true`) não mudou; mudou o
nome da pergunta. Corrigido em `518fdc2`.

**O `Engine` que o `createGame` devolve já entrega quase tudo**: `settings: SettingsStore`, `t: Translate`,
`audio`, `crt`, `lq`, `input`, `keyboardConfig`, `say`, `alert`, `deafMode`, `overlays`, `tts`, `reading`,
`pause`, `mapSlot`. Então a onda da injeção é um **intermediário**, e não o destino: os 104 pontos que
passaram de nome solto para `settingsStore.X` ficam idênticos, e o que muda é a linha que os origina —
`createSettingsStore(store)` na raiz vira `ctx.engine.settings`. O mesmo para o tradutor.

**`createGame({ dictionaries })` é «THE ONE PLACE A GAME'S WORDS LIVE»**, e não o `registerDict` do shell:
todo termo que o jogo declara — `preset`, `accommodations`, `gameOptions`, `howToPlay`, `hud` — é chave
desse mapa. A fiação de dicionários do terceiro commit entra por esta porta quando o `createGame` for
adotado.

### Estado em 27/09, 21h16

Doze commits locais, nenhum empurrado (um deles é de outra sessão). **265 erros de tipo** (eram 383) e
**777 de 795 testes** a passar.

**Feito:** as ondas de renomeação e de injeção; o que nunca foi da engine veio para casa; as 18 acomodações
respondidas; o preset a declarar chaves; o **export padrão do cartucho** com declaração estática sobre
suporte (ADR-0253 passo 2); o **shell a chamar `createGame`**; e as cinco primeiras raízes apagadas.

**Falta uma peça só:** dezassete raízes e **~190 usos dos seus punhos** — `overlays` 27, `tts` 21,
`visual` 18, `motor` 16, `kbRuntime` 13, `touchCtl` 12, `gamepadApi` 11, `menuNav` 10, `pauseIcons` 9 —
mais os 36 overlays do `index.html`, o `defineGameBuild` e o `inclusionist-check-cartridge`. Parte disso
é comportamental e não mecânica: o que `visual.render()` significa depois de a engine possuir o painel é
pergunta, não renomeação.

⚠️ **E a árvore está vermelha de propósito**, com duas barras e dois cartões de pausa enquanto a deleção
não terminar: o `createGame` já monta a pilha e este jogo ainda desenha a sua.

### Estado em 02/10, 14h

Seis commits novos, nenhum empurrado (o Dev empurrou os treze anteriores). **129 erros de tipo**, todos em
`app/js/main.ts` — fora dele o compilador está limpo. Três agentes trabalharam em ficheiros disjuntos e cada
um correu só os seus testes, com mutação a provar que os casos novos mordem: as telas passaram a nascer no
documento que a raiz entrega (`cd2ed42`); o estado persistido, o *juice* e os menus recebem loja e barramento,
com as chaves gravadas idênticas byte a byte às da 9.0.0 (`c4de960`); cenas, física, quiz e guia sonoro falam a
11 (`ab3f350`), e isso destapou um defeito real — os geradores «puros» do quiz liam um `t` de módulo que só o
`initQuiz` preenche. O build do cartucho passou a ser o `defineGameBuild` da engine (`9194aa5`, passo 6). E a
raiz deixou de possuir o que o `createGame` possui (`deb1dc8`, `641fc15`): a loja de ajustes — uma segunda
guardava valores próprios em memória, e o alto contraste ligado na barra não chegava ao jogo —, os singletons
de módulo, os sete painéis de ajustes e o runtime de teclado. O que só este jogo faz quando um ajuste muda
ficou, como escuta na loja da engine que o `teardown()` solta.

**O que a execução descobriu e muda o resto do trabalho.** Uma raiz de `createGame` desenha **uma** tela: um
cartão de pausa (`#vp-pause-0`), uma barra e um HUD, todos do assento 0 (`create-game.js:2508-2519`, `:2133`).
O ADR-0144 diz que telas separadas são raízes separadas, cada uma com a sua pausa; e se quatro raízes podem
conviver numa página é desconhecido, porque a raiz procura `#vp-pause-0` e `#game-region` no documento
inteiro. Este jogo é de tela dividida para um a quatro jogadores, com pausa e HUD por tela. Por isso as
quatro peças que ainda faltam — a pausa, a barra, o HUD e o `initShell` (que na 11 continua a exigir
`openTypo`, `openAudio`, `buildScreenPause`: é a casca antiga deste jogo mantida viva na engine, e o
`createGame` não a usa) — não se resolvem por deleção mecânica. Dependem da decisão abaixo.

**Também por medir, e não adivinhado:** as cores por papel do alto contraste não têm evento na loja, e com o
painel da engine não se sabe ainda como o jogo fica a saber que mudaram; a trava de correr no toque passou a
perguntar ao aparelho, porque a engine não avisa quando mostra o pad. As duas ficam para o navegador.

### A decisão que falta: a pausa e o HUD numa tela dividida

**(A) Adotar a pausa e o HUD da engine, uma tela.** O cartão é um só, aberto pelo START de qualquer
jogador, e o `setPauseActor` diz à engine de que assento são os ajustes que se editam ali — o mundo é um só,
então pausar já parava os quatro. O HUD da engine cobre o assento 0; as moedas dos assentos 1–3 ficam
desenhadas pelo jogo na tela de cada um, ou saem. **Consequência:** cumpre o pedido de 07/09 («todo jogo da
engine deve ter o mesmo menu de pausa e ícones») e a verificação «uma barra e um cartão», e os jogadores 2–4
perdem o cartão próprio na sua tela. É o caminho que recomendo.

**(B) Manter a pausa e o HUD por tela deste jogo ao lado do `createGame`.** **Consequência:** duas pausas na
página — a da engine, que não se desliga (ADR-0120/0122), e a deste jogo —, contra o pedido de 07/09; e a
casca antiga continua a pedir os painéis que a engine já monta.

**(C) Pedir à engine cartões e HUD por assento numa raiz só.** **Consequência:** é trabalho do repositório da
engine (outra sessão), e este jogo espera ou faz (A) enquanto isso. Pode somar-se a (A) depois, se a pausa por
tela fizer falta às crianças.

✅ **Decidido pelo Dev em 02/10: (A).** O cartão e o HUD são os da engine; as moedas dos assentos 1–3 ficam
desenhadas pelo jogo na tela de cada um.

### Estado em 02/10, 15h — o jogo é um cartucho que a engine aceita

**`npm run validate` passa** (código de saída 0): `tsc` limpo, **80 ficheiros e 1407 testes** nos dois projetos,
os dois builds, e **`✓ cartridge dist-lib/cartridge.js: the engine's contract holds`** — o passo 7, o portão do CI.
**axe: 0 violações WCAG A/AA** (uma exclusão, o VLibras). O pacote, empacotado e instalado numa pasta vazia só com
os pares declarados, importa-se de fora: `slug`, `create`, 14 ganchos, pt/en/es, zero problemas de contrato.

**No navegador, contra `dist/`** (service worker morto, sha no título): o jogo arranca, entra em jogo por clique
real, o START dá a pausa rápida e o SELECT o cartão da engine (Voltar, Ajuda, Número de jogadores, Configurações,
Opções do jogo, Sair), o Escape devolve ao jogo; **uma barra e um cartão**; o HUD da engine diz «0 de 10 moedas»; e
um clique real no 🌗 da pausa rápida mudou o tema do assento 0 para `hc3` — o controle que já morreu calado uma vez.

Para lá chegar, depois da decisão (A): o `start` saiu do preset (a engine recusava-o), o mundo vazio passou de 0×0
a uma tela (o contrato recusava zero, e há agora um teste que o prende), o aviso de alcance ficou só o da engine, a
barra mudou-se para dentro do `#game-region` (dentro do título sumia em jogo), o cartucho deixou de importar a folha
de estilo da engine (o checador recusava-o), o repositório ganhou o `LICENSE` que declara, e as fontes servidas
passaram a ser exatamente as da 11 — faltavam as quinze letras cursivas que o botão de tipografia oferece.

**O que falta é decisão, e não trabalho:**
- **Publicar: pergunta ABERTA.** Medido em 02/10, 15h40: o cartucho `npm pack`+instala-se de fora e passa o
  checador — tecnicamente está pronto. O que falta é RAZÃO para publicar no npm público. A arquitectura (ADR-0036,
  0082, 0083) assume publicação, mas o único consumidor é a plataforma do próprio Dev; dentro de UMA origem, um
  `git+https://.../game-platformer#v0.2.0`, um workspace do pnpm ou um tarball do próprio servidor servem o mesmo
  propósito sem gravar o pacote em pedra na pré-versão `0.1.0`. **A pergunta ao Dev é «a plataforma já importa do
  npm, ou está num ponto que podia referir o cartucho por git+https / workspace?»**: a resposta decide se o passo 8
  é hoje ou mais tarde. Em todos os casos, `git push` dos 13 commits locais é o próximo passo real.
- **O que (A) custa, e por que o (C) é maior do que parecia (medido em 02/10 depois da resposta do Dev):** o Dev
  decidiu que *só o jogador 1 pausa (e todos pausam), mas cada um tem a sua própria configuração de inclusão e de
  jogo*. A engine 11 cumpre a primeira metade — `leadsTheScreen` já é o assento 0 — mas a `SettingsStore` é GLOBAL:
  `blindMode`, `cbSafe`, `wheelchair`, `oneButton`, `hcOutlineFg`, `letterCase`, `captionsOn` são lidas por todos. Só
  `vizMode` e a saída de áudio já são por jogador. O pedido (C) para a sessão da engine é maior do que a *«pausa por
  assento»* original: os painéis que a engine monta têm de EDITAR as configurações do assento que `setPauseActor`
  indica. Perdas visíveis sem (C): só o assento 0 edita qualquer coisa; «Sair» sai do assento 0; as cores por papel
  do alto contraste já não se podem mudar (ADR-0151, `offer: { roles: false }` no `create-game.js:1476`). As moedas
  do assento 0 ficam no topo central, debaixo da barra — mesmo problema de assento 0 condutor.
- **Voz neural: FEITO**, `uses: { neuralVoice: true }` (commit `84475ac`). A engine prefere a voz do aparelho (ADR-0200);
  o Kokoro entra só como alternativa quando não há voz no idioma da criança. Medido com dois pt-BR no aparelho: usa-se
  Daniel/Maria, Kokoro fica no `heavy/` para quem não os tem.
- **Reconhecimento de fala e narração nos TRÊS IDIOMAS: FEITO**, `uses: { reading: true }` (commit `43f5fda`), somado
  ao `neuralVoice`. Pedido do Dev de 02/10: o jogo tem de ter voz, texto e reconhecimento em pt-BR, en-US e es (MX/AR).
  O `dicts` já declara os três, e com `reading: true` a engine carrega modelos de leitura para o idioma vigente
  mais todos os `availableLocales()` (`create-game.js:3419`); os modelos de COMANDO vêm para todos os três de qualquer
  modo («Toda criança vai experimentar as três línguas imediatamente», o Dev no `create-game.js:3408`).
- **As cores por papel do alto contraste — respondido pela leitura, não falta medir.** O painel visual da engine 11
  não as OFERECE (`offer: { roles: false }`, e os escritores são `noEffect`, `create-game.js:1476-1478`): não há
  evento a escutar porque não há quem escreva. As cores que uma criança guardou na versão antiga continuam a valer
  (o `createHighContrast` do jogo lê-as do armazenamento), mas já não se mudam. É perda da 11, do lado da engine —
  vai junto do pedido (C), se o Dev o quiser fazer.
- **A entrega `heavy/`: espelho de 02/10 ampliado para pt-BR + en + es** (`C:\Users\candi\Claude\inclusionist-heavy-mirror\heavy\`,
  **1,2 GiB** — Kokoro + eSpeak NG + MediaPipe vision + Vosk pt/en/es + leitura pt/en/es + `onnxruntime-web`).
  Formato de ENTREGA (`heavy/<host><path>`): `cp -r <espelho>/heavy dist/` revive voz, visão e reconhecimento em
  qualquer `dist/`. O `--base` do `inclusionist-heavy` espera outro formato (`MIRROR_FOLDERS` de
  `platform/heavy-mirror`), que o repo da engine não gera.
- **Centralização de cache para centenas de jogos — pedido do Dev de 02/10, 15h40:** a engine JÁ FAZ. Medido no
  navegador em `dist/`: a Cache Storage tem um balde nomeado `incl-pesados-v2`, aberto pela engine em todo
  arranque, por `CacheStorage.open(CACHE_HEAVY)` (`platform/heavy.js:163`, `platform/heavy-catalogue.CACHE_HEAVY`).
  O navegador PARTILHA baldes nomeados entre páginas da mesma origem — e desduplica pelo URL. Então **servir
  todos os jogos sob UMA origem** faz o cache resolver-se sozinho: a criança descarrega 1,2 GiB UMA VEZ e os
  N jogos leem o mesmo cache nas visitas seguintes (ADR-0117: «the one who should pay this once is the PLATFORM»).
  📌 **O que o DEV precisa de fazer para que isto aconteça:** hospedar a plataforma e os jogos sob um domínio só
  (`inclusionist.app/game-platformer/`, `inclusionist.app/game-chess/`, …). Cada jogo serve o seu `/heavy/*` com
  os MESMOS ficheiros — podem ser cópias no disco ou um `/heavy/*` compartilhado por *rewrite* do servidor. O
  navegador cuida do resto; nenhum código muda. Em dev entre repos, cada jogo mantém o seu `cp` do espelho.
  🔴 **Diferentes origens perdem a partilha** (origem = esquema + host + porta): `game-platformer.app` e
  `game-chess.app` cada um descarrega 1,2 GiB. Alojar tudo num só domínio é a arquitectura que ADR-0117 nomeia.
- **Armazenamento pelo `ctx`:** o cartucho hoje guarda, pela loja crua (não a `settings`), estas chaves próprias:
  `KEYS.quizlevel(JOGO)`, `.cenario(JOGO)`, `.activity(JOGO)`, `.tabsel`, `.fracnot`, `.attract(JOGO,cen)` (as gravações
  do attract por cenário), `.reducedMotion` (JSON com as quatro flags de cena), e por jogador: `.easyP(i)`,
  `.toggleMoveP(i)`, `.toggleRunP(i)`, `.rmWalk/Breath/FlavorP(i)`, `.vizP(i)`, `.sinkP(i)`, e um `incl_hearingloss`
  avulso. **Resposta curta ao Dev**: nenhuma dessas chaves muda o modo como a página armazena — tudo cai no mesmo
  `localStorage` que a engine abre. Passar a loja pelo `ctx` só vale a pena se a plataforma vier a querer dar a cada
  criança a sua loja isolada (um `memoryBackend` por criança, ou um escopo com prefixo). É mudança pequena no
  cartucho (um `host.storage?` já existe no `createGame`), mas depende de a plataforma a pedir — a decisão **pode
  ficar para quando a plataforma a pedir, sem bloquear a publicação**.

### DW medido em 02/10: `uses.fonts` fica vazio

O jogo desenha texto com uma família só, `system-ui, sans-serif` (`render/textures.ts:90`), e nenhum CSS dele
nomeia outra. Não há família da biblioteca a declarar. ⚠️ Mas a página ainda liga **uma cópia própria** do
`fonts.css` antigo da engine (`app/public/vendor/`, 17 famílias, 932 KB de faces), com `@font-face` para
famílias que a 11 tirou do pacote (Lato, Source Sans 3…) e para as que a engine agora carrega ela mesma.
A nota manda apagar o `@font-face` próprio dessas famílias; tirar a cópia e o `preload` do `index.html` é
limpeza a fazer depois da pausa, medindo no navegador que a fonte do jogo continua a ser a Atkinson.
📌 **Medido depois (`ec0b723`): tirar a cópia estava ERRADO.** A engine não entrega as suas faces à página; quem
as serve é o `vendor/` de cada jogo. A cópia não sobrava — estava velha. Foi substituída pela da 11, byte a byte.

## Passos

1. **Subir e deixar o compilador enumerar.** `peerDependencies`/`devDependencies` para `^11.0.0`; `npm ci`
   do zero (⚠️ matar dev/preview antes — trancam o binário nativo do rolldown e o `npm ci` morre com
   `EPERM`); depois `npm run typecheck`. **A lista de erros é o mapa real**; as notas dizem o *porquê* e o
   *para quê*, o compilador diz *onde*.
2. **Trabalhar as notas por camada**, na ordem em que o documento as põe: `core` → `platform` → `input` →
   `render` → `ui` → `boot`. Cada nota traz a substituição; nenhuma se adivinha.
3. **A onda da injeção (CS–DE)** num passo próprio, porque muda donos e não nomes.
4. **Responder as acomodações** e as portas novas (`uses`, `hud`, `gamepad.wizardClosed`, `gameSay` com
   idioma). ⚠️ **Decisão sua em cada acomodação**: `false` numa que o jogo tem **remove** o controle da
   criança; palavra numa que ele não tem cria controle morto. Apuro e apresento a conta, uma a uma.
5. **O cartucho vira export padrão** e a declaração torna-se estática sobre o suporte que a fábrica
   preenche (ver DV acima). Reescrever o comentário de `src/contract.ts`: ele hoje argumenta o contrário.
6. **`defineGameBuild`** em `vite.config.ts`; sai a config de modo `lib` própria. `package.json`: `exports`,
   `types`, `files`, `build:lib` → `--mode cartridge`.
7. **`inclusionist-check-cartridge`** a passar — é o portão novo do CI compartilhado.
8. **Publicar**, com `private: false`, quando o checador estiver verde.

### Ficheiros críticos

`package.json` · `vite.config.ts` · `src/index.ts` (export padrão) · `src/contract.ts` (o comentário que
perdeu o argumento) · `src/standalone.ts` · `app/js/main.ts` · `app/js/declaration/platformer-declaration.ts`
· `app/index.html` · `.github/workflows/ci.yml` · os testes que leem o fonte
(`pause-icons-escritores`, `rng-do-cartucho`, `declaration`) — movem-se com ele.

### Reaproveitar, não reescrever

`Breaking-Changes.md` é a migração; `defineGameBuild` e `inclusionist-check-cartridge` substituem a config
dupla e qualquer checador próprio; `Engine.dispose()` substitui metade do `teardown` escrito à mão; os 29
módulos que vieram para casa **ficam** — não voltam para a engine.

---

## Verificação

1. `npm run validate` e `npm run test:a11y`, lendo o **código de saída** — `N passed` convive com erro não
   tratado e saída não-zero.
2. `npx inclusionist-check-cartridge` — o portão que o CI passou a correr.
3. O artefato do cartucho importado **de fora** da árvore que o publica; dentro dela as devDependencies
   mascaram o que falta.
4. **No navegador, contra `dist/`**: ⚠️ este jogo é PWA — matar o service worker, limpar `caches` e **ler o
   sha no título**. Em 11/09 o preview serviu precache de um build anterior à migração.
5. **Uma barra e um cartão de pausa, não dois**; e os painéis que a engine monta **abrem e agem** — um
   controle presente e morto é pior que um ausente, e foi assim que os ícones 🌗/🚥 morreram sem `tsc`,
   teste ou axe darem sinal.
6. ⚠️ **O teclado não se verifica por tecla real neste navegador**: ele entrega `keydown` com `key` certo,
   `code` **vazio** e `which` 0, e a engine identifica por `e.code`. Clique real para o que é clicável,
   Vitest para o resto.
7. **Uma suíte de cada vez** na máquina.

## O que eu não decido sozinho

- Cada acomodação, uma a uma.
- `uses.fonts` (depois de medir se o jogo desenha fora das famílias da engine), `genero`, `uses.neuralVoice`.
- Publicar o pacote — e o `git push`, que nunca é meu.
- A pausa e o HUD numa tela dividida: (A), (B) ou (C) acima.
- Se o cartucho recebe o armazenamento pelo `ctx` em vez de abrir o `localStorage` (hoje abre um invólucro
  sem memória sobre o mesmo armazenamento da engine; mudar é mexer no contrato do cartucho).
