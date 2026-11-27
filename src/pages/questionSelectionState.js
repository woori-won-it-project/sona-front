export const maxSelectedQuestions = 10;
export const maxQuestionLength = 150;
export const selectionLimitMessage = '질문은 최대 10개까지 선택할 수 있어요.';

export const questionTypes = {
  case: '실제 사례 기반',
  predicted: '사례 미매칭 · AI 예상 분쟁',
  custom: '직접 작성',
};

export const validationErrors = {
  empty: '검증 질문을 입력해 주세요.',
  length: '질문은 150자 이하로 입력해 주세요.',
  unrelated: '등록한 문서와 관련된 검증 질문을 입력해 주세요.',
  vague: '확인하려는 보장이나 조건을 구체적으로 입력해 주세요.',
  notBinary: '예 또는 아니오로 답변할 수 있는 질문을 입력해 주세요.',
  duplicate: '이미 등록된 질문과 유사한 내용이에요.',
  request: '질문을 확인하지 못했어요. 다시 시도해 주세요.',
};

export function checkQuestionText(value) {
  const text = value.trim();
  if (!text) return 'empty';
  return [...text].length > maxQuestionLength ? 'length' : null;
}

export function toggleQuestionSelection(ids, id) {
  if (ids.includes(id)) return ids.filter((selectedId) => selectedId !== id);
  return ids.length < maxSelectedQuestions ? [...ids, id] : ids;
}

export function saveCustomQuestion(draft, question) {
  const editing = draft.customQuestions.some(({ id }) => id === question.id);
  if (editing) {
    return {
      ...draft,
      customQuestions: draft.customQuestions.map((item) =>
        item.id === question.id ? question : item,
      ),
    };
  }
  if (draft.selectedIds.length >= maxSelectedQuestions) return draft;
  return {
    customQuestions: [...draft.customQuestions, question],
    selectedIds: [...draft.selectedIds, question.id],
  };
}

export function removeCustomQuestion(draft, id) {
  return {
    customQuestions: draft.customQuestions.filter((item) => item.id !== id),
    selectedIds: draft.selectedIds.filter((selectedId) => selectedId !== id),
  };
}

export function getSelectedQuestions(questions, selectedIds) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return selectedIds.map((id) => byId.get(id)).filter(Boolean);
}

export function selectionSignature(selected, customQuestions) {
  const fields = (questions) => questions.map(({ id, type, text }) => [id, type, text]);
  return JSON.stringify([fields(selected), fields(customQuestions)]);
}
