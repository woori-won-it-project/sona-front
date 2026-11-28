import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockQuestionSelectionApi } from '@/api/mocks/questionSelection';
import {
  canManageQuestion,
  checkQuestionText,
  confirmQuestionSelection,
  getSelectedQuestions,
  maxQuestionLength,
  storedQuestionIds,
  toEvidence,
  toQuestion,
  toggleQuestionSelection,
  verifyQuestionSelection,
} from './questionSelectionState';

const signal = new AbortController().signal;
const selection = { reviewId: '3', questionIds: [1, 5], signal };

it('restores only saved selections and leaves checkbox changes outside the question list', () => {
  const questions = [
    { questionId: 1, sourceType: 'CASE_BASED', questionText: 'one', status: 'DRAFT' },
    { questionId: 5, sourceType: 'MANUAL', questionText: 'five', status: 'APPROVED' },
    { questionId: 8, sourceType: 'MISUNDERSTANDING', questionText: 'eight', status: 'SELECTED' },
  ].map(toQuestion);
  const saved = storedQuestionIds(questions);
  expect(saved).toEqual([5, 8]);
  const local = toggleQuestionSelection(toggleQuestionSelection(saved, 5), 1);
  expect(getSelectedQuestions(questions, local).map(({ text }) => text)).toEqual(['eight', 'one']);
  expect(storedQuestionIds(questions)).toEqual([5, 8]);
});

it('keeps the 10-question and 150-character UI limits', () => {
  const ids = Array.from({ length: 10 }, (_, index) => index);
  expect(toggleQuestionSelection(ids, 10)).toBe(ids);
  expect(toggleQuestionSelection(ids, 9)).toEqual(ids.slice(0, 9));
  expect(checkQuestionText('  ')).toBe('empty');
  expect(checkQuestionText('  ' + '한'.repeat(maxQuestionLength) + '  ')).toBeNull();
  expect(checkQuestionText('가 '.repeat(76))).toBe('length');
});

it.each([
  ['MANUAL', 'DRAFT', true],
  ['MANUAL', 'SELECTED', true],
  ['MANUAL', 'APPROVED', false],
  ['CASE_BASED', 'DRAFT', false],
  ['MISUNDERSTANDING', 'SELECTED', false],
])('allows management for %s/%s only when permitted', (type, status, allowed) => {
  expect(canManageQuestion({ type, status })).toBe(allowed);
});

it('uses document and case evidence with no placeholder output for absent source fields', () => {
  expect(
    toEvidence({
      generationReason: 'Reason',
      evidences: [
        {
          evidenceId: 1,
          filename: 'terms.pdf',
          sourcePage: 3,
          evidenceText: 'Excerpt',
          clauseTitle: null,
        },
        {
          evidenceId: 2,
          disputeCaseId: 9,
          caseTitle: null,
          evidenceText: 'Example',
          sourceUrl: 'https://example.com/source',
        },
        { evidenceId: 3, sourceUrl: null },
      ],
    }),
  ).toMatchObject({
    reason: 'Reason',
    sections: [
      { label: '관련 문서', entries: [{ id: 1, title: 'terms.pdf · PDF p.3', text: 'Excerpt' }] },
      { label: '관련 분쟁사례', entries: [{ id: 2, title: '', text: 'Example' }] },
    ],
    references: ['https://example.com/source'],
  });
  expect(toEvidence({ generationReason: null, evidences: [] })).toBeNull();
});

it('confirms the selected IDs once and hands off the server review ID', async () => {
  const api = {
    confirm: vi.fn().mockResolvedValue({ reviewId: 3, currentStep: 'ANSWER_APPROVE' }),
    getReview: vi.fn(),
  };
  await expect(confirmQuestionSelection({ api, ...selection })).resolves.toEqual({
    status: 'saved',
    reviewId: 3,
  });
  expect(api.confirm).toHaveBeenCalledExactlyOnceWith(selection);
  expect(api.getReview).not.toHaveBeenCalled();
});

it.each([
  ['ANSWER_APPROVE', { status: 'saved', reviewId: 3 }],
  ['QUESTION_SELECT', { status: 'unconfirmed' }],
  ['ANALYZING', { status: 'unconfirmed' }],
])(
  'checks the actual %s step after a lost response without repeating the write',
  async (currentStep, expected) => {
    const api = {
      confirm: vi.fn().mockRejectedValue({ code: 'ERR_NETWORK' }),
      getReview: vi.fn().mockResolvedValue({ reviewId: 3, currentStep }),
    };
    await expect(
      confirmQuestionSelection({ api, ...selection, scope: currentStep }),
    ).resolves.toEqual(expected);
    expect(api.getReview).toHaveBeenCalledExactlyOnceWith({ reviewId: '3', signal });
    expect(api.confirm).toHaveBeenCalledTimes(1);
  },
);

it('keeps an unresolved save locked and rechecks with a read only', async () => {
  const api = {
    confirm: vi.fn().mockRejectedValue({ status: 500 }),
    getReview: vi
      .fn()
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ reviewId: 3, currentStep: 'ANSWER_APPROVE' }),
  };
  await expect(confirmQuestionSelection({ api, ...selection })).resolves.toEqual({
    status: 'unconfirmed',
  });
  await expect(verifyQuestionSelection({ api, ...selection })).resolves.toEqual({
    status: 'saved',
    reviewId: 3,
  });
  expect(api.confirm).toHaveBeenCalledTimes(1);
  expect(api.getReview).toHaveBeenCalledTimes(2);
});

it('keeps a processing conflict locked after reload and unlocks only after approval is confirmed', async () => {
  const storage = new Map();
  vi.stubGlobal('sessionStorage', {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  });
  try {
    const api = {
      confirm: vi.fn().mockRejectedValue({ status: 409, code: 'REVIEW_PROCESSING' }),
      getReview: vi.fn().mockResolvedValue({ reviewId: 3, currentStep: 'QUESTION_SELECT' }),
    };
    const params = { api, ...selection, scope: 'processing-test' };
    await expect(confirmQuestionSelection(params)).resolves.toEqual({ status: 'unconfirmed' });
    expect([...storage.values()]).toEqual(['1']);
    vi.resetModules();
    const reloaded = await import('./questionSelectionState');
    expect(reloaded.selectionAttempt(params.scope, params.reviewId).isPending()).toBe(true);
    await expect(reloaded.verifyQuestionSelection(params)).resolves.toEqual({
      status: 'unconfirmed',
    });
    await expect(reloaded.confirmQuestionSelection(params)).resolves.toEqual({
      status: 'unconfirmed',
    });
    expect(api.confirm).toHaveBeenCalledTimes(1);
    api.getReview.mockResolvedValueOnce({ reviewId: 3, currentStep: 'ANSWER_APPROVE' });
    await expect(reloaded.verifyQuestionSelection(params)).resolves.toEqual({
      status: 'saved',
      reviewId: 3,
    });
    expect(storage.size).toBe(0);
  } finally {
    vi.unstubAllGlobals();
  }
});

describe('question mock API', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function complete(operation) {
    await vi.runAllTimersAsync();
    return operation;
  }

  it('creates, edits and deletes persistent manual questions without altering another review', async () => {
    const api = createMockQuestionSelectionApi();
    const input = { reviewId: '101', signal };
    const created = await complete(api.create({ ...input, questionText: 'New question?' }));
    expect(created).toMatchObject({
      questionId: expect.any(Number),
      sourceType: 'MANUAL',
      status: 'DRAFT',
    });
    const update = { ...input, questionId: created.questionId, questionText: 'Edited question?' };
    const edited = await complete(api.update(update));
    expect(edited).toEqual({ ...created, questionText: update.questionText });
    expect(await complete(api.list(input))).toContainEqual(edited);
    expect(await complete(api.list({ ...input, reviewId: '102' }))).not.toContainEqual(edited);
    await complete(api.remove(update));
    expect(await complete(api.list(input))).not.toContainEqual(edited);
  });

  it('returns approval state on reentry and prevents modification of approved questions', async () => {
    const api = createMockQuestionSelectionApi('restored');
    const input = { reviewId: '201', signal };
    const initial = await complete(api.list(input));
    expect(storedQuestionIds(initial.map(toQuestion))).toEqual([1, 3]);
    const details = await complete(api.evidence({ ...input, questionId: 1 }));
    expect(toEvidence(details).sections).toHaveLength(2);
    const rejected = expect(api.remove({ ...input, questionId: 3 })).rejects.toMatchObject({
      code: 'INVALID_QUESTION_STATUS',
    });
    await complete(rejected);
    await complete(api.confirm({ ...input, questionIds: [2, 3] }));
    const reopened = await complete(createMockQuestionSelectionApi('restored').list(input));
    expect(storedQuestionIds(reopened.map(toQuestion))).toEqual([2, 3]);
    expect(reopened.find(({ questionId }) => questionId === 3).status).toBe('APPROVED');
  });
});
