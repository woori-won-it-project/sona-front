import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questionSelectionApi } from '@/api/questionSelection';
import {
  getSelectedQuestions,
  maxSelectedQuestions,
  removeCustomQuestion,
  saveCustomQuestion,
  selectionSignature,
  toggleQuestionSelection,
  validationErrors,
} from '@/pages/questionSelectionState';

const emptyDraft = { questions: [], customQuestions: [], selectedIds: [] };

export function useQuestionSelection({ reviewId, mock, scenario, evidenceId }) {
  const queryClient = useQueryClient();
  const scope = ['question-selection', reviewId, mock ? ['mock', scenario] : 'server'];
  const listKey = [...scope, 'list'];
  const mockApi = useRef(null);
  const activeRequest = useRef(null);

  useEffect(() => () => activeRequest.current?.controller.abort(), []);

  async function getApi() {
    if (import.meta.env.DEV && mock) {
      mockApi.current ??= import('@/api/mocks/questionSelection').then(
        ({ createMockQuestionSelectionApi }) => createMockQuestionSelectionApi(scenario),
      );
      return mockApi.current;
    }
    return questionSelectionApi;
  }

  const list = useQuery({
    queryKey: listKey,
    queryFn: async ({ signal }) => (await getApi()).list({ reviewId, signal }),
    networkMode: 'always',
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const evidence = useQuery({
    queryKey: [...scope, 'evidence', evidenceId],
    queryFn: async ({ signal }) =>
      (await getApi()).evidence({ reviewId, questionId: evidenceId, signal }),
    enabled: evidenceId !== null,
    networkMode: 'always',
    staleTime: Infinity,
    retry: false,
  });
  const validation = useMutation({
    mutationFn: async (request) => (await getApi()).validate({ reviewId, ...request }),
    networkMode: 'always',
    gcTime: 0,
  });
  const save = useMutation({
    mutationFn: async (request) => (await getApi()).save({ reviewId, ...request }),
    networkMode: 'always',
    gcTime: 0,
  });

  const data = list.data ?? emptyDraft;
  const questions = [...data.questions, ...data.customQuestions];
  const selected = getSelectedQuestions(questions, data.selectedIds);
  const selectionSaved =
    selected.length > 0 &&
    data.savedSignature === selectionSignature(selected, data.customQuestions);

  function updateDraft(update) {
    queryClient.setQueryData(listKey, (current) => current && update(current));
  }

  function toggle(id) {
    if (activeRequest.current || !list.data) return true;
    const current = queryClient.getQueryData(listKey);
    const selectedIds = toggleQuestionSelection(current.selectedIds, id);
    if (selectedIds === current.selectedIds) return false;
    updateDraft((draft) => ({ ...draft, selectedIds }));
    return true;
  }

  async function submitCustom(text, questionId) {
    if (activeRequest.current || !list.data) return { status: 'ignored' };
    const current = queryClient.getQueryData(listKey);
    if (!questionId && current.selectedIds.length >= maxSelectedQuestions) {
      return { status: 'limit' };
    }

    const controller = new AbortController();
    const request = { kind: 'validation', controller };
    activeRequest.current = request;
    try {
      const { reason } = await validation.mutateAsync({
        text,
        questionId,
        questions: [...current.questions, ...current.customQuestions],
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      if (reason)
        return {
          status: 'invalid',
          reason: Object.hasOwn(validationErrors, reason) ? reason : 'request',
        };

      const question = { id: questionId ?? crypto.randomUUID(), type: 'custom', text };
      updateDraft((draft) => ({ ...draft, ...saveCustomQuestion(draft, question) }));
      return { status: 'success' };
    } catch {
      return controller.signal.aborted
        ? { status: 'ignored' }
        : { status: 'invalid', reason: 'request' };
    } finally {
      if (activeRequest.current === request) {
        activeRequest.current = null;
        validation.reset();
      }
    }
  }

  function cancelValidation() {
    const request = activeRequest.current;
    if (request?.kind !== 'validation') return;
    activeRequest.current = null;
    request.controller.abort();
    validation.reset();
  }

  async function confirm() {
    if (activeRequest.current || !list.data) return false;
    const current = queryClient.getQueryData(listKey);
    const selected = getSelectedQuestions(
      [...current.questions, ...current.customQuestions],
      current.selectedIds,
    );
    if (!selected.length) return false;
    const signature = selectionSignature(selected, current.customQuestions);
    if (current.savedSignature === signature) return true;

    const controller = new AbortController();
    activeRequest.current = { kind: 'save', controller };
    try {
      await save.mutateAsync({
        selected,
        customQuestions: current.customQuestions,
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      updateDraft((draft) => ({ ...draft, savedSignature: signature }));
      return true;
    } catch {
      return false;
    } finally {
      activeRequest.current = null;
    }
  }

  return {
    list,
    questions,
    selected,
    selectionSaved,
    evidence,
    validating: validation.isPending,
    saving: save.isPending,
    saveFailed: save.isError,
    toggle,
    submitCustom,
    cancelValidation,
    confirm,
    remove(id) {
      if (activeRequest.current || !list.data) return;
      updateDraft((draft) => ({ ...draft, ...removeCustomQuestion(draft, id) }));
    },
  };
}
