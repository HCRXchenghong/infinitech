function resolveLocationSelectUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

function showLocationSelectToast(uniApp, title, icon = "none") {
  if (typeof uniApp.showToast === "function") {
    uniApp.showToast({ title, icon });
  }
}

function setLocationSelectStorage(uniApp, key, value) {
  if (typeof uniApp.setStorageSync === "function") {
    uniApp.setStorageSync(key, value);
  }
}

function navigateLocationSelectBack(uniApp) {
  if (typeof uniApp.navigateBack === "function") {
    uniApp.navigateBack();
  }
}

function navigateLocationSelectTo(uniApp, url) {
  if (url && typeof uniApp.navigateTo === "function") {
    uniApp.navigateTo({ url });
  }
}

export function buildLocationSelectSnapshot(payload = {}) {
  const latitude = Number(payload?.latitude || 0);
  const longitude = Number(payload?.longitude || 0);
  const address = typeof payload?.address === "string" ? payload.address.trim() : "";
  const displayAddress =
    address || `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

  return {
    selectedAddress: displayAddress,
    currentLocation: {
      lat: latitude,
      lng: longitude,
    },
  };
}

export function createLocationSelectPage(options = {}) {
  const getCurrentLocation =
    typeof options.getCurrentLocation === "function"
      ? options.getCurrentLocation
      : async () => ({ latitude: 0, longitude: 0, address: "" });
  const runtimeUni = resolveLocationSelectUniApp(options.uniApp);

  return {
    data() {
      return {
        loading: false,
      };
    },
    methods: {
      async handleRelocate() {
        if (this.loading) {
          return false;
        }

        this.loading = true;
        try {
          const data = await getCurrentLocation();
          const snapshot = buildLocationSelectSnapshot(data);
          setLocationSelectStorage(
            runtimeUni,
            "selectedAddress",
            snapshot.selectedAddress,
          );
          setLocationSelectStorage(
            runtimeUni,
            "currentLocation",
            snapshot.currentLocation,
          );
          showLocationSelectToast(runtimeUni, "定位成功", "success");
          setTimeout(() => this.goBack(), 500);
          return true;
        } catch {
          showLocationSelectToast(runtimeUni, "定位失败");
          return false;
        } finally {
          this.loading = false;
        }
      },
      handleSelectAddress() {
        navigateLocationSelectTo(
          runtimeUni,
          "/pages/profile/address-list/index?select=1",
        );
      },
      goBack() {
        navigateLocationSelectBack(runtimeUni);
      },
    },
  };
}
