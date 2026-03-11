const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/gamesController');

router.get('/', gamesController.getGames);
router.get('/:gameId', gamesController.getGameById);
router.get('/:gameId/live', gamesController.getGameLive);
router.get('/:gameId/relay', gamesController.getGameRelay);
router.get('/:gameId/chat', gamesController.getGameChat);

module.exports = router;
