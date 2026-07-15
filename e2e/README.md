# Playwright 가상 베타테스터

실제 React 화면, Spring API, 테스트 전용 H2 DB를 함께 띄워 핵심 사용자 흐름을 검증한다. 각 테스트는 새 브라우저 프로필로 시작하고, 다중 사용자 시나리오는 별도 BrowserContext를 추가해 익명 세션을 분리한다.

## 현재 시나리오

- 작성자와 독자가 서로 다른 익명 세션을 받고 소유권 UI가 섞이지 않는지 확인
- 독자가 댓글을 작성하고 작성자가 새로 불러와 확인하는 왕복 흐름
- 검색어 입력만으로는 필터링하지 않고 제출 후 결과와 형광 강조를 적용하는지 확인
- 같은 검색어의 게시글 9개를 서버 페이지 크기 8개/1개로 나눠 조회하는지 확인
- 320px 소형 모바일과 768px 태블릿에서 가로 넘침 없이 작성 화면을 여는지 확인

## Codespaces에서 실행

최초 한 번만 의존성과 Chromium을 설치한다.

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
```

전체 테스트는 헤드리스 모드로 실행되므로 별도 브라우저 창이 뜨지 않는다.

```bash
npm test
```

화면과 각 단계를 직접 보려면 UI 모드를 실행한다.

```bash
npm run test:ui
```

터미널에 표시되는 링크를 열거나 Codespaces의 `PORTS` 탭에서 `9323`을 연다. 테스트 화면에는 trace와 요청 정보가 포함될 수 있으므로 포트 공개 범위는 `Private`로 둔다.

Playwright 전용 기본 포트는 Spring `18080`, Vite `4173`이다. Vite는 `--strictPort`로 실행되어 충돌 시 다른 포트로 이동하지 않고 즉시 실패한다. 꼭 다른 포트를 써야 하면 두 URL을 함께 지정한다.

```bash
E2E_BACKEND_URL=http://127.0.0.1:18081 \
E2E_FRONTEND_URL=http://127.0.0.1:4174 npm test
```

기존 서버를 의도적으로 재사용할 때만 `E2E_REUSE_SERVERS=true`를 추가한다.

마지막 HTML 리포트를 Codespaces에서 열려면 아래 명령 후 `PORTS` 탭의 `9324`를 연다.

```bash
npm run show-report:codespaces
```

실패 결과는 `e2e/playwright-report`와 `e2e/test-results`에 남는다. GitHub Actions에서는 실패한 실행의 report, screenshot, video, trace를 7일간 artifact로 보관한다.