function resolveClientIp(req) {
  const forwardedFor = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const realIp = String(req?.headers?.['x-real-ip'] || '').trim();
  const socketIp = String(req?.ip || req?.socket?.remoteAddress || '').replace(/^::ffff:/, '').trim();
  return forwardedFor || realIp || socketIp;
}

function buildForwardHeaders(req, options = {}) {
  const authHeaders = {};
  const auth = req?.headers?.authorization;
  if (auth) {
    authHeaders.Authorization = auth;
  }

  if (options.includeClientIp) {
    const clientIp = resolveClientIp(req);
    if (clientIp) {
      authHeaders['X-Forwarded-For'] = clientIp;
      authHeaders['X-Real-IP'] = clientIp;
    }
  }

  const extraHeaders = options.headers && typeof options.headers === 'object'
    ? options.headers
    : {};

  if (options.preferExtraHeaders) {
    return { ...authHeaders, ...extraHeaders };
  }

  return { ...extraHeaders, ...authHeaders };
}

function withForwardAuth(req, options = {}, headerOptions = {}) {
  const merged = { ...options };
  const headers = buildForwardHeaders(req, {
    headers: options.headers || {},
    includeClientIp: Boolean(headerOptions.includeClientIp),
    preferExtraHeaders: Boolean(headerOptions.preferExtraHeaders)
  });

  if (Object.keys(headers).length > 0) {
    merged.headers = headers;
  } else {
    delete merged.headers;
  }

  return merged;
}

module.exports = {
  buildForwardHeaders,
  withForwardAuth
};
