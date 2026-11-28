const recommendations = [
  {
    questionId: 1,
    sourceType: 'CASE_BASED',
    questionText: '보장 개시일부터 보험금을 청구할 수 있나요?',
    status: 'DRAFT',
  },
  {
    questionId: 2,
    sourceType: 'MISUNDERSTANDING',
    questionText: '통원 치료에도 같은 보장 한도가 적용되나요?',
    status: 'DRAFT',
  },
];

const extraQuestions = Array.from({ length: 9 }, (_, index) => ({
  questionId: index + 3,
  sourceType: 'MISUNDERSTANDING',
  questionText: '예시 조건 ' + (index + 1) + '에 해당하면 보장 대상인가요?',
  status: 'DRAFT',
}));

const sampleEvidence = {
  evidenceId: 11,
  clauseId: 7,
  documentId: 5,
  filename: '예시 보험약관.pdf',
  clauseNumber: '제11조',
  clauseTitle: '보험금 지급사유',
  sourcePage: 32,
  evidenceText: '예시 약관에서 보장 개시일과 보험금 지급 조건을 확인합니다.',
  caseChunkId: null,
  disputeCaseId: null,
  caseTitle: null,
  sourceUrl: null,
};

const sampleCase = {
  evidenceId: 12,
  clauseId: null,
  documentId: null,
  filename: null,
  clauseNumber: null,
  clauseTitle: null,
  sourcePage: null,
  evidenceText: '지급 조건을 다르게 이해한 가상의 사례입니다.',
  caseChunkId: 21,
  disputeCaseId: 8,
  caseTitle: '보험금 지급 조건 관련 가상 사례',
  sourceUrl: null,
};

function wait(signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 550);
    signal.addEventListener('abort', abort, { once: true });
  });
}

const reviews = new Map();

export function createMockQuestionSelectionApi(scenario) {
  const failed = new Set();

  function getOrCreateReview(id) {
    const key = JSON.stringify([scenario, String(id)]);
    if (!reviews.has(key)) {
      const questions = scenario === 'empty' ? [] : [...recommendations];
      if (scenario === 'many') questions.push(...extraQuestions);
      if (scenario === 'restored') {
        questions[0] = { ...questions[0], status: 'SELECTED' };
        questions.push({
          questionId: 3,
          sourceType: 'MANUAL',
          questionText: '가상의 예시 조건에서도 신청할 수 있나요?',
          status: 'APPROVED',
        });
      }
      reviews.set(key, { questions, currentStep: 'QUESTION_SELECT', nextId: 12 });
    }
    return reviews.get(key);
  }

  function failOnce(step, error) {
    if (
      (scenario === step + '-error' || (step === 'create' && scenario === 'validation-error')) &&
      !failed.has(step)
    ) {
      failed.add(step);
      throw error;
    }
  }

  function findQuestion(review, questionId) {
    const question = review.questions.find((item) => item.questionId === questionId);
    if (!question) throw { status: 404, code: 'NOT_FOUND' };
    return question;
  }

  function findEditable(review, questionId) {
    const question = findQuestion(review, questionId);
    if (question.sourceType !== 'MANUAL' || !['DRAFT', 'SELECTED'].includes(question.status)) {
      throw { status: 409, code: 'INVALID_QUESTION_STATUS' };
    }
    return question;
  }

  return {
    async list({ reviewId, signal }) {
      await wait(signal);
      failOnce('list', { status: 500, code: 'INTERNAL_ERROR' });
      return [...getOrCreateReview(reviewId).questions];
    },
    async evidence({ reviewId, questionId, signal }) {
      await wait(signal);
      failOnce('evidence', { status: 500, code: 'INTERNAL_ERROR' });
      const question = findQuestion(getOrCreateReview(reviewId), questionId);
      const evidences =
        scenario === 'long-evidence'
          ? Array.from({ length: 8 }, (_, i) => ({
              ...sampleEvidence,
              evidenceId: 30 + i,
              sourcePage: 32 + i,
            }))
          : question.sourceType === 'CASE_BASED'
            ? [sampleEvidence, sampleCase]
            : [sampleEvidence];
      return {
        ...question,
        generationReason: '예시 지급 조건을 다르게 이해할 가능성을 살펴봅니다.',
        evidences,
        mock: true,
      };
    },
    async create({ reviewId, questionText, signal }) {
      await wait(signal);
      failOnce('create', { status: 400, code: 'INVALID_INPUT' });
      const review = getOrCreateReview(reviewId);
      const question = {
        questionId: review.nextId++,
        sourceType: 'MANUAL',
        questionText,
        status: 'DRAFT',
      };
      review.questions.push(question);
      return question;
    },
    async update({ reviewId, questionId, questionText, signal }) {
      await wait(signal);
      failOnce('update', { status: 400, code: 'INVALID_INPUT' });
      const review = getOrCreateReview(reviewId);
      const updated = { ...findEditable(review, questionId), questionText };
      review.questions = review.questions.map((item) =>
        item.questionId === questionId ? updated : item,
      );
      return updated;
    },
    async remove({ reviewId, questionId, signal }) {
      await wait(signal);
      failOnce('remove', { status: 500, code: 'INTERNAL_ERROR' });
      const review = getOrCreateReview(reviewId);
      findEditable(review, questionId);
      review.questions = review.questions.filter((item) => item.questionId !== questionId);
    },
    async confirm({ reviewId, questionIds, signal }) {
      await wait(signal);
      failOnce('save', { status: 502, code: 'AI_CALL_FAILED' });
      const review = getOrCreateReview(reviewId);
      if (review.currentStep !== 'QUESTION_SELECT')
        throw { status: 409, code: 'INVALID_REVIEW_STATUS' };
      review.questions = review.questions.map((question) => ({
        ...question,
        status: questionIds.includes(question.questionId)
          ? question.status === 'APPROVED'
            ? 'APPROVED'
            : 'SELECTED'
          : 'DRAFT',
      }));
      review.currentStep = 'ANSWER_APPROVE';
      if (scenario === 'response-lost') throw { status: null, code: 'ERR_NETWORK' };
      return { reviewId, currentStep: review.currentStep, selectedCount: questionIds.length };
    },
    async getReview({ reviewId, signal }) {
      await wait(signal);
      return { reviewId, currentStep: getOrCreateReview(reviewId).currentStep };
    },
  };
}
