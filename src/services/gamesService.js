const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

const getGames = async () => {
  return prisma.game.findMany();
};

const getGameById = async (gameId) => {
  return prisma.game.findUnique({
    where: { id: gameId },
  });
};

module.exports = { getGames, getGameById };
