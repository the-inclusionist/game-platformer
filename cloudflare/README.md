# Publicar em `o-inclusionista.jrocha.dev.br/game-platformer/` via Cloudflare

Passo a passo. O **bucket R2 `the-inclusionist-lfs` já existe e já tem a árvore inteira** (1,5 GiB —
Kokoro, MediaPipe, Vosk, Whisper, Moonshine, eSpeak NG, onnxruntime-web, fontes e Libras), carregado pelo
Dev com `the-inclusionist-lfs/upload-to-r2.ps1`. **Nada precisa de ser enviado desta sessão.**

Arquitectura: Cloudflare Pages serve o shell do jogo (3,5 MiB); o bucket R2 existente serve o `heavy/`; uma
Pages Function em `functions/game-platformer/heavy/[[path]].ts` traduz `/game-platformer/heavy/<host><path>`
em chave do bucket via `MIRROR_FOLDERS` da engine. O cache do navegador fica em `incl-pesados-v2` (nomeado
pela engine) e, ao servir OUTROS jogos da **mesma origem**, reutiliza o que já está lá, sem rede (ADR-0117).

## A via certa: Git Integration (deploy a cada `git push`)

Com o repo em `github.com/the-inclusionist/game-platformer`, o Pages observa o GitHub, constrói e implanta
sozinho a cada push para `main`. Cada PR tem o seu preview deployment próprio. Não é preciso `wrangler`
instalado nem corrido na máquina.

### 1. Criar o projeto Pages ligado ao GitHub

Dashboard do Cloudflare → `Workers & Pages` → `Create` → `Pages` → `Connect to Git` → GitHub →
autorizar a conta → escolher o repo `the-inclusionist/game-platformer`.

Depois na página de configuração do build:

| campo | valor |
|---|---|
| Project name | `game-platformer` |
| Production branch | `main` |
| Framework preset | `None` (o Vite é configuração nossa, não default do CF) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` *(deixar vazio)* |

Em **Environment variables (Production)** adicionar:

| nome | valor |
|---|---|
| `INCL_BASE` | `/game-platformer/` |

O `vite.config.ts` lê esta variável no build (`base: process.env.INCL_BASE || '/'`). Sem ela, os assets
nascem com paths de raiz e nada se encontra sob `/game-platformer/`.

Clicar **Save and Deploy**. O Pages faz `git clone`, `npm install`, `npm run build`, e serve `dist/`.

### 2. Ligar o bucket `the-inclusionist-lfs` à Pages Function

Mesmo projeto → `Settings` → `Functions` → `R2 bucket bindings` → `Add binding`:

| campo | valor |
|---|---|
| Variable name | `LFS` |
| R2 bucket | `the-inclusionist-lfs` |
| Jurisdiction | **European Union** |

🔴 O **Jurisdiction** é obrigatório porque o bucket foi criado na jurisdição EU (vê-se pelo URL S3 do Dev
começar por `*.eu.r2.cloudflarestorage.com`). Sem este campo o deploy falha com `bucket not found` mesmo
com o nome certo — e o `wrangler.toml` deste repo já declara `jurisdiction = "eu"` pela mesma razão.

Guardar. Fazer o **próximo push qualquer** para re-deploy com o binding ativo (basta `git commit --allow-empty
-m "trigger: bind LFS"` seguido de `git push`), ou usar o botão `Redeploy` do dashboard.

### 3. Domínio personalizado — via Router Worker

🔴 **Não dá para adicionar o domínio diretamente** porque `o-inclusionista.jrocha.dev.br` já está associado
ao projeto Pages do site («That domain is already associated with an existing project», medido em 02/10).
Um Worker intercepta duas rotas no domínio e proxia para este Pages. Ver `router-worker/README.md` neste
mesmo diretório. Resumo:

```powershell
cd cloudflare/router-worker
wrangler deploy
```

Com o Worker publicado, `o-inclusionista.jrocha.dev.br/game-platformer/` serve o jogo e
`o-inclusionista.jrocha.dev.br/heavy/*` serve os ficheiros pesados do R2, ambos na mesma origem que o site
— cache partilhado como ADR-0117 pede.

### A partir daqui

Qualquer `git push` para `main` lança um build-e-deploy novo (visível em `Workers & Pages` →
`game-platformer` → `Deployments`). PRs ganham previews em `<branch>.game-platformer.pages.dev`.

## Alternativa: Direct Upload (manual, para emergências)

Útil quando o GitHub está em baixo, quando queres testar um build local sem fazer push, ou para investigar
um deploy que o CF rejeitou.

PowerShell:
```powershell
npm i -g wrangler
wrangler login
$env:INCL_BASE = '/game-platformer/'
npx vite build
wrangler pages deploy dist --project-name=game-platformer
```

Git Bash (nota: `MSYS_NO_PATHCONV=1` para o Git Bash não traduzir o `/game-platformer/` para um caminho do
Windows):
```bash
npm i -g wrangler && wrangler login
MSYS_NO_PATHCONV=1 INCL_BASE=/game-platformer/ npx vite build
wrangler pages deploy dist --project-name=game-platformer
```

Verificação rápida de que o build ficou com os caminhos certos:

PowerShell:
```powershell
Select-String -Path dist\index.html -Pattern '/game-platformer/' | Select-Object -First 5
```

Git Bash:
```bash
grep -o '"/game-platformer/[^"]*"' dist/index.html | head
```

## Verificação pós-deploy (DevTools na aba servida)

```js
// A Function devolve o Kokoro:
await fetch('/game-platformer/heavy/huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx', { method: 'HEAD' }).then(r => r.status)
// → 200

// E traduziu via MIRROR_FOLDERS para `kokoro-82m-v1.0-onnx/onnx/model.onnx` no bucket.
// A engine já tem o cache nomeado depois de um ciclo:
await caches.has('incl-pesados-v2')
// → true
```

## Adicionar o segundo jogo (futuro)

**(a) Projecto Pages separado**, custom domain na mesma origem (`o-inclusionista.jrocha.dev.br/game-chess/`
por *route*). O mesmo bucket `the-inclusionist-lfs` serve-o; copia-se `functions/game-platformer/` para
`functions/game-chess/` e troca-se o nome do caminho. Mantém a mesma origem — o cache partilha-se.

**(b) Repo de plataforma**. Um `inclusionist-platform` que, em build, instala cada jogo (por tag git ou
pacote npm), copia o `dist/` para `platform/dist/game-<slug>/` e deploya um só projeto Pages. Promover
este `wrangler.toml` e `functions/` para lá; os cartuchos ficam sem configuração de deploy, como manda a
arquitetura (ADR-0140 §3).

## O que mudar quando a versão da engine subir

A `MIRROR_FOLDERS` da Pages Function é cópia da `platform/heavy-mirror.MIRROR_FOLDERS` da engine 11.0.0. Ao
subir para uma versão nova, verificar a tabela:

```powershell
node -e "import('@the-inclusionist/engine/platform/heavy-mirror.js').then(m => console.log(JSON.stringify(m.MIRROR_FOLDERS, null, 2)))"
```

Se a tabela mudou, atualizar o `functions/game-platformer/heavy/[[path]].ts` e fazer push. O comentário no
topo da Function explica porque a tabela foi copiada em vez de importada.
