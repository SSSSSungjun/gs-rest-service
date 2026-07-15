# Playwright 가상 베타테스터

실제 React 화면, Spring API, 테스트 전용 H2 DB를 함께 띄워 핵심 사용자 흐름을 검증한다. 각 테스트는 새 브라우저 프로필로 시작하고, 다중 사용자 시나리오는 별도 BrowserContext를 추가해 익명 세션을 분리한다.

## 현재 시나리오

- 작성자와 독자가 서로 다른 익명 세션을 받고 소유권 UI가 섞이지 않는지 확인
- 독자가 댓글을 작성하고 작성자가 새로 불러와 확인하는 왕복 흐름
- 검색어 입력만으로는 필터링하지 않고 제출 후 결과와 형광 강조를 적용하는지 확인
- 같은 검색어의 게시글 9개를 서버 페이지 크기 8개/1개로 나눠 조회하는지 확인
- 320px 소형 모바일과 768px 태블릿에서 가로 넘침 없이 작성 화면을 여는지 확인

## Codespaces에서 실행

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
npm test
```

Playwright가 Spring Boot와 Vite를 자동으로 실행한다. 이미 8080/5173 서버가 실행 중이면 로컬에서는 해당 서버를 재사용한다.

실패 결과는 `e2e/playwright-report`와 `e2e/test-results`에 남는다. GitHub Actions에서는 실패한 실행의 report, screenshot, video, trace를 7일간 artifact로 보관한다.