# Router Worker — `o-inclusionista.jrocha.dev.br` → jogos

Este Worker resolve o impasse: o dominio `o-inclusionista.jrocha.dev.br` ja pertence ao projeto Pages do
SITE, e CF Pages so permite um dominio por projeto. Para servir CADA jogo em `.../<slug>/*` do MESMO
dominio (necessario para partilhar o cache por origem, ADR-0117), este Worker intercepta uma rota por jogo
mais a rota partilhada do `/heavy/*`, e proxia cada uma para o projeto Pages certo. Tudo o resto cai para o
site, como se o Worker nao existisse.

**Jogos encaminhados hoje** (02/10): `game-platformer` → `game-platformer.pages.dev`, `game-2048` →
`game-2048-32g.pages.dev`.

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

### Via `git push` (recomendado, mantem o modelo da Pages)

A workflow `.github/workflows/deploy-router-worker.yml` roda `wrangler deploy` sempre que algo em
`cloudflare/router-worker/` muda em `main`. Precisa de UM secret no repo do GitHub:

1. Cloudflare Dashboard → Profile → API Tokens → `Create Token` → template `Edit Cloudflare Workers`.
2. Restringir Account e Zone ao proprio (`jrocha.dev.br`).
3. GitHub repo → Settings → Secrets and variables → Actions → `New repository secret`:
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Value**: o token.
4. `git push` — a workflow corre, o Worker publica.

### Primeira publicacao, ou debug manual

```powershell
cd cloudflare/router-worker
wrangler login     # uma vez por maquina
wrangler deploy
```

Se der erro `Zone not found` ou similar, confirma no dashboard que `jrocha.dev.br` esta na mesma conta
Cloudflare onde fazes `wrangler login`.

### Alternativa: Cloudflare Workers Builds (sem workflow, sem token)

Lancado em 2024, e' a integracao GitHub do Workers (analoga a' do Pages). Liga-se o repo pelo dashboard
(Workers & Pages → Create → Workers → Connect to Git) e a CF faz build e deploy a cada push. Se preferires,
apaga a workflow em `.github/workflows/deploy-router-worker.yml` e usa so Workers Builds.

## Verificar

Com o Worker publicado e as rotas ativas:

```powershell
curl -I https://o-inclusionista.jrocha.dev.br/game-platformer/
curl -I https://o-inclusionista.jrocha.dev.br/heavy/huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx
```

Ambos devem devolver `200 OK` (ou `304` para o segundo com `If-None-Match`).

## Adicionar um jogo

Feito uma vez em 02/10 para o `game-2048`; a receita e' esta. Quando o jogo tiver o seu proprio projeto
Pages a responder:

1. No `src/index.js`, uma linha no mapa `GAMES`.
   ⚠️ **A chave e' o segmento do caminho; o valor e' a ORIGEM REAL.** Os dois nao tem de coincidir — o
   namespace `.pages.dev` e' global, entao quando o nome ja pertence a outra conta o Cloudflare mantem o
   nome do projeto e sufixa o subdominio. O `game-2048` e' exatamente isso: projeto `game-2048`, subdominio
   `game-2048-32g.pages.dev`. Confirmar no dashboard antes de escrever o valor.
2. Em `wrangler.toml`, acrescentar uma rota:
   ```toml
   [[routes]]
   pattern = "o-inclusionista.jrocha.dev.br/<slug>/*"
   zone_name = "jrocha.dev.br"
   ```
3. `wrangler deploy`.

📌 **A ORDEM IMPORTA**: o projeto Pages tem de estar a responder ANTES da rota existir. Com a rota a apontar
para um `.pages.dev` que ainda nao existe, o 404 vem do lado do Cloudflare e fica dificil dizer se o erro e'
da rota ou do projeto.

O `/heavy/*` continua a ir para `game-platformer.pages.dev` (que tem a Pages Function com o binding R2);
nenhum outro jogo precisa de uma Function propria. Qualquer requer, inclui tudo entre uma e outra origem.
