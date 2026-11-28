import client from './client';

export const documentRegistrationApi = {
  async getReview({ reviewId, signal }) {
    const { data } = await client.get('/reviews/' + encodeURIComponent(reviewId), { signal });
    return data.data;
  },

  async createReview({ files, signal }) {
    const body = new FormData();
    body.append('terms', files.policy);
    body.append('productGuide', files.summary);

    // Use the shared Fetch adapter and its redirect policy. Upload progress would
    // require a streaming request, which is incompatible with the HTTP/1.1 dev proxy.
    const { data, status } = await client.post('/reviews', body, { signal });
    // The server may already have created a review even when its response is unusable.
    if (status !== 201 || !Number.isSafeInteger(data?.data?.reviewId) || data.data.reviewId < 1) {
      throw { code: 'REGISTRATION_UNCONFIRMED' };
    }
    return data.data;
  },
};
