const MLB_API = 'https://statsapi.mlb.com/api/v1';

async function mlbFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB API ${res.status}: ${url}`);
  return res.json();
}

// 특정 날짜의 경기 목록
async function fetchSchedule(date) {
  return mlbFetch(`${MLB_API}/schedule?sportId=1&date=${date}&hydrate=team,venue`);
}

// 이닝별 스코어, 볼카운트, 주자 상황
async function fetchLinescore(gamePk) {
  return mlbFetch(`${MLB_API}/game/${gamePk}/linescore`);
}

// 선발 라인업, 타격/수비 통계
async function fetchBoxscore(gamePk) {
  return mlbFetch(`${MLB_API}/game/${gamePk}/boxscore`);
}

// 전체 플레이별 문자중계 이벤트
async function fetchPlayByPlay(gamePk) {
  return mlbFetch(`${MLB_API}/game/${gamePk}/playByPlay`);
}

module.exports = { fetchSchedule, fetchLinescore, fetchBoxscore, fetchPlayByPlay };
