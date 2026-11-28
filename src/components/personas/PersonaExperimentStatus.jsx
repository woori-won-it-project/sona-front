import { experimentProgress, hasSavedExperimentResults } from '@/pages/personaConfigurationState';
import { personaCard } from './PersonaConfiguration';

const recheckButton =
  'persona-status-action persona-content-fade persona-action persona-action--secondary mt-4 rounded-md border border-[#dce5ef] bg-white px-4 py-2 font-semibold text-[#0067ac] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067ac] disabled:opacity-60';

export default function PersonaExperimentStatus({
  experiment,
  mock,
  uncertain,
  checking,
  onCheck,
  retrying,
  onRetry,
  starting,
}) {
  const result = experiment.data;
  const completed = !uncertain && !experiment.isError && hasSavedExperimentResults(result);
  const failed = !uncertain && !experiment.isError && result?.status === 'FAILED';
  const disconnected = experiment.isError;
  const progress = uncertain || disconnected ? null : experimentProgress(result);
  const hasError = uncertain || failed || disconnected;
  const showProgress = !uncertain && !disconnected && (!failed || progress !== null);
  let label = '실험 상태 확인 중';
  let title = '실험 상태를 불러오고 있어요.';
  let description = '문항별 응답 생성 → 기준답안 대조 → 조항별 결과 정리';
  if (starting) {
    label = '실험 시작 중';
    title = '실험을 시작하고 있어요.';
  } else if (completed) {
    label = '페르소나 실험 완료';
    title = '페르소나 실험이 완료됐어요.';
    description = '문항별 응답과 기준답안 대조가 끝났습니다. 리포트에서 결과를 확인하세요.';
  } else if (uncertain) {
    label = uncertain === 'retry' ? '실험 재시도 상태 미확인' : '실험 시작 상태 미확인';
    title =
      uncertain === 'retry'
        ? '실험 재시도 여부를 확인하지 못했어요.'
        : '실험 시작 여부를 확인하지 못했어요.';
    description = '기존 실험 상태를 확인해 주세요.';
  } else if (failed) {
    label = '페르소나 실험 중단';
    title = '페르소나 실험을 완료하지 못했어요.';
    description = onRetry
      ? '기존 실험 조건으로 다시 시도할 수 있어요.'
      : '기존 실험 상태를 확인해 주세요.';
  } else if (disconnected) {
    label = '실험 상태 조회 실패';
    title = '실험 상태를 확인하지 못했어요.';
    description = '실험 상태를 다시 확인해 주세요.';
  } else if (result?.status === 'RUNNING') {
    label = Number.isFinite(result.participantCount)
      ? `${result.participantCount}명 선택`
      : '페르소나 실험 진행 중';
    title = '페르소나가 문서를 읽고 있어요.';
  } else if (result?.status === 'COMPLETED') {
    label = '실험 결과 저장 확인 중';
    title = '결과가 저장되었는지 확인하고 있어요.';
    description = '결과 저장이 확인되면 리포트를 열 수 있어요.';
  }

  return (
    <section
      className={
        personaCard +
        ' persona-status-card mt-[calc(58*var(--review-pixel))] min-h-[calc(330*var(--review-pixel))] bg-white px-[calc(39*var(--review-pixel))] pt-[calc(37*var(--review-pixel))] pb-[calc(36*var(--review-pixel))]'
      }
      aria-busy={checking || retrying || starting}
    >
      <div role={hasError ? 'alert' : 'status'}>
        <div key={title} className="persona-content-fade">
          <p className="flex items-center gap-[calc(8*var(--review-pixel))] text-[length:calc(18*var(--review-pixel))] font-medium text-[#64748b]">
            {label}
            {completed && (
              <span
                aria-hidden="true"
                className="persona-complete-check inline-grid size-[calc(18*var(--review-pixel))] place-items-center rounded-full bg-[#e8f3fa] text-[length:calc(12*var(--review-pixel))] font-bold text-[#0067ac]"
              >
                ✓
              </span>
            )}
            {showProgress && !completed && !failed && (
              <span
                aria-hidden="true"
                className="persona-running-dot size-[calc(5*var(--review-pixel))] rounded-full bg-[#0082c6]"
              />
            )}
          </p>
          <h2 className="mt-[calc(25*var(--review-pixel))] text-[length:calc(26*var(--review-pixel))] leading-[calc(35*var(--review-pixel))] font-bold">
            {title}
          </h2>
          <p className="mt-[calc(23*var(--review-pixel))] text-[length:calc(15*var(--review-pixel))] text-[#64748b]">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-[calc(81*var(--review-pixel))] h-[calc(7*var(--review-pixel))]">
        {showProgress && (
          <div
            role="progressbar"
            aria-label="페르소나 실험 진행률"
            aria-valuenow={progress ?? undefined}
            className="relative h-full overflow-hidden rounded-full bg-[#e8f3fa]"
          >
            {progress === null && (
              <div
                aria-hidden="true"
                className="persona-indeterminate absolute inset-y-0 left-0 rounded-full bg-[#0082c6]"
              />
            )}
            <div
              aria-hidden="true"
              data-stopped={failed || undefined}
              className="persona-progress-fill h-full rounded-full bg-[#0082c6]"
              style={{ '--persona-progress-target': (progress ?? 0) / 100 }}
            />
          </div>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          className={recheckButton}
          onClick={onRetry}
          disabled={retrying || checking}
        >
          {retrying ? '다시 시도 중…' : '다시 시도'}
        </button>
      )}
      {!starting && !completed && !onRetry && onCheck && (hasError || !mock) && (
        <button
          type="button"
          className={recheckButton}
          onClick={() => void onCheck()}
          disabled={checking || retrying}
        >
          {checking ? '상태 확인 중…' : '실험 상태 확인'}
        </button>
      )}
    </section>
  );
}
