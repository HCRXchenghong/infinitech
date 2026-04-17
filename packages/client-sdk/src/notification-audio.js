function trimValue(value) {
  return String(value || "").trim();
}

function appendCacheBuster(url) {
  const value = trimValue(url);
  if (!value) return "";
  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}_ts=${Date.now()}`;
}

function normalizeRefreshTargets(envelope) {
  const payload = envelope && typeof envelope === "object" ? envelope.payload || {} : {};
  const source = Array.isArray(envelope?.refreshTargets)
    ? envelope.refreshTargets
    : (Array.isArray(payload?.refreshTargets) ? payload.refreshTargets : []);
  return source.map((item) => trimValue(item).toLowerCase()).filter(Boolean);
}

function normalizeEnvelopeText(envelope, key) {
  if (!envelope || typeof envelope !== "object") return "";
  const payload = envelope.payload && typeof envelope.payload === "object" ? envelope.payload : {};
  return trimValue(envelope[key] || payload[key]).toLowerCase();
}

function createHtmlAudioPlayer() {
  if (typeof Audio !== "function") {
    return null;
  }
  const audio = new Audio();
  audio.preload = "auto";
  return audio;
}

export function classifyNotificationEnvelopeKind(envelope = {}) {
  const refreshTargets = normalizeRefreshTargets(envelope);
  if (refreshTargets.includes("orders")) {
    return "order";
  }

  const eventType = normalizeEnvelopeText(envelope, "eventType");
  const route = normalizeEnvelopeText(envelope, "route");
  const title = normalizeEnvelopeText(envelope, "title");

  if (
    eventType.includes("order") ||
    eventType.includes("dispatch") ||
    route.includes("/orders") ||
    route.includes("order") ||
    title.includes("订单")
  ) {
    return "order";
  }

  return "message";
}

export function createUniNotificationAudioManager(options = {}) {
  const defaultMessageSrc = trimValue(options.defaultMessageSrc);
  const defaultOrderSrc = trimValue(options.defaultOrderSrc || options.defaultMessageSrc);
  const cooldownMs = Math.max(0, Number(options.cooldownMs || 800));

  let innerAudio = null;
  let htmlAudio = null;
  let bridgeBound = false;
  let lastPlayedAt = 0;

  function getSettings() {
    if (typeof options.resolveSettings === "function") {
      return options.resolveSettings() || {};
    }
    return {};
  }

  function isEnabled(kind) {
    if (typeof options.isEnabled === "function") {
      return options.isEnabled(kind, getSettings()) !== false;
    }
    return true;
  }

  function isVibrateEnabled(kind) {
    if (typeof options.isVibrateEnabled === "function") {
      return options.isVibrateEnabled(kind, getSettings()) === true;
    }
    return false;
  }

  function resolveConfiguredSource(kind) {
    const runtime = typeof options.resolveRuntimeSettings === "function"
      ? (options.resolveRuntimeSettings() || {})
      : {};
    const raw = kind === "order"
      ? trimValue(runtime.orderSoundUrl || runtime.order_sound_url || runtime.order_notification_sound_url)
      : trimValue(runtime.messageSoundUrl || runtime.message_sound_url || runtime.message_notification_sound_url);

    if (!raw) {
      return "";
    }
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("file:")) {
      return raw;
    }
    if (raw.startsWith("/static/") || raw.startsWith("/audio/")) {
      return raw;
    }
    if (raw.startsWith("/") && typeof options.resolveRelativeUrl === "function") {
      return trimValue(options.resolveRelativeUrl(raw));
    }
    return raw;
  }

  function resolveSource(kind) {
    return resolveConfiguredSource(kind) || (kind === "order" ? defaultOrderSrc : defaultMessageSrc);
  }

  function ensureInnerAudio() {
    const uniApp = globalThis.uni;
    if (innerAudio || !uniApp || typeof uniApp.createInnerAudioContext !== "function") {
      return innerAudio;
    }
    try {
      innerAudio = uniApp.createInnerAudioContext();
      innerAudio.autoplay = false;
      innerAudio.obeyMuteSwitch = false;
    } catch (_error) {
      innerAudio = null;
    }
    return innerAudio;
  }

  function ensureHtmlAudio() {
    if (htmlAudio) {
      return htmlAudio;
    }
    htmlAudio = createHtmlAudioPlayer();
    return htmlAudio;
  }

  function playWithHtmlAudio(src) {
    const htmlPlayer = ensureHtmlAudio();
    if (!htmlPlayer) {
      return false;
    }

    try {
      htmlPlayer.pause();
      htmlPlayer.currentTime = 0;
      htmlPlayer.src = appendCacheBuster(src);
      const promise = htmlPlayer.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(() => {});
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  function vibrate(kind) {
    if (!isVibrateEnabled(kind)) {
      return;
    }

    try {
      if (typeof plus !== "undefined" && plus.device && typeof plus.device.vibrate === "function") {
        plus.device.vibrate(200);
        return;
      }
    } catch (_error) {
      // ignore vibration fallback failures
    }

    try {
      const uniApp = globalThis.uni;
      if (uniApp && typeof uniApp.vibrateShort === "function") {
        uniApp.vibrateShort({ type: "heavy" });
      }
    } catch (_error) {
      // ignore vibration fallback failures
    }
  }

  function play(kind = "message", extra = {}) {
    const { force = false, vibrate: shouldVibrate = false } = extra || {};
    if (!force && !isEnabled(kind)) {
      if (shouldVibrate) {
        vibrate(kind);
      }
      return false;
    }

    const now = Date.now();
    if (cooldownMs > 0 && now - lastPlayedAt < cooldownMs) {
      if (shouldVibrate) {
        vibrate(kind);
      }
      return false;
    }

    const src = resolveSource(kind);
    if (!src) {
      if (shouldVibrate) {
        vibrate(kind);
      }
      return false;
    }

    lastPlayedAt = now;

    const player = ensureInnerAudio();
    let played = false;
    if (player) {
      try {
        if (typeof player.stop === "function") {
          player.stop();
        }
        player.src = appendCacheBuster(src);
        if (typeof player.play === "function") {
          player.play();
        }
        played = true;
      } catch (_error) {
        played = playWithHtmlAudio(src);
      }
    } else {
      played = playWithHtmlAudio(src);
    }

    if (shouldVibrate) {
      vibrate(kind);
    }
    return played;
  }

  function playMessage(extra = {}) {
    return play("message", extra);
  }

  function playOrder(extra = {}) {
    return play("order", extra);
  }

  function playForEnvelope(envelope = {}, extra = {}) {
    const kind = classifyNotificationEnvelopeKind(envelope);
    return play(kind, extra);
  }

  function bindBridge(extra = {}) {
    const uniApp = globalThis.uni;
    if (bridgeBound || !uniApp || typeof uniApp.$on !== "function") {
      return;
    }
    bridgeBound = true;

    const handler = (payload) => {
      if (typeof extra.resolveKind === "function") {
        const kind = extra.resolveKind(payload);
        if (kind === "order") {
          playOrder(extra);
          return;
        }
        playMessage(extra);
        return;
      }
      playForEnvelope(payload, extra);
    };

    uniApp.$off("realtime:notification", handler);
    uniApp.$off("push:received", handler);
    uniApp.$on("realtime:notification", handler);
    uniApp.$on("push:received", handler);
  }

  return {
    bindBridge,
    play,
    playMessage,
    playOrder,
    playForEnvelope,
    classifyEnvelopeKind: classifyNotificationEnvelopeKind,
  };
}
