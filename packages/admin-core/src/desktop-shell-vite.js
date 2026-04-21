import path from "node:path";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export function createAdminDesktopViteConfig(options = {}) {
  const currentDir = path.resolve(String(options.currentDir || process.cwd()));
  const port = Number(options.port || 0);

  return defineConfig({
    plugins: [vue()],
    resolve: {
      alias: {
        "@": path.resolve(currentDir, "src"),
        "@infinitech/admin-core": path.resolve(
          currentDir,
          "../packages/admin-core/src",
        ),
      },
    },
    server: {
      host: "0.0.0.0",
      port,
      strictPort: true,
    },
  });
}
