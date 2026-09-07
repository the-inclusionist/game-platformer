# Estudo — Compatibilidade com Tiled (mapas) e Aseprite (sprites)

Pedido do José em 2026-07-03: estudar deixar o jogo compatível com arquivos de **Tiled** e **Aseprite** antes
de prosseguir com o tilemap/engine. Pesquisa research-first (fontes ao fim de cada seção). **Nenhum código
alterado** — é estudo para decisão.

---

## A. Tiled (editor de mapas) — VEREDITO: não adotar como formato; manter texto-glifo

Adotar o Tiled como formato **reverteria** a decisão travada hoje (mapa como *ascii art* legível/diffável) e
**fere pilares** (no-build/enxuto/procedural). Detalhes:

- **Formatos:** JSON (`.tmj`) é o único fácil de ler sem build (`JSON.parse` nativo); TMX=XML, CSV perde
  tilesets/objetos, Lua inútil. Mas todos guardam `"data":[2,2,1,10,…]` (ou XML) → **ilegível como arte e com
  diff ruim** (inserir uma coluna desloca todos os índices). É o oposto do seu objetivo.
- **Libs Pixi↔Tiled** (`@pixi/tilemap`, `pixi-tiledmap`): assumem **bundler + spritesheet + Pixi v8** → ferem
  no-build/enxuto/nossa v7. Se um dia ler `.tmj`, o parser é **de mão** (JSON, `encoding:"csv"`, sem compressão
  — ~20 linhas, mascarando as flip-flags `& ~0xE0000000`).
- **Modelo procedural:** o Tiled é orientado a *imagem de tileset*; nosso jogo é *cor por tipo* (`TILE_COLOR`).
  Usá-lo exigiria criar PNGs de tileset (nem que placeholders) + `firstgid`→nosso tipo via "Collection of
  Images" com `inclType` por tile. Duplica o modelo. Chave/portão/itens caberiam bem em **object layers**.
- **Editor custom NÃO fica obsoleto** (para este jogo): o custom reusa o mesmo `parseLevel`/legend (uma verdade
  só), valida regras do **jogo** (spawn, portão-sem-chave, regiões inalcançáveis) que o Tiled não sabe, e prova
  as fronteiras da engine. Reavaliar Tiled só como **editor compartilhado dos 35+ jogos**, no futuro.
- **Licença:** app Tiled é GPLv2+, mas **arquivos exportados não herdam** (output ≠ derivado; spec TMX é
  CC BY-SA). Sem conflito com nosso GPL-3.0.
- **Ponte opcional (se quiser a edição visual do Tiled um dia):** conversores `texto→.tmj` (abre no Tiled) e
  `.tmj→texto` (regrava o canônico). O jogo **nunca** lê `.tmj`; o `.txt` segue sendo a fonte no git. É variante
  disciplinada da "Opção A", não adoção do Tiled como formato.

**Recomendação A:** manter o **texto-glifo canônico** (`plano-editor-mapa.md`) e o **editor custom**. Tiled só
como conversor opcional de autoria, se e quando desejado.

*Fontes:* doc.mapeditor.org (JSON Map Format, Global Tile IDs, TMX, Editing Tilesets) · npm @pixi/tilemap ·
github riebel/pixi-tiledmap · gnu.org GPL-FAQ (output≠derivado).

---

## B. Aseprite (sprites/animação) — VEREDITO: pipeline tecnicamente ótimo, MAS há uma decisão de pilar

O caminho **atlas PNG + JSON** é limpo e vantajoso, e o repo **já usa PNGs** (`game.js`: `SPR=`, `pngTex`,
`A('andar',8)` → ~40+ PNGs individuais por personagem). Tecnicamente resolvido:

- **Export:** `aseprite -b menino.aseprite --sheet menino.png --data menino.json --format json-array
  --list-tags --filename-format '{tag}-{tagframe}'` (sem `--trim` no v1 = preserva "pés na linha").
- **JSON:** `frames[]` (`frame{x,y,w,h}`, `duration` em **ms**, `spriteSourceSize`, `sourceSize`) +
  `meta.frameTags` (`name`,`from`,`to`,`direction`) = as animações + `meta.slices` (pivot/hitbox) +
  `meta.layers`.
- **Loader PixiJS v7 (offline, sem build):** o único passo não-nativo é converter **`frameTags`→`animations`**
  (dict `nome→[chaves]`, ~15 linhas); o resto do JSON o `PIXI.Spritesheet` já entende. `BaseTexture` com
  `SCALE_MODES.NEAREST` **antes** do `parse()` (mantém pixel-art). São **2 arquivos** (png+json) por personagem,
  cacheados no SW.
- **Ganhos (importam no hardware-alvo fraco = inclusão):** ~40 requests → **2**; N base-textures → **1** →
  **batching WebGL** (menos texture-swaps); cache PWA mais simples.
- **Cadência:** manter o `ANIM.*Hold` atual (holds em ticks) e só trocar a **fonte** das texturas — **zero
  regressão** de timing, painel `?debug` intacto. Migrar para durações-por-frame (ms do Aseprite) fica para
  depois, dentro do subsistema de animação da engine.
- **Slices** → **pivot dos pés** (elimina alinhamento manual); **layers** → variações de **forma** (ex.:
  **cadeira de rodas** como layer por cima, sincronizada por tag) — casa com "forma=camada, cor=palette-swap".
- **Licença:** Aseprite é pago (EULA: só não redistribuir o *app*), mas **os assets exportados são seus** e o
  **formato é aberto** → **nenhuma** implicação para o GPL-3.0 (só lemos PNG+JSON nossos; não parsear `.aseprite`
  nativo em runtime).
- **Encaixe na engine:** loader em `render/aseprite-loader.js`, chamado no **boot async** já previsto; a
  **entidade** recebe `{animations, anchor}` já parseado — não sabe que veio do Aseprite (troca de fonte no
  futuro não a afeta).

### ⚠️ A DECISÃO que isto força (pilar do CLAUDE.md)
O `CLAUDE.md` crava **"arte = dados/algoritmo; nenhum PNG embutido (GPL-clean)"** e **ASCII paramétrico** como
rumo oficial da arte. Mas o jogo **já carrega PNGs** (PixelLab, "fase atual"), e o atlas Aseprite **consolida o
caminho PNG** — contradizendo o pilar. **Não dá para 'adotar Aseprite' sem o José decidir conscientemente:**
o atlas PNG vira a **fonte oficial** (revisando o pilar), ou o Aseprite é só **ferramenta de autoria** enquanto
o jogo caminha para arte-como-dados?

### Restrição a11y (independe da decisão)
O **alto-contraste** hoje gera silhueta do caminho **ASCII/indexado** (`silhouetteCanvasIdx`). O atlas de cor
**não** produz silhueta sozinho. Então, adotando ou não o Aseprite, é preciso **preservar o caminho
ASCII/indexado** como (a) fonte do alto-contraste e (b) fallback — ou gerar a silhueta do alpha do atlas na
carga. (Pilar a11y AAA — não pode regredir.)

*Fontes:* aseprite.org/docs/cli · gists dacap (json-hash/array) · pixijs.com guides Spritesheets v7 ·
community.aseprite.org (frameTags→animations middleware; slices/pivot) · aseprite.org/faq + EULA (uso de assets).

---

## C. Impacto nas decisões anteriores
- **`plano-editor-mapa.md`:** confirmado — texto-glifo + editor custom seguem. Tiled não muda nada (no máximo um
  conversor opcional futuro).
- **`../2-Architecture/plano-engine.md`:** o subsistema **Render** ganha um `aseprite-loader.js` (se a decisão B for "adotar");
  o subsistema **Entidades** consome `animations`. O **alto-contraste** amarra o caminho ASCII/indexado — a
  engine deve mantê-lo como subsistema vivo, não descartável.
- **Repo público (GPL):** aviso lateral — a **procedência/licença dos PNGs atuais** (PixelLab) precisa ser
  confirmada limpa para o repositório público, independentemente do Aseprite. (Verificar antes do 1º push.)

## D. Decisões pendentes (José)
1. **Tiled:** confirmar a Recomendação A (texto-glifo canônico; Tiled só como conversor opcional).
2. **Aseprite / rumo da arte:** atlas PNG como fonte oficial (revisando o pilar) × só autoria (rumo procedural)
   × adiar. (Independe: preservar o caminho ASCII/indexado do alto-contraste.)
