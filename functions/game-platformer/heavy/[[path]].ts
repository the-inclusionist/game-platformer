// SPDX-License-Identifier: AGPL-3.0-or-later
// Pages Function: `o-inclusionista.jrocha.dev.br/game-platformer/heavy/*` → bucket R2 `inclusionist-heavy`.
//
// 🔴 O MESMO BUCKET SERVE TODOS OS JOGOS (ADR-0117). O cache do navegador partilha-se por ORIGEM, entao
// `/game-chess/heavy/*` apontaria para o mesmo bucket na mesma origem e o navegador reutilizaria o
// ficheiro sem rede. O caminho local difere (`/game-platformer/heavy/...` vs `/game-chess/heavy/...`), mas
// a engine guarda no `CacheStorage('incl-pesados-v2')` pela URL UPSTREAM, nao pelo URL local
// (`platform/heavy.deliveryCacheKey`), entao a chave no cache nomeado tambem fica identica.
//
// ⚠️ ESTE FICHEIRO E' DO JOGO, mas o seu CONTEUDO e' identico em todos os jogos — so o diretorio pai muda
// (`game-platformer`, `game-chess`, ...). Quando o repo da plataforma existir, isto vira um ficheiro so em
// `functions/[slug]/heavy/[[path]].ts` e some de cada cartucho.

interface Env {
  readonly HEAVY: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, request, env, waitUntil }) => {
  // O caminho capturado pelo `[[path]]` chega como string[] ou string, consoante o nivel.
  const key = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '');
  if (!key) return new Response('heavy: no key', { status: 400 });

  /*
   * ⚠️ `onlyIf: etag` LE O ETAG DO PEDIDO para responder 304 se a crianca ja tem a ultima versao. O cache
   * verificado da engine ja usa `?sha256=<hash>` como cache-buster, entao os `heavy/*` sao immutable: nao
   * mudam de bytes sem mudar de URL, e um 200 vale para sempre.
   */
  const inm = request.headers.get('if-none-match') ?? undefined;
  const obj = await env.HEAVY.get(key, inm ? { onlyIf: { etagMatches: inm.replace(/^W\//, '').replace(/^"|"$/g, '') } } : undefined);
  if (!obj) {
    // O R2 devolve `null` tanto para "nao existe" quanto para "etag ja bate (304)". `onlyIf` sem corpo = 304.
    if (inm) return new Response(null, { status: 304 });
    return new Response(`heavy: ${key} not in bucket`, { status: 404 });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  // 📌 IMMUTABLE porque a engine chega aqui com `?sha256=<hash>` no URL (ver `platform/heavy.js:284`): dois
  // bytes diferentes nunca partilham um URL, entao `max-age` longo e `immutable` sao seguros.
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  // CORS: a plataforma pode servir `heavy/*` numa sub-origem no futuro; a resposta ja autoriza qualquer
  // origem a ler o corpo sem credenciais. Hoje nao e' usado, nao custa amanha.
  headers.set('access-control-allow-origin', '*');
  return new Response(obj.body, { headers });
};
