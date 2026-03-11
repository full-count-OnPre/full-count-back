const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/gamesController');
const cache = require('../cache');

// 경기 목록 조회
router.get('/', cache(10), gamesController.getGames);

// 경기 상세
router.get('/:gameId', cache(10), gamesController.getGameById);
router.get('/:gameId/live', gamesController.getGameLive);
router.get('/:gameId/relay', gamesController.getGameRelay);
router.get('/:gameId/chat', gamesController.getGameChat);

module.exports = router;
