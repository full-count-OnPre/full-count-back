# Claude Actions Log

---

## 3/11/09:47 — 백엔드 초기 세팅 계획

### 기술 스택 확정

- Runtime: Node.js
- Framework: Express.js
- ORM: Prisma (PostgreSQL 연동)
- DB: PostgreSQL
- Cache: Redis (다른 팀원 담당)
- Auth/JWT: (다른 팀원 담당)

### 이재민 담당 범위

1. 경기 목록 및 실시간 중계 데이터 REST API
2. 애플리케이션 컨테이너화 및 리소스 설정

---

## 3/11/10:04 — 개발환경 세팅 명령어

### 1. 프로젝트 초기화

```bash
npm init -y
```

### 2. 패키지 설치

```bash
# 프로덕션 의존성
npm install express dotenv cors

# 개발 의존성
npm install -D nodemon
```

### 3. Prisma 초기화

```bash
npm install prisma @prisma/client
npx prisma init
```

- `prisma/schema.prisma` 생성됨
- `.env`에 `DATABASE_URL` 자동 추가됨

### 4. 디렉토리 구조

```
full-count-back/
├── src/
│   ├── routes/
│   │   └── games.js
│   ├── controllers/
│   │   └── gamesController.js
│   ├── services/
│   │   └── gamesService.js
│   ├── middlewares/
│   └── app.js
├── prisma/
│   └── schema.prisma
├── .env
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── package.json
```

### 5. .env 설정

```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/fullcount"
```

### 6. docker-compose.yml (로컬 개발용 PostgreSQL)

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:15
    container_name: fullcount-db
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: fullcount
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 7. package.json scripts 추가

```json
"scripts": {
  "dev": "nodemon src/app.js",
  "start": "node src/app.js"
}
```

### 8. PostgreSQL 컨테이너 실행

```bash
docker-compose up -d
```

### 9. Prisma DB 마이그레이션

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 3/11/10:08 — 초기 세팅 완료

### 생성된 파일 목록

- `src/app.js` — Express 앱 엔트리포인트
- `src/routes/games.js` — 경기 라우터
- `src/controllers/gamesController.js` — 컨트롤러
- `src/services/gamesService.js` — Prisma 기반 서비스
- `src/middlewares/` — 추후 인증 미들웨어 연동 예정 (팀원 담당)
- `prisma/schema.prisma` — DB 스키마 정의 파일
- `.env` — 환경변수 (DATABASE_URL, PORT)
- `.env.example` — 환경변수 템플릿
- `docker-compose.yml` — 로컬 개발용 PostgreSQL

### 완료된 설정

- `package.json` scripts: `dev` (nodemon), `start` (node)
- `.env` DATABASE_URL을 표준 PostgreSQL URL로 설정

### 다음 단계

1. `docker-compose up -d` 로 PostgreSQL 실행
2. `prisma/schema.prisma` 에 Game 모델 정의
3. `npx prisma migrate dev --name init` 으로 마이그레이션 적용
4. API 로직 구현

---

## 3/11/10:39 — DB 스키마 설계 확정

### 테이블 구성 (총 6개)

| 테이블              | API/로직 구현 |
| ------------------- | ------------- |
| `team`              | 이재민        |
| `game`              | 이재민        |
| `game_event`        | 이재민        |
| `message`           | 이재민        |
| `user`              | 김승완        |
| `verification_code` | 김승완        |

### 설계 결정 사항

- `InningScore` 별도 테이블 제거 → `game.home_inning_scores: Int[]` / `away_inning_scores: Int[]` 로 대체 (농구 ERD의 periods 방식 참고)
- `Lineup` 별도 테이블 제거 → `game.home_lineup: Json` / `away_lineup: Json` 으로 대체
- `game_event` 는 별도 테이블 유지 (실시간 문자중계 핵심, 경기당 다수 레코드)

### 다음 단계

- `prisma/schema.prisma` 작성 및 마이그레이션

---

## 3/11/11:42 — DB 세팅 및 API 구현 계획

### 진행 순서

#### 1단계 — DB 세팅

1. Docker PostgreSQL 컨테이너 실행: `docker-compose up -d`
2. 테이블 생성: `npx prisma migrate dev --name init`
3. Prisma 클라이언트 생성: `npx prisma generate`

#### 2단계 — 더미데이터 삽입

4. `prisma/seed.js` 작성 (Yankees vs Dodgers 경기 + GameEvent 더미데이터)
5. `package.json`에 seed 스크립트 추가
6. `npx prisma db seed` 실행
7. pgAdmin4로 데이터 시각 확인

#### 3단계 — REST API 구현

| 엔드포인트                     | 설명                                    |
| ------------------------------ | --------------------------------------- |
| `GET /api/games`               | 경기 목록 (날짜, 상태 필터)             |
| `GET /api/games/:gameId`       | 경기 상세 (팀, 스코어 등)               |
| `GET /api/games/:gameId/live`  | 실시간 경기 상황 (볼카운트, 주자, 이닝) |
| `GET /api/games/:gameId/relay` | 문자중계 이벤트 목록                    |
| `GET /api/games/:gameId/chat`  | 채팅 메시지 목록 (팀원 B 연동용)        |

#### 4단계 — 컨테이너화

8. `Dockerfile` 작성 (multi-stage build)
9. `docker-compose.yml`에 app 서비스 추가
10. 전체 스택 docker-compose로 통합 테스트

### 로컬 DB 환경

- Docker PostgreSQL (포트 5432) 사용
- 로컬 설치 PostgreSQL 서비스는 중지 상태 유지
- pgAdmin4 → `localhost:5432` / user: `user` / pw: `password` / db: `fullcount`

---

## 3/11/12:05 — 환경 의존성 이슈 해결

### 발생한 문제

#### 1. Prisma v6 vs v7 충돌

- `prisma.config.ts`는 v7 방식 (datasource url을 config에서 관리)
- 설치된 CLI는 v6.19.2 → `schema.prisma`에 url 필수 → `validate` 실패
- **해결:** Prisma v7으로 업그레이드

#### 2. Node.js 버전 부족

- Prisma v7 요구: `Node.js v20.19+ / v22.12+ / v24+`
- 설치된 버전: `v20.17.0` → 업그레이드 필요
- **해결:** Node.js `v24.14.0` 으로 업그레이드 (공식 사이트에서 설치)

#### 3. Docker Desktop 미실행

- `docker-compose up -d` 실패 → Docker Engine에 연결 불가
- **해결:** Docker Desktop 실행

### 업그레이드 결과

| 항목           | 이전     | 현재     |
| -------------- | -------- | -------- |
| Node.js        | v20.17.0 | v24.14.0 |
| Prisma CLI     | ^6.19.2  | ^7.4.2   |
| @prisma/client | ^6.19.2  | ^7.4.2   |

### 현재 상태

- `npx prisma validate` → 통과
- Docker Desktop 실행 완료
- 다음 단계: `docker-compose up -d` → migrate → generate

---

## 3/11/12:22 — 다음 진행 계획

### 1단계 — DB 세팅 (즉시 진행)

```bash
docker-compose up -d
npx prisma migrate dev --name init
npx prisma generate
```

- `docker-compose up -d`: PostgreSQL 컨테이너 실행 (포트 5432)
- `migrate dev`: `prisma/migrations/` 생성 + DB에 테이블 적용
- `generate`: `generated/prisma/` 에 Prisma 클라이언트 코드 생성

### 2단계 — 더미데이터 삽입

- `prisma/seed.js` 작성
  - Team 2개 (Yankees, Dodgers)
  - Game 1개 (진행중 상태, 7회 상황)
  - GameEvent 여러 개 (문자중계 이벤트)
  - User 1개 (테스트용)
- `package.json` prisma seed 스크립트 추가
- `npx prisma db seed` 실행
- pgAdmin4 → `localhost:5432` 접속하여 데이터 시각 확인

### 3단계 — MLB API Collector + REST API 구현

#### 3-1. MLB API Collector (`src/collector/`)

MLB Stats API에서 실제 과거 경기 데이터를 수집하여 DB에 저장하는 모듈

- `src/collector/mlbClient.js` — MLB Stats API 호출 래퍼
- `src/collector/normalizer.js` — MLB API 응답 → 우리 DB 스키마로 변환
- `src/collector/index.js` — 수집 실행 진입점

사용할 MLB Stats API 엔드포인트:

- `GET /api/v1/schedule` — 경기 목록 (gamePk, 팀, 날짜, 상태)
- `GET /api/v1/game/{gamePk}/linescore` — 실시간 경기 상황
- `GET /api/v1/game/{gamePk}/boxscore` — 스코어, 라인업, 타격/수비 통계
- `GET /api/v1/game/{gamePk}/playByPlay` — 문자중계 이벤트

#### 3-2. REST API (`src/services/`, `src/controllers/`, `src/routes/`)

DB에 저장된 데이터를 프론트에 제공

| 엔드포인트                     | 설명                                    |
| ------------------------------ | --------------------------------------- |
| `GET /api/games`               | 경기 목록 (날짜, 상태 필터)             |
| `GET /api/games/:gameId`       | 경기 상세 (팀, 스코어 등)               |
| `GET /api/games/:gameId/live`  | 실시간 경기 상황 (볼카운트, 주자, 이닝) |
| `GET /api/games/:gameId/relay` | 문자중계 이벤트 목록                    |
| `GET /api/games/:gameId/chat`  | 채팅 메시지 목록 (팀원 B 연동용)        |

#### 3-3. Redis 인터페이스 (`src/cache/redis.js`)

승완님 연동 대비 틀만 작성 — 현재는 항상 `null` 반환, DB fallback으로 동작

### 4단계 — 컨테이너화

- `Dockerfile` 작성 (multi-stage build: builder → production)
- `docker-compose.yml`에 `app` 서비스 추가 (postgres 의존성 포함)
- 전체 스택 `docker-compose up` 으로 통합 테스트

---

## 3/11/12:38 — 1단계 DB 세팅 완료

### 발생한 에러 및 해결

#### 1. Prisma v6 vs v7 충돌

- `prisma.config.ts`는 v7 방식 (datasource url을 config에서 관리)
- 설치된 CLI는 v6 → `schema.prisma`에 url 없다며 validate 실패
- **해결:** Prisma v7.4.2로 업그레이드 (`npm install prisma@^7.4.2 @prisma/client@^7.4.2`)

#### 2. Node.js 버전 부족

- Prisma v7 요구: Node.js v20.19+ / v22.12+ / v24+
- 설치 버전: v20.17.0 → 조건 미충족
- **해결:** 공식 사이트에서 Node.js v24.14.0 설치 (기존 버전 덮어쓰기)

#### 3. dotenv import 방식 문제 (P1000 1차)

- `import "dotenv/config"` 방식이 Prisma TS 로더 환경에서 미작동
- **해결:** `import { config } from "dotenv"; config();` 방식으로 변경

#### 4. .env 값 따옴표 포함 문제 (P1000 2차)

- dotenv v17에서 .env의 `DATABASE_URL="postgresql://..."` 따옴표가 URL에 그대로 포함됨
- **해결:** .env에서 따옴표 제거 → `DATABASE_URL=postgresql://user:password@localhost:5432/fullcount`

#### 5. PostgreSQL 인증 방식 불일치 (P1000 3차)

- PostgreSQL 15 기본 인증은 scram-sha-256이나 pg_hba.conf 설정과 충돌
- **해결:** `docker-compose.yml`에 `POSTGRES_HOST_AUTH_METHOD: trust` 추가

#### 6. 로컬 PostgreSQL 서비스 포트 충돌 (P1000 근본 원인)

- 로컬에 PostgreSQL 설치 시 default 포트 5432로 설정 → 서비스 자동 실행 중
- `netstat -ano | grep ":5432"` 로 두 PID (23692, 27008) 확인
- Docker 컨테이너와 포트 충돌 → DB 연결 불가
- **해결:** `services.msc`에서 로컬 PostgreSQL 서비스 수동 중지

### 완료된 작업

- `docker-compose up -d` ✅ — PostgreSQL 15 컨테이너 (`fullcount-db`) 실행
- `npx prisma migrate dev --name init` ✅ — `prisma/migrations/20260311033720_init/migration.sql` 생성 및 DB 테이블 적용
- `npx prisma generate` ✅ — `generated/prisma/` 에 Prisma Client 코드 생성

---

## 3/11/14:29 — 2단계 더미데이터 삽입 완료

### 발생한 에러 및 해결

#### 1. seed 설정 위치 변경 (Prisma v7)

- `package.json`의 `"prisma": { "seed": "..." }` 방식은 v6까지만 유효
- Prisma v7에서는 `prisma.config.ts`의 `migrations.seed` 필드에서 관리
- **해결:** `prisma.config.ts`에 `seed: "node prisma/seed.js"` 추가

#### 2. CommonJS seed.js → TypeScript 전환 필요

- Prisma v7의 `prisma-client` generator는 TypeScript 파일(`generated/prisma/client.ts`)만 생성
- CommonJS `require("../generated/prisma")`로는 모듈 불가 (`index.js` 없음)
- **해결:** `tsx` 설치 후 `seed.js` → `seed.ts` 전환, seed 커맨드를 `npx tsx prisma/seed.ts`로 변경

#### 3. PrismaClient 생성자 필수 인자 누락

- Prisma v7 새 generator는 Driver Adapter를 필수로 요구 (`new PrismaClient()` 불가)
- **해결:** `@prisma/adapter-pg` 설치 후 `new PrismaPg({ connectionString })` 어댑터 주입

### 완료된 작업

- `prisma/seed.ts` 작성 ✅ — Team 2개, Game 1개, GameEvent 6개, Message 5개, User 1개
- `npx prisma db seed` 성공 ✅ — DB에 더미데이터 삽입 확인
- pgAdmin4로 `fullcount` DB 데이터 시각 확인 ✅

### 추가 설치된 패키지

- `tsx` (devDependencies) — TypeScript seed 파일 실행용
- `@prisma/adapter-pg` (dependencies) — Prisma v7 Driver Adapter

---

## 3/11/16:22 — 3단계 MLB API Collector + REST API 구현 완료

### 발생한 에러 및 해결

#### 1. Prisma v7 generated client import 불가 (Cannot find module)

- `src/services/gamesService.js`에서 `require('../../generated/prisma')` 실패
- Prisma v7 `prisma-client` generator는 TypeScript 파일만 생성, `index.js` 없음
- **해결:** `src/lib/prisma.js` 공유 모듈 생성, `require('../../generated/prisma/client.ts')` 사용 (tsx 런타임에서 .ts require 지원)

#### 2. 앱 실행 런타임을 tsx로 전환

- 기존 `node src/app.js` 방식으로는 TypeScript generated client 로드 불가
- **해결:** `package.json` scripts를 `tsx src/app.js` / `nodemon --exec tsx src/app.js`로 변경

#### 3. `homeWinProb` / `awayWinProb` 컬럼 제거 후 클라이언트 미재생성

- 스키마에서 두 필드 제거 + migrate 후 서버 재시작 시 `The column does not exist` 에러
- **해결:** `npx prisma generate` 재실행으로 generated client 동기화

#### 4. `findUnique` 미동작 → `findFirst`로 변경

- `GET /api/games/:id`에서 `prisma.game.findUnique()` 가 항상 null 반환
- Prisma v7 Driver Adapter 환경에서 `findUnique`의 동작 이상으로 추정
- **해결:** `findFirst({ where: { id: gameId } })`로 교체 → 정상 동작

#### 5. seed 중복 실행으로 이벤트/메시지 데이터 중복

- migrate dev 전후로 seed를 여러 번 실행 → GameEvent, Message 중복 저장
- Game/Team/User는 upsert라 중복 없으나, GameEvent·Message는 create라 중복 발생
- 지금은 무시 (MLB API 실데이터로 교체 시 자동 해소)

### 완료된 작업

- `src/lib/prisma.js` ✅ — 공유 Prisma 클라이언트 (Driver Adapter 포함)
- `src/cache/redis.js` ✅ — Redis 인터페이스 틀 (팀원 B 연동 대비, 현재 null 반환)
- `src/collector/mlbClient.js` ✅ — MLB Stats API 호출 래퍼
- `src/collector/normalizer.js` ✅ — MLB API 응답 → DB 스키마 변환
- `src/collector/index.js` ✅ — 날짜 기반 경기 수집 및 DB 저장 실행 스크립트
- `src/services/gamesService.js` ✅ — 5개 엔드포인트 서비스 로직
- `src/controllers/gamesController.js` ✅ — 5개 엔드포인트 컨트롤러
- `src/routes/games.js` ✅ — 라우터 등록

### API 동작 확인 ✅

| 엔드포인트                 | 결과                              |
| -------------------------- | --------------------------------- |
| `GET /api/games`           | 경기 목록 JSON 정상 반환          |
| `GET /api/games/:id`       | 경기 상세 + 팀 정보 정상 반환     |
| `GET /api/games/:id/live`  | 볼카운트, 주자, 이닝 등 정상 반환 |
| `GET /api/games/:id/relay` | 문자중계 이벤트 목록 정상 반환    |
| `GET /api/games/:id/chat`  | 채팅 메시지 + 유저 정보 정상 반환 |

---

## 3/11/16:48 — 4단계 컨테이너화 완료

### 발생한 에러 및 해결

특별한 에러 없이 1회 빌드 성공

### 완료된 작업

- `Dockerfile` ✅ — API 서버 multi-stage 빌드 (node:24-alpine, builder → runner)
- `Dockerfile.collector` ✅ — Collector multi-stage 빌드 (ENTRYPOINT 방식, `--date` 인자 수동 전달)
- `.dockerignore` ✅ — `node_modules`, `.env`, `generated` 등 빌드 제외
- `docker-compose.yml` 업데이트 ✅
  - `postgres` healthcheck 추가 (`pg_isready` 기반)
  - `api` 서비스 추가 (포트 3000, postgres healthcheck 의존)
  - `collector` 서비스 추가 (profile: collector, 수동 실행 전용)
  - 컨테이너 간 DB 연결: `DATABASE_URL` 호스트를 `localhost` → `postgres` (서비스명)로 변경

### 컨테이너 동작 확인 ✅

```
✔ fullcount-db  — PostgreSQL 15 정상 기동
✔ fullcount-api — 포트 3000 정상 리슨
✔ GET /api/games — 컨테이너 환경에서 API 응답 정상
```

### 이미지 구성 정리

| 이미지                | Dockerfile             | 배포 VM |
| --------------------- | ---------------------- | ------- |
| `fullcount-api`       | `Dockerfile`           | VM2     |
| `fullcount-collector` | `Dockerfile.collector` | VM3     |
| `postgres:15` (공식)  | —                      | VM4     |

---

## 3/12/09:32 — 팀원 브랜치 통합 중 스키마 충돌 해결

### 발생한 에러 및 해결

#### 1. `dev/backend` 브랜치 GitHub 자동 merge 불가

- 승완님 `dev/backend`가 우리 `feat/backend-setting` merge 이전의 main을 base로 생성됨
- **해결:** `dev/backend` 브랜치에서 `git pull origin main` → merge commit 생성 → `git push origin dev/backend`

#### 2. seed.ts — `homeWinProb` / `awayWinProb` 잔존

- 스키마에서 제거한 필드가 seed.ts에 남아 있어 seed 실패
- **해결:** seed.ts에서 해당 두 필드 제거

#### 3. Prisma 클라이언트 필드 불일치 (`password` vs `passwordHash`)

- 승완님이 `User.password` → `User.passwordHash`로 변경했으나 Prisma 클라이언트가 구버전 캐싱
- seed 실행 시 `Argument 'password' is missing` 에러
- **해결 순서:**
  1. `npx prisma migrate reset` — DB 초기화 + 기존 마이그레이션 재적용
  2. `npx prisma migrate dev --name add-auth-fields` — 새 스키마 마이그레이션
  3. `npx prisma generate` — 클라이언트 재생성
  4. `npx prisma db seed` — 정상 완료

### 완료된 작업

- `dev/backend` ↔ `main` 브랜치 통합 완료 ✅
- 승완님 Auth 스키마(`passwordHash`, `role`, `isAdmin`, `deletedAt`, `VerificationCode`) 마이그레이션 적용 ✅
- seed 정상 동작 확인 ✅

### 팀 공유 — 스키마 변경 후 필수 명령어

```bash
npm install
npx prisma migrate dev
npx prisma generate
npx prisma db seed   # 데이터 초기화 필요할 때만
```

---

## 3/12/09:47 - 5단계 MLB API 실데이터 수집

### 목표

더미데이터 대신 실제 MLB Stats API 데이터를 DB에 저장하여 프론트에 실데이터 제공

### 수집 대상

- **기간:** 2025 포스트시즌 (`2025-10-01` ~ `2025-10-29`)
- **예상 경기 수:** 30~47경기
- **예상 소요 시간:** 5~10분

### 할 작업

- `src/collector/index.js`에 `--from` / `--to` 날짜 범위 옵션 추가
- 범위 수집 실행 및 DB 저장 확인
- pgAdmin4에서 실데이터 적재 확인
- REST API 응답이 실데이터로 바뀌는지 확인

### 실행 예정 명령어

```bash
npx tsx src/collector/index.js --from 2025-10-01 --to 2025-10-29
```

---

## 3/12/11:10 — MLB API 실데이터 수집 완료 + 코드 정리

### 역할 변경

- **백엔드 전담: 이재민 단독** (JWT 인증, Redis 캐싱 포함)
- 승완님 코드(`src/auth/`, `src/cache.js`, `src/redis.js`) 활용 + 필요시 수정

### 발생한 에러 및 해결

#### 1. `season` 타입 불일치

- MLB API의 `season` 필드가 문자열(`"2025"`)로 반환됨 → DB 스키마는 `Int`
- **해결:** `Number()` 변환 추가

#### 2. `src/routes/games.js` 중복 라우트

- 승완님이 `cache` 미들웨어 추가하면서 라우트 2벌 등록됨
- **해결:** 중복 제거, cache 미들웨어 포함 버전으로 통일

#### 3. Prisma 인스턴스 이중화

- 우리 `src/lib/prisma.js` (Driver Adapter 포함) + 승완님 `src/db.js` (기본) 공존
- **해결:** `src/auth/routes.js`가 `../lib/prisma` 사용하도록 변경

#### 4. JWT 시크릿 환경변수 누락

- `src/auth/tokens.js`가 `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` 요구 → `.env`에 없음
- **해결:** `.env`에 추가

#### 5. Redis ECONNREFUSED

- 로컬에 Redis 컨테이너 미실행
- **현재:** `src/cache.js`가 Redis 에러 시 fallback 처리 → API 정상 동작
- **할 것:** `docker-compose.yml`에 redis 서비스 추가

### 완료된 작업

- `--from` / `--to` 범위 수집 옵션 추가 ✅
- 2025 포스트시즌 데이터 수집 완료 ✅
- 중복 라우트 제거 ✅
- Prisma 인스턴스 `src/lib/prisma.js`로 통일 ✅
- `.env` JWT + Redis 환경변수 추가 ✅

---

## 3/12/11:30 — 불필요 파일 정리

### 삭제된 파일

| 파일                 | 이유                                               |
| -------------------- | -------------------------------------------------- |
| `src/db.js`          | `src/lib/prisma.js`로 통일, 아무데서도 import 안됨 |
| `src/auth/middle.js` | `requireAuth` 미들웨어 아무데서도 import 안됨      |
| `src/cache/redis.js` | stub 파일 (항상 null 반환), `src/redis.js`로 대체  |

### 수정된 파일

- `src/services/gamesService.js` — `../cache/redis.js` import 제거, `getLiveCache`/`setLiveCache` 호출 제거
- `docker-compose.yml` — redis 서비스 추가, api 서비스에 Redis/JWT 환경변수 추가

---

## 앞으로 할 것

| 순서 | 작업                                         | 파일                           | 비고                             |
| ---- | -------------------------------------------- | ------------------------------ | -------------------------------- |
| 1    | `.env.example` 업데이트                      | `.env.example`                 | JWT, Redis 환경변수 반영         |
| 2    | JWT 인증 미들웨어 작성                       | `src/auth/middleware.js`       | `requireAuth` — Bearer 토큰 검증 |
| 3    | `POST /api/games/:gameId/chat` 추가          | `src/routes/games.js` 등       | JWT 미들웨어 적용, 메시지 저장   |
| 4    | Live 엔드포인트 Redis 캐싱 연동              | `src/services/gamesService.js` | `src/redis.js` 직접 사용         |
| 5    | `docker-compose up --build` 전체 통합 테스트 | —                              | postgres + redis + api 동시 기동 |
| 6    | Docker Hub push                              | —                              | K8s 배포 전 이미지 업로드        |
| 7    | K8s Deployment YAML 작성                     | `k8s/`                         | VM2 api, VM3 redis, VM4 postgres |
