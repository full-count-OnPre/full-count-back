require('dotenv').config();
const { prisma } = require('../lib/prisma.js');
const { fetchSchedule, fetchLinescore, fetchBoxscore, fetchPlayByPlay } = require('./mlbClient.js');
const { normalizeTeam, normalizeLive, normalizeLineup, normalizeEvents, normalizeStatus } = require('./normalizer.js');

// 팀 upsert (code 기준)
async function upsertTeam(mlbTeam) {
  const data = normalizeTeam(mlbTeam);
  return prisma.team.upsert({
    where: { code: data.code },
    update: data,
    create: data,
  });
}

// 경기 1개 수집 및 저장
async function collectGame(scheduledGame) {
  const gamePk = scheduledGame.gamePk;
  const gamePkStr = String(gamePk);

  console.log(`  수집 중: gamePk=${gamePk}`);

  // 팀 upsert
  const homeTeam = await upsertTeam(scheduledGame.teams.home.team);
  const awayTeam = await upsertTeam(scheduledGame.teams.away.team);

  // linescore, boxscore 동시 요청
  const [linescore, boxscore] = await Promise.all([
    fetchLinescore(gamePk).catch(() => null),
    fetchBoxscore(gamePk).catch(() => null),
  ]);

  const liveFields = linescore ? normalizeLive(linescore) : {};
  const homeLineup = boxscore ? normalizeLineup(boxscore.teams?.home ?? {}) : [];
  const awayLineup = boxscore ? normalizeLineup(boxscore.teams?.away ?? {}) : [];

  const boxHome = boxscore?.teams?.home?.teamStats?.batting ?? {};
  const boxAway = boxscore?.teams?.away?.teamStats?.batting ?? {};

  const gameData = {
    gamePk: gamePkStr,
    season: scheduledGame.season ?? new Date(scheduledGame.gameDate).getFullYear(),
    startTime: new Date(scheduledGame.gameDate),
    venue: scheduledGame.venue?.name ?? '',
    status: normalizeStatus(scheduledGame.status?.codedGameState),
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    homeScore: scheduledGame.teams.home.score ?? 0,
    awayScore: scheduledGame.teams.away.score ?? 0,
    homeHits: boxHome.hits ?? 0,
    awayHits: boxAway.hits ?? 0,
    homeErrors: boxscore?.teams?.home?.teamStats?.fielding?.errors ?? 0,
    awayErrors: boxscore?.teams?.away?.teamStats?.fielding?.errors ?? 0,
    homeLineup,
    awayLineup,
    attendance: String(scheduledGame.attendance ?? ''),
    ...liveFields,
  };

  const game = await prisma.game.upsert({
    where: { gamePk: gamePkStr },
    update: gameData,
    create: gameData,
  });

  // 이미 이벤트가 있으면 스킵 (중복 방지)
  const existingCount = await prisma.gameEvent.count({ where: { gameId: game.id } });
  if (existingCount === 0) {
    const playByPlay = await fetchPlayByPlay(gamePk).catch(() => null);
    if (playByPlay?.allPlays?.length) {
      const events = normalizeEvents(playByPlay.allPlays, game.id);
      if (events.length) {
        await prisma.gameEvent.createMany({ data: events });
        console.log(`    GameEvent ${events.length}개 저장`);
      }
    }
  }

  return game;
}

// 특정 날짜의 전체 경기 수집
async function collectByDate(date) {
  console.log(`\n날짜 수집: ${date}`);
  const schedule = await fetchSchedule(date);
  const dates = schedule.dates ?? [];
  if (!dates.length) {
    console.log('  경기 없음');
    return;
  }

  for (const dateEntry of dates) {
    for (const game of dateEntry.games) {
      await collectGame(game);
    }
  }
}

// CLI 실행: node src/collector/index.js --date 2024-10-30
async function main() {
  const args = process.argv.slice(2);
  const dateIdx = args.indexOf('--date');
  const date = dateIdx !== -1 ? args[dateIdx + 1] : null;

  if (!date) {
    console.error('사용법: tsx src/collector/index.js --date YYYY-MM-DD');
    process.exit(1);
  }

  try {
    await collectByDate(date);
    console.log('\n수집 완료');
  } catch (e) {
    console.error('수집 실패:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
