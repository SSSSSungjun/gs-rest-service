# 집 로컬 이전 및 무료 휴대폰 원격 운영 가이드

이 문서는 Codespaces 사용량이 끝난 뒤에도 대나무숲 프로젝트를 집 Windows PC에서 이어서 개발하고, 휴대폰으로 상태 확인·PR 머지·화면 테스트를 할 수 있도록 만든 인수인계서다.

대화 기록이나 특정 Codex 세션은 전제로 하지 않는다. 새 PC나 새 Codex는 먼저 `AGENTS.md`와 이 문서를 읽고 시작한다.

## 0. 결론부터

권장 구성은 다음과 같다.

```text
GitHub main
  ├─ GitHub Actions: 무료 제공량 안에서 CI
  ├─ 집 Windows PC: Git clone + Docker Compose
  ├─ 자동 동기화: 작업 스케줄러가 main을 주기적으로 pull
  └─ 휴대폰
       ├─ GitHub 앱/웹: PR 확인 및 머지
       ├─ Tailscale: 집 PC의 웹 화면 접속
       └─ Chrome Remote Desktop 또는 SSH: 필요할 때만 PC 조작
```

- Codespaces는 더 이상 상시 개발 환경으로 쓰지 않는다.
- GitHub가 코드의 유일한 원본이다.
- 집 PC는 실행 서버이자 로컬 개발 환경이다.
- 휴대폰에서 PR을 머지하면 집 PC가 몇 분 안에 `main`을 받아 다시 빌드하도록 구성할 수 있다.
- 외부 공개 서버, 도메인, 포트포워딩은 사용하지 않는다.
- 무료 구성을 유지하려면 집 PC가 켜져 있고 인터넷에 연결돼 있어야 한다.

## 1. 반드시 지킬 행동강령

### 새 Codex 세션의 첫 행동

집 Codex에 아래 문장을 그대로 전달한다.

> 이 저장소의 AGENTS.md와 docs/home-local-and-remote-runbook.md를 먼저 전부 읽고, 현재 main과 git status를 확인한 다음 작업해. 기존 변경은 건드리지 말고 규칙 브랜치에서 최소 변경 후 PR, checks 확인, squash merge, AGENTS.md 인계 갱신까지 해.

Codex는 다음 순서를 지킨다.

1. `git status -sb`로 현재 브랜치와 사용자 변경을 확인한다.
2. `git remote -v`로 `SSSSSungjun/gs-rest-service`가 맞는지 확인한다.
3. `git fetch origin` 후 최신 `main`을 기준으로 시작한다.
4. `AGENTS.md`와 이 문서를 읽는다.
5. 작업과 직접 관련된 파일만 읽는다.
6. 브랜치는 `<type>/<short-kebab-case>` 형식으로 만든다.
7. 사용자 변경을 덮거나 되돌리지 않는다.
8. 관련 테스트를 실행한다.
9. PR을 만들고, 가능한 경우 squash merge한다.
10. 완료 전에 `AGENTS.md`의 새 세션 인계 내용을 갱신한다.
11. 머지 뒤 로컬 `main`을 다시 동기화한다.

### 절대 금지

- `.env`, API 키, 비밀번호, 쿠키 비밀값을 Git에 커밋하지 않는다.
- `git reset --hard`, 강제 push, 무단 파일 삭제를 하지 않는다.
- 사용자의 미커밋 변경을 임의로 stash·discard하지 않는다.
- 공개 저장소에 집 PC를 GitHub Actions self-hosted runner로 연결하지 않는다.
- 공유기 포트포워딩으로 8080, 22, 5432 등을 인터넷에 공개하지 않는다.
- 데이터가 필요 없다는 확인 없이 `docker compose down -v`를 실행하지 않는다.
- 휴대폰 원격 접속을 위해 DB나 백엔드 포트를 직접 외부에 노출하지 않는다.

GitHub는 공개 저장소에 self-hosted runner를 사용하는 것을 거의 항상 피하라고 경고한다. PR을 통해 runner 환경과 secret이 탈취될 수 있기 때문이다.

공식 문서: https://docs.github.com/en/actions/reference/security/secure-use?learn=getting_started&learnProduct=actions

## 2. 현재 이어받을 기준점

- 저장소: https://github.com/SSSSSungjun/gs-rest-service
- 기준 브랜치: `main`
- 마지막 UI 완료 지점: PR #105
- PR #105까지의 기능 변경은 `main`에 머지되어 있다.
- Codespaces 안의 DB 데이터는 이전하지 않아도 된다.
- Codespaces의 `.env`가 Git에 없다는 것은 정상이다. `.gitignore`가 의도적으로 제외한다.
- 기존 `.env` 값을 읽을 수 없다면 복구가 아니라 재발급·재작성한다.

## 3. 집 PC 준비

### 필요한 프로그램

1. Git for Windows
2. VS Code
3. Codex 앱 또는 사용할 Codex 환경
4. Docker Desktop
5. Tailscale
6. 선택: Chrome Remote Desktop
7. 선택: Windows OpenSSH Server

Docker Desktop은 Windows에서 WSL 2 backend 사용을 권장한다. 현재 공식 요구사항과 설치 절차는 아래에서 확인한다.

- https://docs.docker.com/desktop/setup/install/windows-install/
- https://docs.docker.com/desktop/features/wsl/

주의: Docker Desktop은 개인 사용, 교육, 비상업 오픈소스, 그리고 Docker가 정한 소규모 기업 조건에서는 무료지만, 큰 기업의 상업적 사용은 라이선스를 확인해야 한다. 이 가이드는 집 개인 PC에서의 개인 개발을 전제로 한다.

### 설치 확인

PowerShell에서 실행한다.

```powershell
git --version
docker --version
docker compose version
wsl --version
```

Docker 명령이 실패하면 Docker Desktop을 먼저 실행하고 whale 아이콘이 준비 상태가 될 때까지 기다린다.

## 4. Codespaces에서 집 PC로 코드 옮기기

Codespace를 열 수 없어도 코드가 `main`에 머지돼 있다면 손실이 아니다. 집 PC에서 GitHub를 새로 clone하면 된다.

### 새로 clone

원하는 부모 폴더에서 PowerShell을 연다.

```powershell
Set-Location C:\dev
git clone https://github.com/SSSSSungjun/gs-rest-service.git
Set-Location .\gs-rest-service
git switch main
git pull --ff-only origin main
git status -sb
```

`C:\dev`가 없다면 먼저 파일 탐색기에서 만들거나 아래를 실행한다.

```powershell
New-Item -ItemType Directory -Path C:\dev -Force
```

정상 상태는 대략 다음과 같다.

```text
## main...origin/main
```

### 이미 집에 clone이 있는 경우

먼저 변경 유무를 확인한다.

```powershell
Set-Location C:\dev\gs-rest-service
git status -sb
```

변경이 없다면:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
```

변경이 있다면 pull부터 하지 말고, 그 변경이 필요한 작업인지 확인해 별도 브랜치에 커밋한다. 모르는 변경을 삭제하지 않는다.

### 기준점 표시용 로컬 백업 브랜치

선택 사항이다. 현재 `main`을 이름만 붙여 보관한다.

```powershell
git branch backup/codespaces-final
```

이 브랜치는 로컬 표식일 뿐 원격에 push할 필요가 없다.

## 5. .env를 살리는 정확한 방법

### 핵심 판단

Git이 추적하지 않은 Codespaces `.env`는 clone으로 따라오지 않는다. Codespace가 열리지 않는 동안 그 파일 내용을 GitHub에서 되살릴 방법도 없다.

하지만 현재 프로젝트는 `.env.example`을 기준으로 새 `.env`를 만들 수 있다. DB 데이터가 필요 없으므로 새 PostgreSQL 비밀번호를 쓰면 된다. AI 키만 필요하면 새로 발급한다.

GitHub Codespaces Secret이나 Actions Secret은 보안상 기존 값을 다시 표시하지 않는다. 이름은 확인할 수 있어도 값은 재발급해야 한다.

### 1단계: 템플릿 복사

저장소 루트에서:

```powershell
Copy-Item .env.example .env
notepad .env
```

### 2단계: 새 DB 비밀번호 생성

PowerShell에서:

```powershell
[guid]::NewGuid().ToString("N")
```

출력값을 `POSTGRES_PASSWORD`에 넣는다. 따옴표는 넣지 않는다.

### 3단계: 최초 로컬 실행용 .env

처음에는 아래처럼 맞춘다. 실제 비밀번호는 반드시 새 값으로 바꾼다.

```dotenv
APP_PORT=8080
PUBLIC_ORIGIN=http://localhost:8080

POSTGRES_DB=bamboo_forest
POSTGRES_USER=bamboo
POSTGRES_PASSWORD=여기에_새로_생성한_긴_값
POSTGRES_HOST_PORT=15432
POSTGRES_MAX_CONNECTIONS=50
POSTGRES_SHARED_BUFFERS=128MB

DB_POOL_MAX_SIZE=10
DB_POOL_MIN_IDLE=2
DB_MEMORY_LIMIT=512m
BACKEND_MEMORY_LIMIT=768m
FRONTEND_MEMORY_LIMIT=128m
JAVA_TOOL_OPTIONS=-Xms256m -Xmx512m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Duser.timezone=Asia/Seoul

COOKIE_SECURE=false
SECURITY_HSTS_ENABLED=false
RATE_LIMIT_ENABLED=true

AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

### AI 키 처리

- AI 글쓰기를 당장 쓰지 않으면 `GEMINI_API_KEY`와 `OPENAI_API_KEY`를 비워 둔다.
- AI 기능이 필요하면 기존 키를 찾으려 애쓰기보다 공급자 콘솔에서 새 키를 만든다.
- 무료 사용량과 모델 정책은 바뀔 수 있으므로 결제수단 자동 청구를 켜지 말고 공급자 콘솔의 현재 한도를 확인한다.
- 키를 채팅, 이슈, PR 본문, 로그, 스크린샷에 붙이지 않는다.
- 실수로 노출한 키는 즉시 폐기하고 새로 발급한다.

### Tailscale 접속으로 바꿀 때

집 PC와 휴대폰에 Tailscale을 연결한 뒤 실제로 사용할 주소를 하나 정한다.

예:

```dotenv
PUBLIC_ORIGIN=http://home-board:8080
COOKIE_SECURE=false
SECURITY_HSTS_ENABLED=false
```

또는:

```dotenv
PUBLIC_ORIGIN=http://100.x.y.z:8080
COOKIE_SECURE=false
SECURITY_HSTS_ENABLED=false
```

중요:

- 브라우저 주소와 `PUBLIC_ORIGIN`은 scheme, host, port까지 정확히 같아야 한다.
- `localhost`, MagicDNS 이름, 100.x IP를 섞어 쓰면 글 등록에서 Origin 불일치로 403이 날 수 있다.
- 하나를 정했으면 PC와 휴대폰 모두 같은 주소로 접속한다.
- Tailscale 자체가 장치 사이 트래픽을 암호화하지만 위 주소는 브라우저 기준 HTTP다. 그래서 이 사설 tailnet 구성에서는 `COOKIE_SECURE=false`, `SECURITY_HSTS_ENABLED=false`를 유지한다.
- 나중에 실제 HTTPS를 붙이면 두 값을 `true`로 바꾸고 `PUBLIC_ORIGIN`도 `https://...`로 맞춘다.

### .env가 커밋되지 않는지 확인

```powershell
git status --short
git check-ignore -v .env
```

`.env`가 status에 나타나지 않고 `.gitignore` 규칙이 출력되면 정상이다.

## 6. 첫 실행

저장소 루트에서:

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

브라우저:

```text
http://localhost:8080
```

로그 확인:

```powershell
docker compose logs --tail=200
```

특정 서비스만 볼 때:

```powershell
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
docker compose logs --tail=200 postgres
```

평상시 명령:

```powershell
docker compose up -d
docker compose down
```

- `down`은 named volume을 보존한다.
- `down -v`는 DB와 업로드 volume을 지운다.

### 데이터가 필요 없고 예전 volume 비밀번호가 충돌할 때만

아래는 파괴적 초기화다. 정말 예전 로컬 데이터가 필요 없을 때만 실행한다.

```powershell
docker compose down -v
docker compose up -d --build
```

새 clone의 첫 실행에는 보통 필요 없다.

## 7. 무료 휴대폰 접속: Tailscale

Tailscale Personal은 현재 개인용으로 무료이며, 공식 안내상 무료 Personal tailnet은 최대 6명의 사용자를 허용하고 사용자 장치는 무제한이다.

- 가격: https://tailscale.com/pricing
- 무료 플랜: https://tailscale.com/docs/reference/free-plans-discounts
- Windows 설치: https://tailscale.com/docs/install/windows
- Android 설치: https://tailscale.com/docs/install/android
- 장치 접속: https://tailscale.com/kb/1452/connect-to-devices

### 집 PC

1. Tailscale for Windows를 설치한다.
2. 개인 Google/GitHub 계정 등으로 로그인한다.
3. 장치 이름을 `home-board`처럼 알아보기 쉽게 정한다.
4. Tailscale IP 또는 MagicDNS 이름을 확인한다.
5. Docker Compose를 실행한다.
6. Windows 방화벽에서 8080을 열어야 한다면 공용 네트워크 전체가 아니라 Tailscale 인터페이스/사설 범위로만 제한한다.
7. 공유기 포트포워딩은 하지 않는다.

### Android 휴대폰

1. Play Store에서 Tailscale을 설치한다.
2. 집 PC와 같은 계정으로 로그인한다.
3. VPN 연결을 켠다.
4. Chrome에서 `http://home-board:8080` 또는 정한 Tailscale IP 주소를 연다.
5. 홈 화면에 추가해 앱처럼 한 번에 연다.

Tailscale은 장치에 안정적인 100.x 주소를 주고 MagicDNS 장치 이름으로도 서비스에 연결할 수 있다.

### 접속이 안 될 때

순서대로 확인한다.

1. 집 PC가 켜져 있는가.
2. Windows 로그인 후 Docker Desktop이 실행 중인가.
3. `docker compose ps`에서 서비스가 healthy인가.
4. PC와 휴대폰 모두 Tailscale이 연결 상태인가.
5. 휴대폰이 정확히 `PUBLIC_ORIGIN`과 같은 주소를 쓰는가.
6. PC에서 Tailscale 주소로 접속해도 되는가.
7. Windows 방화벽이 연결을 막는가.

## 8. 휴대폰 딸깍 운영 방식

### 가장 단순한 일상 흐름

1. 집 Codex가 기능 브랜치에 작업하고 PR을 만든다.
2. GitHub Actions가 CI를 실행한다.
3. 휴대폰 GitHub 앱/웹에서 diff와 checks를 확인한다.
4. 휴대폰에서 squash merge한다.
5. 집 PC의 자동 동기화가 `main`을 pull하고 Compose를 다시 빌드한다.
6. 휴대폰 홈 화면의 대나무숲 바로가기를 열어 확인한다.

이 방식은 별도 유료 서버가 필요 없다.

### 자동 동기화 스크립트 설계

집 Codex에 아래 요구사항으로 `scripts/home-sync.ps1`을 만들게 한다.

- 현재 브랜치가 `main`이 아니면 중단한다.
- worktree가 dirty면 중단하고 사용자 변경을 건드리지 않는다.
- `git fetch origin main` 후 로컬과 원격 SHA가 같으면 아무 작업도 하지 않는다.
- 다르면 `git pull --ff-only origin main`만 허용한다.
- `docker compose config --quiet` 성공 후 `docker compose up -d --build`를 실행한다.
- 동시에 두 번 실행되지 않게 lock을 둔다.
- secret이나 `.env` 내용을 로그에 남기지 않는다.
- 결과는 저장소 밖 또는 Git ignored 로그에 시간과 성공/실패만 남긴다.

참고 구현:

```powershell
param(
    [string]$RepoPath = "C:\dev\gs-rest-service"
)

$ErrorActionPreference = "Stop"
$lockPath = Join-Path $env:TEMP "gs-rest-service-home-sync.lock"
$logPath = Join-Path $env:LOCALAPPDATA "gs-rest-service\home-sync.log"
$lockStream = $null

try {
    New-Item -ItemType Directory -Path (Split-Path $logPath) -Force | Out-Null
    $lockStream = [System.IO.File]::Open(
        $lockPath,
        [System.IO.FileMode]::CreateNew,
        [System.IO.FileAccess]::Write,
        [System.IO.FileShare]::None
    )

    Set-Location -LiteralPath $RepoPath

    $branch = (git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -ne "main") {
        throw "main branch가 아니므로 중단"
    }

    $dirty = git status --porcelain
    if ($LASTEXITCODE -ne 0 -or $dirty) {
        throw "worktree에 변경이 있으므로 중단"
    }

    git fetch origin main
    if ($LASTEXITCODE -ne 0) { throw "git fetch 실패" }

    $localSha = (git rev-parse HEAD).Trim()
    $remoteSha = (git rev-parse origin/main).Trim()

    if ($localSha -eq $remoteSha) {
        Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) no-change"
        exit 0
    }

    git pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) { throw "git pull 실패" }

    docker compose config --quiet
    if ($LASTEXITCODE -ne 0) { throw "compose config 실패" }

    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) { throw "compose rebuild 실패" }

    Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) deployed $remoteSha"
}
catch {
    Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) failed: $($_.Exception.Message)"
    exit 1
}
finally {
    if ($lockStream) {
        $lockStream.Dispose()
        Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
    }
}
```

### Windows 작업 스케줄러

1. `작업 스케줄러`를 연다.
2. `작업 만들기`를 선택한다.
3. 이름: `gs-rest-service home sync`
4. 트리거: 로그인할 때 시작, 이후 5분마다 반복
5. 동작의 프로그램: `powershell.exe`
6. 인수:

```text
-NoProfile -ExecutionPolicy Bypass -File "C:\dev\gs-rest-service\scripts\home-sync.ps1"
```

7. 시작 위치:

```text
C:\dev\gs-rest-service
```

8. 이미 실행 중이면 새 인스턴스를 시작하지 않도록 설정한다.
9. 실패 시 5분 뒤 다시 시작하도록 설정한다.
10. 먼저 수동 실행해 로그와 배포 결과를 확인한다.

주의: 자동 동기화 도중 로컬 수정이 있으면 의도적으로 배포하지 않는다. 수정 내용을 보호하기 위한 동작이다.

## 9. 휴대폰에서 PC 자체를 조작해야 할 때

### 쉬운 방식: Chrome Remote Desktop

Google 공식 페이지:

- https://remotedesktop.google.com/
- https://support.google.com/chrome/answer/1649523

집 PC에서 원격 액세스를 설정하고 PIN을 만든 뒤 Android 앱에서 같은 Google 계정으로 접속한다.

용도:

- Docker Desktop이 꺼졌을 때 켜기
- Codex 화면 확인
- 수동으로 pull/rebuild
- 작업 스케줄러 오류 확인

주의:

- 강한 PIN과 Google 2단계 인증을 사용한다.
- 집 PC가 완전히 꺼져 있으면 접속할 수 없다.
- 잠금 화면 상태나 Windows 업데이트 재부팅 뒤에는 환경에 따라 수동 로그인이 필요할 수 있다.

### 가벼운 방식: Tailscale + Windows OpenSSH

전체 화면을 볼 필요 없이 명령만 실행할 때 사용한다.

Microsoft 공식 설치 문서:

https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse

원칙:

- Windows OpenSSH Server는 선택 기능으로 설치한다.
- 비밀번호보다 SSH 키 인증을 사용한다.
- 방화벽 포트 22는 Tailscale에서만 접근 가능하게 제한한다.
- 공유기 포트포워딩은 하지 않는다.
- 휴대폰 SSH 앱에서 집 PC의 Tailscale 이름으로 접속한다.

접속 뒤 자주 쓸 명령:

```powershell
Set-Location C:\dev\gs-rest-service
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\home-sync.ps1
docker compose ps
docker compose logs --tail=100
```

## 10. 집 PC 전원 문제

무료 구성에서 가장 중요한 한계다.

- 집 PC가 켜져 있으면 휴대폰에서 언제든 접속할 수 있다.
- 절전 또는 종료 상태면 Tailscale, Docker, 원격 데스크톱도 모두 멈춘다.
- 클라우드 서버를 쓰지 않는 이상 꺼진 PC를 대신 실행해 줄 곳은 없다.
- Wake-on-LAN은 메인보드와 공유기가 지원할 때만 가능하며 외부에서 깨우려면 항상 켜진 공유기/VPN 장치가 필요하다.
- 추가 장비 없이 확실하게 쓰려면 외출 중 테스트할 날에만 집 PC의 절전을 끄고, Docker를 올려 둔다.
- 상시 공개 서비스가 목적이 아니므로 테스트가 끝나면 `docker compose down`하고 PC를 절전해도 된다.

Windows에서는 테스트 시간 동안만 다음을 확인한다.

- 전원 및 배터리 설정에서 절전 시간을 조정
- Docker Desktop 로그인 시 자동 시작
- Tailscale 로그인 시 자동 시작
- Windows Update의 예기치 않은 재부팅 시간 조정

## 11. Git/PR/CI 일상 명령

### 새 작업 시작

```powershell
git switch main
git pull --ff-only origin main
git status -sb
git switch -c feat/short-description
```

문서 작업은 `docs/...`, 수정은 `fix/...`, 리팩터링은 `refactor/...`를 사용한다.

### 작업 검증

변경 범위에 맞는 테스트만 우선 실행하고, PR의 GitHub Actions 결과를 함께 확인한다. 저장소의 상세 검증 방법은 `AGENTS.md`와 각 docs 문서를 따른다.

### 머지 후 집 PC

```powershell
git switch main
git pull --ff-only origin main
docker compose up -d --build
```

`--ff-only`가 실패하면 무시하고 일반 pull로 덮지 않는다. 로컬 `main`에 별도 커밋이 생겼거나 분기된 것이므로 `git status -sb`와 `git log --oneline --decorate -10`을 먼저 확인한다.

## 12. 비용 0원 유지 규칙

- Codespaces는 사용하지 않거나, 월 무료 제공량이 재설정됐을 때 꼭 필요한 짧은 복구에만 쓴다.
- 별도 VM, VPS, 고정 IP, 유료 터널, 유료 도메인을 만들지 않는다.
- Tailscale Personal 범위 안에서 집 PC와 개인 휴대폰만 연결한다.
- GitHub Actions는 계정의 무료 제공량과 현재 usage를 확인한다.
- Actions에서 매 push마다 무거운 이미지 빌드가 불필요하게 반복되지 않도록 워크플로를 남발하지 않는다.
- AI 공급자의 API는 무료라고 가정하지 않는다. 키를 비워도 되는 구조로 쓰고, 필요할 때 현재 quota를 확인한다.
- 집 PC 전기료는 서비스 요금은 아니지만 실제 비용이다. 테스트할 때만 켜는 것이 가장 싸다.
- Docker Hub 또는 GHCR에 이미지를 올리는 CD는 필요할 때만 추가한다. 현재는 집 PC에서 source build하는 것으로 충분하다.

## 13. 왜 GitHub Actions CD를 지금 바로 안 쓰는가

GitHub-hosted runner는 집 PC에 직접 배포할 수 없다. 집 PC가 외부에서 명령을 받을 통로가 필요하다.

가능한 선택지는:

1. 집 PC self-hosted runner
2. 외부 공개 SSH
3. 유료 클라우드 중계 서버
4. 집 PC가 GitHub를 주기적으로 확인하는 pull 방식

이 중 현재 조건에 맞는 것은 4번이다.

- 무료
- 집 네트워크 인바운드 공개 없음
- 공개 저장소 runner 위험 없음
- 휴대폰 머지 후 자동 반영 가능

나중에 저장소를 private으로 전환하고 runner 보안 경계를 별도로 설계하거나, 실제 서버가 생겼을 때만 CD를 다시 검토한다.

## 14. 장애별 복구표

| 증상 | 먼저 볼 것 | 조치 |
|---|---|---|
| clone 인증 실패 | 저장소 URL, GitHub 로그인 | Git Credential Manager로 다시 로그인 |
| Docker 명령 실패 | Docker Desktop 상태 | Docker Desktop 실행 후 재시도 |
| Compose config 실패 | `.env` 누락/문법 | `Copy-Item .env.example .env` 후 값 확인 |
| backend가 DB 인증 실패 | 기존 volume과 새 비밀번호 불일치 | 데이터 불필요 확인 후 `down -v` 초기화 |
| 글 등록 403 | 브라우저 Origin과 `PUBLIC_ORIGIN` | 주소를 scheme/host/port까지 동일하게 맞춤 |
| 휴대폰 접속 불가 | PC/Tailscale/Docker 상태 | 양쪽 VPN, `docker compose ps`, 방화벽 확인 |
| 자동 pull 안 됨 | 로컬 branch/dirty 상태 | `main` 복귀 또는 변경을 별도 브랜치에 보존 |
| `--ff-only` 실패 | 로컬 main 분기 | 일반 pull 금지, 로그 확인 후 Codex에 진단 요청 |
| 최신 UI가 안 보임 | 이미지 재빌드/브라우저 캐시 | `docker compose up -d --build` 후 새로고침 |
| AI만 실패 | API key/provider | 새 키와 모델명 확인, 키는 로그에 노출 금지 |
| 원격 데스크톱 불가 | PC 전원/로그인 | PC가 켜졌는지, host 서비스가 실행 중인지 확인 |

## 15. 최종 이전 체크리스트

### 코드

- [ ] 집 PC에 저장소 clone
- [ ] `main` 최신 pull
- [ ] `git status -sb` clean 확인
- [ ] `AGENTS.md`와 이 문서 확인

### 환경변수

- [ ] `.env.example`에서 `.env` 생성
- [ ] 새 PostgreSQL 비밀번호 생성
- [ ] `PUBLIC_ORIGIN` 결정
- [ ] 필요할 때만 새 AI API key 발급
- [ ] `git check-ignore -v .env` 확인

### 실행

- [ ] Docker Desktop/WSL 2 정상
- [ ] `docker compose config --quiet` 통과
- [ ] `docker compose up -d --build` 성공
- [ ] `docker compose ps` healthy
- [ ] PC 브라우저에서 글 작성/사진/투표 확인

### 휴대폰

- [ ] PC와 휴대폰에 Tailscale 설치
- [ ] 같은 tailnet 로그인
- [ ] Tailscale 주소를 `PUBLIC_ORIGIN`에 반영
- [ ] 휴대폰 Chrome에서 접속
- [ ] 홈 화면 바로가기 생성
- [ ] 선택: Chrome Remote Desktop
- [ ] 선택: OpenSSH key 접속

### 자동화

- [ ] `scripts/home-sync.ps1` 생성
- [ ] 수동 실행 성공
- [ ] Windows 작업 스케줄러 5분 반복
- [ ] dirty worktree에서 안전하게 중단하는지 확인
- [ ] 휴대폰 PR 머지 후 자동 재빌드 확인

## 16. 다음 집 Codex가 바로 할 일

1. 이 문서와 `AGENTS.md`를 읽는다.
2. 집 로컬 clone과 `.env`를 준비한다.
3. Compose smoke test를 실행한다.
4. `scripts/home-sync.ps1`을 위 안전 조건대로 실제 파일로 추가한다.
5. 해당 스크립트는 별도 `chore/home-main-sync` 브랜치와 PR로 관리한다.
6. Tailscale 접속 주소를 확정한 뒤 `PUBLIC_ORIGIN`을 로컬 `.env`에서만 바꾼다.
7. 휴대폰에서 게시판 접근과 글 등록을 확인한다.
8. 그 다음부터 기존 모바일 우선 UI 작업을 이어간다.

이 문서 자체는 secret을 포함하지 않는다. 실제 secret은 오직 집 PC의 `.env` 또는 필요한 GitHub Secret에만 둔다.
