const { verifyAccessToken } = require("./tokens");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

module.exports = { requireAuth };
