import { io } from 'socket.io-client';

export const OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT = 'official_site_support_message';
export const OFFICIAL_SITE_SUPPORT_SESSION_EVENT = 'official_site_support_session';

const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
const envSocketUrl =
  ((typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SOCKET_URL) || '').trim();

function buildDefaultSocketOrigin() {
  return '';
}

export function getOfficialSiteSocketBaseUrl() {
  if (isDev) {
    return '';
  }
  return envSocketUrl || buildDefaultSocketOrigin();
}

export function createOfficialSiteNotifySocket(socketToken) {
  return io(`${getOfficialSiteSocketBaseUrl()}/notify`, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    autoConnect: true,
    auth: {
      token: String(socketToken || '').trim()
    }
  });
}
