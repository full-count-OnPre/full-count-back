const { verifyAccessToken } = require("./tokens");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

module.exports = {
  requireAuth,
};