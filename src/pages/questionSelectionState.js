export const maxSelectedQuestions = 10;
export const maxQuestionLength = 150;
export const selectionLimitMessage = '질문은 최대 10개까지 선택할 수 있어요.';

export const questionTypes = {
  CASE_BASED: '실제 사례 기반',
  MISUNDERSTANDING: '사례 미매칭 · AI 예상 분쟁',
  MANUAL: '직접 작성',
};

export const validationErrors = {
  empty: '검증 질문을 입력해 주세요.',
  length: '질문은 150자 이하로 입력해 주세요.',
  input: '질문 내용을 확인해 주세요.',
  status: '현재 상태에서는 이 질문을 수정할 수 없어요.',
  request: '질문을 저장하지 못했어요. 다시 시도해 주세요.',
};

export function checkQuestionText(value) {
  const text = value.trim();
  if (!text) return 'empty';
  return [...text].length > maxQuestionLength ? 'length' : null;
}

export function toQuestion({ questionId, sourceType, questionText, status }) {
  return { id: questionId, type: sourceType, text: questionText, status };
}

export function canManageQuestion(question) {
  return question?.type === 'MANUAL' && ['DRAFT', 'SELECTED'].includes(question.status);
}

export function storedQuestionIds(questions) {
  return questions
    .filter(({ status }) => ['SELECTED', 'APPROVED'].includes(status))
    .map(({ id }) => id);
}

export function toggleQuestionSelection(ids, id) {
  if (ids.includes(id)) return ids.filter((selectedId) => selectedId !== id);
  return ids.length < maxSelectedQuestions ? [...ids, id] : ids;
}

export function getSelectedQuestions(questions, selectedIds) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return selectedIds.map((id) => byId.get(id)).filter(Boolean);
}

export function toEvidence({ generationReason, evidences, mock }) {
  const sections = new Map();
  const references = new Set();
  for (const item of evidences ?? []) {
    const isCase =
      item.disputeCaseId != null || item.caseChunkId != null || Boolean(item.caseTitle);
    const title = [
      isCase ? item.caseTitle : item.filename,
      item.clauseNumber,
      item.clauseTitle,
      item.sourcePage == null ? null : 'PDF p.' + item.sourcePage,
    ]
      .filter(Boolean)
      .join(' · ');
    if (item.sourceUrl) references.add(item.sourceUrl);
    if (!title && !item.evidenceText) continue;
    const label = isCase ? '관련 분쟁사례' : '관련 문서';
    if (!sections.has(label)) sections.set(label, []);
    sections.get(label).push({ id: item.evidenceId, title, text: item.evidenceText });
  }
  if (!generationReason && !sections.size && !references.size) return null;
  return {
    reason: generationReason,
    sections: Array.from(sections, ([label, entries]) => ({ label, entries })),
    references: [...references],
    mock,
  };
}

function matchingStage(review, reviewId, step) {
  return (
    review?.reviewId != null &&
    String(review.reviewId) === String(reviewId) &&
    review.currentStep === step
  );
}

export function selectionAttempt(scope, reviewId) {
  return pendingReviewWrite(scope, 'question-selection', String(reviewId));
}

export async function verifyQuestionSelection({ api, reviewId, signal, scope = 'server' }) {
  try {
    const review = await api.getReview({ reviewId, signal });
    signal.throwIfAborted();
    if (matchingStage(review, reviewId, 'ANSWER_APPROVE')) {
      selectionAttempt(scope, reviewId).clear();
      return { status: 'saved', reviewId: review.reviewId };
    }
  } catch {
    signal.throwIfAborted();
  }
  return { status: 'unconfirmed' };
}

export async function confirmQuestionSelection({
  api,
  reviewId,
  questionIds,
  signal,
  scope = 'server',
}) {
  const attempt = selectionAttempt(scope, reviewId);
  if (attempt.isPending()) return verifyQuestionSelection({ api, reviewId, signal, scope });
  signal.throwIfAborted();
  attempt.mark();
  try {
    const result = await api.confirm({ reviewId, questionIds, signal });
    signal.throwIfAborted();
    if (matchingStage(result, reviewId, 'ANSWER_APPROVE')) {
      attempt.clear();
      return { status: 'saved', reviewId: result.reviewId };
    }
  } catch (error) {
    signal.throwIfAborted();
    const rejected = {
      INVALID_INPUT: 400,
      UNAUTHORIZED: 401,
      INVALID_CSRF_TOKEN: 403,
      NOT_FOUND: 404,
    };
    if (Object.hasOwn(rejected, error?.code) && rejected[error.code] === error.status) {
      attempt.clear();
      return { status: 'retry' };
    }
  }
  // QUESTION_SELECT can still be visible while answer generation is running.
  return verifyQuestionSelection({ api, reviewId, signal, scope });
}
import { pendingReviewWrite } from '@/hooks/pendingReviewWrites';
