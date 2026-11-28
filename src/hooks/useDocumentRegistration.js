import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentRegistrationApi } from '@/api/documentRegistration';
import {
  createRegistrationSubmission,
  documentReviewKey,
  hasRequiredDocuments,
  registrationFailure,
  reviewDocuments,
  validateDocumentFiles,
} from '@/pages/documentRegistrationState';

export function useDocumentRegistration({ reviewId, mock, scenario }) {
  const queryClient = useQueryClient();
  const mockApi = useRef(null);
  const [files, setFiles] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [progress, setProgress] = useState(null);
  const [failure, setFailure] = useState(null);
  const [submission] = useState(() =>
    createRegistrationSubmission(mock ? ['mock', scenario] : 'server'),
  );

  useEffect(() => () => submission.abort(), [submission]);

  async function getApi() {
    if (import.meta.env.DEV && mock) {
      mockApi.current ??= import('@/api/mocks/documentRegistration').then(
        ({ createMockDocumentRegistrationApi }) => createMockDocumentRegistrationApi(scenario),
      );
      return mockApi.current;
    }
    return documentRegistrationApi;
  }

  const detail = useQuery({
    queryKey: documentReviewKey(reviewId, mock),
    enabled: Boolean(reviewId),
    queryFn: async ({ signal }) => (await getApi()).getReview({ reviewId, signal }),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (request) => {
      const api = await getApi();
      request.signal.throwIfAborted();
      return api.createReview(request);
    },
    gcTime: 0,
    retry: false,
    networkMode: 'always',
  });

  const locked = Boolean(reviewId || mutation.isSuccess);

  function attach(kind, selected) {
    if (!selected.length || locked || submission.isPending()) return;
    const error = validateDocumentFiles(selected, files[kind]);
    setFileErrors((current) => ({ ...current, [kind]: error }));
    if (error) return;
    setFiles((current) => ({ ...current, [kind]: selected[0] }));
    setFailure(null);
  }

  function remove(kind) {
    if (locked || submission.isPending()) return;
    setFiles((current) => ({ ...current, [kind]: undefined }));
    setFileErrors((current) => ({ ...current, [kind]: null }));
    setFailure(null);
  }

  async function register() {
    if (locked || failure?.uncertain || submission.isPending() || !hasRequiredDocuments(files))
      return null;
    setProgress(null);
    setFailure(null);
    try {
      const review = await submission.submit({
        files,
        createReview: mutation.mutateAsync,
        onProgress: setProgress,
      });
      if (review) {
        queryClient.setQueryData(documentReviewKey(review.reviewId, mock), review);
        setFiles({});
      }
      return review;
    } catch (error) {
      if (error?.code !== 'ERR_CANCELED' && error?.name !== 'AbortError') {
        setFailure(registrationFailure(error));
      }
      return null;
    }
  }

  return {
    detail,
    documents: reviewId ? reviewDocuments(detail.data) : files,
    errors: fileErrors,
    failure,
    uploading: mutation.isPending,
    progress,
    locked,
    canRegister:
      !locked && !failure?.uncertain && !mutation.isPending && hasRequiredDocuments(files),
    hasPendingWork: submission.isPending,
    attach,
    remove,
    register,
  };
}
