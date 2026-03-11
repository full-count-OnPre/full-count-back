const crypto = require("crypto");
const redis = require("./redis");

function buildCacheKey(req) {
  const base = `${req.method}:${req.originalUrl}`;
  return `cache:${crypto.createHash("sha1").update(base).digest("hex")}`;
}

function cache(ttlSeconds = 5) {
  return async (req, res, next) => {
    try {
      if (req.method !== "GET") {
        return next();
      }

      if (req.headers.authorization) {
        return next();
      }

      const key = buildCacheKey(req);
      const cached = await redis.get(key);

      if (cached) {
        res.set("X-Cache", "HIT");
        try {
          return res.json(JSON.parse(cached));
        } catch (e) {
          await redis.del(key);
        }
      }

      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        res.set("X-Cache", "MISS");
        try {
          await redis.set(key, JSON.stringify(body), "EX", ttlSeconds);
        } catch (e) {
          // Cache write failure shouldn't break response
          console.error("[cache] set failed", e);
        }
        return originalJson(body);
      };

      return next();
    } catch (e) {
      // Cache read failure shouldn't block the request
      return next();
    }
  };
}

module.exports = cache;
