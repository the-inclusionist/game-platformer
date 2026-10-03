// SPDX-License-Identifier: AGPL-3.0-or-later
// A BARRA DE ACESSIBILIDADE RECEBE O CLIQUE NO ECRÃ DE TÍTULO.
//
// 🔴 POR QUE ESTE FICHEIRO EXISTE. O Dev em 03/10: *«no início, a barra de acessibilidade rápida precisa
// ser funcional!»* Medido no navegador: no título, um clique real em QUALQUER um dos dez ícones não
// chegava. O `#title-overlay` é um `.overlay`, e a engine dá a essa classe `z-index: 60`; o `#title-icons`
// nasce com `z-index: auto`. O overlay ficava por cima — e como é transparente naquela faixa, a barra
// VIA-SE, o `pointer-events` dizia `auto`, e o `elementFromPoint` sobre o 🌗 devolvia `.title-wrap`.
//
// ⚠️ UM CONTROLE QUE SE VÊ, SE APONTA E NÃO RESPONDE é o que o ADR-0106 §5 proíbe, e é pior que um ausente:
// a criança conclui que o jogo não tem a acomodação. Estava assim em TODOS os ícones, e nada o apanhava —
// o `tsc` não vê CSS, o axe não reprova um botão que existe e tem nome, e nenhum teste clicava no título.
//
// 📌 POR QUE SÓ NO TÍTULO. Subir a barra sempre poria os painéis de ajustes (também `z:60`) por baixo dela,
// e mexeria no cartão de pausa (`z:6`), que o Dev pediu para ficar *«do jeito que ela sempre esteve»*. A
// raiz já escreve `body.at-title` a cada quadro, e é essa classe que limita a regra.
//
// As MUTAÇÕES CONFERIDAS estão no fim do arquivo.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CSS = readFileSync(join(process.cwd(), 'app', 'js', 'ui', 'barra-recolhivel.css'), 'utf8');
const RAIZ = readFileSync(join(process.cwd(), 'app', 'js', 'main.ts'), 'utf8');
const ENGINE = readFileSync(
  join(process.cwd(), 'node_modules', '@the-inclusionist', 'engine', 'app', 'css', 'style.css'), 'utf8');

/**
 * O `z-index` que uma regra declara, ou `null`.
 *
 * ⚠️ O SELETOR TEM DE SER O QUE VENCE NA CASCATA, e esta função não o adivinha — quem a chama é que o
 * nomeia. 📏 Medido em 03/10: eu lia `.overlay{` (que declara `z-index: 50`) e comparava com isso, mas
 * dentro do `#game-region` quem manda é `#game-region .overlay{…z-index:60}`. Com o número errado o caso
 * ficava verde com a barra em 59 — por baixo do overlay, ou seja, com o defeito de volta. Um portão que
 * compara com a medida errada é um portão aberto.
 */
function zDaRegra(css, seletor) {
  const i = css.indexOf(seletor);
  if (i < 0) return null;
  const corpo = css.slice(i, css.indexOf('}', i));
  return corpo.match(/z-index:\s*(\d+)/)?.[1] ?? null;
}

describe('a barra de acessibilidade é clicável no ecrã de título', () => {
  it('🔴 a regra existe e é limitada ao título por `body.at-title`', () => {
    expect(CSS).toMatch(/body\.at-title\s+#title-icons\s*\{[^}]*z-index:\s*\d+/);
  });

  it('🎯 e levanta a barra ACIMA do overlay que vence DENTRO do `#game-region`', () => {
    // 🔴 `#game-region .overlay` e NÃO `.overlay`: o segundo declara 50, o primeiro 60, e a barra vive
    // dentro da região — é o 60 que a tapava. Se a engine subir esse valor, este caso cai e diz porquê,
    // em vez de o título voltar a comer o clique em silêncio.
    const zOverlay = Number(zDaRegra(ENGINE, '#game-region .overlay{'));
    expect(zOverlay, 'a engine mudou o seletor do overlay dentro da região').toBeGreaterThan(0);
    const zBarra = Number(CSS.match(/body\.at-title\s+#title-icons\s*\{[^}]*z-index:\s*(\d+)/)?.[1]);
    expect(zBarra).toBeGreaterThan(zOverlay);
  });

  it('⚠️ e NÃO levanta a barra fora do título — o cartão de pausa fica onde sempre esteve', () => {
    // Uma regra sem o `body.at-title` poria a barra por cima dos painéis de ajustes e do cartão. O Dev
    // pediu o contrário em 03/10: «Aparece do jeito que ela sempre esteve.»
    const semGuarda = CSS.match(/(^|\n)\s*#title-icons\s*\{[^}]*z-index:/);
    expect(semGuarda, 'há um z-index em `#title-icons` sem a guarda do título').toBeNull();
  });

  it('a raiz escreve a classe que a regra espera', () => {
    // Sem esta linha a regra não casa nunca, e o defeito volta sem que o CSS mude.
    expect(RAIZ).toMatch(/classList\.toggle\(\s*'at-title'/);
  });
});

describe('os painéis de inclusão veem-se por cima do cartão de pausa', () => {
  const HUD = readFileSync(join(process.cwd(), 'app', 'js', 'ui', 'seat-hud.css'), 'utf8');
  const regraDaCamada = HUD.match(/#dom-layer:has\(([^)]*\)?[^{]*)\)\s*\{[^}]*z-index:\s*(\d+)/);

  it('🔴 a camada sobe quando um painel está aberto', () => {
    // Sem isto o painel fica em `z:61` DENTRO de uma camada de `z:1`, e o cartão de pausa (`z:6`), que é
    // irmão dela, tapa-o. Foi o defeito de 03/10: a lista não mudava ao escolher «Modo empatia».
    expect(regraDaCamada, 'a regra do `#dom-layer` saiu do `seat-hud.css`').toBeTruthy();
    expect(Number(regraDaCamada[2])).toBeGreaterThan(6); // acima do cartão
  });

  it('🎯 e NÃO sobe pelo ecrã de título — senão a barra volta a não receber cliques', () => {
    // 📏 Medido por isolamento: com a regra sem esta exclusão, nenhum dos dez ícones do título respondia,
    // porque o `#title-overlay` vive nesta camada e está sempre à vista ali. É a troca de um defeito por
    // outro, e só este caso a apanha.
    expect(regraDaCamada[1]).toContain('#title-overlay');
    expect(regraDaCamada[1]).toMatch(/:not\(\s*#title-overlay\s*\)/);
  });

  it('⚠️ a barra do título fica acima do overlay, e a camada acima da barra quando sobe', () => {
    // Os dois números moram em ficheiros diferentes e relacionam-se: se um subir sem o outro, um dos dois
    // defeitos volta. Este caso lê-os juntos, que é a única forma de os manter coerentes.
    const zBarra = Number(CSS.match(/body\.at-title\s+#title-icons\s*\{[^}]*z-index:\s*(\d+)/)?.[1]);
    const zCamada = Number(regraDaCamada[2]);
    const zOverlay = Number(zDaRegra(ENGINE, '#game-region .overlay{'));
    expect(zBarra).toBeGreaterThan(zOverlay);   // a barra passa à frente do título
    expect(zCamada).toBeGreaterThan(zBarra);    // e o painel, quando sobe, passa à frente da barra
  });
});

// ========================= MUTAÇÕES CONFERIDAS =========================
// 1. Apagar a regra inteira: caem os dois primeiros casos.
// 2. `z-index: 61` → `59` (abaixo do `.overlay`): cai o caso que compara com a medida da engine.
// 3. Tirar o `body.at-title` do seletor: cai o terceiro caso, que é o que protege o cartão de pausa.
// 4. Tirar o `classList.toggle('at-title', …)` do `main.ts`: cai o quarto.
