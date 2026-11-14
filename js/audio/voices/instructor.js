// The instructor: recorded "one" .. "four" clips, booked on the audio clock like
// any note so the count stays locked to the beat. Each clip starts a little
// early so its vowel, not its opening consonant, lands on the beat.
import { releaseWhenDone } from './prerender.js';

// From scripts/make-voice.sh (seconds from clip start to the vowel), with
// "one" corrected after measuring the decoded clip in the browser.
export const CLIP_OFFSETS = { one: 0.05, two: 0.055, three: 0.075, four: 0.095 };

const WORDS = ['one', 'two', 'three', 'four'];
const MAX_OFFSET = Math.max(...Object.values(CLIP_OFFSETS));
const FADE_SECONDS = 0.03;

function decode(ctx, data) {
  // Older Safari only supports the callback form.
  return new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject));
}

async function loadClip(ctx, word) {
  let lastError;
  // Ogg first; M4A for Safari versions that can't decode Ogg.
  for (const ext of ['ogg', 'm4a']) {
    try {
      const url = new URL(`../../../assets/voice/${word}.${ext}`, import.meta.url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      return await decode(ctx, await response.arrayBuffer());
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export function createInstructorVoice(ctx, output) {
  const buffers = {};
  const voice = {
    status: 'loading',
    ready: null,
    play(ev, when, secondsPerTick) {
      const word = WORDS[ev.word - 1];
      const buffer = buffers[word];
      if (!buffer) return;

      let start = when - CLIP_OFFSETS[word];
      let skip = 0;
      if (start < ctx.currentTime) {
        skip = ctx.currentTime - start;
        start = ctx.currentTime;
      }
      // Stop before the next count's clip begins; fade rather than speed up.
      const beat = ev.durationTicks * secondsPerTick;
      const limit = when + beat - MAX_OFFSET - 0.01;
      const naturalEnd = start + buffer.duration - skip;
      const end = Math.min(naturalEnd, limit);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      const level = 0.9 * ev.velocity;
      gain.gain.setValueAtTime(level, start);
      if (naturalEnd > limit) {
        gain.gain.setValueAtTime(level, Math.max(start, end - FADE_SECONDS));
        gain.gain.linearRampToValueAtTime(0, end);
      }
      src.connect(gain);
      gain.connect(output);
      src.start(start, skip);
      src.stop(end + 0.01);
      releaseWhenDone(src, gain);
    },
  };

  voice.ready = Promise.all(WORDS.map(async (word) => {
    buffers[word] = await loadClip(ctx, word);
  })).then(
    () => { voice.status = 'ready'; return true; },
    (err) => { voice.status = 'unavailable'; console.warn('Instructor clips unavailable:', err); return false; },
  );

  return voice;
}
