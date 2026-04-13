import request from '@/utils/request';

const DEFAULT_SOUND_RUNTIME = {
  messageSoundUrl: '',
  orderSoundUrl: ''
};

const DEFAULT_MESSAGE_SOUND_URL = '/audio/chat.mp3';
const DEFAULT_ORDER_SOUND_URL = '/audio/come.mp3';
const PLAY_COOLDOWN_MS = 800;

let cachedSoundRuntime = { ...DEFAULT_SOUND_RUNTIME };
let hasLoadedSoundRuntime = false;
let loadingPromise = null;
let lastPlayedAt = 0;
let audioUnlocked = false;
const audioPlayers = {
  message: { url: '', player: null },
  order: { url: '', player: null }
};

function trimValue(value) {
  return String(value || '').trim();
}

function normalizeSoundRuntime(payload = {}) {
  return {
    messageSoundUrl: trimValue(payload.message_notification_sound_url),
    orderSoundUrl: trimValue(payload.order_notification_sound_url)
  };
}

function resolvePlayerKind(kind) {
  return kind === 'order' ? 'order' : 'message';
}

function ensureAudioElement(kind = 'message', customUrl = '') {
  if (typeof Audio !== 'function') {
    return null;
  }

  const resolvedKind = resolvePlayerKind(kind);
  const nextUrl = trimValue(customUrl) || resolveNotificationSoundUrl(resolvedKind);
  if (!nextUrl) {
    return null;
  }

  const state = audioPlayers[resolvedKind];
  if (state.player && state.url === nextUrl) {
    return state.player;
  }

  const player = new Audio();
  player.preload = 'auto';
  player.playsInline = true;
  player.src = nextUrl;
  player.load();
  state.player = player;
  state.url = nextUrl;
  return player;
}

export async function unlockNotificationAudio() {
  void loadNotificationSoundRuntime();

  const candidates = [
    ['message', ''],
    ['order', '']
  ];

  let unlocked = false;
  for (const [kind, customUrl] of candidates) {
    const player = ensureAudioElement(kind, customUrl);
    if (!player) {
      continue;
    }

    try {
      player.pause();
      player.currentTime = 0;
      player.muted = true;
      const playPromise = player.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
      player.pause();
      player.currentTime = 0;
      player.muted = false;
      unlocked = true;
    } catch (_error) {
      player.muted = false;
    }
  }

  if (unlocked) {
    audioUnlocked = true;
  }
  return unlocked;
}

export function getCachedNotificationSoundRuntime() {
  return { ...cachedSoundRuntime };
}

export async function loadNotificationSoundRuntime(force = false) {
  if (hasLoadedSoundRuntime && !force) {
    return getCachedNotificationSoundRuntime();
  }
  if (loadingPromise && !force) {
    return loadingPromise;
  }

  loadingPromise = request.get('/api/public/runtime-settings')
    .then(({ data }) => {
      cachedSoundRuntime = normalizeSoundRuntime(data || {});
      hasLoadedSoundRuntime = true;
      return getCachedNotificationSoundRuntime();
    })
    .catch(() => getCachedNotificationSoundRuntime())
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

export function resolveNotificationSoundUrl(kind = 'message') {
  const runtime = getCachedNotificationSoundRuntime();
  if (kind === 'order') {
    return runtime.orderSoundUrl || DEFAULT_ORDER_SOUND_URL;
  }
  return runtime.messageSoundUrl || DEFAULT_MESSAGE_SOUND_URL;
}

export function playNotificationSound(kind = 'message', customUrl = '') {
  const now = Date.now();
  if (now - lastPlayedAt < PLAY_COOLDOWN_MS) {
    return false;
  }

  const player = ensureAudioElement(kind, customUrl);
  if (!player) {
    return false;
  }

  lastPlayedAt = now;

  try {
    player.pause();
    if (player.readyState === 0) {
      player.load();
    }
    player.muted = false;
    player.currentTime = 0;
    const playPromise = player.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        if (!audioUnlocked) {
          lastPlayedAt = 0;
        }
      });
    }
    return true;
  } catch (_error) {
    if (!audioUnlocked) {
      lastPlayedAt = 0;
    }
    return false;
  }
}

export function playMessageNotificationSound(customUrl = '') {
  void loadNotificationSoundRuntime();
  return playNotificationSound('message', customUrl);
}

export function playOrderNotificationSound(customUrl = '') {
  void loadNotificationSoundRuntime();
  return playNotificationSound('order', customUrl);
}
