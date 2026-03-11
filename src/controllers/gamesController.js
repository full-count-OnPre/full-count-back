const gamesService = require('../services/gamesService');

const getGames = async (req, res) => {
  try {
    const games = await gamesService.getGames();
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getGameById = async (req, res) => {
  try {
    const game = await gamesService.getGameById(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getGames, getGameById };
