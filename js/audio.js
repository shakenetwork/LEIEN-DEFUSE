/* Shared Web Audio mixer: local bank works over HTTP and when opening index.html directly. */
Defuse.audio = {
  muted: false,
  musicMuted: false,
  effectEpoch: 0,
  isMuted(group) { return ["music", "mvp"].includes(group) ? this.musicMuted : this.muted; },
  saveSettings() {
    try { localStorage.setItem("leien-audio-settings", JSON.stringify({ effects: !this.muted, music: !this.musicMuted })); } catch {}
  },
  setMusicMuted(value) {
    this.musicMuted = !!value;
    if (value) { this.stop("music"); this.stop("mvp"); }
    this.saveSettings();
  },
  ctx: null,
  master: null,
  decoded: new Map(),
  voices: new Set(),
  epochs: new Map(),
  generation: 0,
  resumeTask: null,
  resumingContext: null,
  pendingCues: new Map(),
  cueSerial: 0,
  buses: null,
  peakTrims: new WeakMap(),
  cueFamily(name) {
    if (name === "uiTap") return "menu-tap";
    if (/^key[1-7]$/.test(name)) return "keypad";
    if (name === "alarm" || name === "urgent") return "bomb-beep";
    return name;
  },
  clock() { return typeof performance !== "undefined" ? performance.now() : Date.now(); },
  createMixer(context) {
    // Reserve output headroom after compression; the previous broad-knee
    // compressor also boosted quiet signals and could pass overloaded attacks.
    this.master = context.createGain();
    this.master.gain.value = 0.75;
    this.buses = { effects: context.createGain(), music: context.createGain() };
    Object.values(this.buses).forEach(bus => bus.connect(this.master));
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -6;
    compressor.knee.value = 3;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.12;
    const output = context.createGain();
    output.gain.value = 0.75;
    this.master.connect(compressor);
    compressor.connect(output);
    output.connect(context.destination);
  },
  trim(buffer) {
    if (!this.peakTrims.has(buffer)) {
      let peak = 0;
      for (let c = 0; c < buffer.numberOfChannels; c++)
        for (const sample of buffer.getChannelData(c)) peak = Math.max(peak, Math.abs(sample));
      // Some decoded effects exceed 0 dBFS after resampling. Only attenuate;
      // do not re-encode, normalise upwards or reduce the sampling rate.
      this.peakTrims.set(buffer, peak > 0.9 ? 0.9 / peak : 1);
    }
    return this.peakTrims.get(buffer);
  },
  releaseVoice(voice) {
    this.voices.delete(voice);
    try {
      const now = this.ctx.currentTime;
      if (voice.envelope && voice.startAt <= now && this.ctx.state === "running") {
        const param = voice.envelope.gain;
        if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
        else { param.cancelScheduledValues(now); param.setValueAtTime(1, now); }
        param.linearRampToValueAtTime(0, now + 0.012);
        voice.node.stop(now + 0.015);
      } else voice.node.stop();
    } catch {}
  },
  volumes: {
    tap: 0.24,
    plant: 0.55,
    initiate: 0.35,
    planted: 0.72,
    shot: 0.28,
    deagle: 0.24,
    death: 0.5,
    distant: 0.08,
    defuse: 0.45,
    finish: 0.5,
    alarm: 0.3,
    urgent: 0.25,
    explosion: 0.38,
    smoke: 0.16,
    radio: 0.3,
    ctwin: 0.7,
    twin: 0.7,
  },
  unlock({ retry = false } = {}) {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      if (this.ctx?.state === "closed") {
        this.stopAll();
        this.ctx = this.master = null;
        this.buses = null;
        this.decoded.clear();
        this.resumeTask = this.resumingContext = null;
      }
      if (!this.ctx) {
        this.ctx = new C();
        this.createMixer(this.ctx);
      }
      const context = this.ctx;
      if (context.state === "suspended" || context.state === "interrupted") {
        // Some mobile WebViews leave a foreground resume promise pending.
        // Only a later explicit gesture may retry it; ordinary simultaneous
        // cues still share one recovery and never recreate the context.
        if (!retry && this.resumingContext === context && this.resumeTask) return this.resumeTask;
        const task = Promise.resolve(context.resume()).then(
          () => this.ctx === context && context.state === "running",
          () => false,
        );
        this.resumeTask = task;
        this.resumingContext = context;
        task.finally(() => {
          if (this.resumeTask === task) this.resumeTask = this.resumingContext = null;
        });
        return task;
      }
    } catch {
      /* Browsers without audio still play the complete game. */
    }
  },
  async ready(context) {
    // User gestures start resume asynchronously. A cached buffer may be ready
    // first; wait for that same recovery instead of silently discarding it.
    if (this.resumingContext === context && this.resumeTask) await this.resumeTask;
    return this.ctx === context && context?.state === "running";
  },
  setMuted(value) {
    this.muted = !!value;
    if (value) {
      this.effectEpoch++;
      for (const group of new Set([...this.voices].map(v => v.group)))
        if (!["music", "mvp"].includes(group)) this.stop(group);
    }
    this.saveSettings();
  },
  stop(group) {
    this.epochs.set(group, (this.epochs.get(group) || 0) + 1);
    for (const voice of [...this.voices])
      if (voice.group === group) {
        this.releaseVoice(voice);
      }
  },
  stopAll() {
    this.generation++;
    for (const voice of [...this.voices]) this.releaseVoice(voice);
    this.pendingCues.clear();
  },
  async buffer(path) {
    const context = this.ctx;
    if (!this.decoded.has(path))
      this.decoded.set(
        path,
        (async () => {
          await Defuse.audioBankReady;
          let data;
          if (Defuse.audioBank?.[path]) {
            const binary = atob(Defuse.audioBank[path]);
            data = Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer;
          } else {
            const response = await fetch(path);
            if (!response.ok) throw new Error("Audio missing");
            data = await response.arrayBuffer();
          }
          return context.decodeAudioData(data);
        })(),
      );
    const task = this.decoded.get(path);
    try { return await task; }
    catch (error) {
      // A temporary mobile-network failure must not poison this cache forever.
      if (this.decoded.get(path) === task) this.decoded.delete(path);
      throw error;
    }
  },
  setGroupVolume(group, volume) {
    for (const voice of this.voices)
      if (voice.group === group && voice.gain)
        voice.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)) * (voice.trim || 1), this.ctx.currentTime, 0.04);
  },
  defeatCues(result) {
    if (!result || result.success) return [];
    // Pre-plant defense ends by elimination. Its cinematic already played
    // the gunfire; no C4 exists to beep or explode in this branch.
    if (result.opening === "rush-defense") return [{ name: "twin", at: 0.12 }];
    // Smoke deaths already played their gunfire/collapse before this result.
    // Do not imply that a positioning mistake detonated the C4.
    if (result.reason === "eliminated" && result.deathCause === "smoke-crossfire")
      return [{ name: "twin", at: 0.12 }];
    // Terminal outcomes are exclusive. A gunfire/fire/grenade death never
    // resumes the planted clock or schedules an imaginary later C4 blast.
    if (result.reason === "eliminated" || result.terminalKind === "eliminated")
      return [{ name: "death", at: 0 }, { name: "twin", at: .65 }];
    return [{ name: "explosion", at: 0 }, { name: "twin", at: 1.15 }];
  },
  async playDefeat(result) {
    this.stop("result");
    const cues = this.defeatCues(result);
    if (!cues.length || this.muted || !this.ctx || document.hidden) return;
    const generation = this.generation, effectEpoch = this.effectEpoch, epoch = this.epochs.get("result"), context = this.ctx;
    // Decode before scheduling so the large explosion file cannot arrive
    // after the victory announcement. All cues share one audio-clock origin.
    await Promise.allSettled([...new Set(cues.map(c => c.name))].map(name => {
      const path = Defuse.assets.sounds[name];
      return path ? this.buffer(path) : Promise.resolve();
    }));
    const ready = await this.ready(context);
    if (this.muted || document.hidden || !ready ||
        this.generation !== generation || this.effectEpoch !== effectEpoch || this.epochs.get("result") !== epoch) return;
    const origin = this.ctx.currentTime + 0.015;
    return Promise.all(cues.map(cue => this.play(cue.name, {
      group: "result", at: origin + cue.at, fallback: false,
    })));
  },
  async play(
    name,
    {
      group = "effect",
      loop = false,
      volume,
      pan = 0,
      delay = 0,
      at,
      startedAt,
      fallback = true,
    } = {},
  ) {
    if (this.isMuted(group) || !this.ctx || document.hidden) return;
    const music = ["music", "mvp"].includes(group);
    const immediate = !music && !loop && at === undefined && !delay;
    const family = this.cueFamily(name), requestKey = `${group}:${family}`;
    const request = ++this.cueSerial, requestedAt = this.clock();
    if (immediate) this.pendingCues.set(requestKey, request);
    const stale = () => immediate && (this.pendingCues.get(requestKey) !== request ||
      this.clock() - requestedAt > (/^(keypad|tap|menu-tap|bomb-beep|radio)$/.test(family) ? 200 : 600));
    const context = this.ctx,
      path = Defuse.assets.sounds[name],
      epoch = this.epochs.get(group) || 0,
      generation = this.generation,
      effectEpoch = this.effectEpoch;
    if (!path) {
      if (fallback) this.synth(name);
      return;
    }
    try {
      const buffer = await this.buffer(path);
      const ready = await this.ready(context);
      if (
        this.isMuted(group) ||
        (!["music", "mvp"].includes(group) && effectEpoch !== this.effectEpoch) ||
        generation !== this.generation ||
        epoch !== (this.epochs.get(group) || 0) ||
        !ready
      )
        return;
      if (stale() || document.hidden) return;
      // Seek against the round clock after decoding, including tab resumes.
      const offset =
        startedAt === undefined
          ? 0
          : Math.max(0, (Date.now() - startedAt) / 1000);
      if (!loop && offset >= buffer.duration) return;
      // Fast taps must not build an ever-growing choir, including different
      // keypad digits. Scheduled result cues retain their intended timeline.
      if (immediate) {
        const siblings = [...this.voices].filter(v => !v.music && v.family === family && v.startAt <= this.ctx.currentTime);
        const limit = /^(keypad|tap|menu-tap|radio|bomb-beep)$/.test(family) ? 1 : 2;
        while (siblings.length >= limit) this.releaseVoice(siblings.shift());
      }
      const effectVoices = [...this.voices].filter(v => !v.music);
      if (!music && effectVoices.length >= 12) this.releaseVoice(effectVoices[0]);
      const source = this.ctx.createBufferSource(),
        gain = this.ctx.createGain(), envelope = this.ctx.createGain();
      const startAt = at === undefined ? this.ctx.currentTime + delay : Math.max(this.ctx.currentTime, at);
      const trim = this.trim(buffer);
      source.buffer = buffer;
      source.loop = loop;
      gain.gain.value = Math.max(0, Math.min(1, volume ?? this.volumes[name] ?? 0.25)) * trim;
      // Separate click-free envelope leaves volume changes independent.
      const duration = buffer.duration - offset;
      const attack = Math.min(music ? 0.025 : 0.003, duration / 3);
      envelope.gain.setValueAtTime(0, startAt);
      envelope.gain.linearRampToValueAtTime(1, startAt + attack);
      if (!loop) {
        const endAt = startAt + duration;
        envelope.gain.setValueAtTime(1, Math.max(startAt + attack, endAt - 0.008));
        envelope.gain.linearRampToValueAtTime(0, endAt);
      }
      source.connect(gain);
      gain.connect(envelope);
      const bus = this.buses?.[music ? "music" : "effects"] || this.master;
      const panner = !music && Number.isFinite(pan) && pan !== 0 && this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        envelope.connect(panner);
        panner.connect(bus);
      } else envelope.connect(bus);
      const voice = { node: source, gain, envelope, panner, group, name, offset, music, family, startAt, trim };
      this.voices.add(voice);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        envelope.disconnect();
        panner?.disconnect();
        this.voices.delete(voice);
      };
      source.start(
        startAt,
        loop ? offset % buffer.duration : offset,
      );
      return voice;
    } catch {
      if (
        fallback &&
        generation === this.generation &&
        epoch === (this.epochs.get(group) || 0) &&
        !this.isMuted(group) && effectEpoch === this.effectEpoch
        && !stale() && !document.hidden
      )
        this.synth(name);
    }
  },
  tone(frequency, duration, type = "sine", delay = 0, volume = 0.04) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    if ([...this.voices].filter(v => v.group === "synth").length >= 4) return;
    const source = this.ctx.createOscillator(),
      gain = this.ctx.createGain(),
      envelope = this.ctx.createGain(),
      at = this.ctx.currentTime + delay;
    source.type = type;
    source.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(1, at + 0.003);
    source.connect(gain);
    gain.connect(envelope);
    envelope.connect(this.buses?.effects || this.master);
    const voice = { node: source, gain, envelope, group: "synth", startAt: at, music: false };
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      envelope.disconnect();
      this.voices.delete(voice);
    };
    source.start(at);
    source.stop(at + duration + 0.02);
  },
  synth(name) {
    if (name === "rankup") {
      // Short ascending cue, routed through the same effects limiter as gameplay.
      this.tone(523.25, 0.16, 'sine', 0, 0.035);
      this.tone(659.25, 0.18, 'sine', 0.13, 0.035);
      this.tone(783.99, 0.25, 'sine', 0.26, 0.035);
      this.tone(1046.5, 0.3, 'sine', 0.4, 0.025);
    } else if (name === "error") {
      this.tone(160, 0.17, "sawtooth");
      this.tone(100, 0.18, "sawtooth", 0.12);
    } else if (name === "pass" || name === "finish" || name === "ctwin") {
      this.tone(700, 0.12);
      this.tone(1050, 0.2, "sine", 0.1);
    } else if (name === "explosion" || name === "twin") {
      this.tone(70, 0.6, "sawtooth", 0, 0.1);
    } else this.tone(name === "alarm" || name === "urgent" ? 1200 : 800, 0.07);
  },
  vibrate(pattern) {
    if (!this.muted && navigator.vibrate) navigator.vibrate(pattern);
  },
};
try {
  const saved = JSON.parse(localStorage.getItem("leien-audio-settings"));
  if (saved) {
    Defuse.audio.muted = saved.effects === false;
    Defuse.audio.musicMuted = saved.music === false;
  }
} catch { /* Optional local settings. */ }
