# Publicar em `o-inclusionista.jrocha.dev.br/game-platformer/` via Cloudflare

Passo a passo. Precisas de uma conta Cloudflare com acesso ao domínio `jrocha.dev.br` (ou um subdomínio
que apontes para Pages). Tudo o que custa dinheiro só começa depois dos **10 GiB armazenados no R2** e dos
**500 builds por mês** no Pages — este jogo cabe no plano grátis.

Arquitetura: `Pages` serve o shell do jogo (3,5 MiB); `R2` guarda o `heavy/` (1,2 GiB); uma `Pages Function`
em `functions/game-platformer/heavy/[[path]].ts` encaminha `/game-platformer/heavy/*` para o bucket R2. O
cache do navegador fica em `incl-pesados-v2` (nomeado pela engine) e, ao servir OUTROS jogos da **mesma
origem**, reutiliza o que já está lá, sem rede (ADR-0117).

## Pré-requisitos (uma vez na máquina)

```bash
npm i -g wrangler
wrangler login            # abre o browser para autenticar na conta Cloudflare
```

## 1. Criar o bucket R2 e enviar o `heavy/`

**Uma vez por conta.** Todos os jogos usam este mesmo bucket.

```bash
wrangler r2 bucket create inclusionist-heavy
node cloudflare/upload-heavy-to-r2.mjs   # 1,2 GiB → ~15–40 min, consoante a banda
```

O script lê `C:\Users\candi\Claude\inclusionist-heavy-mirror\heavy\` (o espelho que já construiste em
02/10). Para refazer o espelho se o Dev adicionar línguas:

```bash
node_modules/.bin/inclusionist-heavy \
  C:/Users/candi/Claude/inclusionist-heavy-mirror \
  --kokoro --reading pt --reading en --reading es --commands pt --commands en --commands es
```

## 2. Build de produção

```bash
MSYS_NO_PATHCONV=1 INCL_BASE=/game-platformer/ npx vite build
```

A variável `MSYS_NO_PATHCONV` é para o Git Bash não traduzir o `/game-platformer/` para um caminho do
Windows. No Pages a variável vem do `wrangler.toml` e isto não acontece.

Verifica rápido que o build ficou com os caminhos corretos:

```bash
grep -o '"/game-platformer/[^"]*"' dist/index.html | head
```

## 3. Primeiro deploy (cria o projeto Pages)

```bash
wrangler pages project create game-platformer --production-branch=main
wrangler pages deploy dist --project-name=game-platformer
```

Isso devolve um URL `https://<hash>.game-platformer.pages.dev`. Testa aí primeiro:
- Abre o URL + `/game-platformer/` (ou configura a rota principal no dashboard).
- `?debug=true` no fim mostra a barra do Dev.
- O `/game-platformer/heavy/<host>/<path>` deve responder 200 — se der 404 é porque o bucket ainda não foi
  carregado, ou o `wrangler.toml` não foi lido no deploy. O Pages lê os bindings dos settings do dashboard,
  **não** do `wrangler.toml` para deploys por CLI (ver passo 4).

## 4. Ligar o bucket R2 ao projeto Pages

No **dashboard do Cloudflare** → `Workers & Pages` → `game-platformer` → `Settings` → `Functions` →
`R2 bucket bindings`:

- **Variable name**: `HEAVY`
- **R2 bucket**: `inclusionist-heavy`

Guardar. Depois **re-deploy** para o binding entrar em vigor:

```bash
wrangler pages deploy dist --project-name=game-platformer
```

## 5. Domínio personalizado

No dashboard → `Workers & Pages` → `game-platformer` → `Custom domains` → `Set up a custom domain`:

- Entrar `o-inclusionista.jrocha.dev.br`.
- O Cloudflare cria o CNAME automaticamente se o domínio já está na conta.
- O certificado TLS é automático.

Quando o DNS propagar, `o-inclusionista.jrocha.dev.br/game-platformer/` serve o jogo.

## 6. Adicionar o segundo jogo (futuro)

Com `game-chess` pronto, há duas vias:

**(a) Projecto Pages separado**, custom domain `o-inclusionista.jrocha.dev.br/game-chess/` por *route*. O
mesmo bucket R2 serve-o; copia-se `functions/game-platformer/` para `functions/game-chess/` e troca-se o
nome do caminho. Mantém a mesma origem — o cache partilha-se.

**(b) Repo de plataforma**. Um `inclusionist-platform` que, em build, instala cada jogo (por tag git ou
pacote npm), copia o `dist/` para `platform/dist/game-<slug>/` e deploya um só projeto Pages. Promover
este `wrangler.toml` e `functions/` para lá; os cartuchos ficam sem configuração de deploy, como manda a
arquitetura (ADR-0140 §3).

Enquanto houver um jogo só, (a) basta — e o `functions/game-platformer/` deste repo já está pronto para a
transição em (b).

## Verificar

Depois do deploy, do browser do Dev:

```js
// no DevTools da aba a correr em o-inclusionista.jrocha.dev.br/game-platformer/
await fetch('/game-platformer/heavy/huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx', { method: 'HEAD' }).then(r => r.status)   // 200
await caches.has('incl-pesados-v2')  // true depois de a engine ter corrido um ciclo
```
