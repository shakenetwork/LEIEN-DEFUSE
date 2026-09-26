/* Optional Bilibili Toy identity. No cookies, UID, storage or custom bridge.
 * Official contract: https://www.bilibili.com/toy/publish/sdk#api-getuserprofile
 * The first profile request must follow a user gesture; Toy owns consent UI. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.Defuse.profile = api.createProfile(root, root.Defuse);
    const boot = () => root.Defuse.profile.init();
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot, { once: true });
    else boot();
  }
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const SDK_URL = "https://s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js";

  function isToyEnvironment(win) {
    const loc = win.location, ua = win.navigator?.userAgent || "";
    if (!loc || loc.protocol !== "https:" || !loc.pathname.startsWith("/toy/")) return false;
    // The official SDK rejects these browsers and otherwise opens an App prompt.
    if (!/BiliApp/i.test(ua) && /Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return false;
    if (loc.hostname === "www.bilibili.com") return true;
    if (!["www.bilibilitoy.com", "www.bebox.net"].includes(loc.hostname)) return false;
    const ancestors = loc.ancestorOrigins;
    if (ancestors?.length && ancestors[0] !== "https://www.bilibili.com") return false;
    return win.parent !== win || /BiliApp/i.test(ua);
  }

  function normalizeProfile(value, fallback) {
    if (!value || typeof value.nickname !== "string") throw new Error("invalid_profile");
    const name = Array.from(value.nickname.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "").trim()).slice(0, 40).join("");
    if (!name) throw new Error("invalid_profile");
    let image = fallback.image;
    if (typeof value.avatar === "string") {
      try {
        const url = new URL(value.avatar);
        if (url.protocol === "https:" && !url.username && !url.password && !url.port &&
            (url.hostname === "hdslb.com" || url.hostname.endsWith(".hdslb.com"))) image = url.href;
      } catch (_) { /* A bad avatar must never prevent playing. */ }
    }
    // Intentionally discard toyOpenId: this game needs only presentation data.
    return { name, image };
  }

  function createProfile(win, Defuse) {
    const doc = win.document, fallback = { name: Defuse.player.name, image: Defuse.player.image };
    let app, sdk, observer, initTask, supported = false, connected = false;
    let eligible = false, loading = false, pending = false, queued = false, status = "", requestId = 0;
    let authorizedImage = "", avatarFailed = false, loginRequired = false;

    function sync() {
      if (!app) return;
      app.querySelectorAll("[data-player-name]").forEach((node) => {
        if (node.textContent !== Defuse.player.name) node.textContent = Defuse.player.name;
      });
      app.querySelectorAll("[data-player-avatar]").forEach((img) => {
        if (img.getAttribute("src") !== Defuse.player.image) img.setAttribute("src", Defuse.player.image);
        img.alt = `${Defuse.player.name}的头像`;
        img.referrerPolicy = "no-referrer";
        if (connected && Defuse.player.image !== fallback.image) img.dataset.profileSource = "bilibili";
        else delete img.dataset.profileSource;
      });
      app.querySelectorAll("[data-profile-controls]").forEach((node) => { node.hidden = !eligible; });
      app.querySelectorAll("[data-profile-offline]").forEach((node) => { node.hidden = eligible; });
      app.querySelectorAll("[data-profile-login]").forEach((node) => { node.hidden = !eligible || !loginRequired; });
      app.querySelectorAll("[data-profile-connect]").forEach((node) => {
        node.disabled = loading || pending || (connected && !avatarFailed);
        node.hidden = connected && !avatarFailed;
        node.textContent = loading ? "正在连接 B站…" : avatarFailed ? "重试加载头像" : connected ? "已使用 B站身份" :
          pending ? "等待授权…" : eligible && !supported ? "重试连接 B站" : loginRequired ? "登录后重新连接" : "连接 B站账号";
      });
      app.querySelectorAll("[data-profile-status]").forEach((node) => {
        if (node.textContent !== status) node.textContent = status;
      });
    }

    function queueSync(records) {
      if (queued || !records.some((r) => Array.from(r.addedNodes).some((n) => n.nodeType === 1))) return;
      queued = true;
      win.queueMicrotask(() => { queued = false; sync(); });
    }

    function onAvatarError(event) {
      if (!connected || !event.target?.matches?.("[data-player-avatar]")) return;
      if (event.target.getAttribute("src") !== Defuse.player.image || Defuse.player.image === fallback.image) return;
      Defuse.player.image = fallback.image;
      avatarFailed = !!authorizedImage;
      status = "昵称已同步，头像暂未加载。可以重试，不影响开局。";
      sync();
    }

    function loadSdk() {
      return new Promise((resolve, reject) => {
        // Never adopt an arbitrary pre-existing window.toy or a query-string URL.
        const script = doc.createElement("script");
        script.src = SDK_URL;
        script.async = true;
        script.referrerPolicy = "no-referrer";
        const timer = win.setTimeout(() => { script.remove(); reject(new Error("sdk_unavailable")); }, 6000);
        script.onload = () => {
          win.clearTimeout(timer);
          const candidate = win.toy;
          if (typeof candidate?.getUserProfile === "function" && typeof candidate?.isSupport === "function") resolve(candidate);
          else reject(new Error("sdk_unavailable"));
        };
        script.onerror = () => { win.clearTimeout(timer); script.remove(); reject(new Error("sdk_unavailable")); };
        doc.head.appendChild(script);
      });
    }

    function failureMessage(error) {
      switch (error?.type) {
        case "user_denied": return "未授权，继续使用默认角色。想换头像时可以重试。";
        case "not_logged_in": return "B站尚未登录。点击下方登录，完成后回来重新连接。";
        case "unsupported": return "当前环境暂不支持，继续使用默认角色。";
        default: return "暂时没能取得头像，继续玩，也可以稍后重试。";
      }
    }

    function connect(event) {
      if (!eligible || loading || pending || !event?.isTrusted) return Promise.resolve(false);
      if (win.navigator?.userActivation && !win.navigator.userActivation.isActive) return Promise.resolve(false);
      if (connected) {
        if (!avatarFailed || !authorizedImage) return Promise.resolve(false);
        avatarFailed = false;
        Defuse.player.image = authorizedImage;
        status = "B站身份已同步 · 你是补枪手";
        sync();
        return Promise.resolve(true);
      }
      // Retrying a failed SDK load does not request a profile after awaiting it.
      // Once ready, a separate click supplies the required fresh user gesture.
      if (!supported) return init().then(() => false);
      pending = true;
      status = "仅用于你的游戏角色，由 B站确认授权。";
      sync();
      const id = ++requestId;
      let result;
      // Call synchronously within the real click, before any await loses activation.
      try { result = sdk.getUserProfile(); } catch (error) { result = Promise.reject(error); }
      return new Promise((resolve) => {
        const timer = win.setTimeout(() => {
          if (id !== requestId) return;
          requestId++;
          pending = false;
          status = "授权暂未完成，默认角色仍可开局。";
          sync();
          resolve(false);
        }, 120000);
        Promise.resolve(result).then((value) => {
          if (id !== requestId) return;
          const profile = normalizeProfile(value, fallback);
          Defuse.player.name = profile.name;
          Defuse.player.image = profile.image;
          authorizedImage = profile.image !== fallback.image ? profile.image : "";
          avatarFailed = false;
          connected = true;
          loginRequired = false;
          status = authorizedImage ? "B站身份已同步 · 你是补枪手" : "B站昵称已同步 · 暂用默认头像";
          win.dispatchEvent?.(new win.Event("defuse-profile-change"));
          return true;
        }).catch((error) => {
          if (id !== requestId) return;
          loginRequired = error?.type === "not_logged_in";
          status = failureMessage(error);
          return false;
        }).then((ok) => {
          win.clearTimeout(timer);
          if (id === requestId) { pending = false; sync(); }
          resolve(!!ok);
        });
      });
    }

    function supportProbe() {
      return new Promise((resolve, reject) => {
        const timer = win.setTimeout(() => reject(new Error("support_timeout")), 7000);
        Promise.resolve().then(() => sdk.isSupport("getUserProfile")).then(resolve, reject).finally(() => win.clearTimeout(timer));
      });
    }

    function init() {
      if (initTask) return initTask;
      if (supported) return Promise.resolve(true);
      if (!app) {
        app = doc.querySelector("#app");
        if (!app) return Promise.resolve(false);
        app.addEventListener("click", (event) => {
          if (event.target?.closest?.("[data-profile-connect]") && app.contains(event.target)) connect(event);
        });
        app.addEventListener("error", onAvatarError, true);
        if (win.MutationObserver) {
          observer = new win.MutationObserver(queueSync);
          observer.observe(app, { childList: true, subtree: true });
        }
        // A transient offline launch must not permanently suppress the feature.
        win.addEventListener?.("online", () => { if (!supported && !pending) init(); });
      }
      eligible = isToyEnvironment(win);
      sync();
      if (!eligible) return Promise.resolve(false);
      loading = true;
      status = "正在连接 B站，默认角色仍可开局。";
      sync();
      initTask = (async () => {
        try {
          if (!sdk) sdk = await loadSdk();
          supported = !!(await supportProbe());
          status = supported ? "点击授权后，使用你的 B站头像和昵称。" : "当前容器暂不支持身份同步，可稍后重试。";
        } catch (_) {
          supported = false;
          status = "暂时未连接 B站，可以重试，也可以直接开局。";
        }
        return supported;
      })().finally(() => {
        loading = false;
        initTask = null;
        sync();
      });
      return initTask;
    }

    function requireLogin() {
      connected = false; loginRequired = true; avatarFailed = false; authorizedImage = "";
      Defuse.player.name = fallback.name; Defuse.player.image = fallback.image;
      status = failureMessage({ type: "not_logged_in" });
      sync();
      win.dispatchEvent?.(new win.Event("defuse-profile-change"));
    }
    return { init, sync, connect, requireLogin, get sdk() { return eligible ? sdk : null; },
      get state() { return { supported, pending, connected, loading, avatarFailed, eligible, loginRequired }; } };
  }
  return { SDK_URL, isToyEnvironment, normalizeProfile, createProfile };
});
