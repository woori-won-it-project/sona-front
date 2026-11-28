import { useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  hasApprovedSelection,
  personaExperimentApi,
  readApprovedQuestions,
} from '@/api/personaExperiment';

export function usePersonaExperiment({
  reviewId,
  mock,
  scenario,
  answersRequested,
  experimentId,
  uncertain,
}) {
  const mockApi = useRef(null);
  const canExecute = import.meta.env.DEV && mock;
  const scope = ['persona-experiment', reviewId, mock ? ['mock', scenario] : 'server'];
  const queryOptions = { retry: false, refetchOnWindowFocus: false };

  async function getMockApi() {
    if (!canExecute) throw { code: 'PERSONA_EXPERIMENT_WRITE_BLOCKED' };
    mockApi.current ??= import('@/api/mocks/personaExperiment').then(
      ({ createMockPersonaExperimentApi }) => createMockPersonaExperimentApi(scenario),
    );
    return mockApi.current;
  }

  async function getApi() {
    return mock ? getMockApi() : personaExperimentApi;
  }

  const recovery = useQuery({
    ...queryOptions,
    queryKey: [...scope, 'mock-recovery'],
    queryFn: async () => (await getMockApi()).findExperiment({ reviewId }),
    enabled: mock && Boolean(reviewId),
  });
  const restoredId =
    mock && !uncertain && recovery.isSuccess && !recovery.isFetching
      ? recovery.data?.experimentId
      : null;
  const currentExperimentId = uncertain ? null : (experimentId ?? restoredId ?? null);
  const configuring = currentExperimentId == null && !uncertain;

  const review = useQuery({
    ...queryOptions,
    queryKey: [...scope, 'review'],
    queryFn: async ({ signal }) => (await getApi()).getReview({ reviewId, signal }),
    enabled: Boolean(reviewId) && configuring,
  });
  const canConfigure = review.isSuccess && review.data?.currentStep === 'PERSONA_SELECT';
  const questions = useQuery({
    ...queryOptions,
    queryKey: [...scope, 'questions'],
    queryFn: async ({ signal }) => (await getApi()).listQuestions({ reviewId, signal }),
    enabled: configuring && canConfigure,
  });
  const approved = questions.isSuccess && hasApprovedSelection(questions.data);
  const answers = useQuery({
    ...queryOptions,
    queryKey: [
      ...scope,
      'answers',
      questions.data?.map(({ questionId, status }) => [questionId, status]),
    ],
    queryFn: async ({ signal }) =>
      readApprovedQuestions(await getApi(), { reviewId, questions: questions.data, signal }),
    enabled: configuring && canConfigure && approved && !questions.isFetching && answersRequested,
  });
  const experiment = useQuery({
    ...queryOptions,
    queryKey: [...scope, 'status', currentExperimentId],
    queryFn: async ({ signal }) =>
      (await getApi()).getExperiment({ reviewId, experimentId: currentExperimentId, signal }),
    enabled: currentExperimentId != null,
    refetchInterval: ({ state }) =>
      mock && state.status === 'success' && state.data?.status === 'RUNNING' ? 450 : false,
  });
  const execution = useMutation({
    mutationFn: async ({ conditions, retryId }) => {
      const api = await getMockApi();
      return retryId == null
        ? api.startExperiment({ reviewId, conditions })
        : api.retryExperiment({ reviewId, experimentId: retryId });
    },
    retry: false,
    networkMode: 'always',
  });

  return {
    review,
    questions,
    approved,
    answers,
    experiment,
    currentExperimentId,
    recovery,
    canExecute,
    executing: execution.isPending,
    execute: execution.mutateAsync,
  };
}
