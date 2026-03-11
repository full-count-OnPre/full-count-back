const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/gamesController');

// 경기 목록 조회
router.get('/', gamesController.getGames);

// 경기 상세 (중계 데이터)
router.get('/:gameId', gamesController.getGameById);

module.exports = router;
