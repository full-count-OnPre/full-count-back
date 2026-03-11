import { config } from "dotenv";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── 팀 ──────────────────────────────────────
  const yankees = await prisma.team.upsert({
    where: { code: "NYY" },
    update: {},
    create: {
      name: "New York Yankees",
      code: "NYY",
      city: "New York",
      league: "AL",
      color: "#132448",
      accent: "#c4ced4",
    },
  });

  const dodgers = await prisma.team.upsert({
    where: { code: "LAD" },
    update: {},
    create: {
      name: "Los Angeles Dodgers",
      code: "LAD",
      city: "Los Angeles",
      league: "NL",
      color: "#005a9c",
      accent: "#ef3e42",
    },
  });

  // ── 유저 (테스트용) ──────────────────────────
  const testUser = await prisma.user.upsert({
    where: { email: "test@fullcount.com" },
    update: {},
    create: {
      nickname: "야구팬",
      email: "test@fullcount.com",
      password: "hashed_password_placeholder",
    },
  });

  // ── 경기 ─────────────────────────────────────
  const game = await prisma.game.upsert({
    where: { gamePk: "20260311-nyy-lad" },
    update: {},
    create: {
      gamePk: "20260311-nyy-lad",
      season: 2026,
      startTime: new Date("2026-03-11T18:10:00Z"),
      venue: "Dodger Stadium",
      weather: "맑음 22°C",
      status: 1,
      homeTeamId: dodgers.id,
      awayTeamId: yankees.id,

      homeScore: 3,
      awayScore: 2,
      homeHits: 7,
      awayHits: 5,
      homeErrors: 0,
      awayErrors: 1,

      homeInningScores: [0, 1, 0, 0, 2, 0, 0, 0, 0],
      awayInningScores: [1, 0, 0, 1, 0, 0, 0, 0, 0],

      currentInning: 7,
      inningHalf: "BOTTOM",
      balls: 2,
      strikes: 1,
      outs: 2,
      base1b: true,
      base2b: false,
      base3b: true,
      currentBatter: "Mookie Betts",
      currentPitcher: "Gerrit Cole",
      lastPitch: "슬라이더 143km/h",

      attendance: "56,000",

      homeLineup: [
        { order: 1, name: "Mookie Betts", position: "RF" },
        { order: 2, name: "Freddie Freeman", position: "1B" },
        { order: 3, name: "Will Smith", position: "C" },
        { order: 4, name: "Teoscar Hernandez", position: "LF" },
        { order: 5, name: "Max Muncy", position: "3B" },
        { order: 6, name: "James Outman", position: "CF" },
        { order: 7, name: "Miguel Vargas", position: "2B" },
        { order: 8, name: "Gavin Lux", position: "SS" },
        { order: 9, name: "Yoshinobu Yamamoto", position: "P" },
      ],
      awayLineup: [
        { order: 1, name: "Anthony Volpe", position: "SS" },
        { order: 2, name: "Juan Soto", position: "RF" },
        { order: 3, name: "Aaron Judge", position: "CF" },
        { order: 4, name: "Giancarlo Stanton", position: "DH" },
        { order: 5, name: "Jazz Chisholm", position: "3B" },
        { order: 6, name: "Gleyber Torres", position: "2B" },
        { order: 7, name: "Ben Rice", position: "1B" },
        { order: 8, name: "Austin Wells", position: "C" },
        { order: 9, name: "Trent Grisham", position: "LF" },
      ],
    },
  });

  // ── 문자중계 이벤트 ───────────────────────────
  const now = new Date("2026-03-11T18:10:00Z");
  const t = (min: number) => new Date(now.getTime() + min * 60 * 1000);

  const events = [
    {
      inning: 1, inningHalf: "TOP", outs: 2, balls: 3, strikes: 2,
      base1b: false, base2b: false, base3b: false,
      headline: "Volpe 삼진 아웃",
      detail: "Yamamoto의 포심 패스트볼에 헛스윙 삼진.",
      tag: "K",
      homeScore: 0, awayScore: 0,
      batter: "Anthony Volpe", pitcher: "Yoshinobu Yamamoto",
      occurredAt: t(5),
    },
    {
      inning: 1, inningHalf: "BOTTOM", outs: 1, balls: 2, strikes: 1,
      base1b: false, base2b: true, base3b: false,
      headline: "Ben Rice 실책! Dodgers 선취점",
      detail: "Judge의 강한 땅볼을 1루수 Ben Rice가 실책. 2루 주자 홈인. Dodgers 1-0.",
      tag: "E",
      homeScore: 1, awayScore: 0,
      batter: "Aaron Judge", pitcher: "Gerrit Cole",
      occurredAt: t(18),
    },
    {
      inning: 2, inningHalf: "TOP", outs: 0, balls: 2, strikes: 0,
      base1b: false, base2b: false, base3b: false,
      headline: "Soto 솔로 홈런! Yankees 동점!",
      detail: "Yamamoto의 체인지업을 왼쪽 담장 너머로 날림. 1-1 동점.",
      tag: "HR",
      homeScore: 1, awayScore: 1,
      batter: "Juan Soto", pitcher: "Yoshinobu Yamamoto",
      occurredAt: t(28),
    },
    {
      inning: 4, inningHalf: "TOP", outs: 2, balls: 1, strikes: 2,
      base1b: false, base2b: false, base3b: false,
      headline: "Judge 적시 2루타! Yankees 역전!",
      detail: "Judge의 중월 2루타로 1루 주자 Stanton 홈인. Yankees 2-1 역전.",
      tag: "RBI",
      homeScore: 1, awayScore: 2,
      batter: "Aaron Judge", pitcher: "Yoshinobu Yamamoto",
      occurredAt: t(65),
    },
    {
      inning: 5, inningHalf: "BOTTOM", outs: 1, balls: 0, strikes: 1,
      base1b: false, base2b: false, base3b: false,
      headline: "Freeman 2타점 적시타! Dodgers 재역전!",
      detail: "Cole의 슬라이더를 중전 안타. 1·2루 주자 모두 홈인. Dodgers 3-2.",
      tag: "RBI",
      homeScore: 3, awayScore: 2,
      batter: "Freddie Freeman", pitcher: "Gerrit Cole",
      occurredAt: t(100),
    },
    {
      inning: 7, inningHalf: "BOTTOM", outs: 2, balls: 2, strikes: 1,
      base1b: true, base2b: false, base3b: true,
      headline: "2사 1·3루, Betts 타석 — 승부처!",
      detail: "Cole 2-1 카운트. 슬라이더 143km/h 볼. 다음 투구에 주목.",
      tag: "NOTE",
      homeScore: 3, awayScore: 2,
      batter: "Mookie Betts", pitcher: "Gerrit Cole",
      occurredAt: t(140),
    },
  ];

  for (const e of events) {
    await prisma.gameEvent.create({ data: { gameId: game.id, ...e } });
  }

  // ── 채팅 메시지 ───────────────────────────────
  const messages = [
    { userId: testUser.id, gameId: game.id, message: "콜 오늘 구위 좋다!", createdAt: t(10) },
    { userId: testUser.id, gameId: game.id, message: "Judge 저 타구는... 실책이지 뭐야", createdAt: t(19) },
    { userId: testUser.id, gameId: game.id, message: "Soto 존재감 미쳤네 ㅋㅋ", createdAt: t(29) },
    { userId: testUser.id, gameId: game.id, message: "Freeman 해줬다!! Dodgers 재역전!!", createdAt: t(101) },
    { userId: testUser.id, gameId: game.id, message: "Betts 여기서 쳐야 시리즈 가져간다", createdAt: t(141) },
  ];

  for (const m of messages) {
    await prisma.message.create({ data: m });
  }

  console.log("Seed 완료");
  console.log(`  Team: Yankees(${yankees.id}), Dodgers(${dodgers.id})`);
  console.log(`  Game: ${game.id} (${game.gamePk})`);
  console.log(`  User: ${testUser.id}`);
  console.log(`  GameEvents: ${events.length}개`);
  console.log(`  Messages: ${messages.length}개`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
