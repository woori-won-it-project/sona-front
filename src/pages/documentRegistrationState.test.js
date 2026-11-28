import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRegistrationSubmission,
  documentReviewKey,
  documentReviewPath,
  documentSize,
  hasRequiredDocuments,
  maxDocumentBytes,
  registrationFailure,
  reviewDocuments,
  validateDocumentFiles,
} from './documentRegistrationState';

const makePdf = (name) =>
  new File(['%PDF-1.4'], name, { type: 'application/pdf', lastModified: 1 });
const files = { policy: makePdf('terms.pdf'), summary: makePdf('guide.pdf') };
afterEach(() => vi.unstubAllGlobals());

describe('document registration state', () => {
  it('requires both documents, one nonempty PDF per field, and at most 20 MB per file', () => {
    expect(hasRequiredDocuments({ policy: files.policy })).toBe(false);
    expect(hasRequiredDocuments(files)).toBe(true);
    const atLimit = { name: 'sample.PDF', type: 'application/pdf', size: maxDocumentBytes };
    expect(validateDocumentFiles([atLimit])).toBeNull();
    expect(validateDocumentFiles([{ ...atLimit, size: maxDocumentBytes + 1 }])).toBe('size');
    expect(validateDocumentFiles([new File(['x'], 'sample.txt')])).toBe('type');
    expect(validateDocumentFiles([new File(['x'], 'sample.pdf', { type: 'text/plain' })])).toBe(
      'type',
    );
    expect(validateDocumentFiles([new File([], 'sample.pdf')])).toBe('empty');
    expect(validateDocumentFiles([files.policy, files.summary])).toBe('count');
    expect(validateDocumentFiles([files.policy], files.policy)).toBe('duplicate');
    expect(validateDocumentFiles([files.summary], files.policy)).toBeNull();
  });

  it('restores file names and byte sizes from the review and scopes the cache and route by ID', () => {
    const review = {
      reviewId: 37,
      documents: [
        { documentType: 'TERMS', filename: 'saved-terms.pdf', fileSize: 2048 },
        { documentType: 'PRODUCT_GUIDE', filename: 'saved-guide.pdf', fileSize: 1048576 },
      ],
    };
    expect(reviewDocuments(review)).toEqual({
      policy: { name: 'saved-terms.pdf', size: 2048 },
      summary: { name: 'saved-guide.pdf', size: 1048576 },
    });
    expect(documentSize(2048)).toBe('2 KB');
    expect(documentSize(1048576)).toBe('1 MB');
    expect(documentReviewKey(37, false)).toEqual(documentReviewKey('37', false));
    expect(documentReviewKey(37, true)).not.toEqual(documentReviewKey(37, false));
    expect(documentReviewPath(review.reviewId, '?mock=1')).toBe('/documents/37?mock=1');
  });

  it('sends both files once, waits for the saved ID after 100%, and blocks resubmission', async () => {
    const submission = createRegistrationSubmission();
    const response = Promise.withResolvers();
    const onProgress = vi.fn();
    const createReview = vi.fn((request) => {
      request.onProgress(100);
      return response.promise;
    });
    const request = { files, createReview, onProgress };
    const pending = submission.submit(request);

    await vi.waitFor(() => expect(createReview).toHaveBeenCalledTimes(1));
    expect(onProgress).toHaveBeenCalledWith(100);
    expect(submission.isPending()).toBe(true);
    await expect(submission.submit(request)).resolves.toBeNull();
    response.resolve({ reviewId: 125 });
    await expect(pending).resolves.toEqual({ reviewId: 125 });
    await expect(submission.submit(request)).resolves.toBeNull();
    expect(createReview).toHaveBeenCalledExactlyOnceWith({
      files,
      signal: expect.any(AbortSignal),
      onProgress,
    });
  });

  it('allows manual retry for confirmed file rejection and locks unconfirmed registration', async () => {
    const storage = new Map();
    vi.stubGlobal('sessionStorage', {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    });
    const submission = createRegistrationSubmission('response-loss-test');
    const createReview = vi
      .fn()
      .mockRejectedValueOnce({ status: 413, code: 'FILE_TOO_LARGE' })
      .mockRejectedValueOnce({ status: null, code: 'ERR_NETWORK' });
    const request = { files, createReview, onProgress: vi.fn() };

    await expect(submission.submit(request)).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
    await expect(submission.submit(request)).rejects.toMatchObject({ code: 'ERR_NETWORK' });
    await expect(submission.submit(request)).rejects.toMatchObject({
      code: 'REGISTRATION_UNCONFIRMED',
    });
    vi.resetModules();
    const reloaded = await import('./documentRegistrationState');
    const reopened = reloaded.createRegistrationSubmission('response-loss-test');
    await expect(reopened.submit(request)).rejects.toMatchObject({
      code: 'REGISTRATION_UNCONFIRMED',
    });
    expect(createReview).toHaveBeenCalledTimes(2);
    expect(storage.size).toBe(1);
    expect([...storage.keys()][0]).not.toContain('terms.pdf');
    createReview.mockResolvedValueOnce({ reviewId: 501 });
    await expect(
      reopened.submit({
        ...request,
        files: { ...files, summary: makePdf('different.pdf') },
      }),
    ).resolves.toEqual({ reviewId: 501 });
    expect(storage.size).toBe(1);
  });

  it.each(['FILE_TOO_LARGE', 'INVALID_FILE_TYPE', 'REQUIRED_DOCUMENT_MISSING'])(
    'shows a file error for %s',
    (code) =>
      expect(registrationFailure({ code })).toEqual({
        uncertain: false,
        message: expect.any(String),
      }),
  );

  it('aborts pending work on exit and ignores a late success', async () => {
    const submission = createRegistrationSubmission('aborted-registration');
    const response = Promise.withResolvers();
    const createReview = vi.fn(() => response.promise);
    const pending = submission.submit({ files, createReview, onProgress: vi.fn() });
    await vi.waitFor(() => expect(createReview).toHaveBeenCalledTimes(1));
    submission.abort();
    expect(createReview.mock.calls[0][0].signal.aborted).toBe(true);
    response.resolve({ reviewId: 125 });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
