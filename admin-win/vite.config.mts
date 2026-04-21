import { createAdminDesktopViteConfig } from "../packages/admin-core/src/desktop-shell-vite.js";

export default createAdminDesktopViteConfig({
  currentDir: __dirname,
  port: 8890,
});
