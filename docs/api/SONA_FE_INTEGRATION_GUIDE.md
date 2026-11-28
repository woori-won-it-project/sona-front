## 1. 공통 설정 및 인증

- Base URL: `/api/v1` · 일반 요청: `application/json` · 파일 업로드: `multipart/form-data`
- Access Token(30분)과 Refresh Token(24시간)은 HttpOnly Cookie로 관리. 프론트에서 직접 읽거나 Local Storage / Session Storage에 저장하지 않음.
- API 요청 시 Axios `withCredentials: true` 또는 Fetch `credentials: 'include'` 설정. Cookie Header는 브라우저가 자동 첨부하므로 직접 설정하지 않음.
- 로그인 화면 진입 시 `GET /auth/csrf` 호출 → `POST /auth/login` 호출. 로그인 성공 시 CSRF Token이 갱신되므로 이후 요청에는 최신 값 사용.
- 인증이 필요한 API에서 `401 UNAUTHORIZED` 응답을 받으면 `POST /auth/refresh` 호출 → 성공 시 기존 요청 재시도. 재발급 인증 실패 시 로그인 화면으로 이동. 로그인 실패(`LOGIN_FAILED`)와 재발급 요청 자체는 자동 재발급 대상에서 제외하고, 재시도 무한 반복을 방지함.
- Refresh Token Rotation을 사용하므로 동시에 여러 요청이 401을 받아도 재발급 요청은 한 번만 실행하도록 처리.
- 로그아웃은 `POST /auth/logout` 호출. 성공 시 로그인 화면 이동.

### CSRF Token 사용 방식

1. 백엔드가 `XSRF-TOKEN`이라는 Cookie로 CSRF Token을 발급.
2. 프론트엔드는 해당 Cookie의 값을 읽음.
3. POST, PUT, PATCH, DELETE 요청 시 `X-XSRF-TOKEN` Header에 그 값을 넣음.
4. 백엔드는 전달받은 Header의 토큰을 기대하는 CSRF Token과 비교.
5. 검증에 실패하면 `403 Forbidden` (`INVALID_CSRF_TOKEN`) 반환.

**Access Token으로 사용자 인증을 하고, 데이터를 변경하는 요청에는 CSRF Token을 추가로 검증하는 구조.** GET 조회에는 CSRF 검증이 필요하지 않음. CSRF Token은 매 요청마다 새로 발급하지 않고 기존 값을 재사용하며, 로그인 등으로 갱신되면 새 값을 사용. 토큰이 없거나 갱신이 필요한 경우 `GET /auth/csrf` 호출.

Cookie를 읽을 수 있는 배포 환경에서는 Axios 공통 설정(`xsrfCookieName: 'XSRF-TOKEN'`, `xsrfHeaderName: 'X-XSRF-TOKEN'`, 필요 시 `withXSRFToken: true`)을 이용할 수 있음. 신뢰하는 API 서버 전용 인스턴스에서 사용.

> 배포 구조 미확정: API 표의 SameSite=Strict는 예시이며, 실제 SameSite, Domain, CORS 및 CSRF 전달 방식은 배포 환경에 맞춰 확정. 운영 환경에서는 HTTPS와 Secure Cookie 사용.

## 2. 검수 홈 및 새 문서 등록

### 검수 홈

- `GET /reviews`로 목록 조회. `status=IN_PROGRESS`는 진행 중, `status=COMPLETED`는 이전 검수 내역. `limit`은 선택이며 미지정 시 전체 조회.
- 검수 홈 진행률은 `currentStep`에 대응하는 프론트의 단계별 고정 퍼센트로 표시. 서버 진행률 필드 없음.
- `documentType=PRODUCT_GUIDE`는 상품설명서로 표시. 파일명은 최신 상품설명서 원본 파일명이며 없으면 null.
- 이어하기 버튼: `GET /reviews/{reviewId}` → `currentStep` 기준으로 화면 이동 → 해당 화면에 필요한 API 조회.
- 삭제는 진행 중 검수만 가능하며 분석·실험 중에는 불가. 리포트 보기는 `reviewId`로 리포트 화면 이동.

| currentStep     | 이동 화면      |
| --------------- | -------------- |
| DOC_UPLOAD      | 문서 등록      |
| ANALYZING       | 분석 진행      |
| QUESTION_SELECT | 검증 질문 선택 |
| ANSWER_APPROVE  | 검증 문항 승인 |
| PERSONA_SELECT  | 페르소나 선택  |
| EXPERIMENT      | 실험 진행      |
| REPORT          | 분석 리포트    |
| REVISION        | 수정 제안      |
| REUPLOAD        | 수정 문서 등록 |

### 새 문서 등록

- 새 문서 등록 버튼은 API 호출 없이 화면 이동.
- 보험약관 1개 + 상품설명서 1개 필수. PDF만, 각각 최대 20MB(20 × 1024 × 1024 byte). 특약 첨부 없음.
- 첨부·삭제·교체는 서버 저장 전까지 프론트에서 처리. `File.name`, `File.size`로 이름과 용량 표시.
- 필수 파일 2개가 유효할 때만 분석 시작 활성화. 분석 시작 시 `FormData`에 `terms`, `productGuide` 추가하여 `POST /reviews` 호출. multipart boundary는 브라우저가 설정하도록 Content-Type을 직접 지정하지 않음.
- 전송 중 중복 클릭 방지. 업로드 진행률 100%와 서버 저장 성공은 구분하고, `201 Created`를 받은 뒤 저장 완료 처리.
- 서버 저장 전 화면 이탈 시 첨부 파일 초기화. 저장된 검수의 문서는 상세 조회로 복원하며 `fileSize`는 byte 단위.

## 3. 분석 진행

분석은 일단 **동기 방식**으로 구현 예정. SSE, WebSocket, 자동 Polling 및 별도 진행률 API 없음.

- 분석 시작 버튼 클릭 → 문서 등록 API(`POST /reviews`) 호출 → 성공 시 반환된 `reviewId`로 분석 API(`POST /reviews/{reviewId}/analysis`) 호출.
- 분석 화면의 문구와 진행률은 일정 시간 간격(예: 3초)으로 프론트에서 변경. 실제 서버 처리율이나 남은 시간과는 무관한 표시용 값.
- 실제 분석 완료 응답(`200 OK`, `currentStep=QUESTION_SELECT`) 전에는 100%를 표시하지 않음. 성공 시 타이머 종료 후 질문 선택 화면 이동.
- 진행 중 홈 이동, 사이드 메뉴 및 중복 실행 버튼 비활성화. 새로고침·브라우저 종료는 가능한 범위에서 경고 표시.
- 분석 실패 응답을 받으면 로딩 종료, 오류 안내 및 재시도 버튼 표시. 기존 `reviewId`로 분석 API만 재호출하고 파일은 다시 업로드하지 않음.
- 네트워크 오류·Timeout·새로고침으로 응답을 못 받으면 검수 상세 조회로 현재 단계 확인 후 처리.

| 확인한 currentStep | 처리                                           |
| ------------------ | ---------------------------------------------- |
| DOC_UPLOAD         | 기존 reviewId로 분석 재시도 가능               |
| ANALYZING          | 중복 실행 금지, 처리 중 안내 및 수동 상태 확인 |
| QUESTION_SELECT    | 질문 선택 화면 이동                            |
| 이후 단계          | 해당 검수 단계 화면 이동                       |

> 요청 Timeout은 실제 분석 시간 및 배포 환경 확인 후 결정.

## 4. 검증 질문 선택 및 문항 승인

### 검증 질문 선택

- 질문 목록(No. 10)을 조회해 유형별 배지 표시. 근거 보기(No. 11)는 추천 질문에 제공.
- 체크박스와 선택 개수는 프론트에서 관리하며 개별 선택 API 호출하지 않음. `SELECTED`, `APPROVED`는 선택 상태, `DRAFT`는 미선택 상태로 초기화.
- 직접 작성·수정·삭제(No. 12~14)는 성공 즉시 화면 목록 갱신. '추가하고 선택' 성공 시 반환된 ID를 로컬 선택 목록에 추가. 삭제 시 로컬 선택 목록에서도 제거.
- 직접 작성한 `MANUAL` 문항 중 `DRAFT`, `SELECTED`만 수정·삭제 가능. 추천 질문 및 승인 완료 문항 수정·삭제 불가.
- 최소 1개 선택해야 승인 이동 버튼 활성화. 선택 확정(No. 15) 시 전체 `questionIds` 배열을 한 번에 전달.
- 선택 확정 요청 중 AI 기준답안 생성 로딩 표시 및 중복 클릭 방지. 성공 시 승인 화면 이동, 실패 시 현재 선택을 유지하고 오류 안내.
- 확정 전 홈 이동·새로고침 시 미저장 체크박스 선택 초기화. 저장된 직접 작성·추천 질문은 유지. 선택 확정 응답 유실 시 상세 조회로 단계 확인.

### 검증 문항 승인

- No. 10 목록에서 `SELECTED`(검토 필요), `APPROVED`(승인 완료)만 표시. `DRAFT` 제외. 문항 클릭 시 No. 11 상세 조회.
- `referenceAnswer`의 YES/NO를 예/아니요로 표시. 예/아니요 변경은 프론트에서 임시 보관하고, 답안 승인 클릭 시 No. 16에 `referenceAnswer`만 전달. 별도 기준답안 수정 화면/API 없음.
- `referenceAnswerReason`은 AI 생성 답안 근거 설명이며, 담당자가 답안을 바꿔 승인하면 최종 답안과 일치하지 않을 수 있음. `evidences`의 약관 문서명·조항·페이지·원문을 출처로 표시하고, 분쟁사례는 추천 근거로 구분. null인 출처 필드는 표시하지 않음.
- 승인 성공 후 목록을 `APPROVED`로 갱신하고 답안 선택 및 승인 버튼을 비활성화. AI 생성 응답 배지는 승인 후 제거. 다음 문항 이동은 프론트 처리.
- 전체 승인 후 페르소나 선택 버튼에서 No. 17 호출. 미승인 문항이 있으면 안내하고 `details.questionIds`를 이용해 해당 문항으로 이동 가능. 성공 시 `PERSONA_SELECT` 화면 이동.
- 이전 단계 버튼은 No. 18 호출 후 질문 선택 화면 이동. 기존 선택·승인 상태 유지. 다시 선택 확정할 때 유지된 승인 문항은 그대로 승인 상태, 선택 해제 문항은 DRAFT, 신규 선택 문항은 SELECTED. 해제 후 재선택한 기존 승인 문항은 다시 AI 답안을 생성하고 재승인해야 함.
- 새로고침·이어하기 시 저장된 답안과 승인 상태를 다시 조회. 승인하지 않은 로컬 답안 변경은 초기화.

| Enum             | 화면 표시                  |
| ---------------- | -------------------------- |
| CASE_BASED       | 실제 사례 기반             |
| MISUNDERSTANDING | 사례 미매칭 · AI 예상 분쟁 |
| MANUAL           | 직접 작성                  |
| DRAFT            | 미선택                     |
| SELECTED         | 선택 확정 / 검토 필요      |
| APPROVED         | 승인 완료                  |

## 5. 공통 응답 및 오류 처리

| 응답                                                | 처리                                       |
| --------------------------------------------------- | ------------------------------------------ |
| `data: { ... }`                                     | 상세 데이터 사용                           |
| `data: []`                                          | 빈 목록 UI 표시                            |
| `message`                                           | 성공 안내 또는 오류 안내                   |
| 204                                                 | 응답 본문 없음 (CSRF 발급)                 |
| 400 INVALID_INPUT                                   | 입력값 확인                                |
| 401 LOGIN_FAILED                                    | 로그인 실패 안내                           |
| 401 UNAUTHORIZED                                    | 인증 재발급 처리                           |
| 403 INVALID_CSRF_TOKEN                              | CSRF Token 확인 및 오류 안내               |
| 404 NOT_FOUND                                       | 대상이 없거나 접근할 수 없음 안내          |
| 409 REVIEW_PROCESSING                               | 처리 중 안내, 중복 요청 방지               |
| 409 INVALID_REVIEW_STATUS / INVALID_QUESTION_STATUS | 현재 단계 또는 상태에서 불가능한 작업 안내 |
| 409 REQUIRED_DOCUMENT_MISSING                       | 필수 파일 첨부 안내                        |
| 409 REFERENCE_ANSWER_EMPTY                          | 답안 선택 안내                             |
| 409 QUESTION_NOT_APPROVED                           | 미승인 문항 안내                           |
| 413 FILE_TOO_LARGE                                  | 20MB 이하 파일 첨부 안내                   |
| 415 INVALID_FILE_TYPE                               | PDF만 첨부 안내                            |
| 500 INTERNAL_ERROR / 502 AI_CALL_FAILED             | 오류 안내 및 해당 작업 재시도              |

- 요청 성공 응답을 받은 뒤 화면의 저장·삭제·승인 상태를 변경. 응답 유실 시 실제 저장 상태를 조회한 후 재시도.
- API 표의 보험 문구와 분쟁사례는 응답 구조를 설명하는 가상 데이터.
