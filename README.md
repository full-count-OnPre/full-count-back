# ⚾ Full Count — Backend API Server

> **온프레미스 Kubernetes 기반 MLB 실시간 문자 중계 및 응원 플랫폼 — 백엔드**  
> Node.js + Express + Prisma + PostgreSQL + Redis로 구성된 REST API 서버입니다.

[![Node.js](https://img.shields.io/badge/Node.js-Runtime-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Deployed-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)

---

## 📌 프로젝트 개요

**Full Count**는 MLB 실시간 경기 데이터를 제공하고, 사용자 간 응원 댓글 기능을 제공하는 웹 플랫폼입니다.  
이 레포지토리는 백엔드 API 서버로, 인증/경기 데이터/채팅 기능을 담당합니다.

| 항목 | 내용 |
|------|------|
| **프레임워크** | Express.js 5 (Node.js) |
| **ORM** | Prisma |
| **데이터베이스** | PostgreSQL (StatefulSet, NFS PVC) |
| **캐시** | Redis (Master-Replica 구조) |
| **배포 환경** | 온프레미스 Kubernetes (kubeadm) |
| **관련 레포** | [Kubernetes Manifests](https://github.com/full-count-OnPre/full-count-k8s) · [프론트엔드](https://github.com/full-count-OnPre/full-count-front) |

---

## 🏗 시스템 아키텍처

```
[ Client ]
    │ HTTP/REST
    ▼
[ NGINX Ingress ]  /api → 
    │
    ▼
[ NestJS API Server ]  (Kubernetes Deployment)
    ├── 인증 (JWT)
    ├── 경기 데이터 조회 (Redis Cache → PostgreSQL)
    └── 댓글/응원 메시지 처리
         │
    ┌────┴────┐
    ▼         ▼
[ Redis ]  [ PostgreSQL ]
(Cache)    (StatefulSet + NFS PVC)
    ▲
    │
[ MLB Collector ]  (CronJob — 주기적 데이터 수집)
```

---

## 📁 디렉터리 구조

```
full-count-back/
├── src/
│   ├── auth/           # JWT 인증, Guard
│   ├── games/          # 경기 데이터 API
│   ├── messages/       # 댓글/응원 메시지
│   ├── users/          # 사용자 관리
│   └── common/         # 공통 유틸, 인터셉터
├── prisma/
│   └── schema.prisma   # DB 스키마 정의
├── Dockerfile          # API 서버 컨테이너 이미지
├── Dockerfile.collector # MLB 데이터 수집기 이미지
├── docker-compose.yml  # 로컬 개발 환경
└── .env.example        # 환경변수 예시
```

---

## ⚡ 주요 기능

### 1. MLB 경기 데이터 API
- MLB 공식 API에서 실시간 경기 데이터 수집 (CronJob, `*/5 * * * *`)
- 경기 일정, 실시간 스코어, 선수 정보 제공

### 2. Redis Look-aside 캐시 전략
```
요청 → Redis 조회
         ├── Cache Hit  → 즉시 응답
         └── Cache Miss → PostgreSQL 조회 → Redis 저장 → 응답
```
- TTL 설정으로 자동 만료 처리
- Redis Master-Replica 구조로 읽기 부하 분산

### 3. JWT 인증
- Access Token 기반 사용자 인증
- Guard를 통한 엔드포인트 보호

### 4. 실시간 응원 댓글
- 경기별 댓글 작성/조회
- WebSocket(Socket.io) 기반 실시간 중계 메시지

---

## 🗄 데이터베이스 스키마

```prisma
model Game {
  id        String   @id
  homeTeam  String
  awayTeam  String
  status    String
  startTime DateTime
  messages  Message[]
}

model Message {
  id        String   @id @default(uuid())
  content   String
  gameId    String
  userId    String
  createdAt DateTime @default(now())
  game      Game     @relation(fields: [gameId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}

model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  messages  Message[]
}
```

---

## 🐳 Kubernetes 배포 구조

이 백엔드는 온프레미스 Kubernetes 환경에 배포되며, GitOps 방식으로 관리됩니다.

```
GitHub Actions (CI)
    ├── Docker 이미지 빌드 & Push
    └── full-count-k8s 레포 Manifest 자동 업데이트
              │
              ▼
         ArgoCD (CD)
              └── Kubernetes 클러스터 자동 배포
```

**Kubernetes 리소스:**
- `Deployment` — API 서버 (minReplicas: 2, HPA 적용)
- `HPA` — CPU 60% 초과 시 자동 스케일 아웃 (max: 3)
- `ConfigMap` — 환경설정 분리
- `Secret` — DB 접속정보, JWT Secret 보안 관리
- `Service` — ClusterIP (내부 통신)

> 📎 Kubernetes Manifest: [full-count-k8s/ljm](https://github.com/full-count-OnPre/full-count-k8s/tree/main/ljm)

---

## 🚀 로컬 실행 방법

```bash
# 1. 레포지토리 클론
git clone https://github.com/full-count-OnPre/full-count-back.git
cd full-count-back

# 2. 환경변수 설정
cp .env.example .env
# .env 파일 수정

# 3. Docker Compose로 실행 (PostgreSQL + Redis 포함)
docker-compose up -d

# 4. DB 마이그레이션
npx prisma migrate dev

# 5. 서버 실행
npm run start:dev
```

---

## 🔧 트러블슈팅 기록

| 문제 | 원인 | 해결 |
|------|------|------|
| API Pod CrashLoopBackOff | readinessProbe `/api/games` 체크가 DB/Redis 의존성 장애에 영향받음 | `/health` 엔드포인트로 변경 |
| Redis 장애 시 서비스 전체 중단 | 캐시 계층 단일 장애점 | Look-aside 전략 + Redis 장애 시 PostgreSQL Fallback 구현 |
| Pod 재시작 시 DB 데이터 유실 | EmptyDir 사용으로 영속성 없음 | PostgreSQL StatefulSet + NFS PVC로 전환 |

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| **Runtime** | Node.js |
| **Framework** | Express.js 5 |
| **ORM** | Prisma |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 (Master-Replica) |
| **Auth** | JWT (JSON Web Token) |
| **Container** | Docker |
| **Orchestration** | Kubernetes (온프레미스) |
| **CI/CD** | GitHub Actions + ArgoCD |
