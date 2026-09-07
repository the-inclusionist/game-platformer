# Plano — Formato de mapa em texto (1 glifo/tile) + editor de mapas

Pedido do José em 2026-07-03: mapas em **texto plano, 1 caractere por tile**, escolhidos para que o arquivo,
aberto num editor, **pareça ascii art**. Substitui o `CLARITY_MAP` atual (array de números de 1–2 dígitos —
os tipos 10–14 quebram o alinhamento de colunas). Decisão travada: **glifos significativos** (não códigos
alfanuméricos). Editor é ferramenta de dev → vive em `tools/` (fora do `app/`).

## 1. Referências estudadas (o que fazem os formatos consagrados)
- **Mapas ASCII de roguelike** (NetHack, libtcod, Brogue): 1 char/tile, glifos mnemônicos (`#` parede, `.`
  chão, `+` porta, `~` água). É a prova de que "texto = mapa legível" funciona há décadas. → nosso alvo.
- **PICO-8 / TIC-80**: mapa como grade de tiles indexados; edição por editor visual embutido. Lição: **editor
  visual + dados simples** é o fluxo que funciona para quem autora nível.
- **Tiled (formato TMX/CSV)**: padrão da indústria; exporta CSV de índices ou XML. Poderoso, mas **pesado e
  não-legível como arte** (índices numéricos). Bom p/ inspirar o *parser*, não o formato de leitura humana.
- **Sokoban level format (.sok/XSB)**: 1 char/tile (`#`,`$`,`.`,`@`) — padrão de fato, legível, versionável.
  Confirma: **legend fixo de glifos + linhas de texto** é o formato certo p/ diff no git e leitura humana.

Conclusão: adotar o **modelo roguelike/Sokoban** — legend de glifos + linhas de texto — e um **editor visual
próprio** estilo PICO-8 (mas em `tools/`, no-build).

## 2. Legend proposto (15 tipos → 15 glifos)
Escolhidos p/ evocar o que representam e manterem a paisagem legível (terreno = pontuação/símbolos; power-ups =
LETRAS maiúsculas mnemônicas, como itens de roguelike):

| tipo | significado | glifo | por quê |
|---|---|---|---|
| 1 | ar (iluminado) | `.` | vazio |
| 0 | ar escuro / região secreta | `:` | vazio "sombreado" (regiões que acendem) |
| 2 | pedra / chão sólido | `#` | bloco sólido padrão |
| 6 | parede dura (sem quicar) | `=` | outro sólido, distinto do chão |
| 3 | água | `~` | onda |
| 4 | escada | `H` | degraus |
| 5 | trampolim | `^` | impulso p/ cima |
| 9 | lava / perigo | `x` | espinho/dano |
| 10 | portão | `\|` | porta fechada |
| 11 | chave | `*` | item brilhante |
| 7 | power-up super-pulo | `S` | **S**uper |
| 8 | power-up voo | `F` | **F**ly |
| 12 | power-up super-corrida | `T` | **T**urbo |
| 13 | power-up ultra-pulo | `U` | **U**ltra |
| 14 | power-up ventosa | `C` | **C**ling |

> Exemplo (o que você aprovou):
> ```
> ##############
> #............#
> #....HHH.....#
> #....H.......#
> #..*.H..^^...#
> #####H#####xx#
> ~~~~~~~~~~~~~~
> ```

Legend versionado num só lugar (`core/tiles.js` ou cabeçalho do arquivo), para o parser e o editor lerem a
mesma verdade. Tipos futuros = novo glifo no legend (sem tocar nos mapas existentes).

## 3. Formato do arquivo `.txt`
- Uma linha por linha do mapa; um glifo por tile. **Linhas podem ter comprimentos diferentes** (o mapa atual é
  irregular) → o parser preenche à direita com ar (`.`) até a largura máxima (é o que o `buildWorld` já faz com
  `undefined→0`; manteremos, mapeando o "vazio à direita" para o ar padrão).
- Cabeçalho opcional em linhas iniciadas por `#!` (meta: nome, autor) — ignorado pelo parser de grid. (Cuidado:
  `#` é glifo de parede, então o marcador de meta é `#!` no **início da linha**, distinguível.)
- Codificação UTF-8, sem BOM, `\n`. Extensão `.map.txt` (deixa claro que é texto).
- Local: **`app/assets/levels/ludico.map.txt`** (dado de runtime; vai no deploy) — fonte única, legível,
  diffável no git (seu objetivo).

## 4. Parser no `world.js` (já isolado — cai limpo)
- Novo `parseLevel(text) → grid numérico` (glifo→tipo pelo legend; vazio→ar). Substitui o `CLARITY_MAP` inline.
- `buildWorld` passa a receber o texto e chamar `parseLevel` + o `expandNarrowPassages` atual (inalterado).
- **Carregamento:** o `.txt` é buscado por `fetch` no boot (assíncrono) e pré-cacheado no SW. Isso torna o
  init do mundo **assíncrono** — é uma mudança de boot que o **estudo da engine** (§ boot/asset-loading)
  precisa endereçar; alternativa sync = embutir o texto num módulo JS (`levels/ludico.js` exportando a string),
  mas perde a leitura-como-`.txt` que é justamente seu objetivo. **Recomendo o `.txt` + boot async.**

## 5. Editor de mapas (`tools/map-editor.html`, standalone, no-build)
- Uma página HTML/JS/CSS autossuficiente (como o jogo): **abre e salva o `.map.txt`**.
- **Paleta** dos 15 tipos (ícone + glifo + nome), **pincel** (clicar/arrastar pinta), borracha (= ar), balde,
  seleção retangular, redimensionar grade, desfazer/refazer.
- **Espelho ao vivo**: painel mostrando o texto-glifo (o "ascii art") e o preview renderizado lado a lado.
- **Validação**: avisa tiles órfãos, falta de spawn, portão sem chave, regiões inalcançáveis (reusa a lógica de
  componentes conexos do `buildDarkRegions`).
- **I/O**: File System Access API onde houver; senão, download/upload do `.txt`. Sem servidor, sem build.
- Reusa o **mesmo legend** e (idealmente) o mesmo `parseLevel`/paleta de cores do jogo, importando de
  `core/` — o editor vira o primeiro "consumidor externo" dos módulos, validando as fronteiras da engine.

## 6. Entrega em etapas (cada uma = 1 commit verificado)
1. **Legend + `parseLevel`** em `core/` (+ testes de ida-e-volta: número↔glifo). Sem mudar o jogo ainda.
2. **Migrar `CLARITY_MAP` → `ludico.map.txt`** e `world.js` passa a parsear (boot async). Verificar: mundo
   idêntico (mesmo grid, `tileAt` bit-a-bit igual ao atual).
3. **Editor `tools/map-editor.html`**: pintar + carregar/salvar + validar + preview.
4. **Refino**: undo/redo, meta-cabeçalho, atalhos, exportar preview PNG.

## 7. Riscos
- **Grid irregular** (linhas de tamanhos diferentes) → regra explícita de preenchimento à direita (=ar), com
  teste comparando o grid resultante ao `CLARITY_MAP` atual antes de trocar.
- **Boot assíncrono** (fetch do `.txt`) → decidir no estudo da engine; recomendo async + tela/estado de "carregando".
- **`#` é parede e comentário** → meta só com `#!` no início da linha; nunca inferir comentário no meio.
- **Divergência editor×jogo** → editor importa o MESMO legend/parser do `core/` (uma verdade só).
