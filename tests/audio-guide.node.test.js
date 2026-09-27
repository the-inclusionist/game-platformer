// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests of platform/audio-guide — the CONTINUOUS sound guide (#84 item 2, ADR-0105), node project.
//
// ========================= WHERE THESE CASES CAME FROM =========================
// They are the engine's `tests/audio-sonar.node.test.js` guide block, moved with the guide (ADR-0257). The cases are the
// same claims; what changed is the fixture's other half: the engine's SONAR is a double of its three answers
// (`playerCtx`, `panFor`, `needsAudioCues`), because this file tests the guide and not the sonar — and a double keeps the
// guide's cases from depending on the sonar's ctx, which the engine renames between majors.
//
// ========================= THE FAKE AUDIO CONTEXT =========================
// ⚠️ IT HAS TO EXIST: a continuous presence is a GRAPH that stays — `createOscillator` + `createBiquadFilter` +
// `createGain` — and those nodes are what the cases below question. Asserting through a `tonePan` would pass forever,
// green, without touching the code it claims to cover.
//
// MUTATIONS CHECKED (at the end of the file).
import { describe, it, expect } from 'vitest';
import { routeTo } from '@the-inclusionist/engine/core/route.js';
import { distance } from '@the-inclusionist/engine/core/contract.js';
import {
  createAudioGuide, GUIDE_WAVE, GUIDE_VOL, FRAMES_BETWEEN_ROUTES,
} from '../app/js/platform/audio-guide.js';
import { FAR_CUT, NEAR_CUT } from '../app/js/platform/guide-intensity.js';

function param() {
  return { value: 0, targets: [], setTargetAtTime(v) { this.value = v; this.targets.push(v); } };
}

function fakeAC() {
  const oscillators = [], filters = [], gains = [], panners = [], links = [];
  const link = (self) => (n) => { links.push({ from: self, to: n }); return n; };
  const ac = {
    currentTime: 0,
    destination: { _name: 'destination', connect() {} },
    createOscillator() {
      const o = { _name: 'osc', type: '', frequency: param(), starts: 0, stoppedAt: null, start() { o.starts++; }, stop(t) { o.stoppedAt = t; } };
      o.connect = link(o); oscillators.push(o); return o;
    },
    createBiquadFilter() { const f = { _name: 'filter', type: '', frequency: param(), Q: param() }; f.connect = link(f); filters.push(f); return f; },
    createGain() { const g = { _name: 'gain', gain: param() }; g.connect = link(g); gains.push(g); return g; },
    createStereoPanner() { const p = { _name: 'panner', pan: param() }; p.connect = link(p); panners.push(p); return p; },
  };
  return { ac, oscillators, filters, gains, panners, links };
}

/** The platformer's space: continuous, `unit` = one tile of 16 px, seen from the side. */
const CONTINUOUS = { kind: 'continuous', size: [896, 992], unit: 16, move: 'free', frame: 'clock' };

/**
 * THE SONAR'S THREE ANSWERS, played by a double. `panFor` is the sonar's own rule on this game's ruler — eleven tiles of
 * 16 px saturate the stereo (176 px) — and `needsAudioCues` is «blind mode, or impaired sight».
 */
function sonarDouble(over = {}) {
  return {
    playerCtx: over.playerCtx || (() => null),
    panFor: (wx, p) => Math.max(-1, Math.min(1, (wx - p.x) / 176)),
    needsAudioCues: (p) => !!over.blindMode || !!p.seesLittle,
  };
}

function setup(over = {}) {
  const f = fakeAC();
  const ctx = {
    sonar: sonarDouble(over),
    topology: () => over.topology || CONTINUOUS,
    targetsOf: (i) => (over.targetsOf ? over.targetsOf(i) : (over.targets || [])),
    // `roleAt` OMITTED by default: the guide must keep working without it — the straight line.
    roleAt: over.roleAt,
    catNode: over.catNode, audioOut: over.audioOut, getVolume: over.getVolume,
    getPlayers: () => over.players || [],
    getAudioCtx: () => f.ac,
    getSoundOn: () => (over.soundOn === undefined ? true : over.soundOn),
    getAudioCat: () => (over.audioCat === undefined ? { guide: { on: true } } : over.audioCat),
  };
  return { guide: createAudioGuide(ctx), ...f };
}

/** Runs `n` frames, advancing the clock as a real game would. */
function frames(g, n) {
  for (let i = 0; i < n; i++) { g.ac.currentTime += 1 / 60; g.guide.updateGuide(); }
}

const pl = (o = {}) => ({ x: 32, y: 32, seesLittle: true, i: 0, ...o });

describe('platform/audio-guide · the CONTINUOUS presence (#84 item 2)', () => {
  it('⚠️ [Right] THE BEEP IS DEAD: ONE oscillator, started once, that never stops by itself', () => {
    // THE CASE THAT DEFINES THE CHANGE. The old guide created a 0.12 s `triangle` every 48 frames and threw it away. The
    // Dev's verdict: «um ping é a pior escolha possível, tenebroso para quem tem TEA». An oscillator per event again passes 1.
    const g = setup({ players: [pl()], targets: [{ x: 60, y: 32 }] });
    frames(g, 120);
    expect(g.oscillators.length, 'more than one oscillator was born — it fires again').toBe(1);
    expect(g.oscillators[0].starts).toBe(1);
    expect(g.oscillators[0].stoppedAt, 'the guide stopped by itself: a sound with an end is a beep').toBe(null);
    expect(g.guide.guideCount).toBe(120); // counts FRAMES that sound, not beeps
  });

  it('⚠️ [Right] the timbre has HARMONICS and the filter is a low-pass — without that the brightness axis does not exist', () => {
    const g = setup({ players: [pl()], targets: [{ x: 60, y: 32 }] });
    frames(g, FRAMES_BETWEEN_ROUTES);
    expect(g.oscillators[0].type).toBe(GUIDE_WAVE);
    expect(GUIDE_WAVE, 'a sine has nothing to filter').not.toBe('sine');
    expect(g.filters[0].type).toBe('lowpass');
  });

  it('⚠️ [Right] coming closer OPENS the filter; moving away closes it, and neither is silence', () => {
    const near = setup({ players: [pl()], targets: [{ x: 32 + 16, y: 32 }] });      // 1 step
    const far = setup({ players: [pl()], targets: [{ x: 32 + 20 * 16, y: 32 }] });  // 20 steps
    frames(near, FRAMES_BETWEEN_ROUTES + 2);
    frames(far, FRAMES_BETWEEN_ROUTES + 2);
    expect(near.filters[0].frequency.value).toBeGreaterThan(far.filters[0].frequency.value);
    expect(near.gains[0].gain.value).toBeGreaterThan(far.gains[0].gain.value);
    // ⚠️ AND FAR IS NOT SILENCE. If it were, far would be indistinguishable from no target.
    expect(far.gains[0].gain.value, 'the guide went silent far away').toBeGreaterThan(0);
    expect(far.filters[0].frequency.value).toBeGreaterThanOrEqual(FAR_CUT);
    expect(near.filters[0].frequency.value).toBeLessThanOrEqual(NEAR_CUT);
  });

  it('[Zero] the `guide` category off: no graph is born', () => {
    const g = setup({ audioCat: { guide: { on: false } }, players: [pl()], targets: [{ x: 48, y: 32 }] });
    frames(g, 60);
    expect(g.oscillators.length).toBe(0);
    expect(g.guide.guideCount).toBe(0);
  });

  it('[Zero] a player who sees gets no guide, even with a target beside them', () => {
    const g = setup({ players: [pl({ seesLittle: false })], targets: [{ x: 40, y: 32 }] });
    frames(g, 60);
    expect(g.oscillators.length).toBe(0);
    expect(g.guide.guideCount).toBe(0);
  });

  it('⚠️ [Zero] WITHOUT A TARGET the guide does not even light — its first writing lit it 60 times a second', () => {
    // Silence is the ONLY statement the guide can make, and it means there is no target. Lighting first and asking after
    // created and destroyed sixty oscillators per second, inaudible and costly.
    const g = setup({ players: [pl()], targets: [] });
    frames(g, 60);
    expect(g.oscillators.length, 'a graph was lit with nothing to point at').toBe(0);
    expect(g.guide.guideCount).toBe(0);
  });

  it('⚠️ [Interface] the target VANISHING midway puts the graph out — taking the last coin quiets the guide', () => {
    let targets = [{ x: 60, y: 32 }];
    const g = setup({ players: [pl()], targetsOf: () => targets });
    frames(g, FRAMES_BETWEEN_ROUTES + 2);
    expect(g.oscillators.length).toBe(1);
    expect(g.oscillators[0].stoppedAt).toBe(null);
    targets = [];
    frames(g, FRAMES_BETWEEN_ROUTES + 1);
    expect(g.oscillators[0].stoppedAt, 'the target left and the guide kept pointing at it').not.toBe(null);
    expect(g.oscillators.length, 'it put one out and lit another — the loop spins again').toBe(1);
  });

  it('⚠️ [Interface] switching the category off MIDWAY puts the graph out — a sound that stays is a sound that leaks', () => {
    const cat = { guide: { on: true } };
    const g = setup({ players: [pl()], targets: [{ x: 60, y: 32 }], audioCat: cat });
    frames(g, 30);
    expect(g.oscillators[0].stoppedAt).toBe(null);
    cat.guide.on = false;
    frames(g, 2);
    expect(g.oscillators[0].stoppedAt, 'the category went off and the oscillator stayed alive').not.toBe(null);
  });

  it('[Interface] the MASTER volume multiplies the guide, and does not unplug it from the graph', () => {
    const g = setup({ players: [pl()], targets: [{ x: 48, y: 32 }], getVolume: () => 0 });
    frames(g, FRAMES_BETWEEN_ROUTES + 2);
    expect(g.gains[0].gain.value).toBe(0);
    expect(g.oscillators[0].stoppedAt, 'lowering the volume killed the graph instead of quieting it').toBe(null);
  });

  it.each([
    ['the game\'s sound off', { soundOn: false }],
    ['no categories at all', { audioCat: null }],
    ['no `guide` category', { audioCat: {} }],
  ])('🔴 [Zero] %s: no graph is built, and nothing throws', (_title, over) => {
    const g = setup({ players: [pl()], targets: [{ x: 48, y: 32 }], ...over });
    expect(() => frames(g, 30)).not.toThrow();
    expect(g.oscillators.length).toBe(0);
    expect(g.guide.guideCount).toBe(0);
  });

  it('⚠️ [Error] a device that refuses to build the graph leaves the guide off, and the frame goes on', () => {
    const g = setup({ players: [pl()], targets: [{ x: 48, y: 32 }] });
    g.ac.createOscillator = () => { throw new Error('no oscillator on this device'); };
    expect(() => frames(g, 30)).not.toThrow();
    expect(g.guide.guideCount).toBe(0);
  });

  it('🔴 [Right] the route is measured every FRAMES_BETWEEN_ROUTES frames — no sooner, no later — and the pan follows it', () => {
    let targets = [{ x: 32 + 4 * 16, y: 32 }];                              // to the right
    const g = setup({ players: [pl()], targetsOf: () => targets });
    frames(g, 1);                                                            // the first frame measures
    expect(g.panners[0].pan.value, 'the pan does not say the target is to the right').toBeGreaterThan(0);
    targets = [{ x: 32 - 4 * 16, y: 32 }];                                   // it moves to the left
    frames(g, FRAMES_BETWEEN_ROUTES - 1);
    expect(g.panners[0].pan.value, 'the route was measured before its cadence').toBeGreaterThan(0);
    frames(g, 1);
    expect(g.panners[0].pan.value, 'the route was not measured on its cadence').toBeLessThan(0);
  });

  it('[Simple] the base gain is LOWER than the beep it replaced', () => {
    // A sound that never stops is perceived as louder than a transient of the same peak. The beep used 0.11.
    expect(GUIDE_VOL).toBeLessThan(0.11);
    expect(GUIDE_VOL, 'the volume floor cannot be zero').toBeGreaterThan(0);
  });
});

describe('platform/audio-guide · the route, when the game allows it (#84 item 2)', () => {
  // A 20×20 grid with a vertical WALL at x = 5, open only at y = 19. The target is just on the other side: in a straight
  // line that is 2 cells; on foot it is many, because one must go down, round and back.
  const WALL = (at) => (at.x === 5 && at.y !== 19 ? 'solid' : 'free');
  const ORTHO_GRID = { kind: 'grid', size: [20, 20], move: 'orthogonal', frame: 'compass' };

  it('⚠️ [Right] with `roleAt`, the distance is the one the child WALKS — not the straight line through the wall', () => {
    const withRoute = setup({ topology: ORTHO_GRID, roleAt: WALL, players: [pl({ x: 4, y: 0 })], targets: [{ x: 6, y: 0 }] });
    const withoutRoute = setup({ topology: ORTHO_GRID, players: [pl({ x: 4, y: 0 })], targets: [{ x: 6, y: 0 }] });
    frames(withRoute, FRAMES_BETWEEN_ROUTES + 2);
    frames(withoutRoute, FRAMES_BETWEEN_ROUTES + 2);
    // The straight line says 2 cells and opens the filter almost fully; the route knows about the wall and keeps it closed.
    expect(
      withRoute.filters[0].frequency.value,
      'the route was not used: the guide says «almost there» of a target behind a wall',
    ).toBeLessThan(withoutRoute.filters[0].frequency.value);
  });

  it('⚠️ [Interface] the TWO distances are already in the same unit: steps', () => {
    // It is the assertion that prevents the extra conversion. `distance()` divides by `unit` in the continuous branch, and
    // the route counts steps by definition — dividing again by the world's step would put the guide at full brightness
    // forever in a game with `unit = 16`.
    const route = routeTo({ topology: ORTHO_GRID, roleAt: () => 'free' }, { x: 0, y: 0 }, [{ x: 7, y: 0 }]);
    expect(route.passos).toBe(distance(ORTHO_GRID, { x: 0, y: 0 }, { x: 7, y: 0 }));
    // And with a wall the route is STRICTLY longer — never shorter than the straight line.
    const detour = routeTo({ topology: ORTHO_GRID, roleAt: WALL }, { x: 4, y: 0 }, [{ x: 6, y: 0 }]);
    expect(detour.passos).toBeGreaterThan(distance(ORTHO_GRID, { x: 4, y: 0 }, { x: 6, y: 0 }));
  });
});

// ========================= MUTATIONS CHECKED =========================
// Run on 2026-09-27 in this repository, each alone, with an occurrence count and the source restored from a copy — all red:
//   · M1 the graph not kept on the player (`return startGuide(pl)`) → FOUR fail: THE BEEP IS DEAD (an oscillator per frame),
//     the vanishing target and the category-off teardowns, and the cadence case (a fresh graph measures every frame).
//   · M2 `GUIDE_WAVE` from `sawtooth` to `sine` → the harmonics case. The main axis would die silently.
//   · M3 no `stopGuide(pl)` when the category goes off → the category-off-midway case: a sound that lasts leaks.
//   · M4 `if (roleAt)` → `if (roleAt && false)` → the distance-the-child-WALKS case: «almost there» behind a wall.
//   · M5 `GUIDE_VOL * i.volume * vol` → `GUIDE_VOL * i.volume` → the MASTER-volume case.
//   · M6 no target check before lighting → TWO fail: the no-target-never-lights and the vanishing-target cases.
//   · M7 the game's sound not asked → «the game's sound off».
//   · M8 the cadence one frame late (`< FRAMES_BETWEEN_ROUTES + 1`) → the cadence case.
//   · M9 the pan never measured → the cadence-and-pan case.
//   · M10 a refusing device rethrown instead of leaving the guide off → the [Error] case.
//   · M11 `framesSinceRoute` born at 0 instead of the ceiling → the cadence case (the first frame no longer measures).
//   · M12 `!!cat && !!cat.guide` dropped → TWO fail: «no categories at all» and «no `guide` category» throw.
//   · M13 `GUIDE_VOL` at 0.12 → the [Simple] base-gain case.
//   · E1 the INSTALLED ENGINE's route counting `(steps + 1) * 16` (in `node_modules`, restored after) → the same-unit case.
//     It guards a premise the guide takes from the engine, so only a mutation of the engine can redden it.
