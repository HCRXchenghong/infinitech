import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@infinitech/admin-core": path.resolve(
        __dirname,
        "../packages/admin-core/src",
      ),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 8890,
    strictPort: true,
  },
});
