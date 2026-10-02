// SPDX-License-Identifier: AGPL-3.0-or-later
// render/minimap.ts — minimapa com FOG-OF-WAR, centrado no jogador. Um container PixiJS no canto do stage.
//
// 🔴 CENTRADO NO JOGADOR, mudanca pedida pelo Dev em 02/10. O mundo inteiro continua a ser desenhado dentro
// de `_mmTiles` (nas suas coordenadas de 0 a `W*MM_SCALE`), mas um `_mmView` com mascara de tamanho fixo
// (`MM_VIEW_W × MM_VIEW_H`) corta o que fica fora de uma janela em volta do jogador: a translacao de
// `_mmView` acompanha a posicao do jogador para que ele caia sempre no centro da mascara. Antes a vista era
// aerea estilo Metroid (todo o mundo visivel, com fog), como foi criada em `54fa8654` no repo da engine.
//
// 📌 O FOG CONTINUA IGUAL: `_seen` marca tiles vistos pela CAMERA (nao pela mascara do minimapa), que e'
// como um Metroid tambem funciona: a crianca ve' as plataformas que ja visitou mesmo que estejam fora da
// janela — so' nao as pode ver se nunca la foi.
import * as PIXI from 'pixi.js';
import { LOGICAL_W, LOGICAL_H, TILE } from '@the-inclusionist/engine/core/constants.js';
import { tileAt, isSolidType } from '../core/collision.js';

const MM_SCALE = 0.8, MM_PAD = 4;
// ⚠️ A JANELA DO MINIMAPA, em pixels logicos (o canvas e' 320x180). Mostra ~75 tiles de largura e ~45 de
// altura, cerca de 3x a vista da camera (20x11 tiles) — contexto suficiente sem ver o mundo inteiro.
const MM_VIEW_W = 60, MM_VIEW_H = 36;

let _minimap: PIXI.Container | null = null;
let _mmView: PIXI.Container | null = null;
let _mmTiles: PIXI.Graphics | null = null, _mmPlayer: PIXI.Graphics | null = null;
let _seen: Uint8Array[] = [];
let _dirty = false;
let _W = 0, _H = 0;

// Cria o container + graphics no stage e a grade de "visto" (W×H). Chamado uma vez no boot do game.js.
export function initMinimap(stage: PIXI.Container, W: number, H: number): void {
  _W = W; _H = H;
  _minimap = new PIXI.Container();
  _minimap.x = MM_PAD; _minimap.y = LOGICAL_H - MM_VIEW_H - MM_PAD; _minimap.alpha = 0.92;
  stage.addChild(_minimap);

  // Fundo com o tamanho da JANELA (nao do mundo). O +2/-1 e' uma moldura de 1px.
  const mmBg = new PIXI.Graphics();
  mmBg.beginFill(0x05070f, 0.72); mmBg.drawRect(-1, -1, MM_VIEW_W + 2, MM_VIEW_H + 2); mmBg.endFill();
  _minimap.addChild(mmBg);

  // O conteudo mascarado: o mundo inteiro + o ponto do jogador, nas coordenadas do mundo. A posicao deste
  // container muda a cada frame em `drawMinimapPlayer` para o jogador cair no centro da janela.
  _mmView = new PIXI.Container();
  _mmTiles = new PIXI.Graphics(); _mmPlayer = new PIXI.Graphics();
  _mmView.addChild(_mmTiles, _mmPlayer);
  _minimap.addChild(_mmView);

  // A mascara: um retangulo do tamanho da janela, FIXO na origem do `_minimap`. Como e' filha do `_minimap`
  // (nao do `_mmView`), move-se com o minimapa inteiro ao trocar de canto mas nao com o jogador.
  const mmMask = new PIXI.Graphics();
  mmMask.beginFill(0xffffff); mmMask.drawRect(0, 0, MM_VIEW_W, MM_VIEW_H); mmMask.endFill();
  _minimap.addChild(mmMask);
  _mmView.mask = mmMask;

  _seen = Array.from({ length: H }, () => new Uint8Array(W));
  _dirty = false;
}

// Marca como visto todos os tiles dentro da janela da câmera (camX,camY = canto sup-esq do viewport, em px).
export function markSeen(camX: number, camY: number): void {
  const tx0 = Math.max(0, (camX / TILE) | 0), tx1 = Math.min(_W - 1, ((camX + LOGICAL_W) / TILE) | 0);
  const ty0 = Math.max(0, (camY / TILE) | 0), ty1 = Math.min(_H - 1, ((camY + LOGICAL_H) / TILE) | 0);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (!_seen[ty][tx]) { _seen[ty][tx] = 1; _dirty = true; }
}

// Repinta os tiles vistos SÓ se algo novo foi revelado (barato: o fog muda pouco por frame). Cor por tipo.
export function redrawMinimapIfDirty(): void {
  if (!_dirty || !_mmTiles) return;
  _mmTiles.clear();
  for (let ty = 0; ty < _H; ty++) for (let tx = 0; tx < _W; tx++) {
    if (!_seen[ty][tx]) continue;
    const t = tileAt(tx, ty);
    const col = isSolidType(t) ? 0x9a93b5 : (t === 3 ? 0x2f6fae : (t === 9 ? 0xff5b3a : 0x232038)); // sólido / água / lava / ar
    _mmTiles.beginFill(col, 1); _mmTiles.drawRect(tx * MM_SCALE, ty * MM_SCALE, MM_SCALE + 0.4, MM_SCALE + 0.4); _mmTiles.endFill();
  }
  _dirty = false;
}

// Ponto do jogador (worldX,worldY em px do mundo; o game.js passa o centro do corpo). ALEM do dot, translada
// `_mmView` para que o jogador caia sempre no centro da janela — e' isto que torna o minimapa um "recorte".
export function drawMinimapPlayer(worldX: number, worldY: number): void {
  if (!_mmView || !_mmPlayer) return;
  const px = (worldX / TILE) * MM_SCALE;
  const py = (worldY / TILE) * MM_SCALE;
  // `Math.round` para o conteudo nao fazer sub-pixel shimmer ao mover-se de frame para frame.
  _mmView.x = Math.round(MM_VIEW_W / 2 - px);
  _mmView.y = Math.round(MM_VIEW_H / 2 - py);
  // O dot fica nas coordenadas DO MUNDO, dentro de `_mmView`; a translacao acima leva-o para o centro.
  _mmPlayer.clear(); _mmPlayer.beginFill(0xffd23f, 1);
  _mmPlayer.drawRect(px - 1, py - 1, 2.6, 2.6); _mmPlayer.endFill();
}

// Fim de fase: o fog-of-war volta a escurecer (o mapa some até ser revisto).
export function resetMinimap(): void { _seen.forEach((r) => r.fill(0)); _dirty = true; }

// Reposiciona o minimapa: no toque vai p/ o canto sup-dir (não briga com os controles); senão inf-esq.
export function setMinimapCorner(touch: boolean): void {
  if (!_minimap) return;
  if (touch) { _minimap.x = LOGICAL_W - MM_VIEW_W - MM_PAD; _minimap.y = MM_PAD; }
  else { _minimap.x = MM_PAD; _minimap.y = LOGICAL_H - MM_VIEW_H - MM_PAD; }
}

export function setMinimapVisible(v: boolean): void { if (_minimap) _minimap.visible = v; } // some no título / no multiplayer
export function getMinimap(): PIXI.Container | null { return _minimap; }                     // p/ o __incl (debug/teste)
export function minimapSeenCount(): number { let n = 0; for (const r of _seen) for (const v of r) n += v; return n; } // stat de fog revelado
