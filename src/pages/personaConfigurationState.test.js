import { describe, expect, it, vi } from 'vitest';
import { createMockPersonaExperimentApi } from '@/api/mocks/personaExperiment';
import {
  createInitialExperimentConditions,
  hasApprovedSelection,
  personaExperimentApi,
  readApprovedQuestions,
} from '@/api/personaExperiment';
import {
  answerLabels,
  experimentProgress,
  hasAllConditions,
  hasCompleteConditions,
  personaGroups,
  personaSelection,
  readPersonaDraft,
  savePersonaDraft,
  togglePersonaOption,
} from './personaConfigurationState';

function mockStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
    storedValues: () => [...values.values()],
  };
}

async function initialConditions(api, reviewId) {
  const review = await api.getReview({ reviewId });
  const questions = await api.listQuestions({ reviewId });
  return createInitialExperimentConditions({
    selection: personaSelection(true),
    documents: review.documents,
    questions: await readApprovedQuestions(api, { reviewId, questions }),
  });
}

describe('persona configuration', () => {
  it('toggles individual options and preserves the design order for multiple choices', () => {
    const [age] = personaGroups;
    const first = togglePersonaOption(personaSelection(), age, '60대 이상');
    const second = togglePersonaOption(first, age, '20대');
    expect(first.age).toEqual(['60대 이상']);
    expect(second.age).toEqual(['20대', '60대 이상']);
    expect(togglePersonaOption(second, age, '60대 이상').age).toEqual(['20대']);
  });

  it('validates every group and keeps all-selection in sync with individual changes', () => {
    const partial = { age: ['30대'], gender: ['여'], literacy: [] };
    expect(hasCompleteConditions(partial)).toBe(false);
    const complete = togglePersonaOption(partial, personaGroups[2], '중간');
    expect(hasCompleteConditions(complete)).toBe(true);
    expect(hasAllConditions(complete)).toBe(false);
    const all = personaSelection(true);
    expect(hasAllConditions(all)).toBe(true);
    expect(hasAllConditions(togglePersonaOption(all, personaGroups[0], '20대'))).toBe(false);
    expect(personaSelection(!hasAllConditions(all))).toEqual({ age: [], gender: [], literacy: [] });
  });

  it('restores only the valid draft and confirmation step for the same review', () => {
    const storage = mockStorage();
    const selection = { age: ['30대'], gender: ['여'], literacy: ['중간'] };
    savePersonaDraft('review-42', { ...selection, referenceAnswer: 'YES' }, 'confirm', storage);
    expect(readPersonaDraft('review-42', storage)).toEqual({ selection, phase: 'confirm' });
    expect(readPersonaDraft('review-43', storage)).toEqual({
      selection: personaSelection(),
      phase: 'configure',
    });
    expect(storage.storedValues()[0]).not.toContain('referenceAnswer');
    savePersonaDraft('review-42', { ...selection, gender: [] }, 'confirm', storage);
    expect(readPersonaDraft('review-42', storage).phase).toBe('configure');
  });
});

describe('approved questions and final answers', () => {
  it('requires a nonempty fully approved selection, excluding unselected drafts', () => {
    const questions = (...statuses) => statuses.map((status) => ({ status }));
    expect(hasApprovedSelection(questions('APPROVED', 'DRAFT', 'APPROVED'))).toBe(true);
    expect(hasApprovedSelection(questions('APPROVED', 'SELECTED', 'DRAFT'))).toBe(false);
    expect(hasApprovedSelection(questions('APPROVED', 'UNKNOWN'))).toBe(false);
    expect(hasApprovedSelection(questions('DRAFT'))).toBe(false);
    expect(hasApprovedSelection([])).toBe(false);
  });

  it('fetches details only for approved items and keeps list order', async () => {
    const request = { reviewId: '42', signal: new AbortController().signal };
    const questions = [
      { questionId: 7, questionText: 'first', status: 'APPROVED' },
      { questionId: 2, questionText: 'draft', status: 'DRAFT' },
      { questionId: 5, questionText: 'second', status: 'APPROVED' },
    ];
    const firstDetail = Promise.withResolvers();
    const getQuestion = vi.fn(({ questionId }) =>
      questionId === 7
        ? firstDetail.promise
        : Promise.resolve({ questionId, status: 'APPROVED', referenceAnswer: 'YES' }),
    );
    const reading = readApprovedQuestions({ getQuestion }, { ...request, questions });
    await vi.waitFor(() => expect(getQuestion).toHaveBeenCalledTimes(2));
    firstDetail.resolve({ questionId: 7, status: 'APPROVED', referenceAnswer: 'NO' });
    expect(
      (await reading).map(({ questionText, referenceAnswer }) => [
        questionText,
        answerLabels[referenceAnswer],
      ]),
    ).toEqual([
      ['first', '아니요'],
      ['second', '예'],
    ]);
    expect(getQuestion.mock.calls.map(([{ questionId }]) => questionId)).toEqual([7, 5]);
  });

  it('rejects the confirm data when a final answer cannot be loaded and allows a read retry', async () => {
    const api = createMockPersonaExperimentApi('answer-error');
    const request = { reviewId: '42' };
    const questions = await api.listQuestions(request);
    await expect(readApprovedQuestions(api, { ...request, questions })).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    });
    await expect(readApprovedQuestions(api, { ...request, questions })).resolves.toHaveLength(3);
    const getQuestion = vi
      .fn()
      .mockResolvedValue({ status: 'APPROVED', questionId: 1, referenceAnswer: null });
    await expect(
      readApprovedQuestions({ getQuestion }, { ...request, questions: [questions[0]] }),
    ).rejects.toMatchObject({ code: 'APPROVED_ANSWER_UNAVAILABLE' });
  });
});

describe('experiment lifecycle', () => {
  it('preserves all 18 approved fixture questions through start and restore', async () => {
    const options = { storage: mockStorage() };
    const api = createMockPersonaExperimentApi('many-questions', options);
    const reviewId = 'long-list';
    const conditions = await initialConditions(api, reviewId);
    const { experimentId, totalResponses } = await api.startExperiment({ reviewId, conditions });
    expect(totalResponses).toBe(30 * 18);
    const reentered = createMockPersonaExperimentApi('many-questions', options);
    const result = await reentered.getExperiment({ reviewId, experimentId });
    expect(result.conditions.questions.map(({ questionId }) => questionId)).toEqual(
      Array.from({ length: 18 }, (_, index) => index + 1),
    );
  });

  it('simulates delayed answers and leaves time to exit and resume a handoff run', async () => {
    vi.useFakeTimers();
    try {
      const slow = createMockPersonaExperimentApi('slow');
      const received = vi.fn();
      const answer = slow.getQuestion({ questionId: 1 }).then(received);
      await vi.advanceTimersByTimeAsync(1000);
      expect(received).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(100);
      await answer;
      expect(received).toHaveBeenCalledWith(expect.objectContaining({ referenceAnswer: 'NO' }));
    } finally {
      vi.useRealTimers();
    }
    let time = 0;
    const options = { storage: mockStorage(), now: () => time };
    const api = createMockPersonaExperimentApi('handoff', options);
    const reviewId = 'handoff';
    const conditions = await initialConditions(api, reviewId);
    const { experimentId } = await api.startExperiment({ reviewId, conditions });
    time = 8000;
    const reentered = createMockPersonaExperimentApi('handoff', options);
    await expect(reentered.getExperiment({ reviewId, experimentId })).resolves.toMatchObject({
      status: 'RUNNING',
    });
    time = 10000;
    await expect(reentered.getExperiment({ reviewId, experimentId })).resolves.toMatchObject({
      status: 'COMPLETED',
      conditions,
    });
  });

  it('keeps all live adapters read-only', () => {
    expect(Object.keys(personaExperimentApi).sort()).toEqual([
      'getExperiment',
      'getQuestion',
      'getReview',
      'listQuestions',
    ]);
  });

  it('only shows full progress on a completed status', () => {
    expect(
      experimentProgress({ status: 'RUNNING', completedResponses: 4, totalResponses: 8 }),
    ).toBe(50);
    expect(
      experimentProgress({ status: 'RUNNING', completedResponses: 8, totalResponses: 8 }),
    ).toBe(99);
    expect(experimentProgress({ status: 'RUNNING', totalResponses: 0 })).toBeNull();
    expect(
      experimentProgress({ status: 'COMPLETED', completedResponses: 8, totalResponses: 8 }),
    ).toBe(99);
    expect(experimentProgress({ status: 'COMPLETED', resultsSaved: true })).toBe(100);
  });

  it('recovers through a new adapter after a lost response and keeps running while unmounted', async () => {
    let time = 0;
    const options = { storage: mockStorage(), now: () => time };
    const api = createMockPersonaExperimentApi('response-lost', options);
    const reviewId = '42';
    const conditions = await initialConditions(api, reviewId);
    const start = { reviewId, conditions };
    const [first, second] = await Promise.allSettled([
      api.startExperiment(start),
      api.startExperiment(start),
    ]);
    expect(first).toMatchObject({ status: 'rejected', reason: { code: 'ERR_NETWORK' } });
    expect(second).toMatchObject({
      status: 'rejected',
      reason: { code: 'EXPERIMENT_ALREADY_RUNNING' },
    });
    const restored = createMockPersonaExperimentApi('response-lost', options);
    const isolated = createMockPersonaExperimentApi('experiment-failed', options);
    await expect(isolated.findExperiment({ reviewId })).resolves.toBeNull();
    await expect(restored.findExperiment({ reviewId: '43' })).resolves.toBeNull();
    const recovered = await restored.findExperiment({ reviewId });
    const request = { reviewId, experimentId: recovered.experimentId };
    await expect(restored.getExperiment(request)).resolves.toMatchObject({
      status: 'RUNNING',
      participantCount: 30,
    });
    time += 1800;
    await expect(restored.getExperiment(request)).resolves.toMatchObject({
      status: 'COMPLETED',
      completedResponses: 90,
      conditions,
    });
    await expect(restored.startExperiment(start)).rejects.toMatchObject({
      code: 'EXPERIMENT_ALREADY_RUNNING',
    });
    expect(options.storage.storedValues().join()).not.toMatch(
      /questionText|referenceAnswer|filename/,
    );
  });

  it('allows one explicit retry only after a definite failure, preserving answers and document versions', async () => {
    let time = 0;
    const api = createMockPersonaExperimentApi('experiment-failed', {
      storage: mockStorage(),
      now: () => time,
    });
    const reviewId = '44';
    const conditions = await initialConditions(api, reviewId);
    expect(conditions.targetDocuments.map(({ version }) => version)).toEqual([1, 1]);
    expect(conditions.revisedDocuments.map(({ version }) => version)).toEqual([2]);
    const { experimentId } = await api.startExperiment({ reviewId, conditions });
    const request = { reviewId, experimentId };
    await expect(api.retryExperiment(request)).rejects.toMatchObject({
      code: 'EXPERIMENT_RETRY_UNAVAILABLE',
    });
    time = 900;
    const failed = await api.getExperiment(request);
    expect(failed).toMatchObject({ status: 'FAILED', retryable: true, conditions });
    time = 10000;
    expect(await api.getExperiment(request)).toEqual(failed);
    const retry = await api.retryExperiment(request);
    expect(retry).toMatchObject({ status: 'RUNNING', conditions });
    expect(retry.experimentId).not.toBe(experimentId);
    await expect(api.retryExperiment(request)).rejects.toMatchObject({
      code: 'EXPERIMENT_RETRY_UNAVAILABLE',
    });
  });

  it('distinguishes a confirmed start rejection from a lost retry response', async () => {
    let time = 0;
    const options = { storage: mockStorage(), now: () => time };
    const reviewId = '45';
    const rejected = createMockPersonaExperimentApi('start-error', options);
    const conditions = await initialConditions(rejected, reviewId);
    const start = { reviewId, conditions };
    await expect(rejected.startExperiment(start)).rejects.toMatchObject({
      code: 'MOCK_START_REJECTED',
    });
    await expect(rejected.findExperiment({ reviewId })).resolves.toBeNull();
    await expect(rejected.startExperiment(start)).resolves.toMatchObject({
      status: 'RUNNING',
      conditions,
    });
    const retryLoss = createMockPersonaExperimentApi('retry-response-lost', options);
    const { experimentId } = await retryLoss.startExperiment(start);
    time += 900;
    const request = { reviewId, experimentId };
    await expect(retryLoss.retryExperiment(request)).rejects.toMatchObject({ code: 'ERR_NETWORK' });
    await expect(retryLoss.retryExperiment(request)).rejects.toMatchObject({
      code: 'EXPERIMENT_RETRY_UNAVAILABLE',
    });
    await expect(retryLoss.findExperiment({ reviewId })).resolves.toEqual({
      experimentId: experimentId + 1,
    });
  });
});
