const gamesService = require('../services/gamesService');

const getGames = async (req, res) => {
  try {
    const { date, status } = req.query;
    const games = await gamesService.getGames({ date, status });
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

const getGameLive = async (req, res) => {
  try {
    const data = await gamesService.getGameLive(req.params.gameId);
    if (!data) return res.status(404).json({ error: 'Game not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getGameRelay = async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const events = await gamesService.getGameRelay(req.params.gameId, { cursor, limit });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getGameChat = async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const messages = await gamesService.getGameChat(req.params.gameId, { cursor, limit });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getGames, getGameById, getGameLive, getGameRelay, getGameChat };
