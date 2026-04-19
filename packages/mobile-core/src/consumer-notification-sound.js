import { createUniNotificationAudioManager } from "../../client-sdk/src/notification-audio.js";

function trimValue(value) {
  return String(value || "").trim();
}

export const DEFAULT_CONSUMER_NOTIFICATION_SOUND_STORAGE_KEY = "appSettings";

export function createConsumerNotificationSoundBridge(options = {}) {
  const config = options.config && typeof options.config === "object" ? options.config : {};
  const getCachedSupportRuntimeSettings =
    typeof options.getCachedSupportRuntimeSettings === "function"
      ? options.getCachedSupportRuntimeSettings
      : () => ({});
  const loadSupportRuntimeSettings =
    typeof options.loadSupportRuntimeSettings === "function"
      ? options.loadSupportRuntimeSettings
      : async () => getCachedSupportRuntimeSettings();
  const settingsStorageKey =
    trimValue(options.settingsStorageKey) || DEFAULT_CONSUMER_NOTIFICATION_SOUND_STORAGE_KEY;
  const createNotificationAudioManagerImpl =
    options.createNotificationAudioManagerImpl || createUniNotificationAudioManager;

  function getSettings() {
    const uniApp = options.uniApp || globalThis.uni;
    try {
      return uniApp?.getStorageSync?.(settingsStorageKey) || {};
    } catch (_error) {
      return {};
    }
  }

  function resolveRelativeUrl(raw) {
    const value = trimValue(raw);
    if (!value) {
      return value;
    }

    const baseUrl = trimValue(config.API_BASE_URL).replace(/\/+$/, "");
    return baseUrl ? `${baseUrl}${value}` : value;
  }

  const soundManager = createNotificationAudioManagerImpl({
    defaultMessageSrc: options.defaultMessageSrc || "/static/audio/chat.mp3",
    defaultOrderSrc: options.defaultOrderSrc || "/static/audio/come.mp3",
    resolveRuntimeSettings: () => getCachedSupportRuntimeSettings(),
    resolveSettings: getSettings,
    resolveRelativeUrl,
    isEnabled: (_kind, settings) =>
      settings.notification !== false && settings.sound !== false,
    isVibrateEnabled: (_kind, settings) =>
      settings.notification !== false && settings.vibrate !== false,
  });

  let bridgeBound = false;

  function bindNotificationSoundBridge() {
    if (bridgeBound) {
      return;
    }
    bridgeBound = true;
    soundManager.bindBridge({
      resolveKind: () => "message",
    });
  }

  function playMessageNotificationSound(extra = {}) {
    return soundManager.playMessage(extra);
  }

  function playOrderNotificationSound(extra = {}) {
    return soundManager.playOrder(extra);
  }

  function warmupNotificationSoundRuntime() {
    return Promise.resolve()
      .then(() => loadSupportRuntimeSettings())
      .catch(() => getCachedSupportRuntimeSettings());
  }

  return {
    bindNotificationSoundBridge,
    playMessageNotificationSound,
    playOrderNotificationSound,
    warmupNotificationSoundRuntime,
  };
}
