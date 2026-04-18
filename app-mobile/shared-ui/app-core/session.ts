import config from "../config";
import { forceLogout, manualRefreshToken } from "../request-interceptor";
import { createConsumerAppSessionManager } from "../../../packages/mobile-core/src/consumer-app-session.js";

export interface UserSessionSnapshot {
  token: string;
  refreshToken: string;
  authMode: string;
}

const sessionManager = createConsumerAppSessionManager({
  uniApp: uni,
  baseUrl: config.API_BASE_URL,
  requiredAuthMode: "user",
  manualRefreshToken,
  forceLogout,
  loggerTag: "App",
});

export const {
  getSessionSnapshot: getUserSessionSnapshot,
  hasActiveSession: hasActiveUserSession,
  clearStoredSession: clearStoredUserSession,
  verifySession: verifyUserSession,
} = sessionManager;
