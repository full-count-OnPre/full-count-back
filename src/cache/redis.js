// Redis 인터페이스 — 팀원 B 구현 예정
// null 반환 시 서비스 레이어에서 DB fallback으로 동작

async function getLiveCache(gameId) {
  // TODO: 팀원 B — Redis 연결 및 GET 구현
  return null;
}

async function setLiveCache(gameId, data, ttlSeconds = 10) {
  // TODO: 팀원 B — Redis SET 구현
}

module.exports = { getLiveCache, setLiveCache };
