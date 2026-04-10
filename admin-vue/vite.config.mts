import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

function stripApiSuffix(value: string) {
  return stripTrailingSlash(value).replace(/\/api$/, '');
}

function normalizeRuntime(value: string) {
  const runtime = String(value || '').trim().toLowerCase();
  if (runtime === 'invite' || runtime === 'download' || runtime === 'admin') {
    return runtime;
  }
  return '';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = stripApiSuffix(env.VITE_ADMIN_API_BASE_URL || 'http://127.0.0.1:25500');
  const socketTarget = stripTrailingSlash(env.VITE_SOCKET_URL || 'http://127.0.0.1:9898');
  const webPort = Number(env.VITE_ADMIN_WEB_PORT || 8888);
  const runtimeMode =
    normalizeRuntime(env.VITE_APP_RUNTIME)
    || (env.VITE_INVITE_ONLY === 'true' ? 'invite' : '')
    || (webPort === 1788 ? 'invite' : (webPort === 1798 ? 'download' : 'admin'));

  const inviteGuardPlugin = {
    name: 'fixed-runtime-dev-guard',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const rawUrl = String(req?.url || '/');
        const pathname = rawUrl.split('?')[0] || '/';

        if (runtimeMode === 'admin') {
          if (
            pathname.startsWith('/invite/')
            || pathname.startsWith('/coupon/')
            || pathname === '/download'
          ) {
            res.statusCode = 302;
            res.setHeader('Location', '/access-denied?mode=admin-only');
            res.end();
            return;
          }
          next();
          return;
        }

        const allowedPublicPath = runtimeMode === 'invite'
          ? pathname === '/' ||
            pathname === '/access-denied' ||
            pathname.startsWith('/invite/') ||
            pathname.startsWith('/coupon/')
          : pathname === '/' ||
            pathname === '/download' ||
            pathname === '/access-denied';

        const isFrameworkAsset = pathname.startsWith('/@vite') ||
          pathname.startsWith('/@id/') ||
          pathname.startsWith('/@fs/') ||
          pathname.startsWith('/src/') ||
          pathname.startsWith('/node_modules/') ||
          pathname === '/__vite_ping';

        const isStaticAsset = pathname.includes('.') ||
          pathname.startsWith('/assets/') ||
          pathname.startsWith('/logo');

        const isApiOrHealth = pathname.startsWith('/api/') ||
          pathname === '/health' ||
          pathname.startsWith('/health?') ||
          pathname.startsWith('/uploads/');

        if (allowedPublicPath || isFrameworkAsset || isStaticAsset || isApiOrHealth) {
          next();
          return;
        }

        res.statusCode = 302;
        res.setHeader(
          'Location',
          runtimeMode === 'invite' ? '/access-denied?mode=invite-only' : '/access-denied?mode=download-only'
        );
        res.end();
      });
    }
  };

  return {
    plugins: [vue(), inviteGuardPlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }
            if (id.includes('sql.js')) {
              return 'vendor-sqljs';
            }
            if (id.includes('echarts')) {
              return 'vendor-echarts';
            }
            if (id.includes('element-plus')) {
              return 'vendor-element-plus';
            }
            if (id.includes('socket.io-client')) {
              return 'vendor-socket';
            }
            if (
              id.includes('/vue/') ||
              id.includes('/vue-router/') ||
              id.includes('@vue/')
            ) {
              return 'vendor-vue';
            }
            return 'vendor-misc';
          }
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port: Number.isFinite(webPort) && webPort > 0 ? webPort : 8888,
      strictPort: true,
      proxy: {
        '^/api(?:/|$)': {
          target: apiTarget,
          changeOrigin: true
        },
        '/health': {
          target: apiTarget,
          changeOrigin: true
        },
        '/socket-api': {
          target: socketTarget,
          changeOrigin: true,
          rewrite: (pathValue) => pathValue.replace(/^\/socket-api/, '')
        },
        '/socket.io': {
          target: socketTarget,
          changeOrigin: true,
          ws: true
        }
      }
    }
  };
});
