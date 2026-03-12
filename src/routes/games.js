const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/gamesController');
const cache = require('../cache');
const { requireAuth } = require('../auth/middleware');

router.get('/', cache(10), gamesController.getGames);
router.get('/:gameId', cache(10), gamesController.getGameById);
router.get('/:gameId/live', gamesController.getGameLive);
router.get('/:gameId/relay', gamesController.getGameRelay);
router.get('/:gameId/chat', gamesController.getGameChat);
router.post('/:gameId/chat', requireAuth, gamesController.postGameChat);

module.exports = router;
