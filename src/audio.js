const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Procedural fair ambience; no recorded crowd or vendor voices. */
export class MelaAudio {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.nodes = [];
    this.disposed = false;
    this.beat = 0;
    this.nextBeat = 0;
    this.nextAccent = 0;
    this.onVisibility = () => {
      if (!this.context || this.disposed) return;
      if (document.hidden) {
        this.context.suspend().catch(() => {});
        window.speechSynthesis?.cancel();
      } else if (this.enabled) this.context.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  async start() {
    if (this.disposed) return false;
    try {
      if (!this.context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return false;
        const ctx = this.context = new Audio();
        this.master = ctx.createGain();
        this.master.gain.value = this.enabled ? 0.48 : 0;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -16;
        limiter.knee.value = 20;
        limiter.ratio.value = 5;
        this.master.connect(limiter).connect(ctx.destination);
        this.nodes.push(this.master, limiter);
        const size = Math.floor(ctx.sampleRate * 3);
        this.noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < size; i++) {
          previous = (previous + (Math.random() * 2 - 1) * 0.075) / 1.075;
          data[i] = previous * 3;
        }
        this.crowd = this.bed('bandpass', 730, 0.65);
        this.crowdUpper = this.bed('bandpass', 1450, 1.6);
        this.food = this.bed('highpass', 2000, 0.7);
        this.wheel = this.bed('lowpass', 170, 0.7);
        this.dholLevel = 0.3;
        this.nextBeat = ctx.currentTime + 0.15;
        this.nextAccent = ctx.currentTime + 8;
      }
      if (this.enabled && !document.hidden) await this.context.resume();
      return true;
    } catch {
      return false;
    }
  }

  bed(filterType, frequency, q) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    source.connect(filter).connect(gain).connect(pan).connect(this.master);
    source.start(0, Math.random() * 2);
    this.nodes.push(source, filter, gain, pan);
    return { source, filter, gain, pan };
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) window.speechSynthesis?.cancel();
    if (!this.context) return;
    this.master.gain.setTargetAtTime(this.enabled ? 0.48 : 0, this.context.currentTime, 0.12);
    if (this.enabled && !document.hidden) this.context.resume().catch(() => {});
  }

  update(player = { x: 0, z: 0 }, locations = [], dt = 0) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.enabled || this.disposed) return;
    const now = ctx.currentTime;
    const nearby = pattern => {
      let nearest = null;
      let distance = Infinity;
      for (const location of locations) {
        if (!pattern.test(String(location.type || ''))) continue;
        const x = Number(location.x ?? location.position?.x);
        const z = Number(location.z ?? location.position?.z);
        if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
        const current = Math.hypot(x - player.x, z - player.z);
        if (current < distance) { distance = current; nearest = { x, z }; }
      }
      return {
        level: nearest ? 1 / (1 + (distance / 12) ** 2) : 0,
        pan: nearest ? clamp((nearest.x - player.x) / 18, -0.8, 0.8) : 0
      };
    };
    const food = nearby(/food|chaat|jalebi|chai|snack/i);
    const wheel = nearby(/wheel|ferris|jhoola|ride/i);
    const stage = nearby(/ram|stage|leela|entrance|dhol/i);
    const smooth = Math.max(0.12, Math.min(0.4, Number(dt) || 0.15));
    const level = (bed, amount, pan = 0) => {
      bed.gain.gain.setTargetAtTime(amount, now, smooth);
      bed.pan.pan?.setTargetAtTime(pan, now, smooth);
    };
    const babble = 0.7 + Math.sin(now * 0.83) * 0.15 + Math.sin(now * 1.73) * 0.1;
    level(this.crowd, 0.095 * babble);
    level(this.crowdUpper, 0.038 * (1 + Math.sin(now * 1.13) * 0.3), Math.sin(now * 0.18) * 0.3);
    this.crowd.filter.frequency.setTargetAtTime(620 + Math.sin(now * 0.6) * 180, now, 0.5);
    this.crowdUpper.filter.frequency.setTargetAtTime(1300 + Math.sin(now * 0.39) * 350, now, 0.5);
    level(this.food, food.level * (0.105 + Math.sin(now * 5) * 0.012), food.pan);
    level(this.wheel, wheel.level * (0.13 + Math.sin(now * 4.5) * 0.035), wheel.pan);
    this.wheel.source.playbackRate.setTargetAtTime(0.7 + Math.sin(now * 0.3) * 0.05, now, 0.5);
    this.dholLevel = 0.18 + stage.level * 0.55;
    if (now >= this.nextBeat) {
      // Schedule from the current time so a restored tab never replays missed beats.
      this.drum(this.beat % 4 === 0 || this.beat % 4 === 3, now, this.dholLevel);
      this.beat++;
      this.nextBeat = now + (this.beat % 4 === 3 ? 0.22 : 0.31);
    }
    if (now >= this.nextAccent) {
      this.effect(Math.random() > 0.3 ? 'bell' : 'horn');
      this.nextAccent = now + 12 + Math.random() * 16;
    }
  }

  tone(frequency, duration, volume, type = 'sine', endFrequency, when) {
    const ctx = this.context;
    if (!ctx || !this.enabled || ctx.state !== 'running' || this.disposed) return;
    const at = when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + Math.min(0.012, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(this.master);
    osc.start(at);
    osc.stop(at + duration + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  burst(duration, volume, frequency = 900, type = 'lowpass') {
    const ctx = this.context;
    if (!ctx || !this.enabled || ctx.state !== 'running' || this.disposed) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(0, Math.random());
    source.stop(ctx.currentTime + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  drum(low, now, level) {
    this.tone(low ? 125 : 225, low ? 0.22 : 0.12, (low ? 0.12 : 0.055) * level, 'sine', low ? 46 : 110, now);
    if (!low) this.burst(0.065, 0.045 * level, 1800, 'highpass');
  }

  effect(name) {
    if (!this.context || !this.enabled || this.disposed) return;
    const now = this.context.currentTime;
    switch (name) {
      case 'pop': case 'balloon':
        this.tone(260, 0.075, 0.12, 'sine', 55);
        this.burst(0.08, 0.1, 2100); break;
      case 'firework': case 'fireworks': case 'dahan':
        this.tone(550, 0.6, 0.035, 'sine', 1500);
        this.burst(1.5, 0.2, 700);
        this.burst(0.7, 0.09, 3500, 'highpass'); break;
      case 'cheer': case 'success': case 'win':
        [392, 494, 587, 784].forEach((note, index) => this.tone(note, 0.35, 0.045, 'sine', undefined, now + index * 0.12));
        this.burst(0.7, 0.08, 1100, 'bandpass'); break;
      case 'bell':
        this.tone(1047, 0.8, 0.025);
        this.tone(2097, 0.4, 0.009); break;
      case 'horn':
        this.tone(294, 0.35, 0.014, 'triangle');
        this.tone(370, 0.3, 0.009, 'triangle'); break;
      case 'throw': case 'ring':
        this.tone(660, 0.2, 0.025, 'sine', 280); break;
      default: this.tone(523, 0.15, 0.025);
    }
  }

  speak(text) {
    if (!this.enabled || this.disposed || document.hidden || !this.context || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(String(text).slice(0, 250));
    const hindi = /[\u0900-\u097f]/.test(speech.text);
    const voices = window.speechSynthesis.getVoices();
    speech.voice = voices.find(voice => voice.lang.startsWith(hindi ? 'hi' : 'en-IN'))
      || voices.find(voice => voice.lang.startsWith(hindi ? 'hi' : 'en')) || null;
    speech.lang = hindi ? 'hi-IN' : 'en-IN';
    speech.rate = 0.9;
    speech.volume = 0.65;
    window.speechSynthesis.speak(speech);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.speechSynthesis?.cancel();
    for (const node of this.nodes) {
      try { node.stop?.(); } catch { /* A source may already have stopped. */ }
      try { node.disconnect(); } catch { /* Ignore closed context cleanup. */ }
    }
    this.nodes.length = 0;
    this.context?.close().catch(() => {});
  }
}

export const dispose = audio => audio?.dispose();
