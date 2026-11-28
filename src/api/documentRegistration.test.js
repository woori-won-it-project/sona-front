import { afterEach, expect, it, vi } from 'vitest';
import client from './client';
import { documentRegistrationApi } from './documentRegistration';

vi.mock('./client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const files = {
  policy: new File(['%PDF-1.4'], 'terms.pdf'),
  summary: new File(['%PDF-1.4'], 'guide.pdf'),
};

afterEach(() => vi.resetAllMocks());

it('posts one multipart request and returns the review ID from the 201 response', async () => {
  const signal = new AbortController().signal;
  const review = { reviewId: 31, currentStep: 'DOC_UPLOAD' };
  vi.mocked(client.post).mockImplementation(async (path, body, config) => {
    expect(path).toBe('/reviews');
    expect(Array.from(body.entries())).toEqual([
      ['terms', files.policy],
      ['productGuide', files.summary],
    ]);
    // No overrides for the shared Fetch adapter, redirect policy, or browser boundary.
    expect(config).toEqual({ signal });
    return { status: 201, data: { data: review } };
  });
  await expect(documentRegistrationApi.createReview({ files, signal })).resolves.toEqual(review);
  expect(client.post).toHaveBeenCalledTimes(1);
});

it.each([
  { status: 201, data: { data: {} } },
  { status: 200, data: { data: { reviewId: 31 } } },
])('treats an unusable success response as unconfirmed', async (response) => {
  vi.mocked(client.post).mockResolvedValueOnce(response);
  await expect(documentRegistrationApi.createReview({ files })).rejects.toMatchObject({
    code: 'REGISTRATION_UNCONFIRMED',
  });
});

it('loads an existing review by its server ID', async () => {
  const signal = new AbortController().signal;
  const review = { reviewId: 31, documents: [{ documentId: 9 }] };
  vi.mocked(client.get).mockResolvedValueOnce({ data: { data: review } });
  await expect(documentRegistrationApi.getReview({ reviewId: '31', signal })).resolves.toEqual(
    review,
  );
  expect(client.get).toHaveBeenCalledExactlyOnceWith('/reviews/31', { signal });
});
