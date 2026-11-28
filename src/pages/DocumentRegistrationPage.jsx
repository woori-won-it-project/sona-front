import { useEffect, useId, useRef } from 'react';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import alertIcon from '@/assets/document-registration/alert.svg';
import summaryIllustration from '@/assets/document-registration/summary.svg';
import policyIllustration from '@/assets/document-registration/policy.svg';
import DocumentUploadCard from '@/components/documents/DocumentUploadCard';
import ReviewSteps from '@/components/layout/ReviewSteps';
import ReviewWorkspaceLayout from '@/components/layout/ReviewWorkspaceLayout';
import { useDocumentRegistration } from '@/hooks/useDocumentRegistration';
import { documentReviewPath, fileErrors, hasRequiredDocuments } from './documentRegistrationState';

const steps = ['02 검수 홈', '03 문서 등록', '04 분석 진행'];

const fields = [
  {
    kind: 'summary',
    title: '상품요약서(설명서)',
    description: '상품요약서·설명서 PDF를 여기에 놓으세요.',
    illustration: summaryIllustration,
  },
  {
    kind: 'policy',
    title: '약관',
    description: '보험약관 PDF를 여기에 놓으세요.',
    illustration: policyIllustration,
  },
];

const analysisHints = {
  empty: '상품설명서와 약관을 모두 첨부하면 분석을 시작할 수 있어요.',
  summary: '약관을 추가하면 분석을 시작할 수 있어요.',
  policy: '상품설명서를 추가하면 분석을 시작할 수 있어요.',
  ready: '분석 시작을 누르면 첨부 파일을 저장해요.',
  uploading: '파일을 업로드하고 있어요.',
};

function analysisHint(documents, uploading) {
  if (uploading) return analysisHints.uploading;
  if (documents.summary && documents.policy) return analysisHints.ready;
  if (documents.summary) return analysisHints.summary;
  if (documents.policy) return analysisHints.policy;
  return analysisHints.empty;
}

function useConfirmLeaving(isBusy, hasPendingWork) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasPendingWork() &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('파일 작업이 진행 중이에요. 이 화면에서 나가시겠어요?')) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    if (!isBusy) return;
    function beforeUnload(event) {
      event.preventDefault();
      event.returnValue = true;
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isBusy]);
}

function UploadProgressDialog({ progress }) {
  const dialog = useRef(null);
  const titleId = useId();
  const waitingForSave = progress === 100;

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => event.preventDefault()}
      className="m-auto min-h-[calc(150*var(--review-pixel))] w-[calc(400*var(--review-pixel))] max-w-[calc(100%-2rem)] rounded-[calc(18*var(--review-pixel))] bg-white p-[calc(24*var(--review-pixel))] text-[#172b4d] shadow-[0_2px_8px_#172b4d14] backdrop:bg-[#172b4d]/15"
    >
      <h2
        id={titleId}
        aria-live="polite"
        className="text-[length:calc(20*var(--review-pixel))] leading-[calc(28*var(--review-pixel))] font-medium"
      >
        {waitingForSave ? '서버의 등록 완료를 기다리고 있어요.' : '첨부 파일을 업로드하고 있어요.'}
      </h2>
      {progress === null ? (
        <div
          role="progressbar"
          aria-label="첨부 파일 등록 중"
          className="mt-5 size-5 rounded-full border-2 border-[#e2e8f0] border-t-[#0067ac] motion-safe:animate-spin"
        />
      ) : (
        <div
          role="progressbar"
          aria-label="첨부 파일 전송률"
          aria-valuenow={progress}
          className="mt-[calc(29*var(--review-pixel))] h-[calc(4*var(--review-pixel))] overflow-hidden rounded-full bg-[#e2e8f0]"
        >
          <div className="h-full rounded-full bg-[#0067ac]" style={{ width: progress + '%' }} />
        </div>
      )}
    </dialog>
  );
}

function UploadAlert({ id, error, onRetry, disabled, title }) {
  return (
    <div
      id={id}
      role="alert"
      className="flex min-h-[calc(52*var(--review-pixel))] flex-wrap items-center gap-[calc(12*var(--review-pixel))] rounded-[calc(10*var(--review-pixel))] border border-[#e2e8f0] px-[calc(16*var(--review-pixel))] py-[calc(8*var(--review-pixel))] text-[length:calc(14*var(--review-pixel))] text-[#a44b00] shadow-[0_2px_4px_#172b4d14]"
    >
      <img
        src={alertIcon}
        alt=""
        width={20}
        height={20}
        className="h-auto w-[calc(20*var(--review-pixel))]"
      />
      {title && <span className="sr-only">{title}: </span>}
      <span className="min-w-0 flex-1">{error}</span>
      {onRetry && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRetry}
          className="rounded-md border border-[#e2e8f0] px-3 py-1 text-[#0067ac]"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

function DocumentRegistration({
  reviewId,
  mock,
  scenario,
  search,
  homePath,
  reportPath,
  getAnalysisPath,
}) {
  const navigate = useNavigate();
  const registration = useDocumentRegistration({ reviewId, mock, scenario });
  const { detail, documents, errors, failure, uploading, locked, canRegister } = registration;
  useConfirmLeaving(uploading, registration.hasPendingWork);
  const restored = Boolean(reviewId);
  const analysisPath =
    restored &&
    !detail.isError &&
    detail.data?.currentStep === 'DOC_UPLOAD' &&
    hasRequiredDocuments(documents)
      ? getAnalysisPath?.({ reviewId: detail.data.reviewId })
      : null;
  const canProceed = restored ? Boolean(analysisPath) : canRegister;

  async function beginAnalysis() {
    if (restored) {
      if (analysisPath) navigate(analysisPath);
      return;
    }
    const result = await registration.register();
    if (!result) return;
    const destination = getAnalysisPath?.({ reviewId: result.reviewId });
    navigate(destination || documentReviewPath(result.reviewId, search), { replace: true });
  }

  const hasErrors = fields.some(({ kind }) => errors[kind]);
  const statusText = restored
    ? detail.data
      ? '등록된 검수의 문서 정보를 표시하고 있어요.'
      : detail.isPending
        ? '등록된 문서를 불러오고 있어요.'
        : ''
    : failure?.uncertain
      ? ''
      : analysisHint(documents, uploading);

  return (
    <ReviewWorkspaceLayout homePath={homePath} reportPath={reportPath}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[length:calc(32*var(--review-pixel))] leading-[calc(45*var(--review-pixel))] font-semibold">
            문서 등록
          </h1>
          <p className="mt-[calc(6*var(--review-pixel))] text-[length:calc(16*var(--review-pixel))] leading-[calc(23*var(--review-pixel))] text-[#64748b]">
            상품요약서(설명서)와 약관을 문서 종류에 맞게 첨부해 주세요.
          </p>
        </div>
        <div className="lg:mt-[calc(7*var(--review-pixel))]">
          <ReviewSteps steps={steps} current="03 문서 등록" />
        </div>
      </div>

      <div className="mt-[calc(26*var(--review-pixel))]">
        {(hasErrors || failure || (restored && detail.isError)) && (
          <div className="mb-[calc(16*var(--review-pixel))] grid gap-[calc(8*var(--review-pixel))]">
            {fields.map(({ kind, title }) => {
              const error = errors[kind];
              return error ? (
                <UploadAlert
                  key={kind}
                  id={`${kind}-upload-error`}
                  error={fileErrors[error]}
                  title={title}
                />
              ) : null;
            })}
            {failure && <UploadAlert error={failure.message} />}
            {restored && detail.isError && (
              <UploadAlert
                error={
                  detail.error?.status === 404
                    ? '검수 정보를 찾을 수 없어요.'
                    : '등록된 문서를 불러오지 못했어요.'
                }
                disabled={detail.isFetching}
                onRetry={detail.error?.status === 404 ? undefined : () => void detail.refetch()}
              />
            )}
          </div>
        )}

        <div className="grid gap-[calc(20*var(--review-pixel))] md:grid-cols-2">
          {fields.map(({ kind, ...field }) => (
            <DocumentUploadCard
              key={kind}
              {...field}
              document={documents[kind]}
              uploading={uploading}
              saved={restored}
              disabled={uploading || locked}
              errorId={errors[kind] ? `${kind}-upload-error` : undefined}
              onAttach={(files) => registration.attach(kind, files)}
              onRemove={() => registration.remove(kind)}
            />
          ))}
        </div>

        <footer className="mt-[calc(27*var(--review-pixel))] flex flex-wrap items-center justify-between gap-4 border-t border-[#e2e8f0] pt-[calc(17*var(--review-pixel))]">
          <p
            className={`text-[length:calc(14*var(--review-pixel))] ${canProceed ? 'text-[#0067ac]' : 'text-[#64748b]'}`}
            aria-live="polite"
          >
            {statusText}
          </p>
          <button
            type="button"
            disabled={!canProceed}
            aria-busy={uploading}
            onClick={beginAnalysis}
            className="h-[calc(44*var(--review-pixel))] w-[calc(159*var(--review-pixel))] rounded-[calc(10*var(--review-pixel))] bg-[#0067ac] text-[length:calc(16*var(--review-pixel))] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067ac] disabled:bg-[#eaf5fc] disabled:text-[#64748b]"
          >
            {restored && detail.data && !analysisPath && hasRequiredDocuments(documents)
              ? '등록 완료'
              : '분석 시작'}
          </button>
        </footer>
      </div>
      {uploading && <UploadProgressDialog progress={registration.progress} />}
    </ReviewWorkspaceLayout>
  );
}

export default function DocumentRegistrationPage(props) {
  const { reviewId } = useParams();
  const [search] = useSearchParams();
  const mock = import.meta.env.DEV && search.get('mock') === '1';
  const scenario = mock ? search.get('scenario') : null;
  const query = search.toString();
  return (
    <DocumentRegistration
      key={`${reviewId}:${mock}:${scenario}`}
      reviewId={reviewId}
      mock={mock}
      scenario={scenario}
      search={query ? '?' + query : ''}
      {...props}
    />
  );
}
