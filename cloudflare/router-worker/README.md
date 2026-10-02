# Router Worker — `o-inclusionista.jrocha.dev.br` → jogos

Este Worker resolve o impasse: o dominio `o-inclusionista.jrocha.dev.br` ja pertence ao projeto Pages do
SITE, e CF Pages so permite um dominio por projeto. Para servir o jogo em `.../game-platformer/*` do MESMO
dominio (necessario para partilhar o cache por origem, ADR-0117), este Worker intercepta duas rotas e
proxia-as para `game-platformer.pages.dev`. Tudo o resto cai para o site, como se o Worker nao existisse.

## Fluxo em producao

```
Browser                              CF edge
                                     +---------------------------------+
GET o-inclusionista.jrocha.dev.br  ─▶│ Rota /game-platformer/*  ─▶  Worker
            /game-platformer/        │                                 ╲
                                     │                                   proxia para
                                     │                                 ╱
                                     │                                 game-platformer.pages.dev
                                     │                                   /game-platformer/
                                     │
GET o-inclusionista.jrocha.dev.br  ─▶│ Rota /heavy/*            ─▶  Worker
            /heavy/<host><path>      │                                 ╲
                                     │                                   proxia para
                                     │                                 ╱
                                     │                                 game-platformer.pages.dev/heavy/
                                     │                                   (Pages Function → R2 LFS)
                                     │
GET o-inclusionista.jrocha.dev.br  ─▶│ Qualquer outra rota      ─▶  Pages project do site (inalterado)
            /...outro...             │
                                     +---------------------------------+
```

## Publicar

Pre-requisitos: `wrangler` instalado e autenticado (`wrangler login`).

```powershell
cd cloudflare/router-worker
wrangler deploy
```

O comando le o `wrangler.toml`, publica o Worker na conta e cria as rotas no zone `jrocha.dev.br`.

Se der erro `Zone not found` ou similar, confirma no dashboard que `jrocha.dev.br` esta na mesma conta
Cloudflare onde fazes `wrangler login`.

## Verificar

Com o Worker publicado e as rotas ativas:

```powershell
curl -I https://o-inclusionista.jrocha.dev.br/game-platformer/
curl -I https://o-inclusionista.jrocha.dev.br/heavy/huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx
```

Ambos devem devolver `200 OK` (ou `304` para o segundo com `If-None-Match`).

## Adicionar um segundo jogo

Quando o `game-chess` existir e tiver o seu proprio projeto Pages:

1. No `src/index.js`, descomentar a linha `'game-chess': 'game-chess.pages.dev'`.
2. Em `wrangler.toml`, acrescentar uma rota:
   ```toml
   [[routes]]
   pattern = "o-inclusionista.jrocha.dev.br/game-chess/*"
   zone_name = "jrocha.dev.br"
   ```
3. `wrangler deploy`.

O `/heavy/*` continua a ir para `game-platformer.pages.dev` (que tem a Pages Function com o binding R2);
nenhum outro jogo precisa de uma Function propria. Qualquer requer, inclui tudo entre uma e outra origem.
