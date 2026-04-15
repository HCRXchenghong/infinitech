const axios = require("axios");
const config = require("../config");
const {
  proxyGet,
  proxyPost,
  proxyPut,
  requestGoRaw,
} = require("../utils/goProxy");
const { proxyMultipartUpload } = require("../utils/multipartProxy");

function getRequestOrigin(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = String(req.headers["x-forwarded-host"] || req.get("host") || "")
    .split(",")[0]
    .trim();
  return host ? `${protocol}://${host}` : "";
}

function normalizeOfficialSiteAssetUrl(value, req) {
  const raw = String(value || "").trim();
  if (!raw) {
    return value;
  }

  const origin = getRequestOrigin(req);
  if (!origin) {
    return value;
  }

  if (raw.startsWith("/uploads/")) {
    return `${origin}${raw}`;
  }

  const uploadPathMatch = raw.match(/\/uploads\/.+$/);
  if (!uploadPathMatch) {
    return value;
  }

  return `${origin}${uploadPathMatch[0]}`;
}

function normalizeOfficialSitePayload(payload, req) {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeOfficialSitePayload(item, req));
  }

  if (!payload || typeof payload !== "object") {
    if (typeof payload === "string") {
      return normalizeOfficialSiteAssetUrl(payload, req);
    }
    return payload;
  }

  const next = Array.isArray(payload) ? [] : {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      next[key] = normalizeOfficialSiteAssetUrl(value, req);
      continue;
    }
    if (Array.isArray(value) || (value && typeof value === "object")) {
      next[key] = normalizeOfficialSitePayload(value, req);
      continue;
    }
    next[key] = value;
  }
  return next;
}

async function proxyOfficialSite(req, res, next, options = {}) {
  try {
    const response = await requestGoRaw(req, options);
    return res
      .status(response.status)
      .json(normalizeOfficialSitePayload(response.data, req));
  } catch (error) {
    if (error.response) {
      return res
        .status(error.response.status)
        .json(normalizeOfficialSitePayload(error.response.data, req));
    }
    return next(error);
  }
}

async function createExposure(req, res, next) {
  await proxyOfficialSite(req, res, next, {
    method: "post",
    path: "/official-site/exposures",
    data: req.body || {},
  });
}

async function uploadExposureAsset(req, res, next) {
  await proxyMultipartUpload(req, res, next, {
    path: "/official-site/exposures/assets",
  });
}

async function listPublicNews(req, res, next) {
  await proxyOfficialSite(req, res, next, {
    method: "get",
    path: "/official-site/news",
    params: req.query,
  });
}

async function getPublicNewsDetail(req, res, next) {
  await proxyOfficialSite(req, res, next, {
    method: "get",
    path: `/official-site/news/${req.params.id}`,
    params: req.query,
  });
}

async function listPublicExposures(req, res, next) {
  await proxyOfficialSite(req, res, next, {
    method: "get",
    path: "/official-site/exposures",
    params: req.query,
  });
}

async function getPublicExposureDetail(req, res, next) {
  await proxyOfficialSite(req, res, next, {
    method: "get",
    path: `/official-site/exposures/${req.params.id}`,
    params: req.query,
  });
}

async function createCooperation(req, res, next) {
  await proxyOfficialSite(req, res, next, {
    method: "post",
    path: "/official-site/cooperations",
    data: req.body || {},
  });
}

async function createSupportSession(req, res, next) {
  await proxyOfficialSite(req, res, next, {
    method: "post",
    path: "/official-site/support/sessions",
    data: req.body || {},
  });
}

async function listSupportMessagesByToken(req, res, next) {
  await proxyOfficialSite(req, res, next, {
    method: "get",
    path: `/official-site/support/sessions/${req.params.token}/messages`,
  });
}

async function appendVisitorSupportMessage(req, res, next) {
  await proxyOfficialSite(req, res, next, {
    method: "post",
    path: `/official-site/support/sessions/${req.params.token}/messages`,
    data: req.body || {},
  });
}

async function getSupportSocketToken(req, res, next) {
  const token = String(req.params.token || "").trim();
  if (!token) {
    return res.status(400).json({ success: false, error: "token is required" });
  }

  const apiSecret = String(config.socketServerApiSecret || "").trim();
  if (!apiSecret) {
    return res
      .status(503)
      .json({
        success: false,
        error: "socket token issuance is not configured",
      });
  }

  try {
    const sessionResponse = await requestGoRaw(req, {
      method: "get",
      path: `/official-site/support/sessions/${token}`,
      normalizeErrorResponse: true,
    });

    if (sessionResponse.status < 200 || sessionResponse.status >= 300) {
      return res.status(sessionResponse.status).json(
        sessionResponse.data || {
          success: false,
          error: "support session not found",
        },
      );
    }

    const session = sessionResponse.data?.data || null;
    const sessionToken = String(session?.token || token).trim();
    if (!session || !sessionToken) {
      return res
        .status(404)
        .json({ success: false, error: "support session not found" });
    }

    const socketResponse = await axios.post(
      `${String(config.socketServerUrl || "").replace(/\/$/, "")}/api/generate-token`,
      {
        userId: sessionToken,
        role: "site_visitor",
      },
      {
        timeout: Number(process.env.BFF_REQUEST_TIMEOUT_MS || 8000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiSecret}`,
        },
      },
    );

    return res.status(200).json({
      success: true,
      data: {
        token: socketResponse.data?.token || "",
        userId: socketResponse.data?.userId || sessionToken,
        role: socketResponse.data?.role || "site_visitor",
        session,
      },
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(
        error.response.data || {
          success: false,
          error: error.message || "failed to issue socket token",
        },
      );
    }
    return next(error);
  }
}

async function listAdminExposures(req, res, next) {
  await proxyGet(req, res, next, "/admin/official-site/exposures", {
    params: req.query,
  });
}

async function updateExposure(req, res, next) {
  await proxyPut(
    req,
    res,
    next,
    `/admin/official-site/exposures/${req.params.id}`,
  );
}

async function listAdminCooperations(req, res, next) {
  await proxyGet(req, res, next, "/admin/official-site/cooperations", {
    params: req.query,
  });
}

async function updateCooperation(req, res, next) {
  await proxyPut(
    req,
    res,
    next,
    `/admin/official-site/cooperations/${req.params.id}`,
  );
}

async function listAdminSupportSessions(req, res, next) {
  await proxyGet(req, res, next, "/admin/official-site/support/sessions", {
    params: req.query,
  });
}

async function getAdminSupportMessages(req, res, next) {
  await proxyGet(
    req,
    res,
    next,
    `/admin/official-site/support/sessions/${req.params.id}/messages`,
  );
}

async function appendAdminSupportMessage(req, res, next) {
  await proxyPost(
    req,
    res,
    next,
    `/admin/official-site/support/sessions/${req.params.id}/messages`,
  );
}

async function updateSupportSession(req, res, next) {
  await proxyPut(
    req,
    res,
    next,
    `/admin/official-site/support/sessions/${req.params.id}`,
  );
}

module.exports = {
  createExposure,
  uploadExposureAsset,
  listPublicNews,
  getPublicNewsDetail,
  listPublicExposures,
  getPublicExposureDetail,
  createCooperation,
  createSupportSession,
  listSupportMessagesByToken,
  appendVisitorSupportMessage,
  getSupportSocketToken,
  listAdminExposures,
  updateExposure,
  listAdminCooperations,
  updateCooperation,
  listAdminSupportSessions,
  getAdminSupportMessages,
  appendAdminSupportMessage,
  updateSupportSession,
};
