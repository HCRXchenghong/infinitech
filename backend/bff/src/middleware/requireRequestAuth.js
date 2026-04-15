function requireRequestAuth(req, res, next) {
  const authHeader = String(req.headers.authorization || "").trim();
  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: "未授权，请先登录",
    });
    return;
  }
  next();
}

module.exports = {
  requireRequestAuth,
};
