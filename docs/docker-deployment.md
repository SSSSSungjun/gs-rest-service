# Docker Compose deployment package

이 패키지는 단일 Linux 서버 또는 Codespaces에서 PostgreSQL 16, Spring Boot, React/nginx를 같은 Compose 프로젝트로 실행하는 기준 구성이다. 백엔드 포트는 호스트에 공개하지 않고 nginx의 `APP_PORT`만 공개한다. PostgreSQL은 관리 도구 연결을 위해 호스트 loopback의 `POSTGRES_HOST_PORT`에만 바인딩하며 외부 인터페이스에는 공개하지 않는다.

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

### PostgreSQL 관리 도구 연결

PostgreSQL은 기본적으로 Codespace 내부의 `127.0.0.1:15432`에만 바인딩된다. VS Code PostgreSQL 확장에서는 host `127.0.0.1`, port `15432`, database `bamboo_forest`, user `bamboo`, password는 `.env`의 `POSTGRES_PASSWORD`를 사용한다. SSL은 로컬 연결에서 비활성화할 수 있다.

다른 host port가 필요하면 `.env`의 `POSTGRES_HOST_PORT`를 바꾼다. 이 포트는 Codespaces Ports 탭에서 Public으로 전환하지 않는다.

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
