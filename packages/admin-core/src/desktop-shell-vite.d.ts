import type { UserConfigExport } from "vite";

export interface AdminDesktopViteConfigOptions {
  currentDir?: string;
  port?: number;
}

export declare function createAdminDesktopViteConfig(
  options?: AdminDesktopViteConfigOptions,
): UserConfigExport;
