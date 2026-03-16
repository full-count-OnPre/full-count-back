# Full Count 프로젝트 발표 자료 가이드 (이재민)

> PPT 슬라이드 구성 및 발표 내용 참고용

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | Full Count — MLB 실시간 문자중계 및 응원 플랫폼 |
| 기간 | 2026-03-10 ~ 2026-03-23 |
| 인원 | 4명 |
| 인프라 환경 | 온프레미스 Kubernetes (Kubeadm 기반 멀티노드 클러스터) |
| 이재민 역할 | Kubernetes 플랫폼 엔지니어 + 백엔드 개발 |

---

## 2. 물리적 구조 (Physical Architecture)

> PPT 슬라이드: 노드 구성도

```
┌─────────────────────────────────────────────────────────────────┐
│                    온프레미스 클러스터 (Tailscale 연결)              │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │    k8s-cp        │     │   worker-app      │                  │
│  │ 192.168.80.210   │     │ 192.168.80.220    │                  │
│  │ Control Plane    │────▶│ role=app          │                  │
│  │ API Server       │     │ frontend, API     │                  │
│  │ etcd, Scheduler  │     └──────────────────┘                  │
│  │ NGINX Ingress    │                                            │
│  └──────────────────┘     ┌──────────────────┐                  │
│           │               │   worker-data     │                  │
│           ├──────────────▶│ 192.168.80.230    │                  │
│           │               │ role=data         │                  │
│           │               │ Redis, Collector  │                  │
│           │               └──────────────────┘                  │
│           │                                                      │
│           │               ┌──────────────────┐                  │
│           └──────────────▶│   worker-infra    │                  │
│                           │ 192.168.80.240    │                  │
│                           │ role=infra        │                  │
│                           │ PostgreSQL        │                  │
│                           │ Prometheus/Grafana│                  │
│                           └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

**발표 포인트:**
- Tailscale VPN으로 팀원 4명이 단일 VM에 원격 접속
- 회사 내부망 보안 정책으로 사설 IP 대역이 달라 Tailscale 선택
- Node Label(`role=app/data/infra`)로 Pod 배치 제어

---

## 3. 논리적 구조 (K8s Namespace & Workload)

> PPT 슬라이드: Namespace 설계도

```
┌─────────────────────────────────────────────────────────────────┐
│                      Kubernetes Cluster                          │
│                                                                  │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐  │
│  │       namespace: app         │  │    namespace: data      │  │
│  │  ┌────────────┐              │  │  ┌──────────────────┐   │  │
│  │  │  frontend  │ (Deployment) │  │  │      redis       │   │  │
│  │  └────────────┘              │  │  │  (Deployment)    │   │  │
│  │  ┌────────────┐              │  │  └──────────────────┘   │  │
│  │  │    api     │ (Deployment) │  │  ┌──────────────────┐   │  │
│  │  │  + HPA     │              │  │  │   mlb-collector  │   │  │
│  │  └────────────┘              │  │  │   (CronJob)      │   │  │
│  └──────────────────────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐  │
│  │        namespace: db         │  │  namespace: monitoring  │  │
│  │  ┌────────────┐              │  │  ┌──────────────────┐   │  │
│  │  │ postgresql │(StatefulSet) │  │  │   Prometheus     │   │  │
│  │  └────────────┘              │  │  │   Grafana        │   │  │
│  └──────────────────────────────┘  │  │   Loki           │   │  │
│                                    │  └──────────────────┘   │  │
│                                    └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**발표 포인트:**
- Namespace로 워크로드 논리적 분리 → 팀원별 독립 작업 가능
- Node Label + nodeSelector로 Pod가 지정 노드에만 배포되도록 제어
- Secret/ConfigMap으로 민감정보와 설정값 분리

---

## 4. 웹서비스 흐름도

> PPT 슬라이드: 사용자 요청 처리 흐름

```
사용자 브라우저
      │
      ▼
┌─────────────────┐
│  NGINX Ingress  │  (k8s-cp: 192.168.80.210)
│  /       → frontend
│  /api/*  → API
│  /ws/*   → chat
└─────────────────┘
      │
      ├──── /api/* ─────────────────────────────────▶
      │                                              │
      ▼                                              ▼
┌──────────────┐                         ┌──────────────────┐
│   frontend   │                         │   full-count-api │
│  (React)     │                         │  (Node.js)       │
│  namespace:  │                         │  namespace: app  │
│    app       │                         └──────────────────┘
└──────────────┘                                   │
                                         ┌─────────┴──────────┐
                                         │                     │
                                         ▼                     ▼
                              ┌──────────────────┐  ┌──────────────────┐
                              │   PostgreSQL      │  │     Redis        │
                              │  (StatefulSet)    │  │  (Deployment)    │
                              │  namespace: db    │  │  namespace: data │
                              └──────────────────┘  └──────────────────┘
```

**발표 포인트:**
- NGINX Ingress가 L7 경로 기반 라우팅 수행
- API는 요청에 따라 Redis 캐시 우선 조회 → 없으면 PostgreSQL 조회
- 크로스 네임스페이스 통신은 K8s 내부 DNS로 처리
  (`redis-service.data.svc.cluster.local`)

---

## 5. 3-Tier 구조

> PPT 슬라이드: 애플리케이션 계층 구조

```
┌─────────────────────────────────────────────┐
│          Presentation Tier (프론트엔드)        │
│                                             │
│   React + Sass  │  NGINX (정적 파일 서빙)     │
│   경기 일정 조회, 실시간 중계, 채팅 UI          │
└──────────────────────┬──────────────────────┘
                       │ HTTP/WebSocket
┌──────────────────────▼──────────────────────┐
│           Logic Tier (백엔드 API)              │
│                                             │
│   Node.js + Express.js + Prisma ORM         │
│   REST API (경기 목록, 중계, 채팅)              │
│   JWT 인증 미들웨어                           │
│   Redis 캐시 레이어                           │
└──────────┬──────────────────────┬───────────┘
           │                      │
┌──────────▼──────┐    ┌──────────▼──────────┐
│   Data Tier     │    │    Cache Tier        │
│                 │    │                      │
│  PostgreSQL     │    │  Redis               │
│  (경기, 중계,    │    │  - GET 응답 캐싱      │
│   채팅 영속 저장)│    │  - JWT refresh 저장  │
│                 │    │  - 실시간 경기 캐싱   │
└─────────────────┘    └──────────────────────┘
```

---

## 6. 이재민 담당 작업 요약

### 백엔드 개발

| 작업 | 내용 | 결과물 |
|------|------|--------|
| REST API 개발 | 경기 목록, 중계 데이터 엔드포인트 | `GET /api/games`, `GET /api/games/:id/plays` |
| JWT 인증 | accessToken(15m) + refreshToken(14d) | `POST /api/auth/login`, `POST /api/auth/refresh` |
| Redis 캐싱 | DB 응답 캐싱 + JWT refresh 저장 | `cache:{hash}`, `refresh:{jti}` |
| 애플리케이션 컨테이너화 | Dockerfile 작성 + docker-compose 통합 테스트 | 3 컨테이너 정상 동작 확인 |

### K8s 플랫폼 엔지니어링

| 작업 | 내용 | 결과물 |
|------|------|--------|
| Namespace 설계 및 생성 | app/data/db/monitoring 4개 | `kubectl get namespaces` |
| Node Label 설정 | role=app/data/infra | `kubectl get nodes --show-labels` |
| Secret 생성 | JWT 키 + DATABASE_URL 분리 보관 | `kubectl get secrets -n app` |
| StorageClass 구성 | Longhorn 기반 분산 스토리지 + 동적 프로비저닝 | `kubectl get storageclass` |
| ConfigMap 생성 | 포트, Redis 호스트 등 설정값 | `kubectl get configmap -n app` |
| Multi-stage Dockerfile | builder → runtime 이미지 경량화 | 이미지 용량 비교 |
| API Deployment | Probe, Requests/Limits, RollingUpdate, nodeSelector | `kubectl get pods -n app` |
| HPA | Metrics Server 연동, CPU 60% 기준 스케일 아웃 | `kubectl get hpa -n app` |
| NGINX Ingress | L7 경로 기반 라우팅 (`/api/*`) | `kubectl get ingress -n app` |
| ArgoCD | GitHub 레포 연동, 자동 배포 파이프라인 | ArgoCD UI 화면 |

---

## 7. 발표 시 캡처해야 할 결과물 목록

> 작업 진행하면서 아래 명령어 결과를 캡처해두세요

```bash
# 클러스터 상태
kubectl get nodes -o wide

# Namespace
kubectl get namespaces

# Node Label 확인
kubectl get nodes --show-labels

# Secret/ConfigMap
kubectl get secrets -n app
kubectl get configmap -n app

# StorageClass (Longhorn)
kubectl get storageclass
kubectl get pods -n longhorn-system

# API Pod 동작 확인
kubectl get pods -n app -o wide
kubectl logs -n app deployment/full-count-api

# HPA 동작 확인
kubectl get hpa -n app
kubectl top pods -n app

# Ingress 확인
kubectl get ingress -n app

# ArgoCD Sync 확인
# ArgoCD UI 스크린샷

# 전체 Pod 상태
kubectl get pods -A
```

---

## 8. 발표 슬라이드 구성 제안

| 슬라이드 | 내용 |
|---------|------|
| 1 | 프로젝트 소개 + 역할 |
| 2 | 물리적 아키텍처 (노드 구성도) |
| 3 | 논리적 아키텍처 (Namespace 설계) |
| 4 | 3-Tier 구조 |
| 5 | 웹서비스 흐름도 |
| 6 | 백엔드 개발 결과 (API 엔드포인트, JWT, Redis) |
| 7 | K8s 플랫폼 작업 결과 (캡처 이미지 모음) |
| 8 | Multi-stage Dockerfile + 이미지 경량화 |
| 9 | HPA 동작 시연 or 캡처 |
| 10 | ArgoCD 파이프라인 시연 or 캡처 |
| 11 | 회고 및 배운 점 |

---

## 9. 주의사항 (포트폴리오 문구 수정 필요)

> 발표 및 포트폴리오 작성 시 아래 내용은 사실과 다르므로 수정할 것

| 기존 문구 | 실제 상황 | 수정 방향 |
|---------|---------|---------|
| "Kubeadm 멀티 노드 클러스터 구성" | 기존 이미지 기반 클러스터 활용 | "기존 온프레미스 클러스터 환경에서 플랫폼 엔지니어링 수행" |
| "CNI 최적화 (Calico)" | 이미 설치된 상태에서 참여 | 해당 항목 제거 또는 "Calico 기반 네트워크 정책 이해" |
