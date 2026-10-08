# 모루 · AI Learning Platform POC

Next.js App Router와 Vercel AI SDK로 구현한 한국어 자료 기반 학습 서비스입니다. 주제를 입력하면 DeepSeek가 Tavily 검색 자료를 바탕으로 3개 챕터, 9개 레슨, 27개 퀴즈를 만들고 브라우저에 저장합니다.

## 실행

Node.js 22 이상과 pnpm이 필요합니다. AI SDK 7의 Node.js 요구 버전에 맞췄습니다.

```powershell
pnpm install
pnpm dev
```

http://localhost:3000 에서 **Docker 데모 체험**을 누르면 API 키 없이 전체 학습 흐름을 확인할 수 있습니다. 데모는 공식 Docker 문서를 참고해 미리 작성한 고정 입문 코스이며, 입력한 다른 주제로 AI 생성한 결과가 아닙니다.

## 실제 AI 생성 연결

```powershell
if (!(Test-Path -LiteralPath .env.local)) { Copy-Item .env.example .env.local }
```

`.env.local`에 아래 두 키를 입력하고 개발 서버를 다시 시작하세요.

```dotenv
DEEPSEEK_API_KEY=본인의_DeepSeek_API_키
TAVILY_API_KEY=본인의_Tavily_API_키
```

DeepSeek API 주소는 `https://api.deepseek.com`, 기본 모델은 `deepseek-flash`로 설정되어 있어 키 두 개만 입력하면 됩니다. 모델 변경이 필요할 때만 `DEEPSEEK_MODEL`을 지정하세요. [DeepSeek 공식 Responses API](https://api-docs.deepseek.com/api/create-response/)의 구조화된 JSON 출력을 사용하며, 설치된 AI SDK의 OpenAI 호환 어댑터로 DeepSeek에 직접 요청합니다. OpenAI API 키는 필요하지 않습니다.

두 키가 설정되면 홈의 **학습 코스 만들기**가 활성화됩니다. 키가 채워졌다는 뜻이며, 인증 성공 여부는 실제 생성 요청에서 확인합니다. API 키는 서버에서만 사용하고 `.env.local`은 Git에 포함되지 않습니다.

개발 서버를 실행 중이라면 터미널에서 `Ctrl+C`로 종료한 뒤 `pnpm dev`로 다시 시작하고 브라우저를 새로고침하세요. 주제와 수준을 입력해 **학습 코스 만들기**를 누르면 자료 검색, 출처 목록, 생성된 레슨과 퀴즈를 확인할 수 있습니다.

주제·수준 분석 → 검색어 3개 생성 → Tavily 순차 검색 → 중복 제거 및 출처 5~10개 선별 → 한국어 커리큘럼 생성 → Zod 구조·출처 참조 검증 → LocalStorage 저장 순서로 처리합니다. 홈에서 실제 처리 단계를 표시하며 검색 실패, 자료 부족, 시간 초과, 잘못된 AI 출력은 재시도 가능한 오류로 안내합니다. 사용자 입력과 검색 자료 안의 지시는 신뢰하지 않습니다. 전체 웹페이지 크롤링은 수행하지 않고 Tavily 검색 요약을 사용합니다.

AI 기능을 호출하면 해당 서비스의 사용 요금이 발생할 수 있습니다. 제공되는 콘텐츠는 AI가 검색 요약을 바탕으로 만든 교육 자료이므로 연결된 출처에서 내용을 확인할 수 있습니다.

## 학습 동작

- 코스 → 짧은 학습 카드 → 4지선다 퀴즈 → 정답·해설 → 결과 → 다음 레슨.
- 통과 기준은 정확한 정답률 70% 이상입니다. 3문제 중 2문제는 66.7%이므로 3문제를 모두 맞혀야 통과합니다.
- 처음 맞힌 문제마다 10 XP를 지급합니다. 재도전·복습에서 같은 문제를 다시 맞혀도 중복 지급하지 않습니다. 이미 통과한 레슨은 복습 점수가 낮아져도 완료 상태를 유지합니다.
- 코스, 완료 레슨, 퀴즈 결과, 누적 XP, 현재 레슨, 읽던 카드를 `moru-learning:v1`에 저장합니다. 저장 실패 시 현재 세션에서 학습을 계속할 수 있고 오류를 표시합니다.
- 저장 데이터가 손상되면 원본을 자동으로 지우지 않고 오류를 표시합니다. 기록을 초기화하려면 브라우저 개발자 도구에서 해당 LocalStorage 키를 제거하세요.
- LocalStorage 기반이므로 같은 브라우저와 같은 주소에서 이어서 학습할 수 있습니다. `localhost`와 `127.0.0.1`은 서로 다른 저장 공간을 사용합니다. 회원가입, DB, 결제, 채팅, 소셜 기능은 포함하지 않습니다.

## 검증

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

단위·API 테스트는 외부 API 대신 검증된 응답을 주입해 학습 순서, XP, 저장 복구, 출처 필터링, 오류 처리, DeepSeek 요청 주소·인증·JSON 스키마·추론 설정과 서버 파이프라인을 검증합니다. 브라우저 테스트는 실제 데모 API로 학습·재도전·잠금·새로고침을 확인하며, AI 생성 화면은 모의 스트림 응답으로 주제·수준 전달과 코스·출처 저장을 확인합니다.

브라우저 테스트 기본값은 설치된 Microsoft Edge입니다. Chrome을 쓰려면 PowerShell에서 `$env:PLAYWRIGHT_CHANNEL='chrome'`로 지정하세요. 브라우저가 없으면 `pnpm exec playwright install chromium`으로 설치하고 `$env:PLAYWRIGHT_CHANNEL='chromium'`을 지정하세요. 이미 실행 중인 localhost:3000 서버를 재사용하거나 테스트가 개발 서버를 실행합니다.

일부 관리형 Windows 환경의 pnpm 실행 래퍼가 의존성 검사를 위해 재설치를 수행할 수 있습니다. 이 환경에서는 설치 후 검증 명령을 병렬로 실행하지 않거나 직접 Node CLI를 사용할 수 있습니다.

```powershell
node node_modules/next/dist/bin/next typegen
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src tests playwright.config.ts
node --conditions=react-server --import tsx --test src/lib/*.test.ts src/lib/server/*.test.ts
node node_modules/@playwright/test/cli.js test
node node_modules/next/dist/bin/next build
```

## 코드 구조

- `src/app`: 홈, 코스, 레슨, 퀴즈 및 Route Handler.
- `src/components`: 한국어 반응형 UI, shadcn 방식의 공통 컴포넌트, LocalStorage 구독.
- `src/lib/types.ts`: Zod 스키마와 AI 초안의 서버 측 ID 부여.
- `src/lib/learning.ts`: 점수·XP·진도·잠금 규칙.
- `src/lib/storage.ts`: 버전과 코스·진도 일관성을 검사하는 저장 계층.
- `src/lib/demo-course.ts`: Docker 데모 콘텐츠.
- `src/lib/server`: DeepSeek·Tavily 서버 파이프라인.
- `tokens.css`: Garden 테마 토큰.

실제 DeepSeek·Tavily 호출 검증에는 본인의 유효한 API 키가 필요합니다. 키 없이 데모·단위·API·브라우저 검증을 실행할 수 있습니다.

2026-10-08 DeepSeek 전환 검증 결과: 프로덕션 빌드·타입 검사·lint 통과, 단위·API 테스트 28개 및 프로덕션 Edge 브라우저 테스트 10개 통과. 모의 DeepSeek·Tavily 응답으로 서버 생성 흐름을 검증하고, 모의 AI 생성 스트림으로 주제·수준 전달과 코스·출처 저장을 확인했습니다. 320·375·414·768px 반응형 화면과 학습·재도전·저장·잠금도 확인했습니다. 실제 DeepSeek·Tavily API 호출은 키 입력 후 테스트해야 합니다.
