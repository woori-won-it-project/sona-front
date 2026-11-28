import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questionSelectionApi } from '@/api/questionSelection';
import {
  canManageQuestion,
  checkQuestionText,
  confirmQuestionSelection,
  getSelectedQuestions,
  maxSelectedQuestions,
  selectionAttempt,
  storedQuestionIds,
  toEvidence,
  toQuestion,
  toggleQuestionSelection,
  verifyQuestionSelection,
} from '@/pages/questionSelectionState';

export function useQuestionSelection({ reviewId, mock, scenario, evidenceId }) {
  const queryClient = useQueryClient();
  const scope = ['question-selection', reviewId, mock ? ['mock', scenario] : 'server'];
  const listKey = [...scope, 'list'];
  const mockApi = useRef(null);
  const activeRequest = useRef(null);
  const [localIds, setLocalIds] = useState(null);
  const attemptScope = mock ? ['mock', scenario] : 'server';
  const [confirmation, setConfirmation] = useState(() =>
    selectionAttempt(attemptScope, reviewId).isPending() ? { status: 'unconfirmed' } : null,
  );
  const [removeFailed, setRemoveFailed] = useState(false);

  useEffect(() => () => activeRequest.current?.abort(), []);

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
    queryFn: async ({ signal }) =>
      (await (await getApi()).list({ reviewId, signal })).map(toQuestion),
    refetchOnMount: 'always',
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    networkMode: 'always',
    retry: false,
  });
  const evidence = useQuery({
    queryKey: [...scope, 'evidence', evidenceId],
    queryFn: async ({ signal }) =>
      toEvidence(await (await getApi()).evidence({ reviewId, questionId: evidenceId, signal })),
    enabled: evidenceId !== null,
    networkMode: 'always',
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async ({ operation, signal, ...values }) => {
      const api = await getApi();
      signal.throwIfAborted();
      const request = { api, reviewId, signal, scope: attemptScope, ...values };
      if (operation === 'confirm') return confirmQuestionSelection(request);
      if (operation === 'verify') return verifyQuestionSelection(request);
      return api[operation](request);
    },
    networkMode: 'always',
    gcTime: 0,
    retry: false,
  });

  const ready = list.isSuccess && list.isFetchedAfterMount;
  const questions = ready ? list.data : [];
  const selected = getSelectedQuestions(questions, localIds ?? storedQuestionIds(questions));
  const selectedIds = selected.map(({ id }) => id);
  const locked = ['saved', 'unconfirmed'].includes(confirmation?.status);

  async function execute(operation, values = {}) {
    if (activeRequest.current) return { aborted: true };
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const data = await mutation.mutateAsync({ operation, signal: controller.signal, ...values });
      return controller.signal.aborted ? { aborted: true } : { data };
    } catch (error) {
      return controller.signal.aborted ? { aborted: true } : { error };
    } finally {
      activeRequest.current = null;
    }
  }

  function toggle(id) {
    if (activeRequest.current || locked || !questions.some((question) => question.id === id))
      return true;
    const next = toggleQuestionSelection(selectedIds, id);
    if (next === selectedIds) return false;
    setLocalIds(next);
    return true;
  }

  async function submitCustom(text, questionId) {
    if (activeRequest.current || locked || !ready) return { status: 'ignored' };
    const editing = questionId != null;
    if (editing && !canManageQuestion(questions.find(({ id }) => id === questionId))) {
      return { status: 'invalid', reason: 'status' };
    }
    if (!editing && selectedIds.length >= maxSelectedQuestions) return { status: 'limit' };
    const reason = checkQuestionText(text);
    if (reason) return { status: 'invalid', reason };

    const { data, error, aborted } = await execute(editing ? 'update' : 'create', {
      questionId,
      questionText: text.trim(),
    });
    if (aborted) return { status: 'ignored' };
    if (error || !data) {
      const reason =
        error?.code === 'INVALID_INPUT'
          ? 'input'
          : error?.code === 'INVALID_QUESTION_STATUS'
            ? 'status'
            : 'request';
      return { status: 'invalid', reason };
    }
    const question = toQuestion(data);
    queryClient.setQueryData(listKey, (current) =>
      editing
        ? current.map((item) => (item.id === questionId ? question : item))
        : [...current, question],
    );
    setLocalIds(editing ? selectedIds : [...selectedIds, question.id]);
    return { status: 'success' };
  }

  async function remove(id) {
    if (
      activeRequest.current ||
      locked ||
      !canManageQuestion(questions.find((item) => item.id === id))
    )
      return;
    setRemoveFailed(false);
    const { error, aborted } = await execute('remove', { questionId: id });
    if (aborted) return;
    if (error) {
      setRemoveFailed(true);
      return;
    }
    queryClient.setQueryData(listKey, (current) => current.filter((item) => item.id !== id));
    setLocalIds(selectedIds.filter((selectedId) => selectedId !== id));
  }

  async function confirm() {
    if (activeRequest.current) return null;
    if (confirmation?.status === 'saved') return confirmation;
    const verifying = confirmation?.status === 'unconfirmed';
    if (!verifying && (!ready || !selectedIds.length)) return null;
    const { data, aborted } = await execute(verifying ? 'verify' : 'confirm', {
      questionIds: selectedIds,
    });
    if (aborted) return null;
    setConfirmation(data ?? { status: 'unconfirmed' });
    if (data?.status !== 'saved') return null;
    void queryClient.invalidateQueries({ queryKey: listKey, refetchType: 'none' });
    return data;
  }

  const operation = mutation.variables?.operation;
  return {
    list,
    questions,
    selected,
    evidence,
    ready,
    locked,
    confirmation,
    removeFailed,
    busy: mutation.isPending,
    validating: mutation.isPending && ['create', 'update'].includes(operation),
    saving: mutation.isPending && operation === 'confirm',
    verifying: mutation.isPending && operation === 'verify',
    toggle,
    submitCustom,
    confirm,
    remove,
  };
}
