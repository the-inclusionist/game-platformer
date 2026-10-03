# `game-platformer` → engine 11.0.0, e o cartucho que o CI passa a exigir

> 📌 **Historico do ficheiro.** Nasceu no modo de plano em 27/09 como `estude-o-pacote-da-cosmic-peach.md`
> (nome herdado do ponto onde o Dev entrou no plano). Em 02/10 passou a viver dentro deste repo em
> `.claude/plans/`, e a partir dai cresceu com cada estado-de-execucao. Em 02/10 17h00 o Dev notou que
> existiam dois (uma copia antiga, `estude-o-pacote-da-cosmic-peach.md`, e esta versao viva,
> `2026-09-27-engine-11-cartucho.md`); consolidou-se nesta, com o nome original.

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
  checador — tecnicamente está pronto. O que falta é RAZÃO para publicar no npm público.
  📌 **Correção da sessão da engine em 02/10 ~21h: o argumento mais forte contra (A) `npm publish` público
  é o PILAR 10 — o `dist-lib/` leva uma `.png` de arte, e a arte NÃO é FOSS.** Publicar no npm público
  distribuiria a arte via unpkg/jsdelivr/`npm search`/scanners. Eu nem toquei nisso na análise original.
  Também corrigiu o URL que citei (é `github.com/the-inclusionist/game-platformer`, não `jrocha-dev`).
  📌 **Fato novo (02/10 ~22h): o repositório passou a público.** Isso derruba o argumento *«git+https pede
  token em cada consumidor»* (que valia enquanto era privado); e enfraquece o argumento contra (A), porque
  a arte já está distribuível por `git clone` — pilar 10 virou pergunta de LICENÇA do próprio repo, não de
  método de publicação. **Recomendação (B) git+https por tag mantém-se**, agora pelo motivo isolado da
  imutabilidade do npm: `npm publish` grava `0.1.0` em pedra (unpublish só nas primeiras 72h), e em
  pré-versão isso é custo real; `git tag` é apagável. (B) exige commitar `dist-lib/` em cada tag (hoje está
  no `.gitignore`). Promover para (A) depois é mudar uma linha no `package.json` da plataforma.
- **O que (A) custa, e por que o pedido à engine é mais fundo do que «pausa por assento» (corrigido pela
  sessão da engine em 02/10 ~21h):** o Dev decidiu que *só o jogador 1 pausa (e todos pausam), mas cada um
  tem a sua própria configuração de inclusão e de jogo*. 🔴 **Correções que a sessão da engine fez à minha
  análise:**
  1. **A causa raiz é «uma raiz por tela», não «pausa por assento».** O pilar 7 diz *«N viewports, one sim»*
     — telas separadas vivem na MESMA raiz. A engine implementou pensando «uma raiz por tela» e por isso
     trata os jogadores 2–4 (que têm tela própria no platformer) como outro assento da MESMA tela. O id
     `#vp-pause-0` («pausa do viewport **0**») mostra que o cartão POR VIEWPORT estava previsto e nunca foi
     feito. O HUD tem o mesmo defeito (a engine monta UMA faixa, do assento 0, via `mountHudBands(…, numbers,
     0, …)`). **Nome correto do bloco: «uma tela por viewport», não «pausa por assento».**
  2. **Eu inventei o ADR-0151 como fonte de «SettingsStore global».** Esse ADR não diz isso. Memória
     violada: «identificador não resolvido é invenção».
  3. **Meu inventário de «já por jogador» na 11 estava curto.** Correto: `vizMode`, saída de áudio,
     `easyMode`, as alternâncias (`toggleMove`, `toggleRun`) e partes do `reducedMotion`. Globais que a 11
     ainda não resolveu: modo cego, caixa das letras, legendas, paleta segura, contorno do alto contraste,
     cadeira de rodas, um botão só.
  4. **Faltam restrições no pedido** (sem elas o conserto cria defeito novo):
     - **ADR-0014:** volume, voz e modo cego só editáveis por quem tem SAÍDA DE ÁUDIO PRÓPRIA — dois modos
       cegos no mesmo alto-falante viram ruído para os dois.
     - **Legendas têm um rodapé SÓ POR TELA** — não por assento.
  5. **A frase «cada um tem a sua própria configuração de inclusão» muda contrato e chaves guardadas** →
     vira **12.0** (breaking) e pede ADR na engine ANTES do código, registrando a decisão + as restrições
     acima.
- **Voz neural: FEITO**, `uses: { neuralVoice: true }` (commit `84475ac`). A engine prefere a voz do aparelho (ADR-0200);
  o Kokoro entra só como alternativa quando não há voz no idioma da criança. Medido com dois pt-BR no aparelho: usa-se
  Daniel/Maria, Kokoro fica no `heavy/` para quem não os tem.
- **Reconhecimento de fala e narração nos TRÊS IDIOMAS: FEITO**, `uses: { reading: true }` (commit `43f5fda`), somado
  ao `neuralVoice`. Pedido do Dev de 02/10: o jogo tem de ter voz, texto e reconhecimento em pt-BR, en-US e es (MX/AR).
  O `dicts` já declara os três, e com `reading: true` a engine carrega modelos de leitura para o idioma vigente
  mais todos os `availableLocales()` (`create-game.js:3419`); os modelos de COMANDO vêm para todos os três de qualquer
  modo («Toda criança vai experimentar as três línguas imediatamente», o Dev no `create-game.js:3408`).
- **As cores por papel do alto contraste — NÃO é defeito da engine (correção da sessão da engine, 02/10 ~21h).**
  O painel visual não oferece a linha porque OS PAPÉIS (perigo, água, portão…) são PALAVRAS DE UM JOGO. Para a
  engine oferecer a linha, o cartucho tem de DECLARAR os papéis que pinta. `offer: { roles: false }` é o
  default correto; `offer: { roles: true }` com a lista dos papéis do jogo é o que falta aqui. **Item pequeno
  e SEPARADO** do bloco «uma tela por viewport».
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

### Estado em 02/10, 20h — bugs do deploy encontrados em uso real

A publicação no Cloudflare (CF Pages + R2 + Router Worker) revelou tres bugs do MESMO padrao e um bug de
contrato que o plano original nao tinha listado como itens de trabalho:

**O padrao «caminho relativo + `<base href="/">`» — quatro ocorrencias ate 02/10 21h:**
- `fetch('assets/levels/clarity.map.txt')` em `main.ts` → mapa 404 → mundo vazio → `910e3ba`.
- `SPR = 'assets/sprites/menino/'` em `render/sprites.ts` → sprites do demo do pad → `910e3ba`.
- `ATLAS_URL = 'assets/sprite-atlas.png'` carregado por `PIXI.BaseTexture.from` → personagem invisivel → `29033ee`.
- `img.src = ATLAS_URL` na «rede» do `inpaintInto` (`render/sprites.ts:152`) — fallback raro mas 404 silencioso
  quando dispara em producao: as frestas de 1px voltariam no tronco do personagem sem erro no console →
  medido em 02/10 21h e consertado nesta mesma rodada.

Em todos: o `<base href="/">` (adicionado para a engine resolver `/heavy/*` na raiz do dominio, ADR-0117)
leva qualquer path relativo carregado por JS em RUNTIME a cair na raiz, fora do subpath `/game-platformer/`.
**Receita:** prefixar com `import.meta.env.BASE_URL`. 🔴 Padrao estavel: cada ocorrencia nova vai como item
cumprido neste bloco; nova varredura em 02/10 21h (`grep` por `fetch(`, `BaseTexture.from(`, `.src =`) nao
achou uma quinta.

**O contrato do `word()` da engine 11 (nota DN que o plano citava mas nao aplicava):**
- Painel «Mapear teclado» abria vazio porque `word('act.up')` devolvia `null`, apesar de `t('act.up')`
  resolver. Medido no navegador em 02/10: `createTranslator().word` so' le o dicionario DO JOGO
  (`core/i18n.js:201`), nunca o da engine — por desenho (ADR-0010 pilar 3), para o jogo nomear o proprio
  preset em vez de depender de fallback.
- Faltavam 12 chaves em `game-keys.ts`: `act.{up,down,left,right,run,jump,especial,swap}` + `legend.{run,jump}`.
  O plano cita a nota DN mas eu nao transformei em item «declarar as palavras do preset». Corrigido em `89a015f`.

### As perdas da Decisão (A) QUE EU DEIXEI SO' COMO «CUSTOS» (erro de planeamento, 02/10)

O Dev apontou-me em 02/10 20h que o plano descrevia o que (A) partia mas nao criava tarefas — por isso o
loop nao as atacava. Lista agora, com estado:
- **Mapear teclado abria vazio** → ✓ resolvido em `89a015f` (ver bloco acima).
- **Mapear controle, Mapear toque abrem vazios?** → ✓ medido no navegador em 02/10 20h: ambos abrem corretos.
  Causa prevista pela leitura confirmada: os tres painéis convergem em `wordsOf(preset, word)` da engine
  (`core/actions.js:70`), que resolve `labelKey` pelo dicionário do jogo (`word()`, ADR-0010 pilar 3). As 10
  chaves de `89a015f` destravaram os tres por uma via só. **Mapear controle** abre o wizard pedindo o primeiro
  botao («Aperte QUALQUER botão...»); **Mapear toque** mostra 9 slots visiveis (4 ocultos — START, L1/R1,
  L2/R2 — o jogo nao os nomeia) e cada select traz as 8 acoes nomeadas em pt-BR («Subir / escada», «Descer /
  escada», «Esquerda», «Direita», «Correr / interagir», «Pular», «Especial», «Trocar poder»).
- **FPS debug HUD aparece em (0,0) sem `?debug=true`** → ✓ medido novamente em 02/10 20h: NAO VAZA. O
  parent `#topbar-tools.topbar__right` carrega o atributo `hidden`, e a regra global `[hidden] { display:
  none !important }` esconde o `.hud__fps` dentro. `getBoundingClientRect()` do `.hud__fps` devolve `0×0` em
  `(0,0)` porque esta dentro de um ancestral sem renderizacao, nao porque esteja a desenhar em (0,0). A
  medicao de 15h, que diagnosticou «classe nao esta a ser escondida», estava errada — a classe nao precisa
  de ser escondida porque o ancestral o é.
- **Jogadores 2–4 nao abrem o cartao de pausa com START/SELECT** → engine 11 `leadsTheScreen === 0`
  (`create-game.js:2520`). **Vai no bloco «uma tela por viewport» da engine (ver secao de 02/10 ~21h).**
- **Painel visual nao oferece as cores por papel do alto contraste** → `offer: { roles: false }`
  (`create-game.js:1476`). **Correcao da sessao da engine: NAO e defeito; e' que o cartucho precisa de
  DECLARAR os papeis que pinta. Item SEPARADO do bloco «uma tela por viewport».**
- **«Sair» so' sai do assento 0, nao os outros assentos individualmente** → vai no bloco «uma tela por
  viewport» (depende de pausa+settings por assento).
- **Gamepad no ecra de titulo cai no anel generico da engine (perde-se o ◀▶ no numero de jogadores)** →
  medido pela leitura da engine em 02/10 20h55: **bug da engine, nao do jogo**. O pad vai por
  `menuWithDpad = () => !!overlays.topVisibleOverlay() || ...` (`create-game.js:2634`); o `#title-overlay` e um
  `.overlay` visivel → `menuWithDpad()` retorna `true` → `steerFrame` (`gamepad.js:406`) chama `steerPause(f)`
  em vez de `steerTitle(f)`. O `steerPause` tenta `navBar`, `navDialog`, `getPauseMenu(0)` — nenhum reage no
  titulo (barra desligada, `#vp-pause-0` escondido) → o pad nao faz nada; `ctx.navTitle` **nunca e chamado**.
  O teclado escapa porque o jogo tem `isNavigable()` (`main.ts:2035`) que filtra `title-overlay`/`win-overlay`
  e devolve `false`, fazendo o `ui/menu-nav` deixar a tecla passar. O pad nao tem equivalente — `menuWithDpad`
  nao aceita callback do jogo, entao o gancho `navTitle` fiado em `main.ts:2071` nunca e chamado. **Pedido (C)
  para a engine:** `menuWithDpad` precisa de uma versao `isNavigable`-equivalente para o pad, OU `steerPause`
  precisa cair para `steerTitle` quando nenhum menu da engine reage, OU o `steerFrame` precisa consultar o
  jogo pela mesma via do teclado antes de rotular como «pausa».
- **HUD «0 de 10 moedas» da engine fica no topo central** sobreposto a outros elementos (medido em jogo em
  02/10 17h). **Mesmo defeito arquitetural: a engine monta UMA faixa de HUD, do assento 0
  (`mountHudBands(…, numbers, 0, …)`); HUD por tela vai junto no bloco «uma tela por viewport»**. Correcao
  da sessao da engine: a uniformidade do HUD foi decisao do Dev em ADR-0168 (13/09) e ADR-0239 — eu
  justifiquei errado dizendo que era «so' sobre menu de pausa». **Paliativo acordado ate o HUD por tela
  existir: passar `hud: []`** (medido na engine: sem numeros, a faixa nao nasce). Quando o HUD por tela
  chegar, o platformer volta a usar o da engine.

### Estado em 02/10, ~22h — resposta da sessão da engine

A sessão da engine respondeu à minha mensagem de 02/10 ~21h e corrigiu-me em quase todos os pontos. As
correções já foram aplicadas nos blocos acima; esta secção consolida o PEDIDO ÚNICO como a sessão da engine
propôs, para servir de referência estável:

**Bloco «uma tela por viewport» (pedido único à engine, começa por ADR, vira 12.0):**
1. **Cartão de pausa POR VIEWPORT**, não só o do assento 0 (`#vp-pause-0` passa a ter irmãos `#vp-pause-1/2/3`).
2. **Menus POR VIEWPORT** (incluindo painéis de inclusão), ligados ao cartão daquele viewport.
3. **HUD POR VIEWPORT** (`mountHudBands` recebe o viewport, não só o assento 0).
4. **«Sair» POR VIEWPORT** — sai só a tela daquele viewport, deixa os outros a jogar.
5. **Ajustes de inclusão POR ASSENTO** no `SettingsStore`, com estas restrições do ADR-0014 e da
   acomodação de legendas:
   - **Modo cego, volume, voz** → só editáveis por assento com SAÍDA DE ÁUDIO PRÓPRIA (ADR-0014).
   - **Legendas** → um rodapé SÓ POR TELA, não por assento.
6. **Pad no título chama `navTitle` do jogo** (bug `menuWithDpad` descrito acima em 02/10 20h55).

**Começa com um ADR** registrando a decisão «cada criança tem a sua própria configuração de inclusão»
+ as duas restrições do item 5 + a lista de chaves do `localStorage` que vão mudar de global para
por-assento (necessário para o shim de migração). **Vira 12.0** (breaking: as chaves guardadas mudam de
forma).

**Fora deste bloco** (itens separados que a sessão da engine confirmou):
- **C.5 (cores por papel do alto contraste)**: pequeno item do CARTUCHO — declarar os papéis que pinta
  (`offer: { roles: true }` + lista), não da engine.
- **C.6 (pad no título)**: FICA no bloco acima (item 6) — a leitura da engine em 02/10 20h55 confirmou que
  é bug da engine, mesmo sem controle físico, porque o `ctx.navTitle` nunca sai do `steerPause`.
- **C.7 (`inclusionist-heavy --base` layout)**: backlog, não bloqueia.

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
- **Publicar o pacote** — e o `git push`, que nunca é meu. Rota recomendada: (B) `git+https` por tag, pela
  imutabilidade do npm em pré-versão; mudança para (A) depois é trivial.
- **HUD do jogo em tela dividida enquanto o bloco «uma tela por viewport» da engine não existir:** aceitar
  o paliativo `hud: []` + manter o HUD do jogo (acordado com a sessão da engine em 02/10 ~22h).
- Se o cartucho recebe o armazenamento pelo `ctx` em vez de abrir o `localStorage` (hoje abre um invólucro
  sem memória sobre o mesmo armazenamento da engine; mudar é mexer no contrato do cartucho).
