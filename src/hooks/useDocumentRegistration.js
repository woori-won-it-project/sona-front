import { useEffect, useRef, useState } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentRegistrationApi } from '@/api/documentRegistration';
import {
  canStartAnalysis,
  changeRegisteredDocument,
  createDocumentDraft,
  documentDraftKey,
  saveAndStartAnalysis,
  uploadAndRegister,
  uploadErrorKind,
  validateDocumentFiles,
} from '@/pages/documentRegistrationState';

const emptyTransfer = { file: null, progress: 0, error: null };
const analysisErrorMessage = '분석을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.';

export function useDocumentRegistration({ reviewId, mock, scenario }) {
  const queryClient = useQueryClient();
  const queryKey = documentDraftKey(reviewId, mock);
  const { data: draft } = useQuery({
    queryKey,
    queryFn: skipToken,
    initialData: createDocumentDraft,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const controllers = useRef(new Map());
  const mockApi = useRef(null);
  const [transfers, setTransfers] = useState({});
  const [analysisStage, setAnalysisStage] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  useEffect(
    () => () => {
      for (const controller of controllers.current.values()) controller.abort();
    },
    [controllers],
  );

  async function getApi() {
    if (import.meta.env.DEV && mock) {
      mockApi.current ??= import('@/api/mocks/documentRegistration').then(
        ({ createMockDocumentRegistrationApi }) => createMockDocumentRegistrationApi(scenario),
      );
      return mockApi.current;
    }
    return documentRegistrationApi;
  }

  const { mutateAsync: transfer, reset: resetTransfer } = useMutation({
    mutationFn: async (request) => uploadAndRegister({ ...request, api: await getApi() }),
    networkMode: 'always',
    gcTime: 0,
    retry: false,
  });
  const { mutateAsync: analyze, reset: resetAnalysis } = useMutation({
    mutationFn: async (request) => saveAndStartAnalysis({ ...request, api: await getApi() }),
    networkMode: 'always',
    gcTime: 0,
    retry: false,
  });

  function setTransfer(kind, value) {
    setTransfers((current) => ({ ...current, [kind]: value }));
  }

  async function attach(kind, files) {
    if (!files.length || controllers.current.has(kind) || controllers.current.has('analysis'))
      return;
    const current = queryClient.getQueryData(queryKey);
    const error = validateDocumentFiles(files, current.documents[kind]);
    if (error) {
      setTransfer(kind, { ...emptyTransfer, error });
      return;
    }
    const [file] = files;
    const controller = new AbortController();
    controllers.current.set(kind, controller);
    setTransfer(kind, { file, progress: 0, error: null });
    setAnalysisError('');

    try {
      await transfer({
        reviewId,
        kind,
        file,
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) setTransfer(kind, { file, progress, error: null });
        },
        onRegistered: (document) =>
          queryClient.setQueryData(queryKey, (current) =>
            changeRegisteredDocument(current, kind, document),
          ),
      });
      if (!controller.signal.aborted) setTransfer(kind, emptyTransfer);
    } catch (error) {
      if (!controller.signal.aborted) {
        const kindOfError = uploadErrorKind(error);
        setTransfer(kind, {
          ...emptyTransfer,
          error: kindOfError,
          file: kindOfError === 'upload' ? file : null,
        });
      }
    } finally {
      controllers.current.delete(kind);
      resetTransfer();
    }
  }

  function remove(kind) {
    if (controllers.current.has(kind) || controllers.current.has('analysis')) return;
    queryClient.setQueryData(queryKey, (current) => changeRegisteredDocument(current, kind, null));
    setTransfer(kind, emptyTransfer);
    setAnalysisError('');
  }

  async function start() {
    const current = queryClient.getQueryData(queryKey);
    if (!canStartAnalysis(current, controllers.current.size > 0)) return null;
    const controller = new AbortController();
    controllers.current.set('analysis', controller);
    setAnalysisError('');
    setAnalysisStage(current.saved ? 'analyzing' : 'saving');

    try {
      const result = await analyze({
        reviewId,
        draft: current,
        signal: controller.signal,
        onSaved: (saved) =>
          queryClient.setQueryData(queryKey, (value) =>
            value.revision === current.revision ? { ...value, saved } : value,
          ),
        onAnalyzing: () => setAnalysisStage('analyzing'),
      });
      queryClient.setQueryData(queryKey, (value) =>
        value.revision === current.revision ? { ...value, analysis: result } : value,
      );
      return controller.signal.aborted ? null : result;
    } catch {
      if (!controller.signal.aborted) setAnalysisError(analysisErrorMessage);
      return null;
    } finally {
      controllers.current.delete('analysis');
      resetAnalysis();
      if (!controller.signal.aborted) setAnalysisStage(null);
    }
  }

  const uploading = Object.values(transfers).some(({ file, error }) => file && !error);

  return {
    draft,
    transfers,
    uploading,
    analysisStage,
    analysisError,
    hasPendingWork: () => controllers.current.size > 0,
    canAnalyze: canStartAnalysis(draft, uploading || Boolean(analysisStage)),
    attach,
    remove,
    retry(kind) {
      const file = transfers[kind]?.file;
      if (file) return attach(kind, [file]);
    },
    start,
  };
}
