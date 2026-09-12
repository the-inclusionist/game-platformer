// SPDX-License-Identifier: AGPL-3.0-or-later
// O PORTAO DO ADR-0141: nenhum ficheiro deste cartucho importa a corrente PARTILHADA de `core/rng`.
//
// ⚠️ ELE E' LOAD-BEARING E NAO DECORATIVO, e o registro diz porque: o defeito e' INVISIVEL onde os testes
// correm. Um build solto tem uma corrente so e passa de qualquer maneira; o estrago aparece na plataforma,
// com dois cartuchos a puxar da mesma corrente e um `reseed` num a mover os sorteios do outro.
//
// ⚠️ E A REGRA E' NEGATIVA, nao apenas positiva. Usar `ctx.rng` em quase tudo e ir buscar o `shuffle`
// importado UMA vez tem o defeito inteiro — nao ha versao parcial disto. Por isso o que se afere e' a
// AUSENCIA dos quatro nomes, e nao a presenca do bom.
//
// 📌 Vive como caso de Vitest e nao como regra de ESLint porque este repositorio nao tem ESLint: os portoes
// da casa sao `typecheck`, `vitest`, `build` e `axe`. O ADR pede que ele suba um dia para o workflow
// reutilizavel do ADR-0068 §4, para os seis repositorios o herdarem em vez de o copiarem.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(process.cwd(), 'app', 'js');

// ⚠️ `readdirSync` recursivo A MAO, e nao um glob: `app\\js\\**\\*.ts` no Windows devolve ZERO ficheiros sem
// erro nenhum, porque o `include` do Vitest nao aceita barra invertida — e um portao que varre zero ficheiros
// fica verde a dizer que protege alguma coisa.
function ficheiros(dir) {
  const fora = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) fora.push(...ficheiros(p));
    else if (/\.(ts|js)$/.test(nome)) fora.push(p);
  }
  return fora;
}

// Os quatro nomes ligados a corrente de escopo de modulo. `createRng` e o tipo `Rng` ficam de fora de
// proposito: sao a saida, e nao o problema.
const PROIBIDOS = ['rnd', 'randInt', 'shuffle', 'reseed'];

describe('ADR-0141 — o cartucho nao toca a corrente partilhada', () => {
  const todos = ficheiros(RAIZ);

  // Sem este caso o de baixo ficaria verde com a arvore vazia, que e' a forma mais comum de um portao morrer.
  it('[Zero] o portao varre ficheiros de verdade', () => {
    expect(todos.length).toBeGreaterThan(30);
  });

  it('[Right] nenhum importa `rnd`, `randInt`, `shuffle` ou `reseed` de `core/rng`', () => {
    const culpados = [];
    for (const f of todos) {
      const src = readFileSync(f, 'utf8');
      // So as linhas de IMPORT deste modulo: `rng.shuffle(...)` e um USO da corrente propria e e' o certo.
      for (const linha of src.split('\n')) {
        if (!linha.includes('core/rng.js')) continue;
        const nomes = (linha.match(/\{([^}]*)\}/) || [, ''])[1];
        for (const mau of PROIBIDOS) {
          if (new RegExp('(^|[\\s,{])' + mau + '([\\s,}]|$)').test(nomes)) {
            culpados.push(f.replace(process.cwd(), '') + ' -> ' + mau);
          }
        }
      }
    }
    expect(culpados).toEqual([]);
  });

  // O OUTRO LADO DA MESMA REGRA, porque a ausencia sozinha tambem seria satisfeita por um cartucho que nao
  // sorteia nada. E ele mudou de sitio quando o `main.ts` virou fabrica: a corrente ja nao NASCE na raiz do
  // jogo — nasce no SHELL, um `createRng` por cartucho (ADR-0141 §1), e a raiz recebe-a pelo `ctx`. Afrouxar
  // este caso para "algures ha um createRng" teria escondido exatamente a mudanca que ele devia registar.
  it('[Right] a raiz recebe a corrente do `ctx`, e nao a cria', () => {
    const main = readFileSync(join(RAIZ, 'main.ts'), 'utf8');
    expect(main).toMatch(/const rng: Rng = ctx\.rng/);
    // ⚠️ NAO se afere aqui a AUSENCIA de `createRng(`: o primeiro caso deste ficheiro ja prova que
    // `core/rng` nao e' importado na raiz, e sem import chamar a funcao e' impossivel. Uma asserçao
    // literal sobre o texto reprovava com a palavra dentro de um COMENTARIO que explica a mudanca —
    // um portao que proibe falar do que protege.
  });

  it('[Right] e quem a cria e o shell, uma por cartucho', () => {
    const shell = readFileSync(join(process.cwd(), 'src', 'standalone.ts'), 'utf8');
    expect(shell).toMatch(/const rng = createRng\(\)/);
  });
});
