# PostgreSQL 및 Flyway 전환 1단계

## 현재 범위

- 기존 MySQL 기본 프로필과 파일형 H2 프로필은 Hibernate `update`를 유지한다.
- `postgres` 프로필만 Flyway를 활성화하고 Hibernate는 `validate`만 수행한다.
- PostgreSQL 16의 빈 DB에는 `V1__initial_schema.sql`이 7개 엔티티 테이블과 인덱스를 생성한다.
- GitHub Actions의 `postgres-schema` job이 실제 PostgreSQL 서비스에서 마이그레이션과 JPA 매핑을 함께 검증한다.

이 단계는 PostgreSQL을 선택 가능한 후보로 검증하는 작업이다. 기존 MySQL/H2 데이터를 자동 변환하거나 운영 DB를 즉시 전환하지 않는다.

## 실행 설정

Spring Boot를 PostgreSQL로 실행할 때 다음 환경변수를 사용한다.

```bash
SPRING_PROFILES_ACTIVE=postgres \
DB_URL=jdbc:postgresql://127.0.0.1:5432/bamboo_forest \
DB_USERNAME=bamboo \
DB_PASSWORD=change-me \
./gradlew bootRun
```

빈 DB에서는 `FLYWAY_BASELINE_ON_MIGRATE`를 설정하지 않는다. Flyway가 V1을 직접 적용해야 한다.

## 기존 스키마 연결 주의

`FLYWAY_BASELINE_ON_MIGRATE=true`는 기존 테이블 구조가 V1과 일치하는지 백업과 수동 비교를 마친 경우에만 사용한다. 이 옵션은 기존 DB를 version 1로 기준 등록하고 V1 실행을 건너뛰므로, 누락된 컬럼이나 제약조건을 자동으로 보완하지 않는다.

## 다음 단계

1. 실제 보존 대상 MySQL/H2 데이터를 덤프해 컬럼 nullability와 중복 세션 투표/좋아요를 점검한다.
2. PostgreSQL import 리허설 후 row count와 주요 API 결과를 비교한다.
3. MySQL/H2도 Flyway 관리 대상으로 옮길지 결정하고 vendor별 migration을 추가한다.
4. 운영 전환 시 DB 계정 최소 권한, 백업/복구, connection pool 한도를 배포 설정에 반영한다.
