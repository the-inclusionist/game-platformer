// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Router Worker: `o-inclusionista.jrocha.dev.br/{game-platformer,game-2048,heavy}/*` → o projeto Pages de
// cada jogo, e `/heavy/*` sempre para o que tem o binding R2.
//
// 🔴 EXISTE porque o CF Pages so permite um dominio custom por projeto e `o-inclusionista.jrocha.dev.br` ja
// pertence ao projeto do site. Este Worker intercepta as rotas dos jogos nessa origem e proxia-as para o
// deploy Pages de cada um; tudo o resto do dominio continua a ser servido pelo site como antes, sem o
// Worker correr.
//
// 📌 DOIS JOGOS DESDE 02/10 (`game-platformer`, `game-2048`). Para acrescentar um terceiro basta uma linha
// no mapa `GAMES` abaixo e uma rota em `wrangler.toml`. O `/heavy/*` NAO ganha uma rota por jogo: tem uma
// so, partilhada, e fica sempre no projeto Pages do `game-platformer`, que e' quem tem a Pages Function com
// o binding R2 (`the-inclusionist-lfs`). O cache do navegador por origem (ADR-0117) desduplica entre jogos
// porque o URL `/heavy/...` e' o mesmo para todos.
//
// ⚠️ `fetch(novoRequest)` E NAO `fetch(outUrl, request)`: o `Request` reaproveita o corpo e os cabecalhos
// originais, o que mantem `If-None-Match`, `Range`, metodo e tudo mais que o Pages Function pode querer ler.

// ⚠️ A CHAVE E' O SEGMENTO DO CAMINHO; O VALOR E' A ORIGEM REAL DO PROJETO PAGES. Os dois nao tem de
// coincidir: o namespace `.pages.dev` e' GLOBAL, entao quando o nome que o projeto quer ja pertence a outra
// conta, o Cloudflare mantem o nome do projeto e sufixa o SUBDOMINIO. Foi o que aconteceu ao `game-2048`
// em 02/10: projeto `game-2048` (como diz o `wrangler.toml` do repo dele), subdominio
// `game-2048-32g.pages.dev`. Copiar o slug para o valor daria 404 sem dizer porque.
const GAMES = {
  'game-platformer': 'game-platformer.pages.dev',
  'game-2048': 'game-2048-32g.pages.dev',
  // 'game-chess': 'game-chess.pages.dev',   // ← descomentar quando o terceiro jogo existir
};

// `heavy` nao e' um jogo: aponta para o Pages que serve o /heavy/* (hoje, `game-platformer.pages.dev`).
// Quando houver um projeto Pages separado so para heavy, muda-se aqui — nenhum jogo precisa de mexer.
const HEAVY_ORIGIN = 'game-platformer.pages.dev';

export default {
  async fetch(request) {
    const inUrl = new URL(request.url);
    const path = inUrl.pathname;

    // `/heavy/*` vai sempre para a origem do heavy, com o pathname intacto.
    if (path === '/heavy' || path.startsWith('/heavy/')) {
      return proxyTo(request, HEAVY_ORIGIN);
    }

    // `/<slug>/*` cai no `GAMES[slug]` se existir; senao, 404 explicito (nao cai no site).
    const firstSeg = path.split('/')[1] || '';
    const origin = GAMES[firstSeg];
    if (origin) {
      return proxyTo(request, origin);
    }

    // Isto nao deve acontecer se as rotas em `wrangler.toml` forem apenas as duas acima (o Worker nem corre
    // noutros caminhos). Fica como defesa para o dia em que uma rota larga demais for registada por engano.
    return new Response(`router: no mapping for ${path}`, { status: 404 });
  },
};

function proxyTo(request, origin) {
  const inUrl = new URL(request.url);
  const outUrl = new URL(inUrl.pathname + inUrl.search, `https://${origin}`);
  const outReq = new Request(outUrl, request);
  return fetch(outReq);
}
