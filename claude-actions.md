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
