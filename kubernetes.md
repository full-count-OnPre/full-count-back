# Kubernetes 플랫폼 엔지니어링 계획

# 추후 내가 한 작업 및 결과물을 하나하나 캡쳐해서 발표할 예정.

## 클러스터 구성 (실제)

| 노드명       | IP             | 역할          | 용도                                 |
| ------------ | -------------- | ------------- | ------------------------------------ |
| k8s-cp       | 192.168.80.210 | Control Plane | API Server, etcd, Scheduler, Ingress |
| worker-app   | 192.168.80.220 | Worker        | app (frontend, api)                  |
| worker-data  | 192.168.80.230 | Worker        | data (redis, collector)              |
| worker-infra | 192.168.80.240 | Worker        | db (postgresql) + monitoring         |

## Namespace 설계

| Namespace    | 서비스                    | 노드         |
| ------------ | ------------------------- | ------------ |
| `app`        | frontend, api             | worker-app   |
| `data`       | redis, collector          | worker-data  |
| `db`         | postgresql                | worker-infra |
| `monitoring` | prometheus, grafana, loki | worker-infra |

## 팀원별 K8s 작업 분담

| 팀원   | 담당                                                                               |
| ------ | ---------------------------------------------------------------------------------- |
| 이재민 | API 배포, Multi-stage Dockerfile, Metrics Server, HPA, NGINX Ingress, Helm, ArgoCD |
| 김태경 | PostgreSQL StatefulSet, Redis, NFS/StorageClass, Collector CronJob, DB 백업        |
| 심동섭 | Prometheus, Grafana, Loki, 부하 테스트                                             |
| 김승완 | MetalLB, BGP, NAT/Bastion, SSL(cert-manager)                                       |

---

## 일정 (3/13 ~ 3/19, 주말 제외, 하루 6시간)

---

### 3/13 (Day 1) — 클러스터 확인 + Namespace + Node Label + Secret/ConfigMap ✅

#### 완료된 작업

**클러스터 상태 확인 ✅**

- 노드 4개 Ready 확인 (k8s-cp, worker-app, worker-data, worker-infra)
- K8s v1.34.3, containerd 1.7.28

**Namespace 생성 ✅**

```bash
kubectl create namespace app
kubectl create namespace data
kubectl create namespace db
kubectl create namespace monitoring
```

**Node Label 설정 ✅**

```bash
kubectl label node worker-app role=app
kubectl label node worker-data role=data
kubectl label node worker-infra role=infra
```

**K8s Secret 생성 ✅**

```bash
kubectl create secret generic fullcount-secrets \
  --from-literal=JWT_ACCESS_SECRET=fullcount_access_secret_dev \
  --from-literal=JWT_REFRESH_SECRET=fullcount_refresh_secret_dev \
  --from-literal=POSTGRES_PASSWORD=password \
  -n app

kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_PASSWORD=password \
  -n db
```

**ConfigMap 생성 ✅**

```bash
kubectl create configmap fullcount-config \
  --from-literal=PORT=3000 \
  --from-literal=REDIS_HOST=redis.data.svc.cluster.local \
  --from-literal=REDIS_PORT=6379 \
  -n app
```

---

### 3/16 (Day 2) — Multi-stage Dockerfile + Docker Hub push + API 배포

#### 목표: API 컨테이너 K8s 배포

**[2h] Multi-stage Dockerfile 작성**

- 기존 Dockerfile을 Multi-stage build로 전환 (builder → runtime)
- 이미지 경량화 및 불필요한 devDependencies 제외
- Prisma client generate 포함

**[1h] Docker Hub 이미지 push**

```bash
docker build -t <dockerhub-id>/fullcount-api:latest .
docker push <dockerhub-id>/fullcount-api:latest
```

**[1h] DB 마이그레이션 Job**

- `prisma migrate deploy` 실행하는 K8s Job YAML 작성
- YAML 작성 위치: `/home/admin1/ljm/app/`

**[2h] API Deployment + Service 배포**

- YAML 작성 위치: `/home/admin1/ljm/app/`
- Secret/ConfigMap 환경변수 주입
- Liveness/Readiness Probe 설정
- nodeSelector: `role=app`
- 완료 기준: `GET /api/games` 응답 확인

---

### 3/17 (Day 3) — Metrics Server + HPA + NGINX Ingress

#### 목표: 트래픽 제어 + 자동 확장

> ⚠️ PostgreSQL/Redis가 아직 배포 안 된 경우 API Pod는 CrashLoopBackOff 가능 → 김태경과 일정 조율 필요

**[1h] Metrics Server 설치**

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

- 온프레미스 환경: `--kubelet-insecure-tls` 옵션 필요
- 확인: `kubectl top nodes`

**[2h] HPA 설정**

- api Deployment 대상
- CPU 70% 초과 시 스케일 아웃
- minReplicas: 1 / maxReplicas: 5
- YAML 작성 위치: `/home/admin1/ljm/app/api-hpa.yaml`

**[2h] NGINX Ingress Controller 설치**

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/baremetal/deploy.yaml
```

**[1h] Ingress 라우팅 설정**

- `/api/*` → api Service
- `/*` → frontend Service
- YAML 작성 위치: `/home/admin1/ljm/app/ingress.yaml`

---

### 3/18 (Day 4) — Helm Chart 패키징 + ArgoCD

#### 목표: 선언적 배포 자동화

**[2h] Helm Chart 패키징**

- API Deployment/Service/HPA/Ingress YAML → Helm 템플릿화
- 환경별 values 분리 (dev/prod)

**[3h] ArgoCD 설치 및 설정**

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

- GitHub 레포 `k8s/` 디렉토리 연동
- 자동 Sync 설정

**[1h] k8s/ 디렉토리 생성 및 YAML 정리**

- 개인 디렉토리(`/home/admin1/ljm/`)에서 검증된 YAML을 레포 `k8s/`에 복사
- git push → ArgoCD Sync 확인

---

### 3/19 (Day 5) — 통합 검증 + 버퍼

#### 목표: 전체 파이프라인 동작 확인

**[2h] 전체 흐름 통합 검증**

- API → PostgreSQL → Redis 연결 확인
- Ingress 외부 접속 확인
- HPA 동작 확인 (부하 테스트는 심동섭 담당)
- ArgoCD 자동 Sync 확인

**[4h] 버퍼 / 미완료 작업 마무리**

- 예비 시간 (장애 대응, 팀원 협업)

---

## 전체 일정 요약

| 날짜 | 작업                                                                      | 완료 기준                                |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------- |
| 3/13 | 클러스터 확인, Namespace, Node Label, Secret/ConfigMap ✅                 | 전부 완료                                |
| 3/16 | Multi-stage Dockerfile, Docker Hub push, API Deployment, DB Migration Job | API Pod Running + `/api/games` 응답 확인 |
| 3/17 | Metrics Server, HPA, NGINX Ingress                                        | 외부 접속 + HPA 동작 확인                |
| 3/18 | Helm Chart, ArgoCD, k8s/ 디렉토리 정리                                    | ArgoCD 자동 Sync 확인                    |
| 3/19 | 통합 검증 + 버퍼                                                          | 전체 파이프라인 동작 확인                |

---

## 팀원 YAML 검토 결과

### 김태경 파일 현황

| 파일                                     | 상태                                            |
| ---------------------------------------- | ----------------------------------------------- |
| `collector/collector-configmap.yaml`     | namespace 없음                                  |
| `collector/collector-cronjob.yaml`       | namespace 없음                                  |
| `postgresql/postgresql-pvc.yaml`         | namespace 없음                                  |
| `postgresql/postgresql-secret.yaml`      | namespace 없음 (DB 접속 정보 확정됨)            |
| `postgresql/postgresql-service.yaml`     | **⚠️ 버그: 내용이 Redis Service로 잘못 작성됨** |
| `postgresql/postgresql-statefulset.yaml` | namespace 없음                                  |
| `redis/redis-deployment.yaml`            | namespace 없음                                  |
| `redis/redis-service.yaml`               | namespace 없음                                  |

### 김태경 파일에서 확인된 DB 접속 정보 (백엔드에서 사용)

```
POSTGRES_USER: fullcount_user
POSTGRES_PASSWORD: fullcount_pass
POSTGRES_DB: fullcount
PostgreSQL 서비스명: postgresql-service
Redis 서비스명: redis-service
```

### 발견된 문제점 및 조치

| #   | 문제                                                                   | 조치                                                    |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | `postgresql-service.yaml` 내용이 Redis Service로 잘못 작성됨           | 김태경에게 수정 요청                                    |
| 2   | 모든 김태경 파일에 namespace 없음 (default로 배포됨)                   | 김태경에게 namespace 추가 요청 (`db`, `data`)           |
| 3   | `postgres-secret`(password)과 `postgresql-secret`(fullcount_pass) 충돌 | `postgres-secret` 삭제 후 `postgresql-secret` 기준 통일 |
| 4   | DATABASE_URL에 namespace 없어 크로스 네임스페이스 접근 불가            | `postgresql-service.db.svc.cluster.local`로 수정        |
| 5   | REDIS_HOST 불일치 (내 ConfigMap vs 김태경 파일)                        | `redis-service.data.svc.cluster.local`로 통일           |

### 이재민 조치 목록

- [ ] 김태경에게 연락: `postgresql-service.yaml` 수정 + 모든 파일 namespace 추가
- [ ] `postgres-secret` 삭제 → `postgresql-secret` 기준으로 통일
- [ ] `fullcount-secrets` 업데이트 (POSTGRES_PASSWORD → `fullcount_pass`, DATABASE_URL 추가)
- [ ] `fullcount-config` 업데이트 (REDIS_HOST → `redis-service.data.svc.cluster.local`)
- [ ] 백엔드 YAML 작성 및 적용 (김태경 namespace 확정 후)

---

## 나중에 수정할 것(노션)

- **포트폴리오 주요역할/담당업무 문구 수정 필요**
  - "CNI 최적화 (Calico)" → 직접 설치한 게 아니라 기존 클러스터에 이미 설치된 상태였음
  - "Kubeadm 멀티 노드 클러스터 구성" → 직접 구성한 게 아니라 기존 이미지 사용
  - 실제로 수행한 작업 기준으로 문구 재작성 필요

---

## YAML 작업 디렉토리 구조

```
/home/admin1/
├── ksw/    ← 김승완
├── ktk/    ← 김태경
├── sds/    ← 심동섭
└── ljm/    ← 이재민 작업 공간
    └── backend/
        ├── 01-configmap.yaml
        ├── 02-deployment.yaml
        ├── 03-service.yaml
        ├── 04-ingress.yaml
        ├── 05-hpa.yaml
        └── 06-migrate-job.yaml

레포 k8s/           ← 검증 완료 후 복사 (3/18, ArgoCD 연동용)
```

> PostgreSQL/Redis/Collector/Monitoring YAML은 각 담당자(김태경, 심동섭) 작업
