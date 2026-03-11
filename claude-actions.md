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
