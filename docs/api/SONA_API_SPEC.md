# API 명세서

API 명세서 HTML

- Base URL: `/api/v1`
- Content-Type: `application/json`
- 파일 업로드: `multipart/form-data`
- 인증: Bearer Token
- 파일 최대 크기: 20MB

> Cookie Header는 브라우저 자동 첨부. SameSite=Strict는 잠정 예시. 상세 연동 규칙은 별도 프론트엔드 연동 가이드 참고.
>
> 프론트엔드 연동 가이드

## 공통 에러 응답 형식

모든 에러 응답은 다음 형식을 따릅니다.

```
{
  "timestamp": "2026-11-25T10:00:00",
  "status": 400,
  "code": "INVALID_REQUEST",
  "message": "요청 값이 올바르지 않습니다.",
  "path": "/api/v1/reviews"
}
```

| 필드      | 설명           |
| --------- | -------------- |
| timestamp | 에러 발생 시간 |
| status    | HTTP 상태 코드 |
| code      | 에러 식별 코드 |
| message   | 에러 메시지    |
| path      | 요청 URI       |

---

## PART 1. 인증

### 1. CSRF Token 발급

`GET /auth/csrf`

**Response Header**

`Set-Cookie: XSRF-TOKEN={csrfToken}; Secure; SameSite=Strict; Path=/`

**Error**

**500** `INTERNAL_ERROR`

### 2. 로그인

`POST /auth/login`

**Request Header**

- `Content-Type: application/json`
- `X-XSRF-TOKEN: {csrfToken}`
- `Cookie: XSRF-TOKEN={csrfToken}`

**Request Body**

```json
{
  "employeeNumber": "EMP001",
  "password": "password123"
}
```

**Response Header**

- `Set-Cookie: accessToken={accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/v1; Max-Age=1800`
- `Set-Cookie: refreshToken={refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=86400`
- `Set-Cookie: XSRF-TOKEN={newCsrfToken}; Secure; SameSite=Strict; Path=/`

**Response Body**

```json
{
  "data": {
    "member": {
      "id": 1,
      "employeeNumber": "EMP001",
      "name": "홍길동"
    }
  }
}
```

**Error**

- **400** `INVALID_INPUT`
- **401** `LOGIN_FAILED`
- **403** `INVALID_CSRF_TOKEN`

### 3. Access Token 재발급

`POST /auth/refresh`

**Request Header**

- `X-XSRF-TOKEN: {csrfToken}`
- `Cookie: refreshToken={refreshToken}; XSRF-TOKEN={csrfToken}`

**Response Header**

- `Set-Cookie: accessToken={newAccessToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/v1; Max-Age={accessRemainingSeconds}`
- `Set-Cookie: refreshToken={newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age={remainingSeconds}`

**Response Body**

```json
{
  "message": "토큰이 재발급되었습니다."
}
```

**Error**

- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`

### 4. 로그아웃

`POST /auth/logout`

**Request Header**

- `X-XSRF-TOKEN: {csrfToken}`
- `Cookie: accessToken={accessToken}; refreshToken={refreshToken}; XSRF-TOKEN={csrfToken}`

**Response Header**

- `Set-Cookie: accessToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1; Max-Age=0`
- `Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0`
- `Set-Cookie: XSRF-TOKEN=; Secure; SameSite=Strict; Path=/; Max-Age=0`

**Response Body**

```json
{
  "message": "로그아웃되었습니다."
}
```

**Error**

**403** `INVALID_CSRF_TOKEN`

## PART 2. 검수 홈

### 5. 검수 목록 조회

`GET /reviews`

**Request Header**

`Cookie: accessToken={accessToken}`

**Query / Path Parameter**

- `status` (선택)
- `limit` (선택)

**Response Body**

```json
{
  "data": [
    {
      "reviewId": 1,
      "filename": "암치료보험_상품설명서.pdf",
      "documentType": "PRODUCT_GUIDE",
      "status": "IN_PROGRESS",
      "currentStep": "ANSWER_APPROVE",
      "updatedAt": "2026-11-28T10:30:00"
    },
    {
      "reviewId": 2,
      "filename": "실손보험_상품설명서.pdf",
      "documentType": "PRODUCT_GUIDE",
      "status": "COMPLETED",
      "currentStep": "REPORT",
      "updatedAt": "2026-11-27T15:30:00"
    }
  ]
}
```

**Error**

- **400** `INVALID_INPUT`
- **401** `UNAUTHORIZED`

### 6. 검수 상세 조회

`GET /reviews/{reviewId}`

**Request Header**

`Cookie: accessToken={accessToken}`

**Query / Path Parameter**

`reviewId`

**Response Body**

```json
{
  "data": {
    "reviewId": 1,
    "title": "암치료보험_상품설명서",
    "status": "IN_PROGRESS",
    "currentStep": "ANSWER_APPROVE",
    "documents": [
      {
        "documentId": 1,
        "documentType": "TERMS",
        "filename": "암치료보험_약관.pdf",
        "version": 1,
        "fileSize": 2516582
      },
      {
        "documentId": 2,
        "documentType": "PRODUCT_GUIDE",
        "filename": "암치료보험_상품설명서.pdf",
        "version": 1,
        "fileSize": 1887437
      }
    ],
    "createdAt": "2026-11-25T10:00:00",
    "updatedAt": "2026-11-28T10:30:00",
    "completedAt": null
  }
}
```

**Error**

- **401** `UNAUTHORIZED`
- **404** `NOT_FOUND`
- **500** `INTERNAL_ERROR`

### 7. 검수 삭제

`DELETE /reviews/{reviewId}`

**Request Header**

- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Query / Path Parameter**

`reviewId`

**Response Body**

```json
{
  "message": "검수가 삭제되었습니다."
}
```

**Error**

- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **404** `NOT_FOUND`
- **409** `REVIEW_PROCESSING`
- **409** `INVALID_REVIEW_STATUS`

## PART 3. 새 문서 등록

### 8. 최초 문서 등록 및 검수 생성

`POST /reviews`

**Request Header**

- `Content-Type: multipart/form-data`
- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Request Body**

- `terms`: 보험약관 PDF (File)
- `productGuide`: 상품설명서 PDF (File)

**Response Body**

```json
{
  "data": {
    "reviewId": 3,
    "title": "암치료보험_상품설명서.pdf",
    "status": "IN_PROGRESS",
    "currentStep": "DOC_UPLOAD",
    "documents": [
      {
        "documentId": 5,
        "documentType": "TERMS",
        "filename": "암치료보험_약관.pdf",
        "version": 1,
        "fileSize": 2516582
      },
      {
        "documentId": 6,
        "documentType": "PRODUCT_GUIDE",
        "filename": "암치료보험_상품설명서.pdf",
        "version": 1,
        "fileSize": 1887437
      }
    ]
  }
}
```

**Error**

- **400** `INVALID_INPUT`
- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **409** `REQUIRED_DOCUMENT_MISSING`
- **413** `FILE_TOO_LARGE`
- **415** `INVALID_FILE_TYPE`
- **500** `INTERNAL_ERROR`

## PART 4. 분석 진행

### 9. 문서 분석 시작

`POST /reviews/{reviewId}/analysis`

**Request Header**

- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Query / Path Parameter**

`reviewId`

**Response Body**

```json
{
  "data": {
    "reviewId": 3,
    "status": "IN_PROGRESS",
    "currentStep": "QUESTION_SELECT"
  }
}
```

**Error**

- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **404** `NOT_FOUND`
- **409** `REVIEW_PROCESSING`
- **409** `INVALID_REVIEW_STATUS`
- **409** `REQUIRED_DOCUMENT_MISSING`
- **500** `INTERNAL_ERROR`
- **502** `AI_CALL_FAILED`

## PART 5. 검증 질문 선택

### 10. 검증 질문 목록 조회

`GET /reviews/{reviewId}/questions`

**Request Header**

`Cookie: accessToken={accessToken}`

**Query / Path Parameter**

`reviewId`

**Response Body**

```json
{
  "data": [
    {
      "questionId": 1,
      "sourceType": "CASE_BASED",
      "questionText": "암 진단만으로 암주요치료비를 받을 수 있나요?",
      "status": "DRAFT"
    },
    {
      "questionId": 2,
      "sourceType": "MISUNDERSTANDING",
      "questionText": "면역력 강화 치료는 암 주요치료에서 제외되나요?",
      "status": "DRAFT"
    },
    {
      "questionId": 3,
      "sourceType": "MANUAL",
      "questionText": "양성자치료도 보장 대상에 포함되나요?",
      "status": "DRAFT"
    }
  ]
}
```

**Error**

- **401** `UNAUTHORIZED`
- **404** `NOT_FOUND`
- **500** `INTERNAL_ERROR`

### 11. 질문 상세 및 근거 조회

`GET /questions/{questionId}`

**Request Header**

`Cookie: accessToken={accessToken}`

**Query / Path Parameter**

`questionId`

**Response Body**

```json
{
  "data": {
    "questionId": 1,
    "sourceType": "CASE_BASED",
    "questionText": "암 진단만으로 암주요치료비를 받을 수 있나요?",
    "status": "DRAFT",
    "referenceAnswer": null,
    "referenceAnswerReason": null,
    "approvedAt": null,
    "generationReason": "진단만으로 지급된다고 오해할 가능성을 확인한다.",
    "evidences": [
      {
        "evidenceId": 11,
        "clauseId": 7,
        "documentId": 5,
        "filename": "암치료보험_약관.pdf",
        "clauseNumber": "제11조",
        "clauseTitle": "보험금 지급사유",
        "sourcePage": 32,
        "evidenceText": "암의 진단 및 약관에서 정한 주요치료 시행 조건을 확인한다.",
        "caseChunkId": null,
        "disputeCaseId": null,
        "caseTitle": null,
        "sourceUrl": null
      },
      {
        "evidenceId": 12,
        "clauseId": null,
        "documentId": null,
        "filename": null,
        "clauseNumber": null,
        "clauseTitle": null,
        "sourcePage": null,
        "evidenceText": "진단과 치료 조건의 적용 범위가 쟁점이 된 사례 (형식 예시).",
        "caseChunkId": 21,
        "disputeCaseId": 8,
        "caseTitle": "보험금 지급 조건 관련 분쟁 (가상 예시)",
        "sourceUrl": null
      }
    ]
  }
}
```

**Error**

- **401** `UNAUTHORIZED`
- **404** `NOT_FOUND`
- **500** `INTERNAL_ERROR`

### 12. 질문 직접 작성

`POST /reviews/{reviewId}/questions`

**Request Header**

- `Content-Type: application/json`
- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Query / Path Parameter**

`reviewId`

**Request Body**

```json
{
  "questionText": "양성자치료도 보장 대상에 포함되나요?"
}
```

**Response Body**

```json
{
  "data": {
    "questionId": 3,
    "sourceType": "MANUAL",
    "questionText": "양성자치료도 보장 대상에 포함되나요?",
    "status": "DRAFT"
  }
}
```

**Error**

- **400** `INVALID_INPUT`
- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **404** `NOT_FOUND`
- **409** `REVIEW_PROCESSING`
- **409** `INVALID_REVIEW_STATUS`
- **500** `INTERNAL_ERROR`

### 13. 직접 작성 질문 수정

`PATCH /questions/{questionId}`

**Request Header**

- `Content-Type: application/json`
- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Query / Path Parameter**

`questionId`

**Request Body**

```json
{
  "questionText": "양성자치료도 항암중입자치료에 포함되나요?"
}
```

**Response Body**

```json
{
  "data": {
    "questionId": 3,
    "sourceType": "MANUAL",
    "questionText": "양성자치료도 항암중입자치료에 포함되나요?",
    "status": "DRAFT"
  }
}
```

**Error**

- **400** `INVALID_INPUT`
- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **404** `NOT_FOUND`
- **409** `REVIEW_PROCESSING`
- **409** `INVALID_REVIEW_STATUS`
- **500** `INTERNAL_ERROR`
- **409** `INVALID_QUESTION_STATUS`

### 14. 직접 작성 질문 삭제

`DELETE /questions/{questionId}`

**Request Header**

- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Query / Path Parameter**

`questionId`

**Response Body**

```json
{
  "message": "질문이 삭제되었습니다."
}
```

**Error**

- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **404** `NOT_FOUND`
- **409** `REVIEW_PROCESSING`
- **409** `INVALID_REVIEW_STATUS`
- **500** `INTERNAL_ERROR`
- **409** `INVALID_QUESTION_STATUS`

### 15. 검증 질문 선택 확정

`PUT /reviews/{reviewId}/questions/selection`

**Request Header**

- `Content-Type: application/json`
- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Query / Path Parameter**

`reviewId`

**Request Body**

```json
{
  "questionIds": [1, 2, 3]
}
```

**Response Body**

```json
{
  "data": {
    "reviewId": 3,
    "currentStep": "ANSWER_APPROVE",
    "selectedCount": 3
  }
}
```

**Error**

- **400** `INVALID_INPUT`
- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **404** `NOT_FOUND`
- **409** `REVIEW_PROCESSING`
- **409** `INVALID_REVIEW_STATUS`
- **502** `AI_CALL_FAILED`
- **500** `INTERNAL_ERROR`

## PART 6. 검증 문항 승인

### 16. 문항 승인

`POST /questions/{questionId}/approve`

**Request Header**

- `Content-Type: application/json`
- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Query / Path Parameter**

questionId

**Request Body**

```json
{
  "referenceAnswer": "NO"
}
```

**Response Body**

```json
{
  "data": {
    "questionId": 1,
    "referenceAnswer": "NO",
    "referenceAnswerReason": "암 진단 후 약관에서 정한 주요치료를 받아야 합니다.",
    "status": "APPROVED",
    "approvedAt": "2026-11-28T14:30:00"
  }
}
```

**Error**

- **400** `INVALID_INPUT`
- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **404** `NOT_FOUND`
- **409** `REVIEW_PROCESSING`
- **409** `INVALID_REVIEW_STATUS`
- **500** `INTERNAL_ERROR`
- **409** `INVALID_QUESTION_STATUS`
- **409** `REFERENCE_ANSWER_EMPTY`

### 17. 전체 문항 승인 확인 및 다음 단계 이동

`POST /reviews/{reviewId}/questions/approval`

**Request Header**

- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Query / Path Parameter**

reviewId

**Response Body**

```json
{
  "data": {
    "reviewId": 3,
    "currentStep": "PERSONA_SELECT",
    "approvedCount": 3
  }
}
```

**Error**

- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **404** `NOT_FOUND`
- **409** `REVIEW_PROCESSING`
- **409** `INVALID_REVIEW_STATUS`
- **500** `INTERNAL_ERROR`
- **409** `QUESTION_NOT_APPROVED`

### 18. 검증 질문 선택 단계로 이동

`POST /reviews/{reviewId}/questions/back`

**Request Header**

- `Cookie: accessToken={accessToken}; XSRF-TOKEN={csrfToken}`
- `X-XSRF-TOKEN: {csrfToken}`

**Query / Path Parameter**

reviewId

**Response Body**

```json
{
  "data": {
    "reviewId": 3,
    "currentStep": "QUESTION_SELECT"
  }
}
```

**Error**

- **401** `UNAUTHORIZED`
- **403** `INVALID_CSRF_TOKEN`
- **404** `NOT_FOUND`
- **409** `REVIEW_PROCESSING`
- **409** `INVALID_REVIEW_STATUS`
- **500** `INTERNAL_ERROR`

## PART 7. 페르소나 및 실험

### 18. 페르소나 목록 조회

`GET /personas`

**Response**

```json
{
  "data": [
    {
      "personaId": 1,
      "name": "보장 요약형",
      "financialLiteracy": "LOW",
      "readingBehavior": "요약 설명만 읽음",
      "description": "주요 보장 내용 위주로 확인하는 소비자"
    },
    {
      "personaId": 2,
      "name": "조건 탐색형",
      "financialLiteracy": "MEDIUM",
      "readingBehavior": "지급 조건 키워드를 검색",
      "description": "지급 조건과 예외사항을 찾아보는 소비자"
    }
  ]
}
```

**Error Response**

**401** `UNAUTHORIZED` : 인증이 필요합니다.

### 19. 검수별 페르소나 선택

`PUT /reviews/{reviewId}/personas`

**Request**

```json
{
  "personaIds": [1, 2, 3, 5]
}
```

**Response**

```json
{
  "data": {
    "reviewId": 1,
    "selectedPersonas": [
      {
        "reviewPersonaId": 1,
        "personaId": 1,
        "name": "보장 요약형"
      },
      {
        "reviewPersonaId": 2,
        "personaId": 2,
        "name": "조건 탐색형"
      }
    ],
    "selectedCount": 4
  }
}
```

**Error Response**

- **400** `INVALID_REQUEST` : 페르소나 선택 정보가 올바르지 않습니다.
- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `REVIEW_NOT_FOUND` : 검수 작업을 찾을 수 없습니다.
- **404** `PERSONA_NOT_FOUND` : 선택한 페르소나를 찾을 수 없습니다.

### 20. 페르소나 실험 시작

`POST /reviews/{reviewId}/experiments`

**Request**

```json
{
  "experimentType": "INITIAL",
  "parentExperimentId": null
}
```

**Response**

```json
{
  "data": {
    "experimentId": 1,
    "reviewId": 1,
    "experimentType": "INITIAL",
    "roundNumber": 1,
    "status": "RUNNING",
    "totalResponses": 20
  }
}
```

**Error Response**

- **400** `INVALID_REQUEST` : 실험 요청 정보가 올바르지 않습니다.
- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `REVIEW_NOT_FOUND` : 검수 작업을 찾을 수 없습니다.
- **409** `EXPERIMENT_NOT_READY` : 실험에 필요한 승인 질문 또는 페르소나가 선택되지 않았습니다.
- **409** `EXPERIMENT_ALREADY_RUNNING` : 이미 진행 중인 실험이 있습니다.

### 21. 실험 상태 조회

`GET /experiments/{experimentId}`

**Response**

```json
{
  "data": {
    "experimentId": 1,
    "status": "COMPLETED",
    "totalResponses": 20,
    "completedResponses": 20,
    "createdAt": "2026-11-25T12:00:00",
    "completedAt": "2026-11-25T12:03:00"
  }
}
```

**Error Response**

- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `EXPERIMENT_NOT_FOUND` : 실험을 찾을 수 없습니다.

### 22. 전체 페르소나 응답 조회

`GET /experiments/{experimentId}/responses`

**Response**

```json
{
  "data": [
    {
      "reviewPersonaId": 1,
      "personaName": "보장 요약형",
      "responses": [
        {
          "questionId": 1,
          "selectedAnswer": "YES",
          "responseReason": "암 진단을 받았으므로 지급된다고 판단했습니다.",
          "gradingResult": "INCORRECT",
          "gradingReason": "실제 주요치료 시행 여부를 확인하지 않았습니다."
        },
        {
          "questionId": 2,
          "selectedAnswer": "YES",
          "responseReason": "약관의 제외 항목을 확인했습니다.",
          "gradingResult": "CORRECT",
          "gradingReason": "기준답안과 일치합니다."
        }
      ]
    }
  ]
}
```

**Error Response**

- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `EXPERIMENT_NOT_FOUND` : 실험을 찾을 수 없습니다.
- **409** `EXPERIMENT_NOT_COMPLETED` : 실험이 완료되지 않았습니다.

## PART 8. 분석 리포트 및 재검증

### 23. 분석 리포트 요약 조회

`GET /experiments/{experimentId}/report`

**Response**

```json
{
  "data": {
    "experimentId": 1,
    "reviewId": 1,
    "roundNumber": 1,
    "summary": {
      "questionCount": 5,
      "personaCount": 4,
      "totalResponses": 20,
      "correctCount": 12,
      "incorrectCount": 5,
      "undeterminedCount": 3,
      "misunderstandingRate": 25
    },
    "questionSummaries": [
      {
        "questionId": 1,
        "questionText": "암 진단만으로 암주요치료비를 받을 수 있나요?",
        "correctCount": 2,
        "incorrectCount": 1,
        "undeterminedCount": 1,
        "misunderstandingRate": 25,
        "revisionRequired": false
      }
    ]
  }
}
```

**Error Response**

- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `EXPERIMENT_NOT_FOUND` : 실험을 찾을 수 없습니다.
- **409** `EXPERIMENT_NOT_COMPLETED` : 실험이 완료되지 않았습니다.

### 24. 문항별 응답 분석

`GET /experiments/{experimentId}/questions/{questionId}/analysis`

**Response**

```json
{
  "data": {
    "questionId": 1,
    "questionText": "암 진단만으로 암주요치료비를 받을 수 있나요?",
    "statistics": {
      "totalCount": 4,
      "correctCount": 2,
      "incorrectCount": 1,
      "undeterminedCount": 1,
      "misunderstandingRate": 25
    },
    "personaResponses": [
      {
        "personaName": "보장 요약형",
        "selectedAnswer": "YES",
        "gradingResult": "INCORRECT",
        "responseReason": "암 진단만으로 지급된다고 이해했습니다."
      }
    ]
  }
}
```

**Error Response**

- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `EXPERIMENT_NOT_FOUND` : 실험을 찾을 수 없습니다.
- **404** `QUESTION_NOT_FOUND` : 검증 질문을 찾을 수 없습니다.
- **409** `EXPERIMENT_NOT_COMPLETED` : 실험이 완료되지 않았습니다.

### 25. AI 설명문 수정 제안 생성

`POST /experiments/{experimentId}/revision-suggestions`

**Request**

```json
{
  "questionId": 1
}
```

**Response**

```json
{
  "data": {
    "suggestionId": 1,
    "experimentId": 1,
    "sourcePage": 12,
    "originalText": "암 진단 시 보험금을 지급합니다.",
    "suggestedText": "암 진단확정 후 약관에서 정한 암 주요치료를 받은 경우 보험금을 지급합니다.",
    "revisionReason": "소비자가 암 진단만으로 보험금이 지급된다고 오해할 가능성이 확인되었습니다.",
    "createdAt": "2026-11-25T13:00:00"
  }
}
```

**Error Response**

- **400** `INVALID_REQUEST` : 수정 제안 생성 요청이 올바르지 않습니다.
- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `EXPERIMENT_NOT_FOUND` : 실험을 찾을 수 없습니다.
- **404** `QUESTION_NOT_FOUND` : 검증 질문을 찾을 수 없습니다.
- **409** `EXPERIMENT_NOT_COMPLETED` : 실험이 완료되지 않았습니다.
- **500** `AI_GENERATION_FAILED` : AI 수정 제안 생성에 실패했습니다.

### 26. AI 수정 제안 조회

`GET /experiments/{experimentId}/revision-suggestions`

**Response**

```json
{
  "data": [
    {
      "suggestionId": 1,
      "sourcePage": 12,
      "originalText": "암 진단 시 보험금을 지급합니다.",
      "suggestedText": "암 진단확정 후 약관에서 정한 암 주요치료를 받은 경우 보험금을 지급합니다.",
      "revisionReason": "주요치료 시행 여부에 대한 안내가 필요합니다."
    }
  ]
}
```

**Error Response**

- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `EXPERIMENT_NOT_FOUND` : 실험을 찾을 수 없습니다.

### 27. 수정 상품설명서 업로드

`POST /reviews/{reviewId}/documents`

**Request**

Multipart: `documentType=PRODUCT_GUIDE`, `files=[암치료보험_상품설명서_v2.pdf]`

**Response**

```json
{
  "data": {
    "documentId": 3,
    "documentType": "PRODUCT_GUIDE",
    "originalFilename": "암치료보험_상품설명서_v2.pdf",
    "version": 2
  }
}
```

**Error Response**

- **400** `INVALID_REQUEST` : 문서 유형 또는 파일 정보가 올바르지 않습니다.
- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `REVIEW_NOT_FOUND` : 검수 작업을 찾을 수 없습니다.
- **413** `FILE_SIZE_EXCEEDED` : 파일 크기가 최대 허용 크기(20MB)를 초과했습니다.
- **415** `UNSUPPORTED_FILE_TYPE` : 지원하지 않는 파일 형식입니다.

### 28. 재실험 시작

`POST /reviews/{reviewId}/experiments`

**Request**

```json
{
  "experimentType": "RERUN",
  "parentExperimentId": 1
}
```

**Response**

```json
{
  "data": {
    "experimentId": 2,
    "parentExperimentId": 1,
    "reviewId": 1,
    "experimentType": "RERUN",
    "roundNumber": 2,
    "status": "RUNNING"
  }
}
```

**Error Response**

- **400** `INVALID_REQUEST` : 재실험 요청 정보가 올바르지 않습니다.
- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `REVIEW_NOT_FOUND` : 검수 작업을 찾을 수 없습니다.
- **404** `EXPERIMENT_NOT_FOUND` : 기준 실험을 찾을 수 없습니다.
- **409** `EXPERIMENT_NOT_COMPLETED` : 기준 실험이 완료되지 않았습니다.
- **409** `EXPERIMENT_ALREADY_RUNNING` : 이미 진행 중인 실험이 있습니다.

### 29. 최초 실험과 재실험 비교

`GET /reviews/{reviewId}/experiments/compare?baselineExperimentId=1&targetExperimentId=2`

**Request**

`baselineExperimentId=1`, `targetExperimentId=2`

**Response**

```json
{
  "data": {
    "reviewId": 1,
    "baseline": {
      "experimentId": 1,
      "roundNumber": 1,
      "correctCount": 12,
      "incorrectCount": 5,
      "undeterminedCount": 3,
      "misunderstandingRate": 25
    },
    "target": {
      "experimentId": 2,
      "roundNumber": 2,
      "correctCount": 15,
      "incorrectCount": 3,
      "undeterminedCount": 2,
      "misunderstandingRate": 15
    },
    "changes": {
      "correctCount": 3,
      "incorrectCount": -2,
      "undeterminedCount": -1,
      "misunderstandingRate": -10
    }
  }
}
```

**Error Response**

- **400** `INVALID_REQUEST` : 비교 대상 실험 정보가 올바르지 않습니다.
- **401** `UNAUTHORIZED` : 인증이 필요합니다.
- **404** `REVIEW_NOT_FOUND` : 검수 작업을 찾을 수 없습니다.
- **404** `EXPERIMENT_NOT_FOUND` : 비교 대상 실험을 찾을 수 없습니다.
- **409** `EXPERIMENT_NOT_COMPLETED` : 비교 대상 실험이 모두 완료되지 않았습니다.

---

## 공통 HTTP 상태 코드

| HTTP Status                | 에러 코드 예시                  | 설명                                     |
| -------------------------- | ------------------------------- | ---------------------------------------- |
| 400 Bad Request            | `INVALID_REQUEST`               | 잘못된 요청 데이터 또는 유효성 검증 실패 |
| 401 Unauthorized           | `UNAUTHORIZED`                  | 인증 정보 누락 또는 유효하지 않은 토큰   |
| 403 Forbidden              | `FORBIDDEN`                     | 해당 리소스에 접근할 권한이 없음         |
| 404 Not Found              | `REVIEW_NOT_FOUND` 등           | 요청한 리소스를 찾을 수 없음             |
| 409 Conflict               | `EXPERIMENT_ALREADY_RUNNING` 등 | 현재 리소스 상태와 요청이 충돌함         |
| 413 Payload Too Large      | `FILE_SIZE_EXCEEDED`            | 업로드 파일 크기 초과                    |
| 415 Unsupported Media Type | `UNSUPPORTED_FILE_TYPE`         | 지원하지 않는 파일 형식                  |
| 500 Internal Server Error  | `INTERNAL_SERVER_ERROR`         | 서버 내부 처리 오류                      |
| 502 Bad Gateway            | `AI_ANALYSIS_FAILED` 등         | 외부 AI API 호출 및 처리 실패            |

## 공통 응답 규칙

| 구분                     | 응답 형식                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------- |
| 단일 데이터 조회 및 생성 | `{"data": {...}}`                                                                     |
| 목록 조회                | `{"data": [...]}`                                                                     |
| 성공 메시지              | `{"message": "..."}`                                                                  |
| 에러 응답                | `{"timestamp": "...", "status": 400, "code": "...", "message": "...", "path": "..."}` |
