const redis = require("../redis");

async function storeRefresh(jti, userId, ttlSeconds) {
  await redis.set(`refresh:${jti}`, userId, "EX", ttlSeconds);
}

async function isRefreshValid(jti) {
  const val = await redis.get(`refresh:${jti}`);
  return Boolean(val);
}

async function revokeRefresh(jti) {
  await redis.del(`refresh:${jti}`);
}

module.exports = {
  storeRefresh,
  isRefreshValid,
  revokeRefresh,
};
