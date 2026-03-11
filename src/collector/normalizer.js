// MLB API 응답 → 우리 DB 스키마로 변환

// 팀 색상 (MLB API에 없으므로 하드코딩)
const TEAM_COLORS = {
  NYY: { color: '#132448', accent: '#c4ced4' },
  LAD: { color: '#005a9c', accent: '#ef3e42' },
  BOS: { color: '#bd3039', accent: '#0c2340' },
  SFG: { color: '#fd5a1e', accent: '#27251f' },
  CHC: { color: '#0e3386', accent: '#cc3433' },
  HOU: { color: '#002d62', accent: '#eb6e1f' },
  ATL: { color: '#ce1141', accent: '#13274f' },
  NYM: { color: '#002d72', accent: '#ff5910' },
  PHI: { color: '#e81828', accent: '#002d72' },
  SDP: { color: '#2f241d', accent: '#ffc425' },
  MIN: { color: '#002b5c', accent: '#d31145' },
  CLE: { color: '#00385d', accent: '#e31937' },
  TBR: { color: '#092c5c', accent: '#8fbce6' },
  SEA: { color: '#0c2c56', accent: '#005c5c' },
  TOR: { color: '#134a8e', accent: '#e8291c' },
};

// 경기 상태 코드 → 우리 status (0: 예정, 1: 진행중, 2: 종료)
function normalizeStatus(codedGameState) {
  if (['F', 'O', 'FT', 'FR'].includes(codedGameState)) return 2;
  if (['I', 'IR', 'MA', 'PH', 'MF'].includes(codedGameState)) return 1;
  return 0;
}

// 리그 이름 축약
function normalizeLeague(leagueName = '') {
  if (leagueName.includes('American')) return 'AL';
  if (leagueName.includes('National')) return 'NL';
  return null;
}

// MLB API 팀 객체 → 우리 Team 스키마
function normalizeTeam(mlbTeam) {
  const code = mlbTeam.abbreviation;
  return {
    name: mlbTeam.name,
    code,
    city: mlbTeam.locationName || mlbTeam.franchiseName || '',
    league: normalizeLeague(mlbTeam.league?.name),
    color: TEAM_COLORS[code]?.color ?? null,
    accent: TEAM_COLORS[code]?.accent ?? null,
  };
}

// MLB linescore innings → 이닝별 점수 배열 (9이닝, 없으면 0)
function normalizeInningScores(innings, side) {
  const scores = Array(9).fill(0);
  for (const inning of innings) {
    const idx = inning.num - 1;
    if (idx >= 0 && idx < 9) {
      scores[idx] = inning[side]?.runs ?? 0;
    }
  }
  return scores;
}

// MLB linescore → Game 실시간 필드
function normalizeLive(linescore) {
  const offense = linescore.offense || {};
  const defense = linescore.defense || {};

  return {
    currentInning: linescore.currentInning ?? 1,
    inningHalf: linescore.inningHalf === 'Bottom' ? 'BOTTOM' : 'TOP',
    balls: linescore.balls ?? 0,
    strikes: linescore.strikes ?? 0,
    outs: linescore.outs ?? 0,
    base1b: !!offense.first,
    base2b: !!offense.second,
    base3b: !!offense.third,
    currentBatter: offense.batter?.fullName ?? null,
    currentPitcher: defense.pitcher?.fullName ?? null,
    homeInningScores: normalizeInningScores(linescore.innings ?? [], 'home'),
    awayInningScores: normalizeInningScores(linescore.innings ?? [], 'away'),
  };
}

// MLB boxscore → 라인업 배열
function normalizeLineup(boxTeam) {
  const battingOrder = boxTeam.battingOrder ?? [];
  const players = boxTeam.players ?? {};
  return battingOrder.map((pid, idx) => {
    const player = players[`ID${pid}`];
    return {
      order: idx + 1,
      name: player?.person?.fullName ?? '',
      position: player?.position?.abbreviation ?? '',
    };
  });
}

// 이벤트 타입 → 우리 tag
function normalizeTag(eventType = '') {
  const map = {
    home_run: 'HR',
    strikeout: 'K',
    double_play: 'DP',
    triple_play: 'DP',
    field_error: 'E',
    walk: 'BB',
    intent_walk: 'BB',
  };
  if (map[eventType]) return map[eventType];
  // RBI 판단은 result.rbi > 0
  return 'NOTE';
}

// MLB playByPlay.allPlays → GameEvent[]
function normalizeEvents(allPlays, gameId) {
  const events = [];

  for (const play of allPlays) {
    const result = play.result ?? {};
    const about = play.about ?? {};
    const count = play.count ?? {};
    const matchup = play.matchup ?? {};

    // 의미없는 플레이 제외 (타석 미완료, 경기 시작 이벤트 등)
    if (!about.isComplete) continue;
    const eventType = result.eventType ?? '';
    if (!eventType) continue;

    const tag = result.rbi > 0 && !['home_run', 'field_error'].includes(eventType)
      ? 'RBI'
      : normalizeTag(eventType);

    events.push({
      gameId,
      inning: about.inning ?? 1,
      inningHalf: about.halfInning === 'bottom' ? 'BOTTOM' : 'TOP',
      outs: count.outs ?? 0,
      balls: count.balls ?? 0,
      strikes: count.strikes ?? 0,
      base1b: false,
      base2b: false,
      base3b: false,
      headline: result.description ?? '',
      detail: null,
      tag,
      homeScore: result.homeScore ?? 0,
      awayScore: result.awayScore ?? 0,
      batter: matchup.batter?.fullName ?? null,
      pitcher: matchup.pitcher?.fullName ?? null,
      occurredAt: about.endTime ? new Date(about.endTime) : new Date(),
    });
  }

  return events;
}

module.exports = { normalizeTeam, normalizeLive, normalizeLineup, normalizeEvents, normalizeStatus };
