#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Envia o espelho local `C:\Users\candi\Claude\inclusionist-heavy-mirror\heavy\` para o bucket R2
// `inclusionist-heavy`. Corre UMA VEZ por maquina (o Dev); depois disto cada deploy serve do R2 sem rede
// extra, e o navegador cacheia por URL imutavel.
//
// ⚠️ CORRER DEPOIS DE `wrangler login` e com o bucket ja criado:
//     wrangler r2 bucket create inclusionist-heavy
//     node cloudflare/upload-heavy-to-r2.mjs
//
// 📌 Faz upload sequencial, com um ficheiro de cada vez, PORQUE a API `r2 object put` do wrangler nao
// paraleliza bem e os ficheiros grandes (Kokoro 311 MiB, Whisper 150 MiB, Moonshine 197 MiB) ja saturam a
// subida. Sequencial e' mais lento mas previsivel.
//
// 🔴 PULA FICHEIROS QUE JA ESTAO LA, por `wrangler r2 object get --local` seguido de comparar sha256? Nao:
// o `--local` do wrangler nao usa sha, e um `HEAD` conta como operacao. Primeira execucao faz tudo; para
// re-correr apos adicionar linguas ao espelho, apaga o bucket antes (`wrangler r2 bucket delete`).

import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const MIRROR = 'C:/Users/candi/Claude/inclusionist-heavy-mirror/heavy';
const BUCKET = 'inclusionist-heavy';

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push({ path: p, size: s.size });
  }
  return out;
}

const files = walk(MIRROR);
const total = files.reduce((n, f) => n + f.size, 0);
console.log(`${files.length} ficheiros, ${(total / 1024 / 1024 / 1024).toFixed(2)} GiB`);
console.log(`destino: r2://${BUCKET}/`);
console.log('');

let done = 0, bytes = 0, failures = [];
for (const f of files) {
  const key = relative(MIRROR, f.path).split(sep).join('/');
  const mb = (f.size / 1024 / 1024).toFixed(1);
  process.stdout.write(`[${(++done).toString().padStart(3)}/${files.length}] ${mb.padStart(7)} MiB  ${key} ... `);
  const r = spawnSync('wrangler', ['r2', 'object', 'put', `${BUCKET}/${key}`, '--file', f.path, '--remote'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    console.log('FALHOU');
    console.log(r.stderr);
    failures.push(key);
  } else {
    bytes += f.size;
    console.log('ok');
  }
}

console.log('');
console.log(`enviados: ${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`);
if (failures.length) {
  console.log(`FALHARAM ${failures.length}:`);
  for (const f of failures) console.log('  ' + f);
  process.exit(1);
}
