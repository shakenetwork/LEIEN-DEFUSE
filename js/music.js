/* Equip one local kit at a time; every cue follows the same planted deadline. */
Defuse.music = {
  selected: "bright",
  volume: 0.45,
  cue: null,
  cueRequest: null,
  cueRetry: null,
  mvp: null,
  mvpToken: 0,
  mvpRequest: null,
  hasKit(id) {
    return Object.hasOwn(Defuse.assets.musicKits, id);
  },
  kit() {
    return Defuse.assets.musicKits[this.selected] || null;
  },
  presentation() {
    const kit = this.kit();
    return kit
      ? {
          ...kit,
          category: "音乐盒",
          label: `MUSIC KIT / ${kit.number}`,
          alt: `${kit.title}音乐盒封面`,
        }
      : {
          title: Defuse.assets.gameAudio.title,
          artist: Defuse.assets.gameAudio.artist,
          cover: Defuse.assets.gameAudio.cover,
          category: "游戏音效",
          label: "COUNTER-STRIKE 2",
          alt: "Counter-Strike 2",
        };
  },
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem("leien-music-v1"));
      if (saved?.selected === "off") {
        this.selected = "bright";
        if (Defuse.audio.setMusicMuted) Defuse.audio.setMusicMuted(true);
        else Defuse.audio.musicMuted = true;
        // Migrate once; otherwise every reload overrides a later unmute.
        this.save();
      } else if (this.hasKit(saved?.selected))
        this.selected = saved.selected;
    } catch {
      /* Preferences are optional when local storage is unavailable. */
    }
  },
  save() {
    try {
      localStorage.setItem(
        "leien-music-v1",
        JSON.stringify({
          selected: this.selected,
        }),
      );
    } catch {}
  },
  level() {
    return this.volume * 0.65;
  },
  select(id) {
    if ((id !== "off" && !this.hasKit(id)) || id === this.selected) return;
    this.stop();
    this.selected = id;
    this.save();
    this.refresh();
    // Manual menu feedback is owned by ui-feedback.js; programmatic restore
    // and preference migration must not sound like an extra player click.
  },
  stop() {
    this.cue = null;
    this.cueRequest = this.cueRetry = null;
    this.mvp = null;
    this.mvpRequest = null;
    this.mvpToken++;
    Defuse.audio.stop("music");
    Defuse.audio.stop("music-choice");
    Defuse.audio.stop("mvp");
    this.refresh();
  },
  playMvp(startedAt = Date.now()) {
    const kit = this.kit();
    if (this.selected === "off" || !kit?.mvp || Defuse.audio.musicMuted || document.hidden) return;
    const audio = Defuse.audio, current = this.mvpRequest;
    // Foreground recovery and its first touch can arrive together. Keep the
    // same decoded/pending voice rather than cutting and seeking it twice.
    if (current && current.key === `${this.selected}:${startedAt}` &&
        current.context === audio.ctx && current.generation === audio.generation &&
        current.epoch === (audio.epochs?.get("mvp") || 0)) return current.task;
    this.stop();
    this.mvp = this.selected;
    const token = ++this.mvpToken;
    audio.unlock();
    const request = this.mvpRequest = {
      key: `${this.selected}:${startedAt}`, context: audio.ctx,
      generation: audio.generation, epoch: audio.epochs?.get("mvp") || 0,
    };
    request.task = Promise.resolve(
      audio.play(kit.mvp, {
        group: "mvp",
        volume: this.level(),
        fallback: false,
        startedAt,
      }),
    ).then((voice) => {
      if (token !== this.mvpToken) return;
      if (!voice) {
        this.mvp = null;
        this.mvpRequest = null;
        return;
      }
      voice.node.addEventListener(
        "ended",
        () => {
          if (token !== this.mvpToken) return;
          this.mvp = null;
          this.mvpRequest = null;
        },
        { once: true },
      );
    });
    return request.task;
  },
  sync(round) {
    const kit = this.kit();
    const playable = round && round.state !== "ended" && round.remaining > 0;
    const phase = playable && round.remaining <= 10000 ? "ten" : "planted";
    const enabled =
      playable &&
      this.selected !== "off" &&
      !Defuse.audio.musicMuted &&
      !document.hidden &&
      Defuse.audio.ctx?.state === "running";
    const key = enabled ? `${this.selected}:${round.deadline}:${phase}` : null;
    if (this.cue !== key) {
      if (enabled && this.cueRetry?.key === key && Date.now() < this.cueRetry.at) return;
      Defuse.audio.stop("music");
      this.cue = key;
      this.cueRequest = null;
      if (enabled) {
        const request = this.cueRequest = { key };
        Promise.resolve(Defuse.audio.play(kit.tracks[phase], {
          group: "music",
          volume: this.level(),
          fallback: false,
          startedAt: phase === "ten" ? round.deadline - 10000 : round.plantedAt,
        })).then(voice => {
          if (this.cueRequest !== request || voice) return;
          // A transient fetch/decode failure used to leave this cue marked as
          // playing for the entire phase. Retry gently against its original
          // clock, without ever reviving an abandoned round or changed kit.
          this.cue = null;
          this.cueRetry = { key, at: Date.now() + 1000 };
        });
      }
    }
    const label = document.querySelector("[data-music-now]");
    if (label) {
      const text =
        this.selected === "off"
          ? "仅游戏音效"
          : Defuse.audio.musicMuted
            ? `${kit.title} · 已静音`
            : this.volume === 0
              ? `${kit.title} · 音乐音量为 0`
              : `${kit.title} · ${phase === "ten" ? "最后 10 秒" : "下包乐段"}`;
      if (label.textContent !== text) label.textContent = text;
      label
        .closest(".music-now")
        .classList.toggle("music-critical", !!playable && phase === "ten");
    }
  },
  refresh() {
    const mvpStatus = document.querySelector("[data-mvp-status]");
    if (mvpStatus) mvpStatus.textContent = Defuse.audio.musicMuted ? "MVP · 音乐已关闭" : "响彻音乐盒！";
    const panel = document.querySelector(".music-kit");
    if (!panel) return;
    const kit = this.presentation();
    panel.dataset.audioMode = "kit";
    const cover = panel.querySelector(".music-kit-art img");
    if (kit.cover && cover.getAttribute("src") !== kit.cover)
      cover.src = kit.cover;
    cover.alt = kit.alt;
    panel.querySelector(".music-kit-name").textContent = kit.title;
    panel.querySelector(".music-artist").textContent = kit.artist;
    panel
      .querySelectorAll("[data-music-choice]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.musicChoice === this.selected),
        ),
      );
    const status = Defuse.audio.musicMuted
      ? "音乐已关闭"
      : this.selected !== "off" ? "已装备" : "已启用";
    panel.querySelector(".music-kit-status").textContent = status;
  },
  bar() {
    const name = this.kit()?.title;
    return `<div class="music-now"><span aria-hidden="true">♫</span><span data-music-now>${this.selected === "off" ? "音乐已关闭" : Defuse.audio.musicMuted ? `${name} · 已静音` : `${name} · 等待下包`}</span><span class="music-signal" aria-hidden="true">▂▅▃▆</span></div>`;
  },
  mvpBanner(result) {
    const kit = this.kit();
    const winner = result && Defuse.resolveMvp?.(result);
    const winnerName = winner && winner.id !== "player" ? Defuse.escapeHtml(winner.name) : Defuse.playerName();
    const title = kit?.title || "仅游戏音效";
    const art = kit?.cover || Defuse.assets.gameAudio.cover;
    const status = kit ? Defuse.audio.musicMuted ? "MVP · 音乐已关闭" : "响彻音乐盒！" : "本回合使用固定游戏音效";
    return `<section class="mvp-banner" aria-label="本回合 MVP 音乐"><div class="mvp-banner-art"><img src="${art}" alt="${title}封面" width="90" height="70"></div><div class="mvp-banner-copy"><span>本回合 MVP · ${winnerName}</span><strong data-mvp-status>${status}</strong><p>音乐盒 · ${title}</p></div><b class="mvp-banner-mark">MVP</b></section>`;
  },
  panel() {
    const kit = this.presentation();
    const choices = Object.entries(Defuse.assets.musicKits)
      .map(
        ([id, item]) =>
          `<button data-music-choice="${id}" aria-pressed="${this.selected === id}">${item.title}</button>`,
      )
      .join("");
    return `<section class="music-kit" data-audio-mode="kit" aria-labelledby="music-title"><div class="audio-loadout-header"><span>音乐盒</span><span class="music-kit-status" aria-live="polite"></span></div><div class="music-kit-art"><div class="audio-art-frame"><img src="${kit.cover}" alt="${kit.alt}" width="256" height="198"></div></div><div class="music-kit-info"><h2 id="music-title" class="music-kit-name">${kit.title}</h2><p class="music-artist">${kit.artist}</p></div><div class="music-kit-controls"><div class="music-kit-choice" role="group" aria-label="选择音乐盒">${choices}</div></div></section>`;
  },
};
Defuse.music.load();
