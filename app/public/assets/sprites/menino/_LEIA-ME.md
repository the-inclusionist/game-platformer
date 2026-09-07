# Sprites — convenção de edição (Aseprite → jogo)

## Estrutura
```
assets/sprites/menino/
  <animação>/  0.png 1.png 2.png ...   (frames de COR, na ordem do jogo)
  _paleta-base.gpl                      (paleta indexada semântica)
  _LEIA-ME.md
```
Animações: `idle, andar, correr, pulo, escada, parede, teto, nadar, nadar-parado, voo, gracinha-joinha, gracinha-espreguicar, gracinha-aquecer`.

`pip/` (a pasta que o jogo carrega hoje) é DERIVADA daqui — eu sincronizo + gero os `_hc` (silhueta amarela de alto contraste) a partir destes frames. Não edite `pip/` à mão.

## Melhor caminho pra eu derivar (variantes: menina, cabelos, roupas, tons de pele)

**Use modo Indexado, paleta fixa, slots agrupados por material — a MESMA ordem em todos os frames.**
A derivação vira *troca de faixa de slots* (1 swap = troca a cor inteira de um material), não repintura.

### 8 cores serve?
- **Estilo CHAPADO (1 cor por material, sem sombra)** → sim, 8 é ideal e o swap fica trivial:
  `contorno, pele, cabelo, camisa, calça, olho, branco-do-olho, boca`.
- **Com leve sombreamento (2–3 tons por material)** → ~16 (a `_paleta-base.gpl`).

Recomendo **16 com sombra suave** (mais bonito sem complicar o swap), mas se você prefere o visual chapado pró-TDAH, **colapse pra 8** — funciona igual pra mim. O número de cores importa MENOS que: **mesma paleta + mesmo significado de slot em todo frame.**

### Slots da paleta (faixas que eu troco pra derivar)
| faixa | material | derivo trocando p/ |
|---|---|---|
| 02–05 | pele | tons Fitzpatrick |
| 06–08 | cabelo | qualquer cor/recorte |
| 09–11 | camisa | uniforme/roupas |
| 12–13 | calça/sapato | idem |
| 01,14–16 | contorno/olho/boca | fixos (identidade) |

A **menina** e cabelos diferentes mudam o *formato* (silhueta) — isso você desenha; a *cor* eu derivo por swap.

## Registro (alinhamento)
Mantenha **canvas de tamanho fixo por animação** e os **pés/ponto de contato sempre na mesma linha** entre frames. Assim eu não preciso re-alinhar por bounding-box — exporto direto.

## Export
Cada frame como **PNG indexado** (ou spritesheet por animação, me avise o layout). Eu cuido de `pip/`, `_hc`, swaps de variante e do `sw.js` (cache bump).
