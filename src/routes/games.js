const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/gamesController');
const cache = require('../cache');

// 경기 목록 조회
router.get('/', cache(10), gamesController.getGames);

// 경기 상세 (중계 데이터)
router.get('/:gameId', cache(10), gamesController.getGameById);

module.exports = router;
