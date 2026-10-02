// SPDX-License-Identifier: AGPL-3.0-or-later
// platform/audio-guide — THE CONTINUOUS SOUND GUIDE: a presence that grows brighter as the child walks closer (#84 item 2).
//
// ========================= WHY IT LIVES IN THIS GAME =========================
// It was the second half of the engine's `platform/audio-sonar`, and it left by the Dev's decision: «O guia sonoro é do
// platformer e deve ser decidido por ele sim» (2026-09-23), and «Pode tirar e levar da engine para o platformer»
// (2026-09-27) — ADR-0257. The design is ADR-0105's and did not change on the way: brightness first, a volume floor, a
// harmonic timbre, a fixed pitch, the route on a cadence.
//
// ========================= WHAT IT TAKES FROM THE ENGINE, AND WHAT IT OWNS =========================
// The engine's parts are read through what it already publishes, never through a name made for this game:
//   · the SONAR instance answers `playerCtx` (a child's own output device), `panFor` (the pan on the declared ruler) and
//     `needsAudioCues` (blind mode, or impaired sight) — the same answers the sonar gives itself;
//   · `distance` (`core/contract`) and the route (`core/route`) measure on the declared topology and roles.
// What only the guide used is OWNED here: the nearest target and the steps to it (copies of the sonar's private helpers),
// the live graph and its teardown, the cadence, the glide, and `platform/guide-intensity`.
//
// ========================= NO I/O AT IMPORT =========================
// Nothing here touches `window`: the audio context comes from the ctx. It runs in the `node` project.
import { distance, type Role, type Spot, type Topology } from '@the-inclusionist/engine/core/contract.js';
import { routeTo } from '@the-inclusionist/engine/core/route.js';
import type { AudioSonar, SonarPlayer } from '@the-inclusionist/engine/platform/audio-sonar.js';
import { guideIntensity, FAR_CUT, STEPS_TO_FLOOR } from './guide-intensity.js';

/** The guide's continuous graph: oscillator → low-pass → gain → pan → the `guide` category. */
export interface LiveGuide {
  /** The context that built it — each `setTargetAtTime` takes its `currentTime` from it. */
  readonly ac: AudioContext;
  readonly osc: OscillatorNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
  /** `null` on an engine without `createStereoPanner` — the guide goes mono instead of not existing. */
  readonly panner: StereoPannerNode | null;
  /** Frames since the ROUTE was last recomputed. The route is costly; the sound cannot wait for it. */
  framesSinceRoute: number;
  /** The last measured steps. The intensity comes from here every frame. */
  steps: number;
  /** The last measured pan, for the same reason: it comes from the target, which is found only with the route. */
  pan: number;
}

/**
 * The player as the guide sees them: the sonar's slice, plus the LIVE GRAPH this module hangs on them.
 *
 * ⚠️ THE GRAPH HAS TO SURVIVE FRAMES: a continuous presence is an oscillator that STAYS, with the filter and gain moving
 * under it, and the player is the only per-player thing that lasts from one frame to the next. And a field that lasts is
 * a field that leaks — which is why `stopGuide` exists: with nobody stopping it, turning the `guide` category off would
 * leave the sound playing. `null`/absent = quiet.
 */
export interface GuidePlayer extends SonarPlayer {
  _guide?: LiveGuide | null;
}

/**
 * ⚠️ THE TIMBRE MUST HAVE HARMONICS, and it is a technical requirement, not taste.
 *
 * The axis is BRIGHTNESS, and brightness is a low-pass opening and closing. **A low-pass over a `sine` wave does
 * absolutely nothing**: a sine has nothing above its fundamental for the filter to cut. The sawtooth has ALL the harmonics
 * — and it also keeps the guide apart from the sonar and the cane, which use `sine`.
 */
export const GUIDE_WAVE: OscillatorType = 'sawtooth';

/**
 * The guide's fundamental, FIXED: pitch is already the sonar's language (nearer = higher). If the guide also rose in
 * pitch, whoever hears both at once could not tell them apart. The guide says distance by brightness; the sonar, by pitch.
 */
const GUIDE_HZ = 220;

/**
 * How many frames between two route computations. The route is a breadth-first search and `__incl.update(dt)` counts
 * FRAMES: a search every frame spends the frame budget on a school Chromebook (pillar 1). Twelve frames are ~0.2 s at 60 fps,
 * and the sound does not wait for them: the intensity is rewritten EVERY frame, with the steps the last route left.
 */
export const FRAMES_BETWEEN_ROUTES = 12;

/**
 * The ceiling of spots for the guide's route, well below the route's own 4096: a cue every frame tolerates far less than a
 * calculation when a level loads. Hitting it returns `null` — «I cannot say» — and the guide falls back to the straight
 * line, which still sounds.
 */
const ROUTE_BUDGET = 1024;

/**
 * The guide's base gain, before the intensity and the master volume multiply it. LOWER than the beep it replaced (0.11): a
 * sound that never stops is perceived as louder than a transient of the same peak, and tires by persistence.
 */
export const GUIDE_VOL = 0.06;

/** The `setTargetAtTime` time constant: short enough to follow a step, long enough that a change is a glide, not a stair. */
const GUIDE_TAU = 0.08;

export interface AudioGuideCtx {
  /** The engine's sonar, for the three answers it already gives: the child's device, the pan and «needs cues?». */
  sonar: Pick<AudioSonar, 'playerCtx' | 'panFor' | 'needsAudioCues'>;
  /** Field 1: the metric. A function, because a game with stages changes topology between them. */
  topology: () => Topology;
  /** Field 5, the "target" half: where this player's still-valid targets are. Empty = nothing to point at. */
  targetsOf: (playerIndex: number) => readonly Spot[];
  /** Field 2: what is at a spot — what the route crosses (or not). Absent: the straight-line distance, which still sounds. */
  roleAt?: (at: Spot) => Role;
  /** A mixer category's bus. Absent: `audioOut`, then the `destination` — what is lost is the `guide` slider, not the sound. */
  catNode?: (cat: string) => AudioNode | null;
  /** The master node, `catNode`'s fallback. */
  audioOut?: () => AudioNode | null;
  /** The master volume (0..1), which the guide multiplies by itself. Absent = 1. */
  getVolume?: () => number;
  getPlayers: () => GuidePlayer[];
  getAudioCtx: () => AudioContext | null;
  getSoundOn: () => boolean;
  getAudioCat: () => Record<string, { on: boolean }> | null;
}

export interface AudioGuide {
  /** One frame of the guide, for every player. Called by the game loop while the world runs. */
  updateGuide: () => void;
  /**
   * ⚠️ It counts FRAMES IN WHICH THE GUIDE SOUNDS, not beeps: there is nothing discrete left to count. Reading it to say
   * "the guide is working" is right; reading it to say "it played three times" asks about something that no longer exists.
   */
  readonly guideCount: number;
}

export function createAudioGuide(ctx: AudioGuideCtx): AudioGuide {
  let _guideCount = 0;

  /** This player's nearest target, in the DECLARED METRIC — and `null` if there is none. */
  function nearestSpot(pl: GuidePlayer): { at: Spot; d: number } | null {
    const shape = ctx.topology();
    const here: Spot = { x: pl.x, y: pl.y };
    let nearest: Spot | null = null, bd = Infinity;
    for (const target of ctx.targetsOf(pl.i)) {
      const d = distance(shape, here, target);
      if (d < bd) { bd = d; nearest = target; }
    }
    return nearest ? { at: nearest, d: bd } : null;
  }

  /**
   * HOW MANY STEPS REMAIN, and the preferred answer is the one that goes round walls.
   *
   * ⚠️ BOTH ANSWERS ARE ALREADY IN THE SAME UNIT: the route counts steps by definition, and `distance()` returns steps in
   * EVERY topology (it divides by the `unit` itself). Dividing again by the world step would put the guide at full
   * brightness forever in a game with `unit = 16`. Without `roleAt`, or with the budget run out, the guide falls back to
   * the STRAIGHT LINE — it lies behind a wall, which is why it is a fallback, but going quiet would claim there is no target.
   */
  function stepsToTarget(pl: GuidePlayer, target: { at: Spot; d: number }): number {
    const roleAt = ctx.roleAt;
    if (roleAt) {
      const path = routeTo({ topology: ctx.topology(), roleAt, budget: ROUTE_BUDGET }, { x: pl.x, y: pl.y }, [target.at]);
      if (path) return path.steps;
    }
    return target.d;
  }

  /** Lights this player's continuous graph. `null` = it could not (no context, or an engine without Web Audio). */
  function startGuide(pl: GuidePlayer): LiveGuide | null {
    const pc = ctx.sonar.playerCtx(pl);
    const ac = pc ? pc.ac : ctx.getAudioCtx();
    if (!ac) return null;
    try {
      const osc = ac.createOscillator(), lowpass = ac.createBiquadFilter(), level = ac.createGain();
      osc.type = GUIDE_WAVE;
      osc.frequency.value = GUIDE_HZ;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = FAR_CUT; // born at the bottom of the scale and rising; born open would be a fright
      level.gain.value = 0;                 // and born quiet, so it does not click when it starts
      let migrated: AudioNode = level;
      let panner: StereoPannerNode | null = null;
      if (ac.createStereoPanner) { panner = ac.createStereoPanner(); level.connect(panner); migrated = panner; }
      osc.connect(lowpass).connect(level);
      migrated.connect(pc ? pc.out : (ctx.catNode?.('guide') || ctx.audioOut?.() || ac.destination));
      osc.start();
      // `framesSinceRoute` is born at the ceiling so the FIRST pass measures the route, instead of sounding for twelve
      // frames on invented steps.
      return { ac, osc, filter: lowpass, gain: level, panner, framesSinceRoute: FRAMES_BETWEEN_ROUTES, steps: STEPS_TO_FLOOR, pan: 0 };
    } catch (e) { return null; }
  }

  /**
   * Puts the graph out — and it HAS to be put out: the beep died by itself, this plays until someone stops it. It ramps
   * down (does not cut) because a dry cut on a live oscillator is a click — the transient this guide exists to remove.
   */
  function stopGuide(pl: GuidePlayer): void {
    const g = pl._guide;
    if (!g) return;
    pl._guide = null;
    try {
      const audioNow = g.ac.currentTime;
      g.gain.gain.setTargetAtTime(0, audioNow, 0.05);
      g.osc.stop(audioNow + 0.3);
    } catch (e) { /* noop */ }
  }

  /**
   * THE CONTINUOUS PRESENCE, one frame at a time. It fires nothing — the sound is already there, and changes brightness.
   *
   * ⚠️ GOING QUIET IS STILL A STATEMENT, with one meaning only: THERE IS NO TARGET. That is why "no target" puts the graph
   * out and "far" does not: `guide-intensity`'s floor (`FAR_VOL`) exists so "far" is never heard as "nothing to find".
   */
  function updateGuide(): void {
    const audible = guideAudible();
    const vol = ctx.getVolume ? ctx.getVolume() : 1;
    for (const pl of ctx.getPlayers()) {
      if (!audible || !ctx.sonar.needsAudioCues(pl)) { stopGuide(pl); continue; }
      // no guide lit (no target, or a device that refused it), or the target gone: silence says «nothing to find»
      const g = liveGuide(pl);
      if (!g || !remeasure(pl, g)) { stopGuide(pl); continue; }
      glide(g, vol);
      _guideCount++;
    }
  }

  /** Can the guide be heard at all: the audio started, the game's sound on, and a `guide` category that is on. */
  function guideAudible(): boolean {
    const cat = ctx.getAudioCat();
    return !!ctx.getAudioCtx() && ctx.getSoundOn() && !!cat && !!cat.guide && cat.guide.on;
  }

  /** This player's live guide — lit only if there is a target to point to, and `null` where it cannot be lit. */
  function liveGuide(pl: GuidePlayer): LiveGuide | null {
    if (pl._guide) return pl._guide;
    // ⚠️ "IS THERE A TARGET?" COMES BEFORE LIGHTING: with the graph born first, a player with no target created an
    // oscillator, measured, found nothing and put it out — SIXTY TIMES A SECOND. `nearestSpot` is a loop over
    // `targetsOf`, not the route search: asking every frame costs nothing when the list is empty.
    if (!nearestSpot(pl)) return null;
    return (pl._guide = startGuide(pl));
  }

  /** Every FRAMES_BETWEEN_ROUTES frames the route and the side are measured again. Answers `false` when the target is gone. */
  function remeasure(pl: GuidePlayer, g: LiveGuide): boolean {
    if (++g.framesSinceRoute < FRAMES_BETWEEN_ROUTES) return true;
    g.framesSinceRoute = 0;
    const target = nearestSpot(pl);
    if (!target) return false;
    g.steps = stepsToTarget(pl, target);
    g.pan = ctx.sonar.panFor(target.at.x, pl);
    return true;
  }

  /** EVERY frame, not only when the route is new: this is what makes the change a glide. */
  function glide(g: LiveGuide, vol: number): void {
    const i = guideIntensity(g.steps);
    try {
      const audioNow = g.ac.currentTime;
      g.filter.frequency.setTargetAtTime(i.cutoff, audioNow, GUIDE_TAU);
      g.gain.gain.setTargetAtTime(GUIDE_VOL * i.volume * vol, audioNow, GUIDE_TAU);
      g.panner?.pan.setTargetAtTime(g.pan, audioNow, GUIDE_TAU);
    } catch (e) { /* noop */ }
  }

  return {
    updateGuide,
    get guideCount() { return _guideCount; },
  };
}
