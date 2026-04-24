function trimRoleAppShellValue(value) {
  return String(value == null ? "" : value).trim();
}

function resolveRoleAppShellUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRoleAppShellLogger(logger) {
  return logger && typeof logger === "object" ? logger : console;
}

function normalizeRoleAppShellPublicRoutes(publicRoutes = []) {
  if (!Array.isArray(publicRoutes)) {
    return new Set();
  }

  return new Set(
    publicRoutes
      .map((route) => trimRoleAppShellValue(route))
      .filter(Boolean),
  );
}

function callRoleAppShellTask(task, context, payload) {
  if (typeof task === "function") {
    return task.call(context, payload);
  }
  return undefined;
}

function resolveRoleAppShellCurrentRoute(getCurrentPagesFn) {
  if (typeof getCurrentPagesFn !== "function") {
    return "";
  }

  const pages = getCurrentPagesFn();
  if (!Array.isArray(pages) || pages.length === 0) {
    return "";
  }

  const currentPage = pages[pages.length - 1];
  return trimRoleAppShellValue(currentPage?.route);
}

export function createRoleAppRootLifecycle(options = {}) {
  const runtimeUni = resolveRoleAppShellUniRuntime(options.uniApp);
  const logger = resolveRoleAppShellLogger(options.logger);
  const publicRoutes = normalizeRoleAppShellPublicRoutes(options.publicRoutes);
  const loginRoute = trimRoleAppShellValue(options.loginRoute);
  const loggerTag =
    trimRoleAppShellValue(options.loggerTag) || "RoleApp";
  const readSession =
    typeof options.readSession === "function"
      ? options.readSession
      : () => ({});
  const syncAuthenticatedState =
    typeof options.syncAuthenticatedState === "function"
      ? options.syncAuthenticatedState
      : async () => {};
  const clearUnauthenticatedState =
    typeof options.clearUnauthenticatedState === "function"
      ? options.clearUnauthenticatedState
      : () => {};
  const getCurrentPagesFn = options.getCurrentPagesFn || globalThis.getCurrentPages;
  const shouldRedirectUnauthenticated =
    options.shouldRedirectUnauthenticated !== undefined
      ? Boolean(options.shouldRedirectUnauthenticated)
      : Boolean(loginRoute);

  return {
    onLaunch() {
      void callRoleAppShellTask(options.startPushEventBridge, this, {
        uniApp: runtimeUni,
      });
      callRoleAppShellTask(options.bindNotificationSoundBridge, this, {
        uniApp: runtimeUni,
      });
      if (typeof this.checkAuth === "function") {
        return this.checkAuth();
      }
      return undefined;
    },

    onShow() {
      callRoleAppShellTask(options.bindNotificationSoundBridge, this, {
        uniApp: runtimeUni,
      });
      if (typeof this.checkAuth === "function") {
        return this.checkAuth();
      }
      return undefined;
    },

    onHide() {},

    methods: {
      getCurrentRoute() {
        return resolveRoleAppShellCurrentRoute(getCurrentPagesFn);
      },

      isPublicRoute(route) {
        return publicRoutes.has(trimRoleAppShellValue(route));
      },

      readAppSession() {
        return readSession({
          uniApp: runtimeUni,
          vm: this,
        }) || {};
      },

      async syncAuthenticatedRuntime() {
        try {
          return await syncAuthenticatedState.call(this, {
            session: this.readAppSession(),
            route: this.getCurrentRoute(),
            uniApp: runtimeUni,
            vm: this,
          });
        } catch (error) {
          if (typeof logger.error === "function") {
            logger.error(`[${loggerTag}] sync authenticated runtime failed:`, error);
          }
          return undefined;
        }
      },

      clearUnauthenticatedRuntime() {
        return callRoleAppShellTask(clearUnauthenticatedState, this, {
          route: this.getCurrentRoute(),
          uniApp: runtimeUni,
          vm: this,
        });
      },

      async checkAuth() {
        const session = this.readAppSession();
        const route = this.getCurrentRoute();
        const isAuthenticated = !!session.isAuthenticated;
        const isPublicRoute = this.isPublicRoute(route);

        if (isPublicRoute) {
          if (!isAuthenticated) {
            this.clearUnauthenticatedRuntime();
            return false;
          }

          await this.syncAuthenticatedRuntime();
          return true;
        }

        if (!isAuthenticated) {
          this.clearUnauthenticatedRuntime();
          if (
            shouldRedirectUnauthenticated
            && loginRoute
            && runtimeUni
            && typeof runtimeUni.reLaunch === "function"
          ) {
            runtimeUni.reLaunch({ url: loginRoute });
          }
          return false;
        }

        await this.syncAuthenticatedRuntime();
        return true;
      },
    },
  };
}
