import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDocumentRegistrationApi } from './documentRegistration';

const files = {
  policy: new File(['%PDF-1.4'], 'terms.pdf'),
  summary: new File(['%PDF-1.4'], 'guide.pdf'),
};

describe('development document registration API', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('supplies transfer progress, then a review ID and restorable file metadata', async () => {
    const api = createMockDocumentRegistrationApi();
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    const saved = vi.fn();
    const registration = api.createReview({ files, signal, onProgress }).then((result) => {
      saved(result);
      return result;
    });
    await vi.advanceTimersByTimeAsync(900);
    expect(onProgress).toHaveBeenLastCalledWith(100);
    expect(saved).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    const review = await registration;
    expect(review).toMatchObject({
      reviewId: expect.any(Number),
      status: 'IN_PROGRESS',
      currentStep: 'DOC_UPLOAD',
      documents: [
        { documentType: 'TERMS', filename: 'terms.pdf', fileSize: files.policy.size },
        { documentType: 'PRODUCT_GUIDE', filename: 'guide.pdf', fileSize: files.summary.size },
      ],
    });
    const restored = createMockDocumentRegistrationApi().getReview({
      reviewId: review.reviewId,
      signal,
    });
    await vi.runAllTimersAsync();
    await expect(restored).resolves.toEqual(review);
  });

  it('simulates a confirmed upload failure once and then allows retry', async () => {
    const api = createMockDocumentRegistrationApi('upload-error');
    const request = { files, signal: new AbortController().signal, onProgress: vi.fn() };
    const failure = expect(api.createReview(request)).rejects.toMatchObject({
      status: 415,
      code: 'INVALID_FILE_TYPE',
    });
    await vi.runAllTimersAsync();
    await failure;
    const retry = api.createReview(request);
    await vi.runAllTimersAsync();
    await expect(retry).resolves.toMatchObject({ reviewId: expect.any(Number) });
  });
});
