function trimPhoneContactValue(value) {
  return String(value || "").trim();
}

export function normalizePhoneNumber(value) {
  const text = trimPhoneContactValue(value);
  if (!text) {
    return "";
  }
  const matches = text.match(/\d+/g);
  return matches ? matches.join("") : text;
}

function resolvePhoneContactPlatform(uniApp = globalThis.uni) {
  try {
    const info =
      uniApp && typeof uniApp.getSystemInfoSync === "function"
        ? uniApp.getSystemInfoSync() || {}
        : {};
    return trimPhoneContactValue(info.uniPlatform || info.platform || "");
  } catch (_error) {
    return "";
  }
}

function buildPhoneContactAuditPayload(payload = {}, uniApp = globalThis.uni) {
  const phoneNumber = normalizePhoneNumber(
    payload.phoneNumber || payload.targetPhone,
  );
  return {
    targetRole: trimPhoneContactValue(payload.targetRole),
    targetId: trimPhoneContactValue(payload.targetId),
    targetPhone: phoneNumber,
    contactChannel: "system_phone",
    entryPoint: trimPhoneContactValue(payload.entryPoint),
    scene: trimPhoneContactValue(payload.scene),
    orderId: trimPhoneContactValue(payload.orderId),
    roomId: trimPhoneContactValue(payload.roomId),
    pagePath: trimPhoneContactValue(payload.pagePath),
    clientPlatform: trimPhoneContactValue(
      payload.clientPlatform || resolvePhoneContactPlatform(uniApp),
    ),
    clientResult: trimPhoneContactValue(payload.clientResult || "clicked"),
    metadata:
      payload.metadata && typeof payload.metadata === "object"
        ? payload.metadata
        : undefined,
  };
}

export function createPhoneContactHelper(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const recordPhoneContactClick =
    typeof options.recordPhoneContactClick === "function"
      ? options.recordPhoneContactClick
      : null;

  async function makePhoneCall(payload = {}) {
    const phoneNumber = normalizePhoneNumber(
      payload.phoneNumber || payload.targetPhone,
    );
    if (!/^1\d{10}$/.test(phoneNumber)) {
      throw new Error("invalid phone number");
    }

    if (recordPhoneContactClick) {
      try {
        await recordPhoneContactClick(
          buildPhoneContactAuditPayload(
            { ...payload, phoneNumber },
            uniApp,
          ),
        );
      } catch (error) {
        console.warn("[phone-contact] audit failed:", error);
      }
    }

    return new Promise((resolve, reject) => {
      if (!uniApp || typeof uniApp.makePhoneCall !== "function") {
        reject(new Error("makePhoneCall is unavailable"));
        return;
      }

      uniApp.makePhoneCall({
        phoneNumber,
        success: () => resolve({ success: true, phoneNumber }),
        fail: (error) => reject(error || new Error("makePhoneCall failed")),
      });
    });
  }

  return {
    makePhoneCall,
    normalizePhoneNumber,
  };
}
