# Runtime and deployment readiness

이 문서는 행사성 익명 커뮤니티를 실제 서버에 올린다는 가정에서, 동시성·사이드 이펙트·보안 점검 순서를 기록한다.

## 이번에 보강한 경계

- 게시글 조회수는 엔티티를 읽고 증가시키지 않고 단일 UPDATE 쿼리로 원자 증가한다.
- 게시글 수정·삭제, 댓글 생성은 같은 게시글 행의 비관적 쓰기 잠금을 사용한다.
- 댓글 수정·삭제, 답글 생성, 댓글 좋아요는 대상 댓글 행 잠금을 사용한다.
- 같은 세션의 좋아요 토글은 대상 행 잠금과 DB unique constraint를 함께 사용한다.
- 삭제된 게시글·댓글·투표 선택지는 400 대신 404로 응답한다.
- 상세 진입 또는 댓글 등록 중 게시글이 삭제되면 프론트는 상세를 닫고 목록을 다시 불러온다.
- 답글 대상 댓글만 삭제된 경우에는 게시글을 닫지 않고 댓글 데이터만 새로 불러온다.
- 업로드 파일의 저장 확장자는 원본 파일명이 아니라 검증한 MIME type으로 결정한다.
- 익명 세션 쿠키는 canonical UUID만 허용하고, 잘못된 값은 새 세션으로 교체한다.
- 운영 프로필은 DB 정보와 CORS origin을 환경변수로 강제하고 secure cookie, schema validate, Swagger/H2 비활성화를 적용한다.
- AI provider 호출은 서버 연결/응답 timeout과 브라우저의 X 닫기 요청 취소를 함께 사용한다. 운영 timeout은 provider 지연 분포를 측정한 뒤 조정한다.
- 운영 프로필은 AI·콘텐츠 변경·업로드·상호작용 API에 세션/IP 이중 token bucket을 적용한다.
- AI는 별도로 KST 기준 일일 요청 한도와 서버 전체 동시 실행 상한을 적용하며 초과 시 429와 `Retry-After`를 응답한다.
- API 응답은 framing, MIME sniffing, 민감 브라우저 권한을 차단하고 운영 프로필에서는 HSTS를 보낸다.

## 삭제와 동시 요청의 결과

| 경합 상황 | 처리 |
| --- | --- |
| 상세 진입과 게시글 삭제 | 원자 조회수 UPDATE가 0행이면 404, 상세 종료 후 목록 갱신 |
| 댓글 생성과 게시글 삭제 | 게시글 행 잠금 순서대로 직렬화. 삭제가 먼저면 댓글 404 |
| 답글 생성과 부모 댓글 삭제 | 댓글 행 잠금 순서대로 직렬화. 삭제가 먼저면 댓글 목록 갱신 |
| 좋아요 토글 동시 요청 | 대상 글/댓글 행 잠금으로 직렬화하고 unique constraint로 중복 방어 |
| 투표 변경 동시 요청 | 기존 게시글 행 잠금과 세션별 unique constraint 유지 |
| 조회수 동시 증가 | 단일 UPDATE로 증가분 유실 방지 |

댓글 저장이 먼저 commit된 직후 글 작성자가 삭제하면 댓글 작성자는 성공 응답을 받을 수 있다. 그 뒤 게시글 전체가 삭제되는 것은 두 요청의 실제 commit 순서에 맞는 결과이며 오류로 보지 않는다.

## 공개 배포 전 필수

1. rate limit 기본값은 `prod` 프로필에서 활성화된다. 실제 AI provider의 결제 한도도 별도로 설정하고 아래 단일 인스턴스 한계를 확인한다.
2. 게시글 API의 서버 검색·정렬·페이지네이션은 적용되어 있다. 운영 데이터 규모에서 느린 검색어를 수집한 뒤 PostgreSQL trigram/전문 검색 도입 여부를 결정한다.
3. 업로드 파일의 실제 signature를 검사하고, 로컬 디스크에서 object storage로 옮기며, 게시글에 연결되지 않은 임시 업로드를 만료 삭제한다.
4. Compose는 nginx만 공개하고 백엔드는 내부 network에 둔다. 실제 서버의 TLS termination 뒤에서 `prod,postgres` profiles, secure cookie와 HSTS를 활성화한다.
5. PostgreSQL 전환 시 Flyway migration을 사용하고 기존 DB baseline, 백업·복구 절차를 검증한다.
6. 허용 origin을 실제 프런트 주소로 제한하고, 별도 도메인 구성이라면 Origin/CSRF 정책을 다시 검토한다.
7. 4xx/5xx, DB lock wait, AI latency·실패율, 업로드 용량을 관측하고 session id와 API key는 로그에 남기지 않는다.

## 200 VU 부하 기준점

GitHub-hosted runner 한 대에서 PostgreSQL 16과 애플리케이션을 함께 실행한 200 VU/steady 3분 결과다.

- 75,336 HTTP 요청, 357.16 req/s, 오류 0%, check 100%
- HTTP p95 52.89ms, 평균 18.73ms, 최대 1.7s
- 62,751 iteration 완료, 중단 0건
- 수신 1.4GB, 송신 10MB
- 좋아요·투표 중복과 고아 댓글 SQL 정합성 검사 통과

이는 같은 runner 내부의 단기 기준점이며 실제 인터넷 구간, TLS, 외부 AI, 장시간 DB 증가를 포함한 200명 운영 보장은 아니다. 최대 1.7초 tail과 응답 payload/egress는 운영 관측 대상으로 남긴다.

## Rate limit 운영 경계

- 일반 GET과 SSE 읽기는 제한하지 않는다. 글·댓글 생성/수정/삭제, 이미지 업로드, 조회수·좋아요·투표, AI 초안만 제한한다.
- 익명 세션 UUID는 클라이언트가 바꿀 수 있으므로 세션 한도와 원격 IP 한도를 함께 소비한다. `X-Forwarded-For`는 애플리케이션에서 임의로 신뢰하지 않는다.
- 기본값은 AI 3회/10분/세션, 10회/10분/IP, 2개 동시 실행, 200회/일이다.
- 콘텐츠 변경은 20회/분/세션, 업로드는 10회/10분/세션, 상호작용은 120회/분/세션이며 IP 한도는 NAT 사용자를 고려해 더 높다.
- 제한 상태는 프로세스 메모리에 있다. 재시작하면 초기화되고 여러 인스턴스 간 공유되지 않으므로 단일 인스턴스 보호선이다. 수평 확장 시 gateway/Redis 같은 공유 저장소로 이전해야 한다.
- AI 일일 한도 역시 결제 한도의 최종 보장이 아니다. provider dashboard의 hard quota/budget alert를 함께 둔다.
- 개발과 기존 k6 기준점에서는 기본 비활성화되고 `prod`에서 활성화된다. 별도 검증은 `RATE_LIMIT_ENABLED=true`로 켠다.

## 후속 부하 검증

- 인기 게시글 하나에 좋아요가 몰릴 때 비관적 잠금 대기 시간을 확인한다.
- DB deadlock 또는 lock timeout은 재시도 가능한 409/503 정책을 별도로 정한다.
- AI 호출은 일반 API 부하 테스트와 분리해 provider quota와 서버 thread 점유를 확인한다.
- rate limit 활성화 상태에서는 정상 사용자와 공격성 burst를 분리해 429 비율과 `Retry-After`를 확인한다.

## 참고 기준
- [Spring Data JPA Locking](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

## SSE 활동 신호 배포 점검

- nginx나 배포 프록시에서 `/api/activity/stream` 응답 버퍼링을 끄고, proxy read timeout을 25초 하트비트보다 충분히 길게 둔다. 애플리케이션도 `X-Accel-Buffering: no`와 `Cache-Control: no-cache, no-store`를 보낸다.
- 브라우저 탭 하나당 SSE 연결 하나가 유지된다. 행사 예상 사용자 200명뿐 아니라 여러 탭과 재연결을 포함한 동시 연결 수로 부하 검증한다.
- 현재 최근 200개 replay와 subscriber 목록은 인스턴스 메모리에 있다. 단일 인스턴스에서는 충분하지만 수평 확장 시 인스턴스 간 이벤트 공유가 없으므로 shared pub/sub 또는 sticky routing을 먼저 결정한다.
- SSE는 선택적 갱신 힌트다. 연결 실패나 이벤트 유실이 게시글·댓글 데이터 정합성을 깨뜨리지 않는지, 수동 새로고침과 다음 전체 조회로 항상 복구되는지 확인한다.
- 부하 검증에는 게시글·댓글 쓰기 응답 시간, SSE 구독 200개 이상 유지, 하트비트 재연결, bounded executor queue 포화 시 쓰기 경로 보호를 포함한다.