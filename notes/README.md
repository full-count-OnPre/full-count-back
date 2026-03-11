# 작업 메모

## 오늘 진행 사항
- `wbc-back/` 코드를 루트 앱에 통합함
- auth 라우터를 루트 앱에 연결함: `/api/auth`
- Prisma `User` 모델을 auth 로직에 맞게 통합함
- `.env.example`에 JWT/Redis/Bcrypt 설정 추가함
- `wbc-back/` 폴더 삭제함
- `prisma/seed.ts`를 사용자 제공 최신 내용으로 복구함
- `prisma/seed.ts`의 `password`를 `passwordHash`로 변경함

## 통합 후 변경 파일
- `src/app.js`
- `src/db.js`
- `src/auth/routes.js`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `package.json`
- `.env.example`

## 남아있는 이슈
- `User` 스키마 변경에 대한 마이그레이션이 아직 없음
- JWT 환경변수 없으면 서버가 바로 크래시

## npm audit 결과
- `npm audit fix` 실행 후에도 12개 취약점(5 moderate, 7 high) 남음
- 주요 원인: `prisma`의 개발 의존성 체인(`hono`, `@hono/node-server`, `lodash`, `tar`)
- 해결하려면 `npm audit fix --force` 필요 (Prisma 및 bcrypt 등 **브레이킹 변경** 발생)

## 다음 할 일(선택)
- 마이그레이션 생성 및 `prisma generate`
- `cache` 미들웨어를 필요한 라우트에 적용
- seed 실행 점검
- `npm audit fix --force` 적용 여부 결정
