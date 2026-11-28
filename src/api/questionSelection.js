import client from './client';
import { documentRegistrationApi } from './documentRegistration';

const reviewQuestions = (id) => '/reviews/' + encodeURIComponent(id) + '/questions';
const questionPath = (id) => '/questions/' + encodeURIComponent(id);

export const questionSelectionApi = {
  async list({ reviewId, signal }) {
    const { data } = await client.get(reviewQuestions(reviewId), { signal });
    return data.data;
  },
  async evidence({ questionId, signal }) {
    const { data } = await client.get(questionPath(questionId), { signal });
    return data.data;
  },
  async create({ reviewId, questionText, signal }) {
    const { data } = await client.post(reviewQuestions(reviewId), { questionText }, { signal });
    return data.data;
  },
  async update({ questionId, questionText, signal }) {
    const { data } = await client.patch(questionPath(questionId), { questionText }, { signal });
    return data.data;
  },
  async remove({ questionId, signal }) {
    await client.delete(questionPath(questionId), { signal });
  },
  async confirm({ reviewId, questionIds, signal }) {
    const { data } = await client.put(
      reviewQuestions(reviewId) + '/selection',
      { questionIds },
      { signal },
    );
    return data.data;
  },
  getReview: documentRegistrationApi.getReview,
};
