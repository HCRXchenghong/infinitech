function trimValue(value) {
  return String(value || "").trim();
}

function normalizeEnvelope(envelope) {
  return envelope && typeof envelope === "object" && !Array.isArray(envelope)
    ? envelope
    : {};
}

function normalizePayload(envelope) {
  const safeEnvelope = normalizeEnvelope(envelope);
  const payload = safeEnvelope.payload;
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
}

function normalizeRoleKeys(roleOrRoles) {
  const list = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  return list.map((role) => trimValue(role)).filter(Boolean);
}

export function buildPushNotificationDetailRoute(
  envelope,
  options = {},
) {
  const safeEnvelope = normalizeEnvelope(envelope);
  const notificationId = trimValue(
    safeEnvelope.notificationId ||
      safeEnvelope.notification_id,
  );
  if (!notificationId) {
    return "";
  }

  const basePath = trimValue(options.basePath) || "/pages/message/notification-detail/index";
  let url = `${basePath}?id=${encodeURIComponent(notificationId)}`;
  const messageId = trimValue(safeEnvelope.messageId || safeEnvelope.message_id);
  if (messageId) {
    url += `&messageId=${encodeURIComponent(messageId)}`;
  }
  return url;
}

export function createPushClickUrlResolver(roleOrRoles, options = {}) {
  const roleKeys = normalizeRoleKeys(roleOrRoles);
  const fallbackBuilder = typeof options.buildFallbackUrl === "function"
    ? options.buildFallbackUrl
    : null;

  return function resolveClickUrl(envelope) {
    const safeEnvelope = normalizeEnvelope(envelope);
    const payload = normalizePayload(envelope);
    const routeByUserType = normalizeEnvelope(payload.routeByUserType);

    for (const roleKey of roleKeys) {
      const typedRoute = trimValue(routeByUserType[roleKey]);
      if (typedRoute) {
        return typedRoute;
      }
    }

    const directRoute = trimValue(safeEnvelope.route);
    if (directRoute) {
      return directRoute;
    }

    if (fallbackBuilder) {
      return trimValue(fallbackBuilder(safeEnvelope));
    }

    return "";
  };
}
