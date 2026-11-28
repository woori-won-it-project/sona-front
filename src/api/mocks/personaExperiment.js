import { createInitialExperimentConditions } from '../personaExperiment';

const questions = [
  {
    questionId: 1,
    questionText: '암 진단만으로 암주요치료비를 받을 수 있나요?',
    status: 'APPROVED',
    referenceAnswer: 'NO',
  },
  {
    questionId: 2,
    questionText: '면역력 강화 치료는 암 주요치료에서 제외되나요?',
    status: 'APPROVED',
    referenceAnswer: 'YES',
  },
  {
    questionId: 3,
    questionText: '전액본인부담 항암방사선치료도 비급여 암 주요치료에 포함되나요?',
    status: 'APPROVED',
    referenceAnswer: 'YES',
  },
];

const documents = [
  { documentId: 501, documentType: 'TERMS', version: 1 },
  { documentId: 502, documentType: 'PRODUCT_GUIDE', version: 1 },
  { documentId: 503, documentType: 'PRODUCT_GUIDE', version: 2 },
];
const inMemoryRuns = new Map();

export function createMockPersonaExperimentApi(scenario, { storage, now = Date.now } = {}) {
  const questionFixtures =
    scenario === 'many-questions'
      ? Array.from({ length: 18 }, (_, index) => ({
          ...questions[index % questions.length],
          questionId: index + 1,
          questionText: `검증 사례 ${index + 1} · ${questions[index % questions.length].questionText}`,
        }))
      : questions;
  const progressInterval = ['slow', 'handoff'].includes(scenario) ? 2500 : 450;
  const waitForResponse = () => new Promise((resolve) => setTimeout(resolve, 1100));
  let rejectedStart = false;
  let failedDetail = false;
  let failedStatus = false;
  const keyFor = (reviewId) => 'sona:mock-persona-run:' + JSON.stringify([reviewId, scenario]);

  function readRun(reviewId) {
    const key = keyFor(reviewId);
    try {
      const persistence = storage ?? globalThis.sessionStorage;
      return inMemoryRuns.get(key) ?? JSON.parse(persistence?.getItem(key) ?? 'null');
    } catch {
      return inMemoryRuns.get(key) ?? null;
    }
  }

  function saveRun(reviewId, run) {
    const key = keyFor(reviewId);
    try {
      const persistence = storage ?? globalThis.sessionStorage;
      if (persistence) {
        persistence.setItem(key, JSON.stringify(run));
        inMemoryRuns.delete(key);
        return;
      }
    } catch {
      // A tab with storage disabled can continue in memory until reload.
    }
    inMemoryRuns.set(key, run);
  }

  function readStatus(reviewId, run) {
    const { experimentId, startedAt, attempt, selection, questionIds, documentIds } = run;
    const conditions = createInitialExperimentConditions({
      selection,
      questions: questionIds.map((id) =>
        questionFixtures.find(({ questionId }) => id === questionId),
      ),
      documents: documentIds.map((id) => documents.find(({ documentId }) => id === documentId)),
    });
    const participantCount =
      selection.age.length * selection.gender.length * selection.literacy.length;
    const totalResponses = participantCount * conditions.questions.length;
    const elapsed = Math.max(0, now() - startedAt);
    const fails = attempt === 1 && ['experiment-failed', 'retry-response-lost'].includes(scenario);
    const failed = fails && elapsed >= 900;
    const completed = !fails && elapsed >= progressInterval * 4;
    const fraction = [0, 0.25, 0.6, 0.82, 1][
      Math.floor(Math.min(elapsed, fails ? 900 : progressInterval * 4) / progressInterval)
    ];
    return {
      reviewId,
      experimentId,
      status: failed ? 'FAILED' : completed ? 'COMPLETED' : 'RUNNING',
      resultsSaved: completed,
      retryable: failed,
      participantCount,
      completedResponses: Math.floor(totalResponses * fraction),
      totalResponses,
      conditions,
    };
  }

  return {
    async getReview({ reviewId }) {
      return {
        reviewId,
        currentStep: scenario === 'not-ready' ? 'ANSWER_APPROVE' : 'PERSONA_SELECT',
        documents,
      };
    },
    async listQuestions() {
      if (scenario === 'empty-questions') return [];
      const list = questionFixtures.map(({ questionId, questionText, status }) => ({
        questionId,
        questionText,
        status,
      }));
      if (scenario === 'unapproved') list[1].status = 'SELECTED';
      return list;
    },
    async getQuestion({ questionId }) {
      if (scenario === 'slow') await waitForResponse();
      if (scenario === 'answer-error' && !failedDetail) {
        failedDetail = true;
        throw { code: 'INTERNAL_ERROR' };
      }
      return questionFixtures.find((question) => question.questionId === questionId);
    },
    async startExperiment({ reviewId, conditions }) {
      if (readRun(reviewId)) throw { code: 'EXPERIMENT_ALREADY_RUNNING' };
      if (scenario === 'start-error' && !rejectedStart) {
        rejectedStart = true;
        throw { code: 'MOCK_START_REJECTED' };
      }
      const run = {
        experimentId: 701,
        startedAt: now(),
        attempt: 1,
        selection: conditions.selection,
        questionIds: conditions.questions.map(({ questionId }) => questionId),
        documentIds: [...conditions.originalDocuments, ...conditions.revisedDocuments].map(
          ({ documentId }) => documentId,
        ),
      };
      saveRun(reviewId, run);
      if (scenario === 'slow') await waitForResponse();
      if (scenario === 'response-lost') throw { code: 'ERR_NETWORK' };
      return readStatus(reviewId, run);
    },
    async retryExperiment({ reviewId, experimentId }) {
      const previous = readRun(reviewId);
      if (previous?.experimentId !== experimentId || !readStatus(reviewId, previous).retryable) {
        throw { code: 'EXPERIMENT_RETRY_UNAVAILABLE' };
      }
      const run = {
        ...previous,
        startedAt: now(),
        attempt: previous.attempt + 1,
        experimentId: previous.experimentId + 1,
      };
      saveRun(reviewId, run);
      if (scenario === 'retry-response-lost') throw { code: 'ERR_NETWORK' };
      return readStatus(reviewId, run);
    },
    async findExperiment({ reviewId }) {
      const run = readRun(reviewId);
      return run ? { experimentId: run.experimentId } : null;
    },
    async getExperiment({ reviewId, experimentId }) {
      const run = readRun(reviewId);
      if (run?.experimentId !== experimentId) throw { code: 'EXPERIMENT_NOT_FOUND' };
      if (scenario === 'status-error' && !failedStatus) {
        failedStatus = true;
        throw { code: 'ERR_NETWORK' };
      }
      return readStatus(reviewId, run);
    },
  };
}
