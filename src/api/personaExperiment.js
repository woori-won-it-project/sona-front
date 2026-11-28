import client from './client';
import { documentRegistrationApi } from './documentRegistration';
import { questionSelectionApi } from './questionSelection';

export function hasApprovedSelection(questions) {
  const selected = questions.filter(({ status }) => status !== 'DRAFT');
  return selected.length > 0 && selected.every(({ status }) => status === 'APPROVED');
}

export async function readApprovedQuestions(api, { reviewId, questions, signal }) {
  return Promise.all(
    questions
      .filter(({ status }) => status === 'APPROVED')
      .map(async (question) => {
        const detail = await api.getQuestion({ reviewId, questionId: question.questionId, signal });
        if (
          detail?.questionId !== question.questionId ||
          detail.status !== 'APPROVED' ||
          !['YES', 'NO'].includes(detail.referenceAnswer)
        ) {
          throw { code: 'APPROVED_ANSWER_UNAVAILABLE' };
        }
        return { ...question, referenceAnswer: detail.referenceAnswer };
      }),
  );
}

export function createInitialExperimentConditions({ selection, questions, documents }) {
  const versionedDocuments = documents.map(({ documentId, documentType, version }) => ({
    documentId,
    documentType,
    version,
  }));
  const originalDocuments = versionedDocuments.filter(({ version }) => version === 1);
  return {
    selection: Object.fromEntries(
      Object.entries(selection).map(([key, values]) => [key, [...values]]),
    ),
    questions: questions.map(({ questionId, questionText, referenceAnswer }) => ({
      questionId,
      questionText,
      referenceAnswer,
    })),
    originalDocuments,
    revisedDocuments: versionedDocuments.filter(({ version }) => version > 1),
    targetDocuments: originalDocuments,
    settings: { experimentType: 'INITIAL' },
  };
}

// Live API for issue #13. Persona writes and experiment start depend on a server contract.
export const personaExperimentApi = {
  getReview: documentRegistrationApi.getReview,
  listQuestions: questionSelectionApi.list,
  getQuestion: questionSelectionApi.evidence,
  async getExperiment({ experimentId, signal }) {
    const { data } = await client.get('/experiments/' + encodeURIComponent(experimentId), {
      signal,
    });
    const { status, completedResponses, totalResponses } = data.data;
    // The current read contract does not confirm that the report is ready.
    return { status, completedResponses, totalResponses, resultsSaved: null };
  },
};
