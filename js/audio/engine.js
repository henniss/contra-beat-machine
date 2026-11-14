// The audio system: one volume control per instrument, a shared "dance hall"
// reverb, a master volume, and a compressor so stacked instruments don't clip.
//
//   voice -> instrument volume -> transport -> master -> compressor -> speakers
//                     \-> reverb send -> reverb -/
//
// "transport" is a separate gain used only to silence everything on Stop.

const FADE_SECONDS = 0.02;

function rampTo(ctx, param, value, seconds = FADE_SECONDS) {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
}

// A reverb echo made from decaying noise, so no impulse-response file is needed.
function makeImpulse(ctx, seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

// Sliders are linear 0..1; squaring makes them feel even to the ear.
export const volumeToGain = (volume) => volume * volume;

export class AudioEngine {
  constructor(instruments) {
    this.instruments = instruments;
    this.ctx = null;
    this.channels = {};
    this.voices = {};
    this.settings = { master: 0.8, mixer: {} };
  }

  // Must be called from a user click: browsers block audio until then.
  async start() {
    if (!this.ctx) this.build();
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  build() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx({ latencyHint: 'interactive' });
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;
    compressor.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = volumeToGain(this.settings.master);
    this.master.connect(compressor);

    this.transport = ctx.createGain();
    this.transport.gain.value = 0;
    this.transport.connect(this.master);

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 2.2, 3);
    this.reverbIn = ctx.createGain();
    this.reverbIn.connect(reverb);
    reverb.connect(this.transport);

    for (const inst of this.instruments) {
      const channel = ctx.createGain();
      channel.gain.value = this.channelGain(inst.id);
      channel.connect(this.transport);
      const send = ctx.createGain();
      send.gain.value = inst.reverb ?? 0.2;
      channel.connect(send);
      send.connect(this.reverbIn);
      this.channels[inst.id] = channel;
      this.voices[inst.id] = inst.createVoice(ctx, channel);
    }
  }

  channelGain(id) {
    const inst = this.instruments.find((i) => i.id === id);
    const setting = this.settings.mixer[id];
    if (!setting || !setting.enabled) return 0;
    return volumeToGain(setting.volume) * (inst?.trim ?? 1);
  }

  setMasterVolume(volume) {
    this.settings.master = volume;
    if (this.ctx) rampTo(this.ctx, this.master.gain, volumeToGain(volume));
  }

  setChannel(id, { enabled, volume }) {
    this.settings.mixer[id] = { enabled, volume };
    if (this.ctx && this.channels[id]) rampTo(this.ctx, this.channels[id].gain, this.channelGain(id));
  }

  fadeIn() {
    if (this.ctx) rampTo(this.ctx, this.transport.gain, 1, 0.01);
  }

  fadeOut() {
    if (this.ctx) rampTo(this.ctx, this.transport.gain, 0, 0.05);
  }
}
