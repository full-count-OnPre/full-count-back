const { prisma } = require('../lib/prisma.js');

// GET /api/games?date=YYYY-MM-DD&status=0|1|2
const getGames = async ({ date, status } = {}) => {
  const where = {};

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.startTime = { gte: start, lt: end };
  }

  if (status !== undefined && status !== null) {
    where.status = Number(status);
  }

  return prisma.game.findMany({
    where,
    include: { homeTeam: true, awayTeam: true },
    orderBy: { startTime: 'asc' },
  });
};

// GET /api/games/:gameId
const getGameById = async (gameId) => {
  return prisma.game.findFirst({
    where: { id: gameId },
    include: { homeTeam: true, awayTeam: true },
  });
};

// GET /api/games/:gameId/live
const getGameLive = async (gameId) => {
  const data = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      status: true,
      currentInning: true,
      inningHalf: true,
      balls: true,
      strikes: true,
      outs: true,
      base1b: true,
      base2b: true,
      base3b: true,
      currentBatter: true,
      currentPitcher: true,
      lastPitch: true,
      homeScore: true,
      awayScore: true,
      homeInningScores: true,
      awayInningScores: true,
    },
  });

  return data;
};

// GET /api/games/:gameId/relay?cursor=<lastEventId>&limit=20
const getGameRelay = async (gameId, { cursor, limit = 20 } = {}) => {
  return prisma.gameEvent.findMany({
    where: { gameId },
    orderBy: { occurredAt: 'desc' },
    take: Number(limit),
    ...(cursor && {
      skip: 1,
      cursor: { id: Number(cursor) },
    }),
  });
};

// GET /api/games/:gameId/chat?cursor=<lastMessageId>&limit=50
const getGameChat = async (gameId, { cursor, limit = 50 } = {}) => {
  return prisma.message.findMany({
    where: { gameId },
    include: { user: { select: { id: true, nickname: true } } },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    ...(cursor && {
      skip: 1,
      cursor: { id: Number(cursor) },
    }),
  });
};

module.exports = { getGames, getGameById, getGameLive, getGameRelay, getGameChat };
