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

- **RBAC + 팀원별 네임스페이스 권한 분리 (시간 여유 시 진행)**
  - 현재는 팀원 4명 모두 `admin1` 공유 계정 사용
  - 추후 네트워크 정비 후 Tailscale로 각 유저가 개별 접속하게 되면
  - ServiceAccount + Role + RoleBinding으로 네임스페이스별 권한 분리 적용
  - 예: 이재민 → `app` namespace 권한, 김태경 → `db`/`data` namespace 권한

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

---

## 현재 상태 정리 (3/13 16:22)

### ✅ 완료

- Namespace 4개 생성 (app, data, db, monitoring)
- Node Label 설정 (role=app/data/infra)
- Secret 생성 (fullcount-secrets: JWT x2 + DATABASE_URL)
- ConfigMap 생성 (fullcount-config: PORT, REDIS_HOST, REDIS_PORT)
- Multi-stage Dockerfile 작성 완료 (API + Collector)
- Docker Hub push 완료 (javor10/fullcount-api:latest, javor10/fullcount-collector:latest)
- 백엔드 YAML 파일 작성 완료 (configmap, deployment, service, ingress, hpa, migrate-job)
- GitHub app/backend/ 디렉토리에 YAML 업로드 완료

### 🔲 미완료

- ~~StorageClass 생성~~ ✅ (nfs-client, default)
- kubectl apply 미실행 (configmap, service, deployment)
- DB Migration Job 미실행

### 📋 앞으로 해야 할 것 (순서)

1. ~~**StorageClass 생성**~~ ✅
2. **김태경 작업 완료 대기** (PostgreSQL, Redis Pod Running 확인)
3. **kubectl apply** (configmap → service → deployment)
4. **migrate-job 실행** (prisma migrate deploy)
5. **Metrics Server 설치**
6. **HPA 적용** (hpa.yaml)
7. **NGINX Ingress Controller 설치** (Helm)
8. **Ingress 적용** (ingress.yaml)
9. **Helm Chart 패키징**
10. **ArgoCD 설치 및 연동**
11. **k8s/ 디렉토리 정리 + 최종 검증**

---

## StorageClass 작업 계획 (3/13 16:27)

### 왜 해야 하나?

김태경이 PostgreSQL PVC를 만들 때 `storageClassName`을 지정해야 함.
StorageClass가 없으면 PVC가 `Pending` 상태로 멈추고 PostgreSQL Pod가 뜨지 않음.
StorageClass는 클러스터 레벨 리소스라 플랫폼 엔지니어(이재민) 담당.

### 방식: NFS + nfs-subdir-external-provisioner

온프레미스 환경에서 동적 프로비저닝을 하려면 NFS 서버 + Provisioner가 필요.

```
NFS 서버 (worker-infra 노드)
    ↓
nfs-subdir-external-provisioner (Pod)
    ↓
StorageClass (nfs-client)
    ↓
PVC 생성 시 자동으로 PV 프로비저닝
```

### 작업 순서

**1단계: NFS 서버 확인 (worker-infra 노드에서)**

```bash
# NFS 서버 설치 여부 확인
showmount -e 192.168.80.240
```

**2단계: nfs-subdir-external-provisioner 설치 (Helm)**

```bash
helm repo add nfs-subdir-external-provisioner \
  https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/

helm install nfs-provisioner \
  nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --set nfs.server=192.168.80.240 \
  --set nfs.path=/srv/nfs \
  --set storageClass.name=nfs-client \
  --set storageClass.defaultClass=true
```

**3단계: StorageClass 확인**

```bash
kubectl get storageclass
```

> ⚠️ NFS 서버 IP와 공유 경로(`/srv/nfs`)는 실제 서버 설정에 따라 다를 수 있음.
> worker-infra에서 `showmount -e localhost`로 경로 확인 후 적용.

---

## 3/16 오전 작업 기록 (10:02 기준)

### ✅ 완료된 작업

**Secret 업데이트**

- 기존 `fullcount-secrets` 삭제 후 재생성
- `POSTGRES_PASSWORD` 제거, `DATABASE_URL` 추가 (김태경 DB 접속 정보 기준)
- `DATABASE_URL`: `postgresql://fullcount_user:fullcount_pass@postgresql-service.db.svc.cluster.local:5432/fullcount`

**Docker Hub 이미지 push**

- `javor10/fullcount-api:latest` push 완료
- deployment.yaml, migrate-job.yaml의 `PLACEHOLDER_API_IMAGE` → `javor10/fullcount-api:latest` 교체
- GitHub app/backend/ 반영 완료

**StorageClass 세팅 (Longhorn)**

- NFS 방식 → Longhorn으로 변경 (RWX 불안정 이슈)
- worker-infra에 NFS 서버 설치 후 showmount 확인까지는 완료했으나 Longhorn으로 전환
- Longhorn Helm 설치 완료
- StorageClass `longhorn (default)` 생성 확인

---

### 🔧 트러블슈팅

| 이슈                                          | 원인                                  | 해결                                             |
| --------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| NFS RWX 불안정                                | on-premises 환경 NFS 설정 문제        | Longhorn으로 전환                                |
| Longhorn Pod ImagePullBackOff                 | worker-infra IPv6 네트워크 문제       | IPv6 비활성화 후 재시도                          |
| Longhorn 재설치 실패 (`cannot re-use a name`) | namespace 삭제했으나 Helm secret 잔존 | `kubectl delete secret` 후 `helm upgrade`로 해결 |
| instance-manager ContainerCreating 지연       | worker-infra 이미지 pull 속도 느림    | 대기 후 정상 Running 확인                        |
| nfs-provisioner app namespace에 설치됨        | Helm install 시 namespace 미지정      | Longhorn 전환으로 nfs-provisioner 제거           |

---

### 📋 현재 상태

#### ✅ 완료

- Namespace 4개 (app, data, db, monitoring)
- Node Label (role=app/data/infra)
- Secret (fullcount-secrets: JWT x2 + DATABASE_URL)
- ConfigMap (fullcount-config: PORT, REDIS_HOST, REDIS_PORT)
- Docker Hub push (javor10/fullcount-api:latest)
- 백엔드 YAML 파일 작성 + GitHub 업로드
- StorageClass `longhorn (default)` 생성

#### ✅ 완료 (업데이트)

- configmap, service, deployment YAML 적용 완료
- API Pod 2개 `1/1 Running` 정상 동작 확인

#### 🔲 앞으로 해야 할 것 (순서)

1. **migrate-job 실행** — prisma migrate deploy
2. **API 응답 확인** — `GET /api/games` 응답 확인
3. **Metrics Server 설치**
4. **HPA 적용** — hpa.yaml
5. **NGINX Ingress Controller 설치** — Helm
6. **Ingress 적용** — ingress.yaml
7. **Helm Chart 패키징**
8. **ArgoCD 설치 및 연동**
9. **k8s/ 디렉토리 정리 + 최종 검증**

---

## 3/16 오전 작업 기록 (11:46 기준)

### 🔧 트러블슈팅

| 이슈 | 원인 | 해결 |
|------|------|------|
| API Pod Pending (FailedScheduling) | deployment.yaml의 `nodeSelector: role: app`이나 실제 노드 라벨은 `node-role=app` | `kubectl label node worker-app role=app` 등 라벨 추가 |
| API Pod InvalidImageName | deployment.yaml의 image가 `PLACEHOLDER_API_IMAGE` 그대로 | `sed`로 `javor10/fullcount-api:latest`로 교체 후 재적용 |
| API Pod CreateContainerConfigError | deployment.yaml에 `POSTGRES_PASSWORD` Secret 참조 — Secret에 해당 키 없음 | env에서 `POSTGRES_PASSWORD` 제거, `DATABASE_URL` Secret 참조로 교체 |
| Redis ENOTFOUND (`redis.data.svc.cluster.local`) | ConfigMap의 `REDIS_HOST`가 `redis`로 설정됨 — 실제 서비스명은 `redis-service` | ConfigMap 수정: `redis-service.data.svc.cluster.local` |

### 📋 현재 상태 (11:46 기준)

#### ✅ 완료

- Node Label 추가 (`role=app/data/infra`) — nodeSelector 매핑
- deployment.yaml image 교체 (`javor10/fullcount-api:latest`)
- deployment.yaml env 수정 (`DATABASE_URL` Secret 참조)
- ConfigMap `REDIS_HOST` 수정 (`redis-service.data.svc.cluster.local`)
- **API Pod 2개 `1/1 Running` 정상 확인**

#### 🔲 다음 할 일

1. **migrate-job 실행** — `kubectl apply -f migrate-job.yaml -n app`
2. **API 응답 확인** — `kubectl exec`으로 `GET /api/games` 테스트
3. **Metrics Server 설치**
4. **HPA 적용**
5. **NGINX Ingress Controller 설치 (Helm)**
6. **Ingress 적용**
7. **Helm Chart 패키징**
8. **ArgoCD 설치 및 연동**
9. **최종 검증**

---

## 3/16 오후 작업 기록 (17:40 기준)

### ✅ 완료된 작업

**프론트엔드 YAML 작성 및 배포**

- `~/ljm/frontend/` 디렉토리 생성
- configmap.yaml, deployment.yaml, service.yaml 작성
  - `PLACEHOLDER_FRONTEND_IMAGE` → `shimdongseup/full-count-front:tagname` 교체
  - `nodeSelector: role: app` 추가
  - `VITE_DEMO_CHAT_GAME_ID` 임시값 `"1"` 설정 (데모 시연 시 실제 game ID로 교체 필요)
- Frontend Pod 2개 `1/1 Running` 확인

**Ingress 통합 관리**

- `sds/app/frontend/ingress.yaml`, `ljm/backend/ingress.yaml` 개별 파일 제거
- `~/ljm/ingress.yaml` 단일 파일로 통합 (프론트 + 백엔드 경로 통합 라우팅)
- 팀원 TLS 설정 반영: `fullcount-tls` Secret + `www.fullcount.com` 호스트 적용

**NGINX Ingress Controller 설치**

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/baremetal/deploy.yaml
```

- NodePort: HTTP `32215`, HTTPS `30357`
- Ingress Controller Pod `1/1 Running` 확인 (worker-infra 노드에 배포됨)

**Service 배포**

- `~/ljm/backend/service.yaml` 적용 — `full-count-api` ClusterIP (port 3000)
- `~/ljm/frontend/service.yaml` 적용 — `full-count-front` ClusterIP (port 80)

**Ingress 적용**

```bash
kubectl apply -f ~/ljm/ingress.yaml
```

- `/api` → `full-count-api:3000`
- `/` → `full-count-front:80`
- TLS: `fullcount-tls` Secret, host: `www.fullcount.com`

**migrate-job 실행 (DB 스키마 생성)**

- `prisma migrate deploy` 실패 (migration 파일 없음) → `prisma db push`로 변경
- `🚀 Your database is now in sync with your Prisma schema` 확인

**Tailscale serve 설정 (팀원 접근)**

```bash
sudo tailscale serve --bg --http 80 http://localhost:8080
```

- `http://k8s-cp.tail8b71d0.ts.net` 으로 Tailscale 팀원 접근 가능
- 앱 기능 정상 동작 확인

---

### 🔧 트러블슈팅

| 이슈 | 원인 | 해결 |
|------|------|------|
| Ingress apply 실패 (`webhook not found`) | NGINX Ingress Controller 미설치 | Controller 설치 후 재적용 |
| Ingress Controller Pod `ContainerCreating` 지연 | `ingress-nginx-admission` Secret 생성 지연 + 이미지 pull 시간 소요 | 대기 후 정상 Running 확인 |
| `migrate-job` — `No migration found` | 이미지에 prisma migration 파일 없음 | `prisma migrate deploy` → `prisma db push`로 변경 |
| collector Pod 실패 (`Team 테이블 없음`) | DB 스키마 미생성 상태에서 collector 실행 | migrate-job으로 DB 스키마 생성 후 collector 재실행 |
| Tailscale IP(100.111.227.53)로 접근 불가 | Tailscale이 자체 IP 트래픽을 userspace에서 처리 — iptables/socat 우회 불가 | `tailscale serve --bg --http 80 http://localhost:8080`으로 해결 |
| `socat` bind 실패 (`Cannot assign requested address`) | Tailscale IP는 커널 소켓 직접 바인딩 불가 | socat 방식 포기 → tailscale serve 사용 |
| `tailscale serve` — `Access denied` | sudo 없이 실행 | `sudo tailscale serve ...` 사용 |

---

### 📋 현재 상태 (17:40 기준)

#### ✅ 완료

- Frontend Pod 2개 `1/1 Running`
- Backend(API) Pod 2개 `1/1 Running`
- Service 배포 완료 (frontend, backend)
- NGINX Ingress Controller 설치 및 Ingress 적용
- DB 스키마 생성 (prisma db push)
- TLS Ingress 설정 (`www.fullcount.com`, `fullcount-tls`)
- Tailscale serve로 팀원 접근 및 앱 기능 동작 확인

#### 🔲 앞으로 해야 할 것 (순서)

1. **MetalLB 연동** — 승완님 세팅 기반, 외부 사용자 접근 가능하게
2. **Metrics Server 설치**
3. **HPA 적용** — hpa.yaml
4. **ArgoCD 설치 및 연동**
5. **k8s/ 디렉토리 정리 + 최종 검증**

#### ℹ️ 참고사항

- `VITE_DEMO_CHAT_GAME_ID`: 데모 시연 시 실제 game ID 확인 후 configmap 수정 + `kubectl rollout restart deployment/full-count-front -n app` 필요
- Tailscale serve는 재부팅 후에도 자동 유지됨 (백그라운드 데몬)
- NodePort: HTTP `32215`, HTTPS `30357` (내부 접근용)
