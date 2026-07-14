# AI Provider Setup

게시글의 `AI 글쓰기` 기능은 프론트엔드 변경 없이 Spring 백엔드 설정으로 Gemini와 OpenAI를 선택한다.

## Gemini로 시작하기

1. Google AI Studio에서 API 키를 발급한다.
2. GitHub 저장소의 `Settings > Secrets and variables > Codespaces`로 이동한다.
3. `New repository secret`을 누르고 아래 값을 저장한다.

```text
Name: GEMINI_API_KEY
Secret: 발급받은 Gemini API 키
```

4. 실행 중인 Codespace를 중지한 뒤 다시 시작한다.
5. 키가 들어왔는지 값 자체를 출력하지 않고 확인한다.

```bash
test -n "$GEMINI_API_KEY" && echo "Gemini key ready" || echo "Gemini key missing"
```

기본 provider가 Gemini이므로 `AI_PROVIDER`는 따로 설정하지 않아도 된다. 기본 모델은 `gemini-3.5-flash`다.

기본 추론 수준은 `medium`, provider 공통 출력 예산은 8192 tokens다. 짧고 빠른 응답이 우선이면 `minimal` 또는 `low`, 더 깊은 추론이 필요하면 `high`로 바꿀 수 있다. 추론 수준은 글의 길이 자체가 아니라 모델이 답을 만들기 전에 생각하는 깊이와 지연 시간에 영향을 준다.

모델을 바꾸려면 Codespaces 터미널에서 다음과 같이 설정하고 Spring Boot를 다시 시작한다.

```bash
export GEMINI_MODEL='gemini-3.5-flash'
```

Codespaces Secret을 만들기 어려운 임시 테스트에서는 현재 터미널 세션에만 키를 넣을 수 있다.

```bash
export GEMINI_API_KEY='발급받은 키'
```

터미널을 닫거나 Codespace를 재시작하면 이 임시 값은 사라진다.

## OpenAI로 전환하기

나중에 OpenAI API를 사용하려면 Codespaces Secret에 `OPENAI_API_KEY`를 추가하고 다음 환경변수를 설정한다.

```bash
export AI_PROVIDER='openai'
export OPENAI_MODEL='gpt-5.4-mini'
```

Gemini로 되돌릴 때는 다음과 같이 설정한다.

```bash
export AI_PROVIDER='gemini'
```

환경변수를 변경한 뒤에는 Spring Boot 프로세스를 반드시 다시 시작한다.

## 설정 목록

| 환경변수 | 기본값 | 용도 |
| --- | --- | --- |
| `AI_PROVIDER` | `gemini` | `gemini` 또는 `openai` 선택 |
| `AI_MAX_OUTPUT_TOKENS` | `8192` | 추론과 최종 본문에 사용할 최대 출력 예산 |
| `GEMINI_API_KEY` | 없음 | Gemini 서버 API 키 |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Gemini 모델 |
| `GEMINI_THINKING_LEVEL` | `medium` | `minimal`, `low`, `medium`, `high` 중 추론 수준 |
| `GEMINI_BASE_URL` | Google Gemini API | Gemini 호환 서버 주소 |
| `OPENAI_API_KEY` | 없음 | OpenAI 서버 API 키 |
| `OPENAI_MODEL` | `gpt-5.4-mini` | OpenAI 모델 |
| `OPENAI_BASE_URL` | OpenAI API | OpenAI 호환 서버 주소 |

API 키는 React `.env`, `application.properties`, 소스 코드, Git 커밋에 직접 적지 않는다. Codespaces Secret 또는 서버 환경변수로만 주입한다.

Gemini 무료 티어에는 개인정보, 회사 기밀, 실제 내부 업무 내용을 입력하지 않는다. 무료 티어의 데이터 처리 조건은 실제 사용자 테스트 전에 별도로 확인한다.

Gemini 응답이 `MAX_TOKENS`나 안전 필터로 중단되면 잘린 텍스트를 성공으로 사용하지 않는다. 서버 로그의 `finishReason`, `thoughtsTokens`, `candidateTokens`로 실제 중단 원인을 확인한다.
