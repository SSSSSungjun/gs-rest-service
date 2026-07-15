# Docker Compose deployment package

이 패키지는 단일 Linux 서버 또는 Codespaces에서 PostgreSQL 16, Spring Boot, React/nginx를 같은 Compose 프로젝트로 실행하는 기준 구성이다. PostgreSQL과 백엔드 포트는 호스트에 공개하지 않고 nginx의 `APP_PORT`만 공개한다.

## 구성

- `db`: PostgreSQL 16, Flyway V1 schema, named volume, health check
- `backend`: Java 17 non-root runtime, `postgres,prod` profiles, Actuator health check
- `frontend`: React production build와 nginx reverse proxy
- `postgres_data`: DB 영속 데이터
- `post_images`: 게시글 이미지 영속 데이터

nginx는 `/api`와 `/uploads`를 백엔드로 전달하고 SPA fallback을 처리한다. `/api/activity/stream`은 buffering을 끄고 75초 timeout을 사용한다.

## 최초 실행

Docker와 Docker Compose가 준비된 환경에서 실행한다.

```bash
cp .env.example .env
```

`.env`에서 최소한 다음 값을 바꾼다.

```dotenv
POSTGRES_PASSWORD=long-random-password
PUBLIC_ORIGIN=http://localhost:8080
```

그다음 stack을 시작한다.

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
./scripts/compose-smoke.sh
```

기본 주소는 `http://localhost:8080`이다. 다른 포트를 사용하려면 `APP_PORT`를 바꾼다.

## Codespaces

Codespaces는 Docker-in-Docker를 사용할 수 있다. `.env`의 `PUBLIC_ORIGIN`을 forwarded port의 HTTPS URL로 바꾸고 다음 값을 사용한다.

```dotenv
COOKIE_SECURE=true
SECURITY_HSTS_ENABLED=true
```

Ports 탭에서 `APP_PORT`를 private 또는 public으로 연다. Codespace를 중지하면 stack도 중지되므로 상시 운영 서버로 사용하지 않는다.

## 실제 서버

직접 공개되는 서버에서는 TLS termination을 먼저 구성하고 다음 값을 사용한다.

```dotenv
PUBLIC_ORIGIN=https://community.example.com
COOKIE_SECURE=true
SECURITY_HSTS_ENABLED=true
```

현재 nginx container는 HTTP listener만 제공한다. 실제 인증서는 host nginx, load balancer 또는 별도 TLS proxy에서 종료하고 이 Compose의 `APP_PORT`로 전달한다. 백엔드의 8080 포트를 외부에 공개하지 않는다.

nginx는 들어온 `X-Forwarded-For`를 폐기하고 실제 연결 주소로 다시 쓴다. 백엔드는 Compose에서만 `SERVER_FORWARD_HEADERS_STRATEGY=framework`를 사용하므로 rate limit의 IP 식별은 nginx를 신뢰 경계로 삼는다.

## 운영 명령

```bash
docker compose ps
docker compose logs -f --tail=200 backend
docker compose logs -f --tail=200 db
docker compose up -d --build
docker compose restart frontend
docker compose down
```

`docker compose down`은 named volume을 보존한다. `docker compose down -v`는 DB와 업로드 데이터를 삭제하므로 운영 환경에서 사용하지 않는다.

## 백업

DB backup 파일은 container 밖에 저장한다.

```bash
mkdir -p backups
docker compose exec -T db pg_dump \
  -U "${POSTGRES_USER:-bamboo}" \
  "${POSTGRES_DB:-bamboo_forest}" \
  > "backups/bamboo-$(date +%Y%m%d-%H%M%S).sql"
```

복구는 빈 DB에서만 리허설한 뒤 수행한다.

```bash
docker compose exec -T db psql \
  -U "${POSTGRES_USER:-bamboo}" \
  "${POSTGRES_DB:-bamboo_forest}" \
  < backups/backup.sql
```

게시글 이미지는 `post_images` volume을 별도로 backup해야 한다.

## 자원 기본값

- backend memory limit 768MB, JVM heap 256~512MB
- PostgreSQL memory limit 512MB, `shared_buffers=128MB`, `max_connections=50`
- frontend/nginx memory limit 128MB
- Hikari pool 10, minimum idle 2
- container log 10MB x 3 files

한 서버에 모두 실행할 때 2GB RAM은 최소선이고 4GB RAM을 권장한다. 실제 사용량을 측정한 뒤 JVM heap, DB pool과 PostgreSQL memory를 조정한다.

## 비밀값과 AI

`.env`는 commit하지 않는다. AI key는 image build argument나 React 환경변수로 넣지 않고 backend container environment로만 전달한다. 실제 운영에서는 shell history에 key를 직접 입력하지 말고 서버 secret file 또는 배포 도구의 secret 기능을 사용한다.

AI 일일 limit은 backend process memory에 있으므로 재시작하면 초기화된다. provider dashboard의 hard quota와 budget alert를 별도로 설정한다.

## CI 검증

`Container smoke test` workflow는 실제 이미지를 build하고 PostgreSQL migration, backend/frontend health, 게시글 생성, 보안 헤더와 SSE proxy를 확인한다. 실패 시 Compose logs를 artifact 대신 Actions log에 출력하고 stack과 volume을 항상 정리한다.
