import { afterEach, expect, it, vi } from 'vitest';
import client from './client';
import { questionSelectionApi as api } from './questionSelection';

vi.mock('./client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));

const signal = new AbortController().signal;
const request = { reviewId: '7', questionId: 9, signal };
const question = { questionId: 9, sourceType: 'MANUAL', questionText: 'Example?', status: 'DRAFT' };

afterEach(() => vi.resetAllMocks());

it('loads the raw list, question detail and review state from their documented endpoints', async () => {
  client.get
    .mockResolvedValueOnce({ data: { data: [question] } })
    .mockResolvedValueOnce({
      data: { data: { ...question, generationReason: 'example', evidences: [] } },
    })
    .mockResolvedValueOnce({ data: { data: { reviewId: 7, currentStep: 'ANSWER_APPROVE' } } });
  await expect(api.list(request)).resolves.toEqual([question]);
  await expect(api.evidence(request)).resolves.toMatchObject({
    questionId: 9,
    generationReason: 'example',
  });
  await expect(api.getReview(request)).resolves.toMatchObject({ currentStep: 'ANSWER_APPROVE' });
  expect(client.get.mock.calls).toEqual([
    ['/reviews/7/questions', { signal }],
    ['/questions/9', { signal }],
    ['/reviews/7', { signal }],
  ]);
});

it('uses the server ID and exact questionText and questionIds request bodies', async () => {
  const input = { ...request, questionText: 'Example?' };
  client.post.mockResolvedValueOnce({ data: { data: question } });
  client.patch.mockResolvedValueOnce({ data: { data: question } });
  client.put.mockResolvedValueOnce({
    data: { data: { reviewId: 7, currentStep: 'ANSWER_APPROVE' } },
  });
  await expect(api.create(input)).resolves.toEqual(question);
  await expect(api.update(input)).resolves.toEqual(question);
  await api.remove(input);
  await expect(api.confirm({ ...input, questionIds: [2, 9] })).resolves.toMatchObject({
    currentStep: 'ANSWER_APPROVE',
  });
  expect(client.post).toHaveBeenCalledExactlyOnceWith(
    '/reviews/7/questions',
    { questionText: 'Example?' },
    { signal },
  );
  expect(client.patch).toHaveBeenCalledExactlyOnceWith(
    '/questions/9',
    { questionText: 'Example?' },
    { signal },
  );
  expect(client.delete).toHaveBeenCalledExactlyOnceWith('/questions/9', { signal });
  expect(client.put).toHaveBeenCalledExactlyOnceWith(
    '/reviews/7/questions/selection',
    { questionIds: [2, 9] },
    { signal },
  );
});
