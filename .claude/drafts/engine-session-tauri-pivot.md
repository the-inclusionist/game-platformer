# Rascunho de mensagem para a sessão da engine — pivô Tauri + abstração `/heavy/*`

> **Para o Dev:** este é um rascunho para você revisar e mandar à sessão da engine como quiser. Edite,
> encurte, mude o tom. Depois de enviado, pode apagar este ficheiro.

---

## Mensagem rascunhada (pt-BR)

Oi. Grande novidade do nosso lado, que muda o que você precisa decidir agora.

**Pivô: o alvo final deixa de ser PWA e passa a ser uma shell Tauri instalada em Windows, Linux e Android.**
Modelo de console: a shell é a consola, o cartucho é o jogo, os pesados (Kokoro, MediaPipe, Vosk, leitura)
ficam na pasta de dados da instalação do app, baixados na primeira execução. O browser PWA em
`o-inclusionista.jrocha.dev.br/game-platformer/` **continua vivo como canal de demonstração** (`axe`
público, feedback de professores sem instalar), mas não é mais o alvo oficial.

**O que isso NÃO muda:**
- O cartucho (`{ slug, declaration, hooks, create(ctx) }`) e todo o trabalho da 11.0.0.
- As acomodações, i18n, testes, checador, `axe`.
- O pedido anterior **«uma tela por viewport»** (viewport-root, pausa+HUD+menus+«Sair»+settings por assento
  com restrições do ADR-0014 e da legenda-por-tela, vira 12.0 breaking). **Permanece inalterado.** Tauri é
  WebView; divisão de tela continua a ser `<div>` dividido no mesmo documento.

**O que MUDA no seu lado da engine (pedido novo):**

O pedido anterior sobre `inclusionist-heavy --base` gerar o layout do CF Pages torna-se um pedido maior:

**Abstração de resolução de `/heavy/*`.** No modelo Tauri, a shell serve os pesados do sistema de ficheiros
local via protocolo custom (`tauri://heavy/kokoro.onnx` → `~/.local/share/the-inclusionist/heavy/kokoro.onnx`,
baixado uma vez). No modelo browser (canal de demo), continua HTTP + `CacheStorage` com cache por origem
(ADR-0117). **O cartucho não deve saber a diferença** — continua a dizer `fetch('/heavy/kokoro.onnx')`.

Proposta de contrato: a engine aceita um `host.resolveHeavy(path): Promise<Response | string>` injetado pela
shell (ou pelo arranque do browser). Default fica como está (HTTP contra a raiz do domínio). Em Tauri, a
shell injeta a resolução via `tauri://`. O `inclusionist-heavy` passa a entregar nos dois formatos (o do CF
Pages para o canal browser, e um tar/zip simples que a shell Tauri descompacta na primeira execução).

Isto é o pedido real; o `--base` antigo entra como caso particular do novo contrato.

**Também para a sua ciência (não é pedido):**
- **Android trava em tamanho:** APK no Google Play ≤ 150 MiB base (até 2 GiB com Asset Packs). 1,2 GiB de
  heavy NÃO cabe no APK — é a shell que trata o download na primeira execução com UI de progresso. Nada que
  mude a engine; é desenho da shell.
- **Publicação do cartucho (A/B)** fica adiada: a shell faz `fetch` do bundle `.js`, não `npm install`.
  Mantemos `private: true` por ora.

**Fica igual:**
- O bloco «uma tela por viewport» como pedido único, começando por ADR com as restrições do 0014 e da
  legenda-por-tela antes de código, virando 12.0.
- A `C.5` fica separada (cartucho declara os papéis que pinta; não é defeito da engine).
- A `C.6` (pad no título) fica dentro do bloco «uma tela por viewport» (o diagnóstico está no plano do
  platformer; `menuWithDpad` precisa de callback do jogo, OU `steerPause` cai para `steerTitle`).

**Pergunta:** com o pedido reformulado (abstração `/heavy/*` + ADR do bloco «uma tela por viewport»),
quer começar pelo ADR da pausa-por-viewport ou pelo da abstração `/heavy/*`? São desacoplados — podem
seguir em paralelo em outras sessões se preferir.

Obrigado.

---

## Notas para o Dev (não vai na mensagem)

- O «host.resolveHeavy» é SUGESTÃO minha de contrato; a sessão da engine conhece o terreno dela melhor e
  pode propor outro nome ou outro desenho.
- Se preferir uma mensagem mais curta, pode cortar as secções «Também para a sua ciência» e «Fica igual» —
  elas repetem o que ela já sabe.
- A frase sobre «1,2 GiB» assume o espelho atual (pt + en + es). Se a shell escolher idiomas sob demanda,
  o número cai bastante na primeira execução — mas isso é decisão da shell, não da engine.
