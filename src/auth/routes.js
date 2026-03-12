const express = require("express");
const { prisma } = require("../lib/prisma");
const {
  ACCESS_TTL,
  REFRESH_TTL,
  newJti,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("./tokens");
const { storeRefresh, isRefreshValid, revokeRefresh } = require("./refreshStore");
const { hashPassword, verifyPassword } = require("./password");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    const jti = newJti();
    await storeRefresh(jti, user.id, Math.floor(msFromTtl(REFRESH_TTL) / 1000));

    return res.json({
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user, jti),
      expiresIn: ACCESS_TTL,
    });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "email_taken" });
    }
    return res.status(500).json({ error: "register_failed" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const jti = newJti();
  await storeRefresh(jti, user.id, Math.floor(msFromTtl(REFRESH_TTL) / 1000));

  return res.json({
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user, jti),
    expiresIn: ACCESS_TTL,
  });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: "missing_refresh" });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload.jti) {
      return res.status(401).json({ error: "invalid_refresh" });
    }
    const valid = await isRefreshValid(payload.jti);
    if (!valid) {
      return res.status(401).json({ error: "invalid_refresh" });
    }

    await revokeRefresh(payload.jti);
    const jti = newJti();
    await storeRefresh(jti, payload.sub, Math.floor(msFromTtl(REFRESH_TTL) / 1000));

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      return res.status(401).json({ error: "invalid_refresh" });
    }

    return res.json({
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user, jti),
      expiresIn: ACCESS_TTL,
    });
  } catch (e) {
    return res.status(401).json({ error: "invalid_refresh" });
  }
});

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: "missing_refresh" });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    await revokeRefresh(payload.jti);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(401).json({ error: "invalid_refresh" });
  }
});

function msFromTtl(ttl) {
  if (typeof ttl === "number") return ttl;
  const match = /^([0-9]+)(s|m|h|d)$/.exec(ttl);
  if (!match) return 0;
  const n = Number(match[1]);
  const unit = match[2];
  if (unit === "s") return n * 1000;
  if (unit === "m") return n * 60 * 1000;
  if (unit === "h") return n * 60 * 60 * 1000;
  if (unit === "d") return n * 24 * 60 * 60 * 1000;
  return 0;
}

module.exports = router;
