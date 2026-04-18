export function createConsumerErrandRuntimeBindings(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const clientScope = options.clientScope || "user-vue";
  const unavailableMessage = options.unavailableMessage || "当前服务暂未开放";
  const fallbackTabUrl = options.fallbackTabUrl || "/pages/index/index";
  const schedule =
    typeof options.schedule === "function"
      ? options.schedule
      : (callback, delay) => globalThis.setTimeout(callback, delay);
  const loadPlatformRuntimeSettings =
    typeof options.loadPlatformRuntimeSettings === "function"
      ? options.loadPlatformRuntimeSettings
      : async () => ({});
  const isErrandServiceEnabled =
    typeof options.isErrandServiceEnabled === "function"
      ? options.isErrandServiceEnabled
      : () => true;

  async function ensureErrandServiceOpen(
    serviceKey,
    overrideClientScope = clientScope,
  ) {
    const runtime = await loadPlatformRuntimeSettings();
    const enabled = isErrandServiceEnabled(
      runtime,
      serviceKey,
      overrideClientScope,
    );

    if (!enabled) {
      uniApp?.showToast?.({ title: unavailableMessage, icon: "none" });
      schedule(
        () => {
          uniApp?.navigateBack?.({
            fail: () => {
              uniApp?.switchTab?.({ url: fallbackTabUrl });
            },
          });
        },
        Number(options.navigateDelayMs) || 500,
      );
    }

    return enabled;
  }

  return {
    ensureErrandServiceOpen,
  };
}
