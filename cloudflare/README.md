# Publicar em `o-inclusionista.jrocha.dev.br/game-platformer/` via Cloudflare

Passo a passo. O **bucket R2 `the-inclusionist-lfs` já existe e já tem a árvore inteira** (1,5 GiB —
Kokoro, MediaPipe, Vosk, Whisper, Moonshine, eSpeak NG, onnxruntime-web, fontes e Libras), carregado pelo
Dev com `the-inclusionist-lfs/upload-to-r2.ps1`. **Nada precisa de ser enviado desta sessão.**

Arquitectura: Cloudflare Pages serve o shell do jogo (3,5 MiB); o bucket R2 existente serve o `heavy/`; uma
Pages Function em `functions/game-platformer/heavy/[[path]].ts` traduz `/game-platformer/heavy/<host><path>`
em chave do bucket via `MIRROR_FOLDERS` da engine. O cache do navegador fica em `incl-pesados-v2` (nomeado
pela engine) e, ao servir OUTROS jogos da **mesma origem**, reutiliza o que já está lá, sem rede (ADR-0117).

## Pré-requisitos (uma vez na máquina)

PowerShell:
```powershell
npm i -g wrangler
wrangler login            # autenticar na conta Cloudflare onde o bucket vive
```

Git Bash (equivalente):
```bash
npm i -g wrangler && wrangler login
```

## 1. Build de produção

PowerShell:
```powershell
$env:INCL_BASE = '/game-platformer/'
npx vite build
```

Git Bash (nota: `MSYS_NO_PATHCONV=1` para o Git Bash não traduzir o `/game-platformer/` para um caminho do
Windows):
```bash
MSYS_NO_PATHCONV=1 INCL_BASE=/game-platformer/ npx vite build
```

Em qualquer das duas, verifica rápido que o build ficou com os caminhos corretos:

PowerShell:
```powershell
Select-String -Path dist\index.html -Pattern '/game-platformer/' | Select-Object -First 5
```

Git Bash:
```bash
grep -o '"/game-platformer/[^"]*"' dist/index.html | head
```

📌 No Pages (deploy no servidor) a variável `INCL_BASE` vem do `wrangler.toml` e nenhum destes truques é
preciso — isto é só para builds locais.

## 2. Primeiro deploy (cria o projeto Pages)

```bash
wrangler pages project create game-platformer --production-branch=main
wrangler pages deploy dist --project-name=game-platformer
```

Isto devolve um URL `https://<hash>.game-platformer.pages.dev`. **Nesta fase a Pages Function responde 500**
porque o binding do R2 ainda não existe (passo 3).

## 3. Ligar o bucket `the-inclusionist-lfs` ao projeto Pages

No **dashboard do Cloudflare** → `Workers & Pages` → `game-platformer` → `Settings` → `Functions` →
`R2 bucket bindings` → `Add binding`:

- **Variable name**: `LFS`
- **R2 bucket**: `the-inclusionist-lfs`

Guardar. **Re-deploy** para o binding entrar em vigor:

```bash
wrangler pages deploy dist --project-name=game-platformer
```

(O `wrangler.toml` deste repo já declara o binding, mas o Pages aceita bindings de R2 só pelo dashboard na
UI atual — o CLI aceita a declaração mas o dashboard tem prioridade.)

## 4. Domínio personalizado

Dashboard → `Workers & Pages` → `game-platformer` → `Custom domains` → `Set up a custom domain` →
`o-inclusionista.jrocha.dev.br`. CNAME e TLS automáticos.

Quando o DNS propagar, `o-inclusionista.jrocha.dev.br/game-platformer/` serve o jogo.

## 5. Verificar (do browser do Dev, DevTools)

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

```bash
node -e "import('@the-inclusionist/engine/platform/heavy-mirror.js').then(m => console.log(JSON.stringify(m.MIRROR_FOLDERS, null, 2)))"
```

Se a tabela mudou, atualizar o `functions/game-platformer/heavy/[[path]].ts` e re-deploy. O comentário no
topo da Function explica porque a tabela foi copiada em vez de importada.
