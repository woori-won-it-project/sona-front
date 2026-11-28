# sona-web

**Sona** — 보험 약관·설명서 문구를 금감원 분쟁조정 사례와 대조해 소비자 오해 소지를 검증하는 B2B 서비스의 프론트엔드입니다.

백엔드는 별도 레포 `sona-server` (Spring Boot, 로컬 `http://localhost:8080`)를 사용합니다. 연동 시 [API 명세서](docs/api/SONA_API_SPEC.md)와 [프론트엔드 연동 가이드](docs/api/SONA_FE_INTEGRATION_GUIDE.md)를 참조합니다. 화면별 적용 범위와 확인 필요 항목은 [화면 명세](SPEC.md)에 정리합니다.

## 기술 스택

| 항목          | 선택                                                     | 설치 버전                 |
| ------------- | -------------------------------------------------------- | ------------------------- |
| 런타임        | Node.js LTS                                              | 24 (`.nvmrc`)             |
| 빌드          | Vite + React                                             | vite 8.3.8 / react 19.3.1 |
| 언어          | JavaScript                                               | -                         |
| 패키지 매니저 | npm (`package-lock.json` 커밋)                           | -                         |
| 스타일        | Tailwind CSS (`@tailwindcss/vite`)                       | 4.3.5                     |
| API 호출      | axios + TanStack Query (`@tanstack/react-query`)         | axios 1.21.1 / 5.108.3    |
| 라우팅        | React Router (`react-router`, `react-router-dom` 미사용) | 8.5.2                     |
| 코드 스타일   | ESLint + Prettier (`prettier-plugin-tailwindcss`)        | eslint 10.15.0 / 3.10.1   |

## 폴더 구조

```
src/
├── api/                  # 서버 호출 전용. axios 인스턴스(client.js)와 API 함수
├── hooks/                # TanStack Query 훅. 화면은 여기서만 데이터를 받는다
├── pages/                # 라우트 단위 화면
├── components/
│   └── layout/           # 공통 레이아웃 (AppLayout: 헤더 + <Outlet/>)
├── router.jsx            # 라우트 정의
├── main.jsx              # QueryClientProvider + RouterProvider
└── index.css             # Tailwind 진입점
```

- 경로 별칭: `@` → `src` (예: `import { useHealth } from '@/hooks/useHealth'`)

## 사전 설치

- **Node.js 24 LTS** — 버전은 `.nvmrc` 참고 (nvm 사용 시 `nvm use`)
- **Docker Desktop** — 백엔드(`sona-server`)를 띄울 때 필요

## 실행 방법

### 1. 환경 변수 파일 복사

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
```

```bash
# Mac
cp .env.example .env
```

| 변수                    | 설명                                    | 기본값                  |
| ----------------------- | --------------------------------------- | ----------------------- |
| `VITE_API_BASE_URL`     | axios baseURL                           | `/api/v1`               |
| `VITE_API_PROXY_TARGET` | 개발 서버가 `/api` 요청을 전달할 백엔드 | `http://localhost:8080` |

### 2. 패키지 설치

```bash
npm install
```

### 3. 백엔드 띄우기 (`sona-server` 레포에서)

```bash
docker compose -f infra/docker-compose.yml --env-file .env --profile app up -d --build
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 에 접속하면 로그인 화면이 열립니다.
백엔드 연결은 http://localhost:5173/health 에서 확인합니다. 백엔드가 꺼져 있으면 "서버 연결 실패"가 표시됩니다.

개발 서버에서 `?mock=1`로 문서 등록과 질문 선택을 확인할 수 있습니다. 목업 요청은 브라우저 안에서 처리됩니다.

- [문서 등록](http://localhost:5173/documents?mock=1) · [파일 오류 후 수동 재시도](http://localhost:5173/documents?mock=1&scenario=upload-error) · [등록 응답 유실](http://localhost:5173/documents?mock=1&scenario=response-lost)
- [저장된 질문 선택 복원](http://localhost:5173/questions/1?mock=1&scenario=restored) · [질문 확정 응답 유실](http://localhost:5173/questions/1?mock=1&scenario=response-lost)

실제 문서 등록은 리디렉션을 차단하는 공통 전송 방식을 사용합니다. 등록 요청 중에는 로딩을 표시하고 서버가 201을 반환하면 등록을 완료합니다. [프론트엔드 개발 가이드](docs/FRONTEND_DEVELOPMENT_GUIDE.md)

### 스크립트

| 명령                   | 설명                    |
| ---------------------- | ----------------------- |
| `npm run dev`          | 개발 서버               |
| `npm run build`        | 프로덕션 빌드 (`dist/`) |
| `npm run preview`      | 빌드 결과 미리보기      |
| `npm run lint`         | ESLint 검사             |
| `npm run format`       | Prettier로 전체 포맷    |
| `npm run format:check` | 포맷 검사만 (수정 없음) |

## 규칙

- **서버 호출은 `src/api/` 안에서만 한다.** 화면·컴포넌트에서 axios나 fetch를 직접 쓰지 않는다.
- **데이터는 TanStack Query 훅으로 받는다.** 화면은 `src/hooks/`의 훅을 통해서만 서버 데이터를 사용한다.
- 문서 분석은 검수 생성 후 동기 요청으로 실행합니다. 응답 유실 시 검수 상세에서 현재 단계를 확인합니다. 개발용 목업 미리보기는 현재 구현의 테스트 경로입니다.
- **스타일은 Tailwind 클래스로** 작성한다.
- **커밋 전 `npm run lint`와 `npm run format`** 을 실행한다.

## 주의사항

- `.env`는 커밋하지 않는다. 새 변수가 생기면 `.env.example`에 추가한다.
- 패키지 추가는 **npm으로만** 한다. (`yarn.lock`, `pnpm-lock.yaml`이 생기지 않게)
