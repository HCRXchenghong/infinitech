import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

function stripApiSuffix(value: string) {
  return stripTrailingSlash(value).replace(/\/api$/, '');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = stripApiSuffix(env.VITE_ADMIN_API_BASE_URL || 'http://127.0.0.1:25500');
  const socketTarget = stripTrailingSlash(env.VITE_SOCKET_URL || 'http://127.0.0.1:9898');
  const inviteOnlyRuntime = env.VITE_INVITE_ONLY === 'true';
  const webPort = Number(env.VITE_ADMIN_WEB_PORT || 8888);

  const inviteGuardPlugin = {
    name: 'invite-only-dev-guard',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const rawUrl = String(req?.url || '/');
        const pathname = rawUrl.split('?')[0] || '/';

        if (!inviteOnlyRuntime) {
          if (pathname.startsWith('/invite/') || pathname.startsWith('/coupon/')) {
            res.statusCode = 302;
            res.setHeader('Location', '/access-denied?mode=admin-only');
            res.end();
            return;
          }
          next();
          return;
        }

        const allowedPublicPath = pathname === '/' ||
          pathname === '/download' ||
          pathname === '/access-denied' ||
          pathname.startsWith('/invite/') ||
          pathname.startsWith('/coupon/');

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
        res.setHeader('Location', '/download');
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
    server: {
      host: '0.0.0.0',
      port: Number.isFinite(webPort) && webPort > 0 ? webPort : 8888,
      strictPort: true,
      proxy: {
        '/api': {
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
