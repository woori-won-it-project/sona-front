# Sona 프론트엔드 개발 가이드

처음 맡은 화면은 **개발 서버 실행 → 이슈와 작업 브랜치 생성 → Figma 확인 → 화면과 API 연결 → 테스트 → PR** 순서로 진행하세요. 이 문서는 02·04·06·08·10·12번 화면 담당자를 위한 안내입니다.

> 이 가이드 작성 시점에는 이슈 #11의 공통 인증과 01·03·05번 연동이 작업 트리에 있습니다. 현재 `dev`는 이슈 #11 반영 전입니다. 최신 `dev`를 받은 뒤 아래 파일과 라우트를 확인하고, #11이 반영되면 공통 인증과 인계 지점을 사용하세요. 승인·분석 화면의 UI와 목업 테스트는 연동 작업과 병행할 수 있습니다.

## 1. 처음 실행하기

1. Git과 **Node.js 24**를 준비합니다. 팀 버전은 [.nvmrc](../.nvmrc)에서 확인합니다. 터미널에서 `git --version`, `node -v`, `npm -v`를 실행해 설치 여부를 확인합니다. 실제 백엔드도 로컬에서 실행하려면 Docker Desktop이 필요합니다.
2. 저장소가 없으면 아래 명령으로 내려받습니다. 이미 저장소를 받았다면 프로젝트 폴더에서 시작합니다.

   ```powershell
   git clone https://github.com/woori-won-it-project/sona-front.git
   cd sona-front
   ```

3. 의존성을 설치하고 환경변수를 준비합니다. 아래 명령은 PowerShell용입니다. macOS에서 처음 복사할 때는 `cp .env.example .env`를 사용합니다. 기존 `.env`가 있으면 필요한 키를 직접 확인하세요.

   ```powershell
   npm ci
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   npm run dev
   ```

4. 터미널에 표시된 주소로 접속합니다. 기본 주소는 `http://localhost:5173`이며, 종료할 때는 서버를 실행한 터미널에서 Ctrl+C를 누릅니다. `/login`은 로그인, `/health`는 백엔드 연결 확인 화면입니다. `/health`에 표시되는 상태만으로 로그인 쿠키나 다른 API의 동작까지 확인할 수는 없습니다.
5. 실제 연동이 필요하면 별도 디렉터리의 `sona-server`에서 아래 명령을 실행합니다. 백엔드 `.env`와 초기 설정은 해당 저장소의 안내를 확인합니다. 프론트엔드와 백엔드는 각각의 터미널에서 실행합니다.

   ```powershell
   docker compose -f infra/docker-compose.yml --env-file .env --profile app up -d --build
   ```

#11 기준의 프론트엔드 환경 예시는 아래와 같습니다. `.env`를 바꿨으면 Vite를 재시작합니다. `VITE_` 값은 빌드 결과에 노출되므로 비밀값을 넣지 않고, `.env`는 커밋 대상에서 제외합니다. [.env.example](../.env.example) · [README](../README.md) · [Vite 프록시](../vite.config.js)

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY_TARGET=http://localhost:8080
```

## 2. GitHub 이슈에서 PR까지

1. GitHub의 **Issues → New issue**에서 담당 화면 번호·이름, Figma 링크, 작업 범위, 연동할 API, 완료 기준, 미확정 항목을 적습니다. 이슈 번호를 기억합니다.
2. 변경이 없는 작업 트리에서 `dev`를 최신화하고 기능 브랜치를 만듭니다. 예시는 이슈 #42입니다. `git status -sb`에 기존 변경사항이 보이면 먼저 변경의 소유와 보관 방법을 확인하세요. `git pull --ff-only`가 실패하면 원인을 확인한 뒤 진행합니다.

   ```powershell
   git status -sb
   git switch dev
   git pull --ff-only origin dev
   git switch -c feat/42-review-home
   ```

3. 맡은 화면부터 구현합니다. 작업 브랜치에서 `git status -sb`와 `git diff`로 변경 파일을 확인합니다. 공통 설정이나 다른 화면의 수정이 필요하면 담당자와 범위를 맞춥니다.
4. 테스트와 브라우저 검증을 마치고, 커밋 전에 저장소 규칙대로 `npm run format`과 `npm run lint`를 실행합니다. 전체 포맷으로 다른 팀원 파일에 생긴 변경이 있는지 확인합니다. 작업한 파일을 하나씩 스테이징하고 `git diff --cached`로 커밋에 들어갈 내용을 봅니다.

   ```powershell
   git add src/pages/ReviewHomePage.jsx
   git diff --cached
   git commit -m "FEAT: 02 검수 홈 추가"
   git push -u origin feat/42-review-home
   ```

   위 파일명과 브랜치명은 예시입니다. 실제로 수정한 API, 훅, 테스트 등도 필요한 파일만 추가하세요. 커밋 형식은 `TYPE: 요약`이며 `TYPE`은 대문자를 사용합니다. 팀 규칙에 따라 `dev`와 `main`에 직접 push하지 않습니다.

5. GitHub **Pull requests → New pull request**에서 **base는 `dev`, compare는 내 기능 브랜치**로 지정합니다. PR 제목은 커밋 형식을 사용합니다. 제공되는 PR 템플릿에 관련 이슈(예시 `Closes #42`), 무엇을 왜 바꿨는지, PR 유형, 주요 변경 사항, UI 스크린샷, 리뷰 요청 사항, 체크리스트를 채웁니다. 템플릿이 표시되지 않으면 [AGENTS.md](../AGENTS.md)의 항목을 사용합니다.
6. CI 결과와 리뷰를 확인합니다. 리뷰 수정은 같은 기능 브랜치에 커밋하고 push하면 기존 PR에 반영됩니다. 검증하지 못한 실제 서버 연동과 남은 계약 문제는 PR 본문에 남깁니다.

## 3. 문서를 읽는 순서와 파일 위치

| 문서                                                       | 확인할 내용                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| [README.md](../README.md)                                  | 설치, 환경변수, 실행·검사 명령                                    |
| [AGENTS.md](../AGENTS.md)                                  | 구현 범위, Git·보안·테스트 규칙과 Codex에 적용할 저장소 규칙      |
| [SPEC.md](../SPEC.md)                                      | 화면 번호, Figma 노드 ID, UI 공통 규격, 화면 동작, 확인 필요 항목 |
| [API 명세서](api/SONA_API_SPEC.md)                         | HTTP 메서드, 요청·응답 필드, 상태 코드, 오류 코드                 |
| [프론트엔드 연동 가이드](api/SONA_FE_INTEGRATION_GUIDE.md) | 인증, API 호출 순서, 단계 이동, 응답 유실과 상태 복원             |

먼저 `SPEC.md`에서 내 화면을 찾고 Figma의 활성 프레임·개발 주석·프로토타입을 확인합니다. 이후 API 명세서에서 **메서드와 경로**를 함께 찾습니다. 일부 API 번호는 중복됩니다. 화면과 서버 문서가 충돌하면 차이와 영향을 기록하고 담당자에게 확인하세요. 화면 구조는 [Figma 기준 디자인](https://www.figma.com/design/coKkohqI7eZjIqq6f45AH4/?node-id=1024-13327)을 따릅니다.

| 위치              | 맡는 일                         |
| ----------------- | ------------------------------- |
| `src/api/`        | 서버 요청과 응답 해석           |
| `src/hooks/`      | 서버 데이터 조회·변경·캐시 관리 |
| `src/pages/`      | 화면 상태와 흐름                |
| `src/components/` | 여러 화면에서 재사용하는 UI     |
| `src/router.jsx`  | URL과 화면 연결                 |
| `src/main.jsx`    | Query·Router Provider 등록      |

## 4. 공통 Axios와 TanStack Query 사용하기

흐름은 **화면 → 훅 → API 함수 → 공통 Axios → 서버**입니다. `@/`는 `src/`의 경로 별칭입니다. 서버 요청은 `src/api/` 안에 작성하고 `client.get('/reviews')`처럼 상대 경로를 넘깁니다. 공통 클라이언트가 `/api/v1`을 붙이며, Vite는 `/api` 요청을 개발 백엔드로 전달합니다. [공통 Axios](../src/api/client.js) · [Vite 설정](../vite.config.js)

아래는 02번 목록에 새로 작성할 파일의 예시입니다. 조회에는 `useQuery`, 승인·삭제·등록 같은 서버 변경에는 `useMutation`을 사용합니다. 성공 후 영향받은 목록이나 상세 캐시를 갱신하고, 저장 여부가 불명확하면 서버 상태를 조회한 뒤 재시도를 결정합니다.

```js
// src/api/reviews.js 예시
import client from '@/api/client';

export async function listReviews({ status, signal }) {
  const { data } = await client.get('/reviews', { params: { status }, signal });
  return data.data;
}
```

```js
// src/hooks/useReviews.js 예시
import { useQuery } from '@tanstack/react-query';
import { listReviews } from '@/api/reviews';

export function useReviews(status) {
  return useQuery({
    queryKey: ['reviews', status],
    queryFn: ({ signal }) => listReviews({ status, signal }),
  });
}
```

화면에서는 `isPending`, `isError`, 빈 배열, 성공 결과를 표현합니다. 입력 중인 답안, 열린 모달, 미확정 체크박스는 화면 로컬 상태로 관리합니다. 캐시 키에는 필요한 검수 ID, 실험 ID, 문항 ID, 버전을 넣어 서로 다른 결과가 섞이지 않게 합니다. 공통 Provider는 이미 등록돼 있습니다. [main.jsx](../src/main.jsx) · [05번 훅 참고](../src/hooks/useQuestionSelection.js)

**인증 흐름**은 01번에서 `issueCsrfToken()`을 실행하고 `login({ employeeNumber, password })`를 호출합니다. 다른 화면에서 공통 Axios를 사용하면 쿠키 포함, 변경 요청의 CSRF 헤더, 같은 페이지에서의 동시 401 갱신과 원 요청 1회 재시도를 재사용합니다. `401 UNAUTHORIZED`는 인증 갱신 대상이고 `403 INVALID_CSRF_TOKEN`은 CSRF 확인이 필요한 오류입니다. 갱신 인증 실패 시 공통 설정이 로그인으로 이동합니다. `Cookie`·`Authorization` 헤더를 화면에서 직접 만들거나 토큰·비밀번호를 저장하지 마세요. 로그아웃 버튼은 훅에서 `logout()`을 호출하고 성공 후 `/login`으로 이동하도록 연결합니다. [auth.js](../src/api/auth.js) · [01번 로그인 훅](../src/hooks/useLogin.js)

**공통 UI**는 기존 화면에서 용도를 확인한 뒤 재사용하세요.

- `ReviewWorkspaceLayout`은 검수 작업용 사이드바와 헤더를 제공합니다. 확정된 주소를 `homePath`, `reportPath`로 전달하고, 헤더에 이전 이동 버튼이 필요하면 `headerStart`를 사용합니다. [ReviewWorkspaceLayout.jsx](../src/components/layout/ReviewWorkspaceLayout.jsx)
- `ReviewSteps`에는 단계 목록과 현재 단계를 전달합니다. `AppLayout`은 헤더와 자식 라우트의 `Outlet`을 가진 기본 레이아웃이며 현재 `/health` 등에 쓰입니다. 검수 작업 화면은 Figma에 맞춰 적절한 레이아웃을 사용하세요. [ReviewSteps.jsx](../src/components/layout/ReviewSteps.jsx) · [AppLayout.jsx](../src/components/layout/AppLayout.jsx)
- 10번 파일 입력은 03번의 `DocumentUploadCard`와 파일 검증 코드를 참고하세요. 수정 등록의 필드와 응답은 10번 API 계약을 적용합니다. [DocumentUploadCard.jsx](../src/components/documents/DocumentUploadCard.jsx) · [문서 등록 상태](../src/pages/documentRegistrationState.js)

## 5. 짝수 페이지별 구현 순서

아래 메서드와 경로는 전달받은 API 문서 기준입니다. 브라우저 화면의 URL은 다음 절에서 별도로 확인하세요.

| 화면                      | 사용할 API                                                                                                                                                                                           | 먼저 구현할 동작과 주의점                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **02 검수 홈**            | `GET /reviews`, `GET /reviews/{reviewId}`, `DELETE /reviews/{reviewId}`                                                                                                                              | 목록을 `IN_PROGRESS`와 `COMPLETED`로 구분합니다. 신규 등록은 `/documents`로 이동합니다. 이어하기는 상세의 `currentStep`을 확인한 뒤 이동합니다. 홈 진행률은 단계별 표시값입니다. 삭제는 확인 모달을 거치고 진행 중인 검수만 대상으로 하며 분석·실험 중에는 막습니다.                                                                                                |
| **04 분석 진행**          | `POST /reviews/{reviewId}/analysis`, `GET /reviews/{reviewId}`                                                                                                                                       | 04번이 분석 시작 요청을 담당합니다. 동기 요청을 기다리는 동안 표시용 진행률을 제공하며 `200 OK`와 `QUESTION_SELECT`가 확인된 뒤 100%를 표시합니다. 새로고침·응답 유실 시 상세로 단계를 먼저 확인합니다. `DOC_UPLOAD`에서 가능하다고 확인한 경우 기존 ID로 분석만 재시도하고, `ANALYZING`이면 수동 확인을 제공합니다. 이 단계의 계약에는 SSE와 자동 폴링이 없습니다. |
| **06 검증 문항 승인**     | `GET /reviews/{reviewId}/questions`, `GET /questions/{questionId}`, `POST /questions/{questionId}/approve`, `POST /reviews/{reviewId}/questions/approval`, `POST /reviews/{reviewId}/questions/back` | `SELECTED`·`APPROVED`만 표시합니다. 상세에서 답안과 근거를 읽고, 로컬 답안 변경은 승인 시 `{ referenceAnswer: 'YES' }` 또는 `'NO'`로 전송합니다. 승인 성공 후 해당 문항을 잠그고, 전체 승인과 이전 단계 버튼은 각각 서버 성공을 확인한 뒤 이동합니다.                                                                                                               |
| **08 분석 리포트**        | `GET /experiments/{experimentId}/report`, `GET /experiments/{experimentId}/responses`, `GET /experiments/{experimentId}/questions/{questionId}/analysis`                                             | 같은 실험 ID로 요약, 전체 응답, 문항별 분석을 조회합니다. 미완료 오류는 별도 상태로 표시하며 판단 불가를 오답과 구분합니다. 09번 수정 제안·10번 등록·비교로 이동할 때 현재 검수와 실험·버전 맥락을 전달합니다.                                                                                                                                                      |
| **10 수정 문서 등록**     | `POST /reviews/{reviewId}/documents`                                                                                                                                                                 | 기존 설명서를 조회해 읽기 전용으로 보여 주고, 수정 상품설명서 PDF 한 개를 최대 20MB까지 첨부합니다. multipart의 `documentType`은 `PRODUCT_GUIDE`이고 파일 필드는 `files`입니다. 등록 성공 응답의 문서 ID와 버전을 사용합니다. 결과가 불확실하면 저장 상태를 확인한 뒤 재시도를 판단합니다. 재실험 시작은 11번 담당자와 인계 지점을 합의합니다.                      |
| **12 재실험 분석 리포트** | 08번의 실험별 조회 API, `GET /reviews/{reviewId}/experiments/compare`                                                                                                                                | 08번의 리포트 UI와 조회 훅을 재사용합니다. 동일 검수의 완료된 기준·대상 실험을 `baselineExperimentId`, `targetExperimentId`로 비교합니다. 이전 완료 버전만 대상으로 제시하고, 조회나 비교 화면 진입으로 실험을 시작하지 않습니다. 13번에는 확정된 두 실험 ID를 인계합니다.                                                                                          |

02번 이어하기의 단계는 문서의 `DOC_UPLOAD` → 03, `ANALYZING` → 04, `QUESTION_SELECT` → 05, `ANSWER_APPROVE` → 06, `PERSONA_SELECT` → 07에서 시작합니다. `EXPERIMENT`, `REPORT`, `REVISION`, `REUPLOAD`와 재실험 흐름은 최초·재실험 구분에 필요한 ID와 실제 등록 경로를 담당자와 확인하세요. [화면 명세](../SPEC.md#4-화면별-기능) · [검수 홈 단계 표](api/SONA_FE_INTEGRATION_GUIDE.md#검수-홈)

## 6. 화면 연결과 새로고침 복원

**서버 API 경로와 브라우저 URL은 따로 관리합니다.** 이슈 #11 기준으로 라우터에 있는 화면은 `/login`, `/documents`, `/documents/:reviewId`, `/questions/:reviewId`, `/health`입니다. `/`는 로그인으로 이동합니다. 02·04·06·07번 목적지 URL은 담당자끼리 합의한 뒤 `src/router.jsx`에 등록합니다. 아래 표의 목적지 예시는 작성 시점에 등록된 라우트가 아닙니다. [router.jsx](../src/router.jsx)

| 연결        | 출발 화면과 담당자가 할 일                                                                                                                                                                                | 목적지와 전달 값                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **01 → 02** | 02 라우트를 등록한 뒤 로그인 화면의 `onLoginSuccess`에 성공 이동을 연결합니다. 이동은 `navigate(확정된_02_경로, { replace: true })` 형태를 사용합니다.                                                    | 02 경로 예시는 `/reviews`입니다. 02는 자체적으로 검수 목록을 조회합니다.                                                                                 |
| **03 → 04** | 03은 `POST /reviews`의 201 응답에서 받은 `reviewId`를 `getAnalysisPath({ reviewId })`에 전달합니다. 담당자가 목적지 함수를 연결하면 해당 URL로 이동합니다. 현재 기본 이동은 `/documents/:reviewId`입니다. | 04 경로 예시는 `/analysis/:reviewId`입니다. 04번만 분석 요청을 실행합니다. 최초 등록 직후의 분석 시작 의도를 어떻게 전달하고 소비할지는 함께 합의합니다. |
| **04 → 05** | 분석 성공 응답의 `QUESTION_SELECT`를 확인하고 진행 타이머를 정리합니다. 응답을 못 받았다면 상세 조회에서 동일 단계를 확인합니다.                                                                          | 등록된 `/questions/:reviewId`에 03에서 받은 서버 ID를 그대로 넣습니다. 05는 목록을 조회합니다.                                                           |
| **05 → 06** | 선택 확정 결과의 `ANSWER_APPROVE`가 확인되면 05가 `getApprovalPath({ reviewId })`를 호출합니다. 연결 전에는 화면에 저장 완료가 표시됩니다.                                                                | 06 경로 예시는 `/approval/:reviewId`입니다. 06은 같은 ID로 문항 목록과 문항 상세를 조회합니다.                                                           |
| **06 → 05** | 06에서 이전 단계를 누르면 `POST /reviews/{reviewId}/questions/back`을 호출합니다. 성공 응답의 `QUESTION_SELECT`를 확인한 뒤 이동합니다.                                                                   | 등록된 `/questions/:reviewId`로 이동합니다. 05가 서버 목록을 다시 가져와 `SELECTED`·`APPROVED`를 선택으로 복원합니다.                                    |
| **06 → 07** | 06의 전체 승인 버튼에서 `POST /reviews/{reviewId}/questions/approval`을 실행합니다. 미승인 오류는 안내하고, 성공 응답의 `PERSONA_SELECT`를 확인한 뒤 이동합니다.                                          | 07 경로 예시는 `/personas/:reviewId`입니다. 승인된 문항과 페르소나 목록은 07에서 조회합니다.                                                             |

이동 코드를 작성할 때는 먼저 등록 경로를 확인하고, 서버에서 받은 ID만 경로에 넣으세요. 아래는 04가 05로 들어올 때 사용할 수 있는 예시입니다.

```jsx
import { useNavigate, useParams } from 'react-router';

function useQuestionSelectionDestination() {
  const navigate = useNavigate();
  const { reviewId } = useParams();

  return () => {
    if (reviewId) navigate('/questions/' + encodeURIComponent(reviewId));
  };
}
```

새로고침 후에도 URL에서 `reviewId`를 읽을 수 있습니다. 이 값으로 `GET /reviews/{reviewId}`를 호출해 현재 단계를 확인하고 화면에 필요한 데이터를 조회하세요. `location.state`는 이동 직후의 부가 정보에만 사용하고, 저장된 파일·문항·실험 상태는 서버 응답을 기준으로 복원합니다. 04·11번은 화면 진입이나 새로고침을 분석·실험 재실행 조건으로 사용하지 않습니다. 06번에서 승인하지 않은 답안과 05번 미확정 체크는 화면의 임시 상태입니다.

## 7. 목업과 테스트

목업은 서버 없이 UI를 확인할 수 있는 **개발 전용 예시 응답**입니다. #11 기준으로 03·05번은 Vite 개발 모드와 `?mock=1`이 함께 있을 때 `src/api/mocks/`의 어댑터를 동적으로 불러옵니다. 다른 화면이 이를 참고해 어댑터를 만들 경우 실제 API와 같은 입력·응답 구조를 사용하고, 실서버 캐시와 구분하세요. 테스트 데이터에는 가상의 값만 사용합니다. [03 목업](../src/api/mocks/documentRegistration.js) · [05 목업](../src/api/mocks/questionSelection.js)

| 브라우저 주소 예시                           | 확인할 동작                                             |
| -------------------------------------------- | ------------------------------------------------------- |
| `/documents?mock=1`                          | 두 PDF의 일괄 등록과 등록 후 ID 기반 상세 이동          |
| `/documents?mock=1&scenario=upload-error`    | 한 번 실패한 뒤 사용자가 다시 등록하는 동작             |
| `/documents?mock=1&scenario=response-lost`   | 등록 여부 미확인 안내와 같은 탭의 동일 첨부 재전송 차단 |
| `/questions/1?mock=1&scenario=restored`      | 서버에 저장된 선택과 승인 상태를 흉내 낸 목록           |
| `/questions/1?mock=1&scenario=long-evidence` | 긴 근거의 스크롤과 화면 배치                            |
| `/questions/1?mock=1&scenario=response-lost` | 확정 응답 유실 후 상세 단계 조회                        |

목업에서 생성한 기록은 브라우저 탭의 현재 앱 실행 동안 메모리에 있습니다. 브라우저 새로고침을 포함한 저장 복원은 서버 또는 별도 테스트 서버로 검증하세요. 실제 03 등록에서는 리디렉션을 차단하고 서버 응답까지 로딩을 표시합니다. 목업은 전송률 시나리오를 제공할 수 있습니다.

같은 탭에서는 새로고침 후에도 미확인 쓰기를 구분합니다. 03은 파일명·크기 조합의 해시, 05는 검수 ID로 표시를 유지합니다. 03은 다른 조합으로 신규 등록할 수 있습니다. 05에서 상태 확인을 누르면 상세 조회만 실행하며, QUESTION_SELECT 상태만으로는 재전송하지 않습니다.

### 개발 완료 체크리스트

- [ ] Figma 활성 프레임과 화면의 배치·문구·동작을 대조했다.
- [ ] 로딩, 빈 목록, 성공, 오류, 재시도, 중복 클릭 방지를 확인했다.
- [ ] 키보드만으로 입력, 모달, 주요 이동 버튼을 조작했고 포커스와 입력 라벨을 확인했다.
- [ ] 명세의 PC 검증 크기인 1280×780, 1280×720, 1366×768, 1440×900, 1600×650, 1920×1080에서 잘림·겹침과 버튼 접근을 확인했다. 01번을 점검할 때는 360×640도 확인했다.
- [ ] 정방향 이동과 복귀에 서버 ID를 전달하고, 새로고침 시 저장 상태 복원과 검수·실험별 데이터 분리를 확인했다.
- [ ] 목업으로 확인한 내용과 실제 백엔드로 확인한 내용을 구분해 기록했다.
- [ ] 민감한 데이터, 다른 팀원 소유 화면의 변경, 의도치 않은 포맷 변경이 커밋에 들어가지 않는지 확인했다.

테스트는 기존 Vitest와 `*.test.js` 또는 `*.test.jsx`를 사용합니다. 파일 크기 제한, 승인 상태 전이, 오류 시 입력 유지처럼 화면 결과에 영향을 주는 규칙을 검증하세요. 아래 명령은 프로젝트 루트에서 실행합니다.

```powershell
npm test
npm run lint
npm run build
npm run format:check
git diff --check
```

API 문서 서식을 바꿀 때는 메서드·경로·필드·예시·오류 코드를 대조하고 같은 포맷 검사를 실행하세요. [CI 검사 순서](../.github/workflows/ci.yml)

## 8. Codex에 전달할 프롬프트 예시

아래 내용을 복사해 화면 번호, 이슈 번호, Figma 링크를 바꿉니다. 처음 맡은 화면이라면 먼저 읽기 전용 검토를 요청해 구현 범위와 필요한 파일을 확인할 수 있습니다.

```text
이슈 #42의 02번 검수 홈만 구현해 줘. 현재 작업 브랜치와 변경 파일을 먼저 확인해 줘.
Figma 주소는 팀에서 공유한 02번 활성 프레임 링크를 사용해 줘.
AGENTS.md, SPEC.md, docs/api/SONA_API_SPEC.md, 프론트엔드 연동 가이드를 읽어 줘.
기존 공통 레이아웃, src/api/client.js와 TanStack Query 훅을 재사용해 줘.
유효한 로딩·빈 상태·실패·재시도와 새로고침 시 서버 상태 복원을 구현해 줘.
다른 화면에 영향을 주는 라우트 연결과 미확정 API 필드는 먼저 보고해 줘.
실제 서버와 목업에서 확인한 결과를 구분하고, 테스트·린트·빌드·포맷 결과를 알려 줘.
커밋, push, PR 생성은 이번 작업 범위에서 제외해 줘.
```

04번에는 분석 요청 실행·복구 조건을, 06번에는 승인·복귀 API와 답안 상태를, 08·12번에는 실험과 버전 ID를, 10번에는 수정 PDF 필드와 11번 인계를 한 줄씩 추가하세요.

## 9. 착수 전에 확인할 미확정 사항

| 담당                      | 합의하거나 확인할 항목                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 프론트 화면 담당자        | 02·04·06·07 및 리포트 관련 URL, 공통 사이드바 목적지, 03에서 넘기는 최초 분석 시작 의도, 10→11과 12→13에서 전달할 ID                                   |
| 백엔드 인증 담당자        | Bearer 표기와 상세 HttpOnly 쿠키 계약의 차이, 배포별 CSRF 쿠키 접근·SameSite·Domain·CORS, 새로고침 직후 세션 확인 방식, PART 7~8의 인증·CSRF 적용 범위 |
| 백엔드 검수·분석 담당자   | 최초 문서 등록 응답 유실 시 검수 찾기와 중복 등록 방지, 저장된 문서 교체와 PDF 오류 구분, 분석 타임아웃, 처리 중과 재시도 가능 상태의 구분             |
| 백엔드 문항 담당자        | 최대 10개·150자와 의미 중복 검증 범위, 05 확정 처리 중 상태 확인 방법, 06의 `QUESTION_NOT_APPROVED`에서 `details.questionIds` 제공 여부                |
| 백엔드 실험·리포트 담당자 | 목록의 리포트 연결 ID, 현재·완료 실험과 버전 목록 조회, 최초·재실험에서 사용할 문서·기준 실험 관계, 오해율·판정 기준과 조항별 비교 데이터              |

03 최초 등록의 서버 멱등성·검수 찾기와 05 확정의 재시도 판별은 서버 계약이 필요합니다. 같은 탭의 보호는 전체 브라우저나 기기에 공유되지 않습니다. 추가로 발견한 계약 차이는 [SPEC.md의 확인 필요 항목](../SPEC.md#확인-필요-항목)에 기록합니다.
