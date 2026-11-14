#!/usr/bin/env bash
# Generates the instructor's count clips ("one" .. "four") in assets/voice/.
# Only needed to regenerate the clips; the site itself just loads the files.
#
# Requires: espeak-ng, ffmpeg, python3.
# The clips are output of the speech program, not part of it, so espeak-ng's
# GPL license does not apply to them.
#
# After running, copy the printed timing offsets into
# js/audio/voices/instructor.js (CLIP_OFFSETS).

set -euo pipefail
cd "$(dirname "$0")/.."

VOICE="${VOICE:-en-us}"
SPEED="${SPEED:-230}"   # words per minute: a crisp, natural counting pace
PITCH="${PITCH:-40}"
MAX_SECONDS="${MAX_SECONDS:-0.34}"
OUT=assets/voice
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"

for word in one two three four; do
  espeak-ng -v "$VOICE" -s "$SPEED" -p "$PITCH" -w "$TMP/$word-raw.wav" "$word"
  # Trim silence at both ends, cap the length, and fade the tail.
  ffmpeg -y -loglevel error -i "$TMP/$word-raw.wav" -af \
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atrim=0:${MAX_SECONDS},afade=t=out:st=$(python3 -c "print(${MAX_SECONDS}-0.04)"):d=0.04" \
    -ar 48000 -ac 1 "$TMP/$word.wav"
  ffmpeg -y -loglevel error -i "$TMP/$word.wav" -c:a libopus -b:a 32k "$OUT/$word.ogg"
  ffmpeg -y -loglevel error -i "$TMP/$word.wav" -c:a aac -b:a 48k "$OUT/$word.m4a"
  cp "$TMP/$word.wav" "$TMP/final-$word.wav"
done

# The timing offset is where the vowel starts: the first moment the clip
# reaches half its peak loudness. Consonants like "th" and "f" are much quieter.
python3 - "$TMP" <<'PY'
import array, json, math, sys, wave

tmp = sys.argv[1]
offsets, lengths = {}, {}
for word in ["one", "two", "three", "four"]:
    with wave.open(f"{tmp}/final-{word}.wav") as w:
        rate = w.getframerate()
        samples = array.array("h", w.readframes(w.getnframes()))
    frame = int(rate * 0.005)
    rms = [
        math.sqrt(sum(s * s for s in samples[i:i + frame]) / frame)
        for i in range(0, len(samples) - frame, frame)
    ]
    peak = max(rms)
    onset = next(i for i, r in enumerate(rms) if r >= 0.5 * peak)
    offsets[word] = round(onset * 0.005, 3)
    lengths[word] = round(len(samples) / rate, 3)

print("Clip lengths (s):", json.dumps(lengths))
print("CLIP_OFFSETS =", json.dumps(offsets))
PY
