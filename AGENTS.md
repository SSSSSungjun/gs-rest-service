# Codex Working Rules

이 문서는 대나무숲 프로젝트를 Codex로 이어서 작업할 때 반복 설명과 토큰 사용을 줄이기 위한 기본 지침이다.

## 토큰 절약 원칙

- 매 작업은 `main` 최신 기준으로 시작한다.
- 사용자가 별도 요청하지 않으면 관련 파일만 최소로 읽는다.
- 파일을 조회하는 도구(cat, view_file 등)를 사용할 때는 한 번에 최대 50줄 이상을 넘겨서 읽지 않고, 필요한 라인 범위만 지정해 읽는다.
- 이미 대화와 문서에 있는 프로젝트 배경은 길게 반복하지 않는다.
- 중간 보고는 필요한 경우에만 짧게 한다.
- 완료 보고는 PR 번호, 머지 커밋, 핵심 변경점만 짧게 정리한다. 완료 보고 직전, 에이전트는 다음 작업을 위해 AGENTS.md 내의 '컨텍스트 캐시에 남길 내용' 영역을 스스로 최신 정보로 갱신(Overwrite)해 둔다.
- 단순 UI/CSS 수정을 할 때는 장황한 설계 설명을 생략한다.

## 컨텍스트 캐싱 전략

`AGENTS.md`를 작업 재개용 컨텍스트 캐시의 첫 진입점으로 사용한다.

다음 작업을 시작할 때는 전체 파일을 훑기 전에 아래 순서로 좁혀서 확인한다.

1. `AGENTS.md`에서 프로젝트 규칙과 최근 작업 기준을 확인한다.
2. 설계 의도나 트러블슈팅이 필요한 경우에만 `docs/technical-notes.md`를 확인한다.
3. 변경 목표와 직접 관련된 파일만 검색한다.
4. 관련 컴포넌트/서비스/API의 호출 경계가 불명확할 때만 주변 파일을 추가로 읽는다.
5. 단순 UI 간격, 문구, 색상 조정은 전체 구조 재분석 없이 해당 CSS/컴포넌트부터 본다.

컨텍스트 캐시에 남길 내용:

- 최근에 머지된 주요 PR 번호와 변경 의도
- 자주 수정하는 파일 위치
- 사용자가 반복해서 말한 UI/UX 취향
- 다음 작업에서 먼저 봐야 할 후보 파일
- 로컬 실행/검증 제약

컨텍스트 캐시에 남기지 않아도 되는 내용:

- 한 번 보면 충분한 전체 파일 목록
- 단순 스타일 수치 변경 이력
- PR 본문과 중복되는 장황한 설명
- 아직 실제 병목이 확인되지 않은 Redis 같은 인프라 캐싱 설계

## 기본 작업 방식

- GitHub repository 기준으로 작업한다.
- 새 브랜치를 만들고 구현한다.
- 구현 후 PR을 만들고 가능한 경우 squash merge까지 진행한다.
- 동일한 빌드 에러나 린트 에러가 3회 이상 반복되면 자율 수정을 중단하고, 에러 로그와 함께 사용자에게 즉시 질문한다.
- 로컬 빌드나 실행이 불가능하면 가능한 정적 검증 범위를 명확히 말한다.
- 사용자 변경이나 기존 작업을 되돌리지 않는다.
- 기존 코드 스타일과 책임 분리를 우선한다.
### 브랜치 이름 규칙

- 브랜치 이름에는 작업 주체를 나타내는 `agent/`, `codex/` 같은 접두사를 사용하지 않는다.
- 형식은 `<type>/<short-kebab-case>`로 통일하고 영문 소문자와 하이픈을 사용한다.
- 허용 type은 `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`다.
- `add`, `update`, 사용자명처럼 변경 성격이 불명확한 접두사는 사용하지 않는다.
- 예: `feat/comment-replies`, `fix/null-view-count`, `test/multi-user-load`, `docs/deployment-guide`.
- 한 브랜치에는 하나의 변경 목적만 담고 squash merge 후 원격 브랜치를 삭제한다.
## 프로젝트 요약

- 프로젝트명: 대나무숲
- 성격: 익명 게시판 + 댓글 중심 서비스
- 소유권: 쿠키 기반 익명 세션으로 내가 쓴 글/댓글만 수정/삭제 가능
- 기본 닉네임: 익명
- 주요 기능: 글/댓글, 좋아요, 조회수, 검색, 인기글, 페이지네이션, 이미지 첨부, 댓글 알림, 대댓글, 투표, 반응형 UI
- 기술 방향: Spring 계층 분리, React 컴포넌트/API/reducer/util 분리, PostgreSQL/nginx/CI-CD 확장 가능성 고려

## 문서화 기준

- 구조적 설계, 책임 분리, 트러블슈팅, 배포 확장성에 의미가 있는 변경은 `docs/technical-notes.md`에 누적한다.
- 단순 간격, 색상, 작은 UI 문구 변경은 기술 노트 갱신을 생략한다.
- 면접/자소서에서 설명 가능한 선택은 짧게라도 남긴다.
- PR 본문에는 왜 바꿨는지 한 줄 이상 남긴다.

## 프론트엔드 작업 기준

- `App.tsx`가 비대해지지 않게 컴포넌트, reducer, api, util로 분리한다.
- 모바일 사용성을 우선 고려한다.
- 반복 입력 영역은 세로 공간을 아낀다.
- 게시글 목록은 빠르게 스캔할 수 있게 메타, 본문, 이미지, 반응 수의 위계를 유지한다.
- 검색 결과는 필터링만 하지 말고, 화면에 보이는 게시글 작성자/본문의 검색어를 `mark.search-highlight`로 형광 표시한다.
- 알림, 메뉴, 모달은 바깥 클릭/ESC/액션 후 닫힘 같은 기본 상호작용을 챙긴다.

## 백엔드 작업 기준

- Controller는 HTTP 입출력과 세션 식별자 확보에 집중한다.
- Service는 검증, 소유권 판단, 도메인 규칙을 담당한다.
- Repository는 데이터 조회와 집계에 집중한다.
- DTO로 API 계약을 고정하고 Entity 직접 노출을 피한다.
- 프론트 검증과 별개로 서버 검증을 유지한다.

## 다음에 이어서 볼 만한 주제

컨텍스트 캐시를 기준으로 다음 작업의 탐색 범위를 먼저 줄인다.

우선 확인 후보:

- UI 배치/간격: `my-react-app/src/App.css`, `my-react-app/src/forumToss.css`, 관련 React component
- 검색/조회수: `my-react-app/src/hooks/useFeedView.ts`, `my-react-app/src/feedSelectors.ts`, `my-react-app/src/components/BoardFeed.tsx`, `my-react-app/src/components/HighlightedText.tsx`, `my-react-app/src/search.css`, `complete/src/main/java/com/example/restservice/service/PostService.java`, post entity/DTO/controller- 게시글 목록/상세: post list/detail component, post API client
- 글쓰기 입력창/이미지 첨부/투표/AI 초안: `my-react-app/src/components/BoardComposer.tsx`, `my-react-app/src/components/BoardComposer.css`, `my-react-app/src/boardApi.ts`, `complete/src/main/java/com/example/restservice/service/AiDraftService.java`
- 투표 표시/집계: `my-react-app/src/components/PollBlock.tsx`, `complete/src/main/java/com/example/restservice/service/PollService.java`, poll entity/repository
- 댓글/알림/활동 신호: `my-react-app/src/components/CommentNotificationBar.tsx`, `my-react-app/src/components/ActivityRefreshButton.tsx`, `my-react-app/src/useBoardActivity.ts`, `my-react-app/src/commentNotifications.ts`, `my-react-app/src/App.tsx`, `complete/src/main/java/com/example/restservice/service/BoardActivityStreamService.java`
- 버튼/액션 아이콘: `my-react-app/src/components/Icons.tsx`, 액션이 있는 각 컴포넌트
- 백엔드 API 변경: controller/service/dto/entity 순서로 최소 확인
- 브라우저 가상 사용자 회귀: `e2e/tests/board-beta.spec.ts`, `e2e/playwright.config.ts`, `.github/workflows/playwright-e2e.yml`

현재 판단:
- PR #32는 댓글 상세의 접기/펼치기를 제거해 댓글을 항상 표시하고, 댓글 알림을 상단 배너 대신 알림 버튼 + 별도 목록 화면으로 바꾸는 작업이다.
- PR #33은 댓글 알림 목록 상단의 박스형 헤더를 제거하고, `댓글 알림` 텍스트와 개수/액션만 가로 배치로 남긴 작업이다.
- PR #34는 목록 썸네일의 빈 2번째 그리드 칸으로 생기던 큰 여백을 줄이고, 상세 이미지 최대 크기와 `object-fit: contain`을 적용하는 작업이다.
- PR #35는 PR #34 후속 보정으로, 상세 이미지 프레임이 고정 폭을 먹어 생긴 좌우 빈 여백을 제거하고 목록 썸네일 그리드를 실제 썸네일 폭만 차지하게 재조정하는 작업이다.
- PR #36은 목록 이미지 여백의 구조 원인을 `PostImageGallery`가 이미지 개수와 무관한 갤러리 컨테이너 폭을 부모 그리드에 넘기는 문제로 보고, 리스트 이미지 1장/2장 폭을 컴포넌트에서 52px/110px로 확정하는 작업이다.
- PR #37은 댓글에 `parentCommentId`를 저장하는 대댓글 기능을 추가하고, 상세 화면에서 답글을 접지 않고 목록에 상시 표시하며 `@닉네임에게` 라벨로 대상 댓글을 보여주는 작업이다.
- PR #38은 글 작성 `+` 메뉴에 투표 만들기를 추가하고, 게시글 목록/상세에서 투표 참여와 결과 표시를 제공하며, 전체글/인기글 탭을 최신순/오래된순/인기순 정렬 드롭다운으로 바꾼 작업이다. 투표는 세션당 한 표이며 같은 게시글 투표 처리는 비관적 락 + 트랜잭션으로 직렬화한다.
- PR #39는 전체 UI를 카드-heavy 피드에서 게시판형 행 리스트 중심으로 바꾸고, 새 `forumToss.css` 오버라이드와 `Icons.tsx` 로컬 SVG 아이콘을 추가해 새로고침/작성/목록/상세/알림/메뉴 액션을 아이콘 중심 버튼으로 정리한 작업이다.
- PR #40은 PR #39 후속 디테일 보정으로, 중복 feed divider를 제거하고 전체 배경을 흰색으로 되돌리며 선택/hover/투표 선택 상태를 회색 계열로 조정하고, 목록 좌우 패딩과 본문-메타 간격을 넓힌 작업이다. 알림/작성/첨부/투표 만들기/게시 버튼은 아이콘만 남기고, 수정/삭제 메뉴는 아이콘 없이 텍스트만 남겼다.
- PR #41은 PR #40 후속 색감 보정으로, 완전 흰색 바탕이 너무 쨍하게 느껴지는 문제를 줄이기 위해 전체 바탕을 아주 옅은 회색(`#f5f6f8`)으로 낮추고 게시글 행/컴포넌트는 흰색으로 유지했다. 새로고침 버튼은 `composerLayout.css`의 기존 `::before` 아이콘을 `forumToss.css`에서 `!important`로 차단해 SVG 아이콘만 보이게 했다.
- PR #42는 UI 톤을 회색보다 연두/초록 계열이 살짝 도는 바탕(`#eef5ec`)으로 옮기고, 목록 게시글을 흰색 + 얇은 연두 보더 카드로 정리하며, 게시글/상세/작성/투표/댓글 패딩을 더 넉넉하게 조정한 작업이다. 작성창 첨부 메뉴는 아이콘만 있으면 애매하므로 `사진`, `투표` 짧은 텍스트를 다시 붙였다. 페이지네이션 구조는 1~5 숫자 + 직접 이동 기조를 유지했다.
- PR #43은 일반 검색과 조회수를 추가한 작업이다. 검색은 게시글 작성자/본문과 댓글 작성자/본문을 대상으로 필터링하되, 현재 화면에 보이는 게시글 작성자/본문에는 `HighlightedText`로 검색어를 형광 표시한다. 조회수는 게시글 상세를 열 때 `POST /api/posts/{id}/views`로 증가시키고, 목록/상세 모두 눈 아이콘과 함께 표시한다. 조회수 증가가 `updatedAt`을 바꿔 `수정됨`으로 보이지 않도록 엔티티에서 view-count-only update를 분리했다.
- PR #44는 조회수 컬럼 추가 이전 게시글의 `view_count = NULL` 때문에 primitive `long` 필드 로딩이 실패하던 문제를 고친 핫픽스다. 엔티티는 레거시 `NULL`을 0으로 안전하게 읽고 증가시키며, 시작 시 기존 `NULL` 행을 0으로 일괄 보정한다. 같은 종류의 컬럼 추가 때는 기존 데이터 백필 여부를 먼저 확인한다.
- PR #45는 검색 입력값과 적용 검색어를 분리해 돋보기 클릭/Enter에서만 목록 필터와 형광 강조가 실행되게 하고, 상세 진입 시 조회수를 화면에서 먼저 +1 한 뒤 서버 값으로 재동기화하는 작업이다.
- PR #46은 검색 대상을 `게시글`과 `댓글`로 분리한 작업이다. 검색 대상과 텍스트는 돋보기/Enter 제출 시 함께 적용되며, 댓글 검색은 일치 댓글을 개별 결과로 표시하고 원문 상세 진입 시 댓글 작성자/본문만 강조한다. 댓글 결과도 기존 1~5 페이지네이션 기조를 사용한다.
- PR #47은 게시글 작성 `+` 메뉴에 `AI 글쓰기`를 추가한 작업이다. 작성창은 취소 가능한 프롬프트 모드로 전환되고 생성 결과는 기존 본문 입력란에만 채워져 검토·수정 후 게시한다. OpenAI Responses API 호출은 Spring 백엔드의 `/api/ai/drafts`가 담당하며 키는 `OPENAI_API_KEY`, 모델은 `OPENAI_MODEL` 환경변수로 주입한다.
- PR #48은 AI 글쓰기 백엔드에 Gemini provider를 추가하고 기본값을 Gemini로 전환한 작업이다. `GEMINI_API_KEY`를 Codespaces Secret으로 주입하며, `AI_PROVIDER=openai`로 기존 OpenAI Responses API 구현에 복귀할 수 있다. 설정 절차는 `docs/ai-provider-setup.md`를 먼저 확인한다.
- PR #49는 Gemini 기본 추론 수준 `medium`을 유지하면서 출력 예산을 700에서 2000 tokens로 늘리고, 챗봇 답변이 아닌 충분한 분량의 게시글 본문을 쓰도록 지시를 강화한 작업이다. AI 결과 적용 후 textarea는 내용에 맞춰 최대 220px까지 다시 계산하며, 서버 로그에는 키·프롬프트 없이 provider별 생성 시간만 남긴다.
- PR #50은 `AiDraftService.INSTRUCTIONS`를 커뮤니티 게시글 초안 기준으로 재작성한 작업이다. 분량 미지정 시 300~700자, 4~8문장, 2~4문단을 목표로 하며, 실제 사실 조작은 금지하되 요청 범위의 일상적 장면과 감정 묘사는 보강하도록 구분한다.
- PR #51은 Gemini가 `MAX_TOKENS` 등으로 중단했는데 일부 텍스트가 있다는 이유로 잘린 초안을 성공 처리하던 문제를 고친 작업이다. 기본 출력 예산은 8192 tokens이며, 비정상 `finishReason`은 실패 처리하고 생각/본문/전체 토큰 수를 로그로 남긴다.
- PR #52는 AI instruction이 칼럼·에세이·후기·정보글 등 사용자가 지정한 형식을 커뮤니티 기본형보다 우선하도록 바꾸고, 고정 작성창 실제 높이를 `ResizeObserver`로 목록 하단 여백에 반영한 작업이다. AI 생성 중 프롬프트 영역에는 회전 상태와 경과 초를 표시하며 취소는 유지한다.
- PR #53은 피드의 고정 작성 폼을 입력형 진입 버튼 하나로 축소하고, 본문·사진·투표·AI 글쓰기를 자유롭게 조합하는 전용 작성 화면으로 옮긴 작업이다. 작성 화면은 `#compose` 히스토리를 사용해 브라우저 뒤로가기와 등록 성공 복귀를 지원하며, 닫았다 다시 열어도 등록 전 본문·사진·투표 초안은 유지한다.
- PR #54는 삭제 레이스를 404 + 화면 복구로 정리하고, 조회수 원자 증가와 글/댓글 행 잠금, batch fetch를 적용한 런타임 안정화 작업이다. 업로드 확장자·익명 세션·운영 프로필·보안 헤더도 보강했으며, AI 생성 취소와 서버 provider 연결/응답 timeout을 둔다. 공개 배포 전 남은 rate limit·서버 페이지네이션·object storage 점검은 `docs/deployment-readiness.md`를 먼저 본다.
- PR #56은 게시글 수정을 인라인 폼에서 전용 `BoardComposer`의 edit 모드로 통합한 작업이다. 저장은 기존 게시글에 PATCH하므로 ID·댓글·좋아요·조회수·기존 투표를 유지하고, 수정 중에도 사진과 AI 초안을 사용할 수 있다. AI 생성은 별도 `그만 기다리기` 버튼 없이 기존 X/화면 닫기의 요청 취소만 사용한다.
- PR #57은 320px 문서 최소 폭을 제거하고 모바일 툴바·카드 패딩·검색·페이지네이션·작성 화면을 Fold 커버, 구형 소형 폰, 태블릿과 짧은 가로 화면에 맞춘 반응형 호환성 작업이다. 터치 버튼 크기는 유지하되 컨테이너는 `clamp()`/`minmax()`로 유동화하고, 1~5 페이지 + 직접 이동 구조는 유지한다.
- PR #58은 게시글·댓글 생성 커밋 후 SSE 활동 신호를 보내고, 최근 20초에 활동이 몰릴 때만 기존 새로고침 자리를 `새 글/댓글 N` 버튼으로 바꾸는 작업이다. 자동 삽입·스크롤 이동·토스트는 없으며, 작성자 본인 이벤트를 제외하고 갱신 성공 후 20초 쿨다운을 둔다. 목록 사진은 첫 번째 한 장만 표시하고 전체 개수는 메타 숫자로만 보여준다.
- PR #59는 약 940줄의 `App.tsx`를 `useBoardController` + `BoardPage` 조립으로 축소하고, 피드 selector·화면 전환·알림·이미지를 역할별 훅으로 분리한 리팩터링이다. Spring 서비스 테스트 5개와 backend/frontend 독립 Application checks를 추가했으며, Spring Boot 3.2.4와 호환되지 않던 Gradle 9.3.1 wrapper를 8.7로 맞춰 전체 `bootJar` 빌드도 복구했다.
- PR #60은 Spring 서비스 테스트 5개의 영어 메서드명은 유지하면서 CI·IDE 테스트 결과에서 의도가 바로 보이도록 한글 `@DisplayName`을 추가한 작업이다.
- PR #61은 Playwright 가상 베타테스터 기반을 추가한 작업이다. 실제 Vite + Spring Boot + 전용 H2를 띄우고 독립 BrowserContext 두 개로 익명 소유권과 댓글 왕복을 검증하며, 검색 제출/강조와 320px 모바일·768px 태블릿 overflow를 검사한다. 실패 시 screenshot·video·trace·HTML report를 Actions artifact로 7일 보관한다.
- PR #62는 게시글·댓글 검색, 최신순·오래된순·인기순, 페이지 분할을 Spring Data Page 쿼리로 옮긴 작업이다. 목록은 페이지 결과만 받고 상세와 소유 글 댓글 알림 소스는 별도 API로 분리했다. Repository 통합 테스트 3개와 Playwright 8개/1개 페이지 전환 시나리오를 추가했다.
- PR #63은 Codespaces에서 개발 서버와 Playwright 서버 포트가 충돌해 Vite가 5174로 이동하고 테스트가 5173을 기다리던 타임아웃을 고친 작업이다. E2E 전용 포트를 Spring 18080/Vite 4173으로 분리하고 `--strictPort`, 서버 로그 출력, 동적 CORS, Codespaces UI 모드(9323) 매뉴얼을 추가했다.
- PR #64는 PostgreSQL을 선택 가능한 운영 DB 후보로 추가한 1단계 작업이다. `postgres` 프로필에서만 Flyway V1 + Hibernate `validate`를 사용하고, Actions의 PostgreSQL 16 서비스에서 실제 migration/JPA 통합 검증을 수행한다. 기존 MySQL/H2는 아직 Hibernate `update`를 유지하며 전환 경계와 baseline 주의사항은 `docs/postgresql-flyway.md`를 본다.
- PR #65는 Playwright의 다중 브라우저 기능 검증과 k6 다중접속 부하 검증을 분리한 작업이다. PostgreSQL 16에서 목록·상세·댓글·좋아요·투표 혼합 트래픽을 50/100/200 VU로 수동 실행할 수 있고, 좋아요·투표 중복/고아 댓글을 SQL로 검사한다. 50 VU/steady 30초 기준은 4,503요청, 73.87 req/s, 오류 0%, p95 6.73ms, 최대 133.55ms, 정합성 위반 0건이다. 같은 runner 내부 단기 측정이므로 운영 200명 보장으로 해석하지 않는다.
- PR #58의 SSE는 전체 게시판에서 활동이 급증했다는 선택적 갱신 신호다. 새 글·댓글을 자동 반영하지 않으며 연결이나 이벤트가 유실되어도 다음 전체 조회로 복구되어야 한다.
- 내가 쓴 글의 기존 댓글 알림 목록은 별도 실시간 push가 아니다. 게시글 목록을 다시 가져온 시점에 댓글과 `localStorage` 읽음 ID를 비교해 계산하므로, 활동 SSE 버튼으로 갱신한 뒤 함께 최신화된다.
- 비속어 필터링은 현재 최후순위다. Spring AI로 검열하기보다 신고/관리자 삭제 모델이 더 적절할 수 있으므로 실제 운영 요구가 생기면 별도 설계한다.
- 사용자는 디씨/펨코처럼 빠르게 스캔되는 게시판형 정보 밀도는 원하지만, 실제 간격과 버튼 감도는 토스처럼 조금 여유 있고 둥근 쪽을 선호한다.
- 사용자는 목록까지 전부 무거운 카드로 감싸는 디자인은 싫어하지만, OKKY/커뮤니티 카드 리스트처럼 얇은 보더와 넉넉한 패딩으로 구분되는 흰 게시글 카드는 선호 쪽에 가깝다. 그림자는 약하게, 구분은 보더와 여백으로 한다.
- 게시글 본문 카드/상세 카드/작성 카드에는 충분한 내부 패딩이 필요하다. 특히 게시글만 봐도 본문을 읽을 공간이 넉넉해야 한다.
- 사용자는 전체 배경이 완전 흰색이면 쨍하다고 느낀다. 기본 바탕은 아주 옅은 연두/회색, 게시글 행/컴포넌트는 흰색, 선택/hover/active 상태는 연한 초록 또는 연회색 쪽이 현재 선호에 가깝다.
- 사용자는 버튼을 텍스트만으로 처리하는 것을 싫어하며, 가능한 경우 아이콘/에셋 기반 버튼을 선호한다. 단, 첨부 메뉴처럼 아이콘만으로 의미가 애매한 경우에는 `사진`, `투표`처럼 짧은 텍스트를 같이 둔다. 수정/삭제 메뉴는 아이콘보다 텍스트만 있는 쪽을 선호한다. 현재는 lockfile 변동을 피하려고 `lucide-react` 대신 로컬 SVG 아이콘 컴포넌트를 사용했다.
- 페이지네이션은 직접 이동 입력 없이 화살표와 숫자만 컴팩트하게 보여준다. 데스크톱은 최대 10개, 소형 모바일은 최대 5개 번호를 노출한다.
- 공기업 행사용 커뮤니티 배포 이야기는 실제 클라우드 배포로 추진하지 않고, 백엔드 보안·트랜잭션·동시성·운영 리스크를 설명하기 위한 가상 시나리오로만 다룬다.
- 사용자는 실시간 신호가 모바일·웹에서 읽기를 방해하면 안 된다고 본다. 활동 알림은 여러 건이 짧게 몰릴 때만 기존 툴바 자리에서 작게 표시하고, 자동 목록 삽입·스크롤 이동·본문 오버레이·반복 토스트를 피한다.
- 알림 버튼은 새 알림이 있을 때 `+N` 배지와 초록 강조색을 사용한다.
- 알림 목록 화면에서는 개별 알림 읽음 처리, 모두 읽음, 원문 게시글 열기를 제공한다.
- 프론트 unit/component test runner는 아직 없지만 `e2e`의 Playwright가 실제 브라우저 회귀를 담당한다. Spring 서비스 테스트는 `complete/src/test/java/com/example/restservice/service`에 있고, `.github/workflows/backend-tests.yml`과 `.github/workflows/playwright-e2e.yml`이 빌드·단위 테스트·브라우저 테스트를 분리 실행한다.
- PR #69는 200 VU 기준점 이후 운영 보호선을 추가한 작업이다. AI·콘텐츠 변경·업로드·상호작용 API에 세션/IP 이중 token bucket을 적용하고, AI에는 KST 일일 한도와 서버 전체 동시 실행 상한을 둔다. 초과 응답은 429 + `Retry-After`이며 일반 GET/SSE는 제한하지 않는다.
- rate limit 상태와 AI 일일 카운터는 단일 프로세스 메모리에 있으므로 재시작 시 초기화되고 수평 확장 인스턴스끼리 공유되지 않는다. 실제 다중 인스턴스 배포 전에는 gateway/Redis 같은 공유 제한기로 이전하고 provider 결제 hard quota를 별도로 둔다.
- 200 VU/steady 3분 기준은 75,336요청, 357.16 req/s, 오류 0%, HTTP p95 52.89ms, 최대 1.7s, 정합성 위반 0건이다. 같은 GitHub runner 내부 단기 측정이므로 실제 운영 200명 보장으로 해석하지 않는다.
- PR #70은 PostgreSQL 16 + Spring Boot + nginx/React를 `compose.yaml` 하나로 구동하는 배포 패키지를 추가한 작업이다. 외부에는 nginx 포트만 공개하고 DB/백엔드는 내부 네트워크에 두며, DB·업로드 named volume, non-root 백엔드, Actuator health check, graceful shutdown, 자원·로그 제한을 적용한다.
- `.github/workflows/container-smoke-test.yml`은 실제 이미지를 빌드해 목록 조회·글 생성·보안/SSE 프록시 헤더까지 검증한다. 프론트 의존성은 `npm ci`로 lockfile 일치를 강제하고, 실행 절차·TLS 경계·백업은 `docs/docker-deployment.md`를 먼저 본다.
- Spring Boot plugin/starter 3.2.4와 devtools 3.2.5가 섞이면 `bootJar`에서 core `spring-boot` JAR가 빠져 컨테이너가 `NoClassDefFoundError: SpringApplication`으로 종료될 수 있다. 현재는 전부 3.2.4로 통일하고 Docker 빌드에서 정확한 core JAR 포함을 검사한다.
- Codespaces Compose 수동 인수 테스트와 영속성 검증, 레퍼런스 기반 게시판 UI 고도화는 완료했다. 실제 서버/TLS·도메인 체크리스트는 대상 인프라가 있는 집 환경에서만 진행한다.
- GitHub PR에 Vercel 상태 체크가 자동으로 붙어 있으며, Codex가 Vercel을 별도 실행하는 것은 아니다.
- `AGENTS.md`는 Codex 작업 규칙과 컨텍스트 캐시의 첫 진입점으로 충분하다.
- 기술적인 의사결정과 트러블슈팅은 `docs/technical-notes.md`에 남기고, `AGENTS.md`에는 다음 작업자가 어디부터 보면 되는지만 짧게 남긴다.
- Redis 같은 인프라 캐싱은 실제 성능 병목이나 배포 요구가 생긴 뒤 별도 설계한다.

## 새 세션 인계 기준

- 최신 완료 지점은 PR #100이다. WYSIWYG 작성기 서식은 굵게·밑줄·글자색·형광펜만 노출하고, 색상과 형광펜은 저장 후 목록·상세에서도 유지한다. 닉네임 입력은 게시 버튼 옆이 아니라 본문 위의 고정 프로필·둥근 입력 영역에 있으며, 사진·투표·AI 글쓰기·게시·작성 진입 문구는 일반 굵기를 사용한다. PR #99의 브라우저별 고정 익명 프로필 토큰은 유지한다.
- PR #72와 #73은 로컬 직접 실행의 게시글 업로드와 현재 lockfile 없이 실행되는 E2E의 생성 `package-lock.json`을 Git 추적 대상에서 제외해 Codespaces에서 `git add .`을 안전하게 사용할 수 있게 한 작업이다.
- PR #74는 PostgreSQL을 외부 인터페이스가 아닌 host loopback `127.0.0.1:15432`에만 바인딩해 VS Code PostgreSQL 관리 도구가 연결할 수 있게 한 작업이다.
- Codespaces Docker Compose 수동 인수 테스트, 글/이미지 등록, `docker compose restart`와 `down` → `up` 후 PostgreSQL/업로드 named volume 영속성 검증을 완료했다. 브라우저 쓰기 403은 코드 결함이 아니라 실제 접속 Origin과 `PUBLIC_ORIGIN` 불일치였고, 같은 값으로 맞춰 해결했다.
- PostgreSQL volume 생성 뒤 `.env`의 비밀번호만 바꿔도 DB 사용자 비밀번호는 자동 변경되지 않는다. 데이터를 유지하려면 container의 `psql`에서 `\\password bamboo`로 맞추고 backend를 재생성한다.
- PR #75는 PostgreSQL 16에서 두 요청을 latch로 동시에 출발시켜 게시글 삭제/댓글 생성, 게시글 삭제/투표 참여, 동일 세션 좋아요 toggle 2회, 동일 세션 동일 투표 2회를 검증한다. 기존 게시글 `PESSIMISTIC_WRITE` 잠금과 트랜잭션만으로 네 테스트가 모두 통과했으며 운영 코드에 별도 비동기 처리는 추가하지 않았다.
- PR #76은 동시성 검증 결과와 운영 판단을 기술 노트 및 인계 문서에 반영한 작업이다.
- PR #77은 연회색 배경과 흰색 연속 목록 패널, 좌측 텍스트 정렬 탭, 우측 통합 검색, 컴팩트한 썸네일/메타 행, 화살표+숫자 페이지네이션으로 게시판을 재구성한 작업이다. 데스크톱은 상단 `글쓰기` 버튼, 820px 이하 모바일·태블릿은 기존 하단 입력형 진입을 사용한다.
- PR #79는 상단을 여백 없는 초록색 헤더로 바꾸고 `대나무숲`·데스크톱 글쓰기·알림만 한 줄에 남겼다. 일반 목록의 전체 글/개수와 데스크톱 새로고침은 제거하고, 모바일은 3분할 정렬 버튼과 검색 옆 새로고침을 사용한다. 목록 본문·메타 대비를 낮추고 날짜를 24시간 이내 상대시간, 같은 해 월일·24시간제, 이전 해 연도 포함으로 표시한다.
- PR #81은 720px 이하에서 게시글 목록 패널만 화면 좌우 끝까지 확장하고, 게시글 내부 패딩과 정렬·검색 영역의 여백 및 데스크톱 폭은 유지한 작업이다.
- PR #83은 브랜드 색상을 덜 쨍한 초록으로 낮추고 `theme.css`에 팔레트를 중앙화했다. 데스크톱 글쓰기는 검색줄 오른쪽에 두며, 목록 작성자는 게시글 ID+닉네임 기반의 고정 원형 시각 토큰과 이름/시간 column으로 표시한다. 이미지는 큰 정사각형, 메타는 더 크고 선명하게 표시하며 활성 좋아요는 빨간 채움 하트다.
- PR #85는 헤더 로고에 Google Fonts `Jua`를 적용하고 흰색을 강제하며, CSP에 Google Fonts 스타일/폰트 출처만 허용했다. 정렬-검색은 20px 간격, 글쓰기는 툴바 맨 오른쪽이다. 목록 이미지는 데스크톱 132px, 모바일 104px, 소형 화면 92px의 강제 정사각형이고 pagination 하단 padding은 데스크톱 220px, 모바일 190px이다.
- PR #87은 목록 반응 메타를 좋아요·댓글만 남기고 조회수·투표 수는 상세에서만 보이게 했다. 사진 개수는 시간 옆에 같은 농도로 표시하며, 하트·댓글은 크게 표시하고 활성 좋아요는 배경 없이 빨간 채움 하트다. 투표 블록은 `theme.css` 팔레트의 부드러운 초록 카드/선택지로 맞췄다.
- PR #89는 목록 반응을 연한 회색 윤곽 하트·채움 말풍선과 가벼운 숫자로 보정하고 활성 하트만 빨간색으로 유지했다. 작성자 메타는 `1시간 전 · 사진 1개` 한 줄 텍스트이며 목록 본문은 보통 굵기다. 투표는 바깥 카드 없이 회색 트랙+브랜드 초록 진행률, 8px 모서리, 넉넉한 선택지 패딩, 하단 참여 인원 문장을 사용한다.
- PR #91은 데스크톱 글쓰기 버튼을 검색 묶음 밖으로 옮겨 게시글 목록 우측 끝과 정렬하고, 댓글을 하트와 같은 크기의 윤곽 아이콘으로 통일했다. 시간·사진 메타와 폼 컨트롤은 전역 기본 글꼴을 동일하게 상속한다. 노트북 재개 시 저장소의 `AGENTS.md`를 먼저 읽고 Codespaces Secret/로컬 `.env`만 별도로 복원한다.
- PR #92는 데스크톱 툴바를 명시적인 2행 grid로 고정해 정렬 탭은 첫 줄, 검색과 글쓰기는 같은 둘째 줄 양 끝에 배치했다. 시간과 사진 수는 하나의 `<time>` 텍스트로 렌더링하고 기본 글꼴은 시스템 UI 스택으로 통일했다.
- 게시글/댓글의 터치 시 검은 tap highlight는 제거하되 키보드 `:focus-visible` 표시는 유지한다. 게시글 행의 작성자/본문/반응 간 수직 간격은 일정하게 맞추고 페이지네이션 아래에는 넉넉한 여백을 둔다.
- nginx는 `/`와 `index.html`을 매번 재검증하고 해시가 붙은 `/assets/`만 장기 캐시한다. 새 Compose 빌드 뒤 일반 `http://127.0.0.1:8081`에서도 쿼리 문자열 없이 최신 UI가 반영되어야 하며 container smoke test가 `Cache-Control: no-cache`를 검증한다.
- 같은 세션의 좋아요 2회는 toggle 계약대로 직렬 처리 후 최종 0건이고, 같은 세션의 동일 투표 2회는 최종 1건이다. 삭제 충돌은 반대 요청이 먼저 성공하거나 404로 안전하게 끝나며 고아 댓글·투표가 남지 않는다.
- CI는 backend/frontend/Playwright/PostgreSQL/container checks까지 구축됐다. 실제 서버·도메인·TLS·운영 Secret으로 자동 배포하는 full-stack CD는 아직 없고 Vercel 상태 체크는 별도다.
- 백업·복구 모의훈련, 환경변수 누락/DB 장애, 외부망 부하·보안 검증은 자동 다음 작업이 아니라 사용자가 명시적으로 선택할 때 진행한다.
- 실제 서버·도메인·HTTPS·운영 Secret·CD 연결과 외부망 검증은 대상 인프라가 있는 집 환경에서 진행한다.
- 사용자는 `main`만 유지하고, Codex는 main 최신 기준의 규칙 브랜치 생성 → 최소 변경 → PR → checks 확인 → squash merge를 맡는다. 사용자는 merge 후 `git switch main`, `git pull --ff-only`만 실행하면 된다.
- Compose의 평상시 시작은 `docker compose up -d`, 종료는 volume을 보존하는 `docker compose down`이다. `docker compose down -v`는 사용자가 명시적으로 초기화를 요청한 경우에만 실행한다.
- 회사 환경에서는 로컬 저장소를 보지 않고 GitHub connector로만 원격 저장소를 읽고 수정한다. 매 작업 시작 시 `_get_repo`로 연결을 확인한다.
- 원격 브랜치 삭제 기능이 connector에 없으면 squash merge 후 사용자에게 GitHub에서 브랜치를 삭제할 대상만 짧게 알린다.

## 프로젝트/세션 격리 기준

- 이 문서의 규칙과 컨텍스트는 `SSSSSungjun/gs-rest-service` 저장소에만 적용하며, 다른 프로젝트로 자동 전이하지 않는다.
- 새 PC·새 Codex 세션에서는 보관 대화나 특정 로컬 폴더명에 의존하지 않고, 먼저 GitHub connector의 `_get_repo`로 이 저장소 연결을 확인한 뒤 원격 `main`의 `AGENTS.md`를 읽는다.
- 이 프로젝트를 다시 시작할 때 사용자가 제공해야 할 최소 정보는 저장소명과 “AGENTS.md 기준으로 진행”이라는 지시뿐이다.
- 같은 Codespace를 다른 PC에서 열면 workspace 파일, 무시된 `.env`, Docker volume의 PostgreSQL 데이터가 유지된다. 새 Codespace에서는 Git 추적 파일은 자동 복원되지만 Secret/`.env`는 별도로 복원한다.
- 작업 종료는 volume을 보존하는 `docker compose down`을 사용한다. `docker compose down -v`와 Codespace 삭제는 사용자가 데이터 초기화를 명시한 경우에만 수행한다.

## 사용자가 짧게 말해도 되는 형식

```text
AGENTS.md 기준으로 해줘.
이번 목표: ...
완료 후 PR 번호/머지 커밋/핵심 변경만 짧게.
```