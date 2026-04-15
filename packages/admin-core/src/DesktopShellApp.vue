<template>
  <div class="desktop-shell">
    <div class="desktop-shell__backdrop desktop-shell__backdrop--a"></div>
    <div class="desktop-shell__backdrop desktop-shell__backdrop--b"></div>

    <section class="desktop-shell__hero">
      <div class="desktop-shell__eyebrow">Infinitech Admin Platform</div>
      <div class="desktop-shell__hero-content">
        <div>
          <h1>{{ shell.platformTitle }}</h1>
          <p>
            与 Web
            管理后台共享同一份模块清单、权限主线和管理域核心，桌面端只保留 Tauri
            壳层与平台能力适配。
          </p>
        </div>
        <div class="desktop-shell__pillbox">
          <span class="desktop-shell__pill">shared contracts</span>
          <span class="desktop-shell__pill">admin-core</span>
          <span class="desktop-shell__pill">audit first</span>
          <span class="desktop-shell__pill">tauri shell</span>
        </div>
      </div>
    </section>

    <section class="desktop-shell__grid">
      <article
        v-for="section in shell.sections"
        :key="section.key"
        class="desktop-shell__panel"
      >
        <header class="desktop-shell__panel-header">
          <div class="desktop-shell__panel-title">{{ section.title }}</div>
          <div class="desktop-shell__panel-count">
            {{ section.items.length }} modules
          </div>
        </header>

        <div class="desktop-shell__cards">
          <div
            v-for="item in section.items"
            :key="item.name"
            class="desktop-shell__card"
          >
            <div class="desktop-shell__card-name">{{ item.title }}</div>
            <div class="desktop-shell__card-path">{{ item.path }}</div>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { buildDesktopShellModel } from "./desktop-shell.js";

const props = defineProps({
  platform: {
    type: String,
    default: "desktop",
  },
});

const shell = computed(() => buildDesktopShellModel(props.platform));
</script>

<style scoped>
.desktop-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 40px;
  background:
    radial-gradient(
      circle at top left,
      rgba(255, 214, 153, 0.28),
      transparent 32%
    ),
    radial-gradient(
      circle at right 20%,
      rgba(114, 211, 202, 0.18),
      transparent 28%
    ),
    linear-gradient(180deg, #fcf5eb 0%, #f4efe7 52%, #ebe4db 100%);
  color: #1c2430;
  font-family: "Avenir Next", "PingFang SC", "Noto Sans SC", sans-serif;
}

.desktop-shell__backdrop {
  position: absolute;
  border-radius: 999px;
  filter: blur(8px);
  opacity: 0.88;
  pointer-events: none;
}

.desktop-shell__backdrop--a {
  top: -120px;
  right: -60px;
  width: 320px;
  height: 320px;
  background: rgba(255, 173, 96, 0.28);
}

.desktop-shell__backdrop--b {
  bottom: -140px;
  left: -90px;
  width: 360px;
  height: 360px;
  background: rgba(33, 131, 128, 0.18);
}

.desktop-shell__hero,
.desktop-shell__grid {
  position: relative;
  z-index: 1;
}

.desktop-shell__hero {
  margin: 0 auto 28px;
  max-width: 1280px;
  padding: 28px 30px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 24px 80px rgba(92, 74, 56, 0.1);
  backdrop-filter: blur(16px);
}

.desktop-shell__eyebrow {
  margin-bottom: 10px;
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #8b5e34;
}

.desktop-shell__hero-content {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(280px, 1fr);
  gap: 24px;
  align-items: end;
}

.desktop-shell__hero h1 {
  margin: 0 0 12px;
  font-size: clamp(32px, 6vw, 56px);
  line-height: 0.96;
  letter-spacing: -0.04em;
}

.desktop-shell__hero p {
  margin: 0;
  max-width: 720px;
  font-size: 15px;
  line-height: 1.7;
  color: #4f5d6f;
}

.desktop-shell__pillbox {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  align-content: flex-start;
}

.desktop-shell__pill {
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(28, 36, 48, 0.08);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.desktop-shell__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  max-width: 1280px;
  margin: 0 auto;
}

.desktop-shell__panel {
  padding: 22px;
  border-radius: 24px;
  background: rgba(19, 29, 37, 0.9);
  color: #f8f4ef;
  box-shadow: 0 18px 54px rgba(28, 36, 48, 0.18);
}

.desktop-shell__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.desktop-shell__panel-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.desktop-shell__panel-count {
  font-size: 12px;
  color: rgba(248, 244, 239, 0.64);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.desktop-shell__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.desktop-shell__card {
  padding: 14px 15px;
  border-radius: 18px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.07),
    rgba(255, 255, 255, 0.03)
  );
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.desktop-shell__card-name {
  font-size: 14px;
  font-weight: 700;
}

.desktop-shell__card-path {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(248, 244, 239, 0.64);
}

@media (max-width: 980px) {
  .desktop-shell {
    padding: 20px;
  }

  .desktop-shell__hero-content,
  .desktop-shell__grid,
  .desktop-shell__cards {
    grid-template-columns: 1fr;
  }

  .desktop-shell__pillbox {
    justify-content: flex-start;
  }
}
</style>
