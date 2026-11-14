// Pre-rendered notes, and prompt clean-up of the audio nodes that remain.
//
// Building every note from live oscillators, filters and gains creates
// hundreds of short-lived audio nodes per second. Browsers (Firefox
// especially) can let finished nodes linger until garbage collection, and the
// audio thread slowly falls behind: playback starts to crackle and pop.
//
// So each voice renders a note once, in an OfflineAudioContext using the same
// node recipe it would use live, caches the result, and replays it with just
// two live nodes: a buffer source and a gain envelope. Rendering happens in the
// background; until a note's buffer is ready the voice builds that note live,
// so nothing is ever silent. Every live node is disconnected as soon as its
// sound ends, so finished notes leave the audio graph straight away.

// One second of white noise per audio context, shared by every voice that
// needs breath, hammer or drum noise. Offline render contexts get their own.
const noiseCache = new WeakMap();

export function noiseBuffer(ctx) {
  if (!noiseCache.has(ctx)) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buffer);
  }
  return noiseCache.get(ctx);
}

// Disconnect `source` and the nodes it feeds once it has finished playing.
export function releaseWhenDone(source, ...nodes) {
  source.onended = () => {
    source.disconnect();
    for (const node of nodes) node.disconnect();
  };
}

// A per-voice cache of rendered buffers, rendered one at a time in order.
export function createRenderCache(ctx) {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const buffers = new Map();
  const requested = new Map();
  let queue = Promise.resolve();
  const lengthOf = (key) => buffers.get(key)?.duration ?? 0;

  return {
    // The buffer for `key` if it lasts at least `seconds`, else null.
    get(key, seconds = 0) {
      return lengthOf(key) >= seconds ? buffers.get(key) ?? null : null;
    },

    // Render build(offlineContext, destination) into a buffer `seconds` long,
    // unless one at least that long exists or is already on its way.
    request(key, seconds, build) {
      if (!Offline || (requested.get(key) ?? 0) >= seconds) return;
      requested.set(key, seconds);
      queue = queue
        .then(async () => {
          if (lengthOf(key) >= seconds) return;
          const offline = new Offline(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
          build(offline, offline.destination);
          const buffer = await offline.startRendering();
          if (buffer.duration > lengthOf(key)) buffers.set(key, buffer);
        })
        .catch((err) => console.warn('Could not pre-render a note:', err));
    },
  };
}

// Play `buffer` through a fresh gain node whose envelope `shape(gainParam)` sets.
export function playBuffer(ctx, output, buffer, when, stopAt, shape) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const env = ctx.createGain();
  shape(env.gain);
  src.connect(env);
  env.connect(output);
  src.start(when);
  src.stop(stopAt);
  releaseWhenDone(src, env);
}

// For each pitch in `events` (single notes or chords), the longest duration in ticks.
export function longestByPitch(events) {
  const longest = new Map();
  for (const ev of events) {
    for (const midi of Array.isArray(ev.midi) ? ev.midi : [ev.midi]) {
      longest.set(midi, Math.max(longest.get(midi) ?? 0, ev.durationTicks));
    }
  }
  return longest;
}

// Buffers are rendered this much longer than the current tempo needs, so
// slowing down a little doesn't send notes back to live synthesis.
export const TEMPO_MARGIN = 1.3;

// A voice for held notes (fiddle, flute): each pitch's attack and endless
// sustain is pre-rendered at velocity 1, and the note's level, length and
// release are applied live by the replaying gain. What differs per instrument:
//   renderNote(c, out, midi, seconds)  the pre-render recipe
//   playLive(ev, when, dur)            the full live note, used for notes
//                                      shorter than `shortest` (they need a
//                                      faster attack) and until a buffer is ready
export function createHeldNoteVoice(ctx, input, { level, release, shortest, renderNote, playLive }) {
  const cache = createRenderCache(ctx);
  const lengthFor = (dur) => dur + release + 0.02;

  function request(midi, dur) {
    const seconds = lengthFor(dur) * TEMPO_MARGIN;
    cache.request(midi, seconds, (c, out) => renderNote(c, out, midi, seconds));
  }

  return {
    prepare(events, secondsPerTick) {
      for (const [midi, ticks] of longestByPitch(events)) {
        const dur = ticks * secondsPerTick;
        if (dur >= shortest) request(midi, dur);
      }
    },

    play(ev, when, secondsPerTick) {
      const dur = Math.max(0.03, ev.durationTicks * secondsPerTick);
      if (dur < shortest) {
        playLive(ev, when, dur);
        return;
      }
      const buffer = cache.get(ev.midi, lengthFor(dur));
      if (!buffer) {
        request(ev.midi, dur);
        playLive(ev, when, dur);
        return;
      }
      const peak = level * ev.velocity;
      const end = when + dur + release;
      playBuffer(ctx, input, buffer, when, end + 0.02, (gain) => {
        gain.setValueAtTime(peak, when);
        gain.setValueAtTime(peak, when + dur);
        gain.linearRampToValueAtTime(0, end);
      });
    },
  };
}
