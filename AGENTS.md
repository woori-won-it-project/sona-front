# AGENTS.md

Claude Code, Codex 등 AI 도구가 이 저장소에서 작업할 때 지켜야 할 규칙입니다.

## 커밋 메시지

- 형식: `TYPE: 요약` (TYPE 은 대문자)
- TYPE: `FEAT`, `FIX`, `REFACTOR`, `DOCS`, `TEST`, `CHORE`, `CI`, `BUILD`, `STYLE`, `PERF`
- 예: `FEAT: 문서 업로드 화면 추가`
- 커밋 전에 `npm run format`, `npm run lint` 를 실행해 통과시킨다.

## PR

- PR 제목은 커밋 메시지와 같은 형식으로 쓴다. (squash merge 시 dev 의 커밋 메시지가 됨)
- PR 본문은 GitHub PR 템플릿 양식을 그대로 채운다:
  - 관련 이슈
  - 작업 요약 (무엇을, 왜)
  - PR 유형 (해당 항목 모두 체크)
  - 주요 변경 사항
  - 스크린샷 (UI 변경 시)
  - 리뷰 요청 사항 (선택)
  - PR Checklist
- 대상 브랜치: 기능 브랜치 → `dev`

## 테스트

- 테스트 파일은 `*.test.js` / `*.test.jsx` 로 만들면 `npm test` 와 CI 에서 자동 실행된다.

## 보안

- `.env` 는 커밋하지 않는다. 새 환경변수는 `.env.example` 에 키 이름만 추가한다.
- `VITE_` 로 시작하는 환경변수는 빌드 결과(JS 파일)에 그대로 들어가 누구나 볼 수 있다. API 키·비밀번호 등 비밀값은 절대 넣지 않는다.
- API 키·비밀번호를 코드, 커밋 메시지, PR 본문에 쓰지 않는다.
