const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
});

redis.on("error", (err) => {
  // Avoid crashing on transient Redis errors
  console.error("[redis] error", err);
});

module.exports = redis;
