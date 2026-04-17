function pickText(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text) return text;
  }
  return "";
}

export function normalizeUniLocationResult(result = {}) {
  const addressField = result.address;
  const addressObject =
    addressField && typeof addressField === "object" ? addressField : {};

  return {
    address: typeof addressField === "string" ? addressField : "",
    addresses: result.addresses,
    city: result.city || addressObject.city,
    district: result.district || addressObject.district,
    province: result.province || addressObject.province,
    street: result.street || addressObject.street,
    streetNum: result.streetNum || addressObject.streetNum,
    poiName: result.poiName || result.name || addressObject.poiName,
  };
}

export function normalizeLocationAddressPayload(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};

  return {
    address: pickText(
      source.address,
      source.addresses,
      source.formattedAddress,
      source.formatted_addresses,
    ),
    city: pickText(source.city),
    district: pickText(source.district),
    province: pickText(source.province),
    street: pickText(source.street),
    streetNum: pickText(source.streetNum, source.street_number),
    poiName: pickText(source.poiName, source.name),
  };
}

export function buildLocationAddressFromParts(address) {
  if (!address || typeof address !== "object") return "";

  return [
    address.province,
    address.city,
    address.district,
    address.street,
    address.streetNum,
    address.poiName,
  ].filter(Boolean).join("");
}

function ensureAndroidRuntimePermission(plusApp) {
  return new Promise((resolve, reject) => {
    try {
      if (!plusApp || !plusApp.os || plusApp.os.name !== "Android") {
        resolve();
        return;
      }

      if (!plusApp.android || typeof plusApp.android.requestPermissions !== "function") {
        resolve();
        return;
      }

      plusApp.android.requestPermissions(
        [
          "android.permission.ACCESS_FINE_LOCATION",
          "android.permission.ACCESS_COARSE_LOCATION",
        ],
        (result) => {
          const deniedAlways = Array.isArray(result?.deniedAlways) ? result.deniedAlways : [];
          const deniedPresent = Array.isArray(result?.deniedPresent) ? result.deniedPresent : [];
          if (deniedAlways.length || deniedPresent.length) {
            reject(new Error("android permission denied"));
            return;
          }
          resolve();
        },
        (error) => reject(error),
      );
    } catch (error) {
      reject(error);
    }
  });
}

function ensureLocationPermission(uniApp, plusApp) {
  return new Promise((resolve, reject) => {
    ensureAndroidRuntimePermission(plusApp)
      .then(() => {
        try {
          const canGetSetting = typeof uniApp?.getSetting === "function";
          const canAuthorize = typeof uniApp?.authorize === "function";
          const canOpenSetting = typeof uniApp?.openSetting === "function";

          const askAuthorize = () => {
            if (!canAuthorize) {
              resolve();
              return;
            }

            uniApp.authorize({
              scope: "scope.userLocation",
              success: () => resolve(),
              fail: () => {
                if (!canOpenSetting) {
                  reject(new Error("permission denied"));
                  return;
                }

                uniApp.showModal({
                  title: "需要定位权限",
                  content: "请在系统设置中开启定位权限后重试",
                  success: (modalResult) => {
                    if (!modalResult?.confirm) {
                      reject(new Error("permission denied"));
                      return;
                    }

                    uniApp.openSetting({
                      success: (settingResult) => {
                        const granted =
                          settingResult?.authSetting &&
                          settingResult.authSetting["scope.userLocation"];
                        if (granted) {
                          resolve();
                          return;
                        }
                        reject(new Error("permission denied"));
                      },
                      fail: () => reject(new Error("permission denied")),
                    });
                  },
                });
              },
            });
          };

          if (!canGetSetting) {
            askAuthorize();
            return;
          }

          uniApp.getSetting({
            success: (result) => {
              const hasAuth = result?.authSetting && result.authSetting["scope.userLocation"];
              if (hasAuth) {
                resolve();
                return;
              }
              askAuthorize();
            },
            fail: () => {
              askAuthorize();
            },
          });
        } catch (error) {
          reject(error);
        }
      })
      .catch((error) => reject(error));
  });
}

function normalizeSelectedLocation(result = {}) {
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    address: result.address || result.name || "",
    name: result.name,
  };
}

export function createLocationService(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const plusApp = options.plusApp || globalThis.plus;

  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      const finalize = (latitude, longitude, addressInfo = {}) => {
        const parsedLatitude = Number(latitude);
        const parsedLongitude = Number(longitude);
        if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
          reject(new Error("invalid location coordinates"));
          return;
        }

        const normalizedAddress = normalizeLocationAddressPayload(addressInfo);
        const addressText =
          normalizedAddress.address ||
          buildLocationAddressFromParts(normalizedAddress) ||
          "";

        resolve({
          latitude: parsedLatitude,
          longitude: parsedLongitude,
          address: addressText,
          city: normalizedAddress.city,
          district: normalizedAddress.district,
          province: normalizedAddress.province,
        });
      };

      const fallbackToUniLocation = (originError) => {
        uniApp.getLocation({
          type: "gcj02",
          geocode: true,
          isHighAccuracy: true,
          success: (result) => {
            const latitude = Number(result.latitude);
            const longitude = Number(result.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              reject(originError || new Error("invalid location coordinates"));
              return;
            }
            finalize(latitude, longitude, normalizeUniLocationResult(result));
          },
          fail: (error) => {
            reject(originError || error);
          },
        });
      };

      ensureLocationPermission(uniApp, plusApp)
        .then(() => {
          try {
            if (plusApp?.geolocation && typeof plusApp.geolocation.getCurrentPosition === "function") {
              plusApp.geolocation.getCurrentPosition(
                (position) => {
                  const coords = position?.coords || {};
                  const latitude =
                    coords.latitude !== undefined && coords.latitude !== null
                      ? coords.latitude
                      : position.latitude;
                  const longitude =
                    coords.longitude !== undefined && coords.longitude !== null
                      ? coords.longitude
                      : position.longitude;

                  const parsedLatitude = Number(latitude);
                  const parsedLongitude = Number(longitude);
                  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
                    fallbackToUniLocation(new Error("invalid location coordinates"));
                    return;
                  }

                  finalize(parsedLatitude, parsedLongitude, {
                    address: position.addresses,
                    ...(position.address || {}),
                  });
                },
                (error) => {
                  fallbackToUniLocation(error);
                },
                {
                  provider: "system",
                  coordsType: "gcj02",
                  geocode: true,
                  enableHighAccuracy: true,
                  timeout: 10000,
                },
              );
              return;
            }
          } catch (_error) {
            // Ignore plus geolocation failures and fall back to uni.getLocation below.
          }

          fallbackToUniLocation();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  function chooseLocation() {
    return new Promise((resolve, reject) => {
      ensureLocationPermission(uniApp, plusApp)
        .then(() => {
          uniApp.chooseLocation({
            success: (result) => resolve(normalizeSelectedLocation(result)),
            fail: (error) => reject(error),
          });
        })
        .catch((error) => reject(error));
    });
  }

  return {
    getCurrentLocation,
    chooseLocation,
  };
}

export function getCurrentLocation(options = {}) {
  return createLocationService(options).getCurrentLocation();
}

export function chooseLocation(options = {}) {
  return createLocationService(options).chooseLocation();
}
