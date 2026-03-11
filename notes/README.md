# 작업 메모

## 오늘 진행 사항
- `wbc-back/` 코드를 루트 앱에 통합함
- auth 라우터를 루트 앱에 연결함: `/api/auth`
- Prisma `User` 모델을 auth 로직에 맞게 통합함
- `.env.example`에 JWT/Redis/Bcrypt 설정 추가함
- `wbc-back/` 폴더 삭제함
- `prisma/seed.ts`를 사용자 제공 최신 내용으로 복구함
- `prisma/seed.ts`의 `password`를 `passwordHash`로 변경함
- refresh 토큰에서 `jti` 누락 시 즉시 401 반환하도록 방어 로직 추가함
- `GET /api/games`, `GET /api/games/:gameId`에 Redis 캐시 미들웨어 적용(10초)
- Prisma client generate 실행함
- 머지 충돌 해결: `prisma/seed.ts` 통합, `src/routes/games.js` 통합(캐시 + 추가 라우트)

## 통합 후 변경 파일
- `src/app.js`
- `src/db.js`
- `src/auth/routes.js`
- `src/routes/games.js`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `package.json`
- `.env.example`

## 남아있는 이슈
- `User` 스키마 변경에 대한 마이그레이션이 아직 없음
- JWT 환경변수 없으면 서버가 바로 크래시

## JWT 흐름 점검
- 발급: `/api/auth/register`, `/api/auth/login`에서 Access/Refresh 발급, Redis에 refresh JTI 저장
- 갱신: `/api/auth/refresh`에서 refresh 검증 → 기존 JTI 폐기 → 새 JTI 저장 → 새 토큰 발급
- 로그아웃: `/api/auth/logout`에서 refresh JTI 폐기
- 주의: TTL 형식이 잘못되면 `msFromTtl`이 0을 반환 → 즉시 만료 가능
- 방어 추가: refresh 토큰 payload에 `jti` 누락 시 401 반환
- 환경변수 누락 시 `tokens.js` 로딩 단계에서 서버 크래시

## npm audit 결과
- `npm audit fix` 실행 후에도 12개 취약점(5 moderate, 7 high) 남음
- 주요 원인: `prisma`의 개발 의존성 체인(`hono`, `@hono/node-server`, `lodash`, `tar`)
- 해결하려면 `npm audit fix --force` 필요 (Prisma 및 bcrypt 등 **브레이킹 변경** 발생)

## 결정 사항
- Prisma 마이그레이션은 JWT와 무관하므로 일단 보류

## 다음 할 일(선택)
- TTL 검증 강화
- seed 실행 점검
- `npm audit fix --force` 적용 여부 결정
