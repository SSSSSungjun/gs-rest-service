# Testing strategy and multi-user load checks

## Playwright를 유지하는 이유

Playwright는 부하 발생기가 아니라 실제 브라우저 경계를 검증하는 회귀 테스트다. 이 프로젝트에서는 서로 다른 BrowserContext가 각각 독립 익명 쿠키를 받고, 작성자 전용 수정·삭제 UI가 다른 사용자에게 노출되지 않으며, 댓글 왕복·검색 강조·페이지네이션·모바일 overflow가 함께 동작하는지 확인한다.

API 단위 테스트만으로는 쿠키 저장, React 상태 반영, 브라우저 히스토리, 접근 가능한 버튼 이름과 반응형 레이아웃을 한 번에 검증할 수 없다. 따라서 Playwright는 k6와 역할이 겹치지 않는다.

포트폴리오에서는 다음처럼 설명할 수 있다.

> 독립 BrowserContext 기반의 익명 사용자 시나리오를 구성해 세션 소유권, 댓글 왕복, 검색 및 반응형 UI를 실제 브라우저에서 회귀 검증했다. 테스트 서버와 개발 서버를 격리해 반복 실행 시 개발 데이터를 오염시키지 않았다.

## k6가 검증하는 범위

`load-tests/k6/community-load.js`는 게시판 트래픽을 다음 비율로 섞는다.

- 목록 조회 45%
- 상세 조회와 조회수 증가 20%
- 인기 게시글 댓글 작성 15%
- 같은 게시글 좋아요 토글 10%
- 같은 투표 참여 10%

각 VU는 독립 cookie jar를 사용하므로 익명 세션도 분리된다. 기본 임계값은 실패율 1% 미만, check 성공률 99% 초과, p95 1초 미만이다. 결과는 실행 환경의 CPU와 DB 조건에 따라 달라지므로 측정값 없이 `200명을 안정적으로 처리했다`고 쓰지 않는다.

## Codespaces 빠른 실행

개발 데이터가 들어 있는 8080 서버에는 부하를 보내지 않는다. 첫 번째 터미널에서 일회성 H2 서버를 실행한다.

```bash
cd complete
./gradlew bootRun --args='--spring.profiles.active=e2e --server.port=18080'
```

두 번째 터미널은 저장소 루트에서 실행한다.

```bash
docker run --rm --network host \
  -v "$PWD/load-tests/k6:/scripts:ro" \
  -e BASE_URL=http://127.0.0.1:18080 \
  -e VUS=50 \
  -e DURATION=1m \
  -e MAX_P95_MS=1500 \
  grafana/k6:1.7.1 run /scripts/community-load.js
```

Codespaces 테스트는 서버와 부하 발생기가 같은 VM의 CPU를 공유한다. 동시성 오류와 느린 endpoint를 찾는 용도이며, 운영 용량 산정 수치로 사용하지 않는다. Docker daemon을 사용할 수 없는 Codespace라면 Actions 수동 실행을 사용한다.

## GitHub Actions 재현 실행

1. 저장소 `Actions`에서 `Multi-user load test`를 선택한다.
2. `Run workflow`에서 VU 50, 100, 200 중 하나와 지속 시간을 선택한다.
3. 먼저 50/30s로 확인한 뒤 100/1m, 마지막에 200/3m 순서로 올린다.
4. 실행 artifact의 `summary.json`과 `load-test-backend.log`를 확인한다.

Actions는 PostgreSQL 16과 Spring API를 새로 띄우고 k6 실행 후 다음 정합성을 SQL로 검사한다.

- 같은 세션의 게시글 좋아요 중복 없음
- 같은 세션의 투표 중복 없음
- 존재하지 않는 게시글을 참조하는 댓글 없음

## 결과 기록 형식

포트폴리오에는 실행 환경, VU, 지속 시간, 요청 수, p95, 오류율을 함께 적는다.

```text
GitHub-hosted runner / PostgreSQL 16 / 100 VU / 1분
총 요청: ... / p95: ...ms / 오류율: ...%
좋아요·투표 중복 및 고아 댓글: 0건
```

임계값 실패는 숨기지 않고 병목 endpoint, DB lock 대기, connection pool 또는 애플리케이션 thread 수를 확인한 뒤 다음 실행과 비교한다.
