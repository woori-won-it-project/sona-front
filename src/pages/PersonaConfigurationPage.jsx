import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { createInitialExperimentConditions } from '@/api/personaExperiment';
import ReviewWorkspaceLayout from '@/components/layout/ReviewWorkspaceLayout';
import ReviewSteps from '@/components/layout/ReviewSteps';
import {
  PersonaConfirmation,
  PersonaOptionsPanel,
} from '@/components/personas/PersonaConfiguration';
import PersonaExperimentStatus from '@/components/personas/PersonaExperimentStatus';
import '@/components/personas/personaMotion.css';
import { usePersonaExperiment } from '@/hooks/usePersonaExperiment';
import {
  hasAllConditions,
  hasCompleteConditions,
  hasSavedExperimentResults,
  personaSelection,
  readPersonaDraft,
  savePersonaDraft,
  togglePersonaOption,
} from './personaConfigurationState';

const steps = ['06 검증 문항 승인', '07 페르소나 실험', '08 분석 리포트'];
const currentStep = steps[1];
const PersonaHandoffDemo = import.meta.env.DEV
  ? lazy(() => import('@/components/personas/PersonaHandoffDemo'))
  : null;
const reportDelay = 2000;
const headings = {
  configure: ['실험 페르소나 구성', '실험에 참여할 금융소비자의 특성을 선택하세요.'],
  confirm: ['실험 조건 확인', '선택한 소비자 특성과 문항별 채점 기준을 확인하세요.'],
  experiment: [
    '페르소나 실험 진행',
    '선택한 페르소나별 응답을 생성하고 담당자 기준답안과 비교해요.',
  ],
};
const backClass =
  'persona-action mr-auto mt-[calc(14*var(--review-pixel))] text-left text-[length:calc(14*var(--review-pixel))] font-bold text-[#64748b] hover:enabled:text-[#0067ac] focus-visible:outline-2 focus-visible:outline-[#0067ac]';

function QueryNotice({ query, label }) {
  if (query.isError) {
    return (
      <p role="alert" className="my-3 text-red-700">
        {label} 정보를 불러오지 못했어요.{' '}
        <button
          type="button"
          className="font-semibold text-[#0067ac] underline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          다시 시도
        </button>
      </p>
    );
  }
  return query.isPending || query.isFetching ? (
    <p role="status" className="my-3 text-[#64748b]">
      {label} 정보를 불러오고 있어요.
    </p>
  ) : null;
}

function PersonaConfiguration({
  reviewId,
  mock,
  scenario,
  homePath,
  approvalPath,
  getReportPath,
  activeExperimentId,
}) {
  const navigate = useNavigate();
  const heading = useRef(null);
  const executionInFlight = useRef(false);
  const draftKey = 'sona:persona-draft:' + JSON.stringify([reviewId, mock, scenario]);
  const [{ selection, phase }, setDraft] = useState(() => readPersonaDraft(draftKey));
  const [answersRequested, setAnswersRequested] = useState(phase === 'confirm');
  const [invalid, setInvalid] = useState(false);
  const [experimentId, setExperimentId] = useState(activeExperimentId ?? null);
  const [uncertain, setUncertain] = useState(null);
  const [startState, setStartState] = useState(null);
  const {
    review,
    questions,
    approved,
    answers,
    experiment,
    currentExperimentId,
    recovery,
    canExecute,
    executing,
    execute,
  } = usePersonaExperiment({
    reviewId,
    mock,
    scenario,
    answersRequested,
    experimentId,
    uncertain,
  });
  const experimenting = uncertain || currentExperimentId != null;
  const starting = startState === 'pending';
  const screen = experimenting || starting ? 'experiment' : phase;
  const canConfigure =
    review.isSuccess && !review.isFetching && review.data?.currentStep === 'PERSONA_SELECT';
  const restoring = mock && (!recovery.isSuccess || recovery.isFetching);
  const canEnter = !restoring && canConfigure && approved && !questions.isFetching;
  const readyToStart =
    canExecute &&
    canEnter &&
    hasCompleteConditions(selection) &&
    answers.isSuccess &&
    !answers.isFetching &&
    answers.data.length > 0;
  const canRetry =
    canExecute &&
    !uncertain &&
    experiment.isSuccess &&
    experiment.data?.status === 'FAILED' &&
    experiment.data.retryable === true;
  const completed =
    !uncertain && experiment.isSuccess && hasSavedExperimentResults(experiment.data);
  const reportPath = completed
    ? getReportPath?.({ reviewId, experimentId: currentExperimentId })
    : undefined;
  const [title, subtitle] = headings[screen];

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [screen]);

  useEffect(() => {
    if (!reportPath) return;
    const timeout = window.setTimeout(() => navigate(reportPath, { replace: true }), reportDelay);
    return () => window.clearTimeout(timeout);
  }, [navigate, reportPath]);

  function updateDraft(nextSelection, nextPhase) {
    setDraft({ selection: nextSelection, phase: nextPhase });
    savePersonaDraft(draftKey, nextSelection, nextPhase);
    setInvalid(false);
    setStartState(null);
  }

  function toggle(group, value) {
    updateDraft(togglePersonaOption(selection, group, value), 'configure');
  }

  function toggleAll() {
    updateDraft(personaSelection(!hasAllConditions(selection)), 'configure');
  }

  function showConfirmation() {
    if (!hasCompleteConditions(selection)) {
      setInvalid(true);
      return;
    }
    setAnswersRequested(true);
    updateDraft(selection, 'confirm');
  }

  async function runExperiment(retryId = null) {
    if (executionInFlight.current || (retryId == null ? !readyToStart : !canRetry)) return;
    executionInFlight.current = true;
    if (retryId == null) setStartState('pending');
    try {
      const conditions =
        retryId == null
          ? createInitialExperimentConditions({
              selection,
              questions: answers.data,
              documents: review.data.documents ?? [],
            })
          : undefined;
      const result = await execute({ conditions, retryId });
      setExperimentId(result.experimentId);
      setStartState(null);
    } catch (error) {
      if (error?.code === 'MOCK_START_REJECTED') {
        setStartState('rejected');
      } else {
        setStartState(null);
        setUncertain(retryId == null ? 'start' : 'retry');
      }
    } finally {
      executionInFlight.current = false;
    }
  }

  async function checkExperiment() {
    if (!uncertain) {
      await experiment.refetch({ cancelRefetch: false });
      return;
    }
    const result = await recovery.refetch({ cancelRefetch: false });
    if (result.data?.experimentId != null) {
      setExperimentId(result.data.experimentId);
      setUncertain(null);
    }
  }

  const headerStart =
    screen === 'confirm' ? (
      <button
        type="button"
        className={backClass}
        onClick={() => updateDraft(selection, 'configure')}
      >
        {'<  이전 단계 · 페르소나 구성'}
      </button>
    ) : screen === 'configure' ? (
      approvalPath ? (
        <Link className={backClass} to={approvalPath}>
          {'<  이전 단계 · 검증 문항 승인'}
        </Link>
      ) : (
        <button type="button" disabled className={backClass}>
          {'<  이전 단계 · 검증 문항 승인'}
        </button>
      )
    ) : undefined;

  return (
    <ReviewWorkspaceLayout homePath={homePath} reportPath={reportPath} headerStart={headerStart}>
      <div
        className="persona-motion"
        data-report-ready={reportPath ? true : undefined}
        style={{ '--persona-report-delay': `${reportDelay}ms` }}
      >
        <div key={screen} className="persona-screen">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1
                ref={heading}
                tabIndex={-1}
                className="text-[length:calc(32*var(--review-pixel))] leading-[calc(45*var(--review-pixel))] font-semibold focus:outline-none"
              >
                {title}
              </h1>
              <p className="mt-[calc(6*var(--review-pixel))] text-[length:calc(16*var(--review-pixel))] leading-[calc(23*var(--review-pixel))] text-[#64748b]">
                {subtitle}
              </p>
            </div>
            <div className="lg:mt-[calc(7*var(--review-pixel))]">
              <ReviewSteps steps={steps} current={currentStep} />
            </div>
          </div>
          {screen === 'experiment' ? (
            <PersonaExperimentStatus
              experiment={experiment}
              mock={mock}
              uncertain={uncertain}
              checking={experiment.isFetching || recovery.isFetching}
              onCheck={checkExperiment}
              starting={starting}
              retrying={executing && !starting}
              onRetry={canRetry ? () => void runExperiment(currentExperimentId) : undefined}
            />
          ) : (
            <>
              {restoring && <QueryNotice query={recovery} label="실험 상태" />}
              <QueryNotice query={review} label="검수" />
              {review.isSuccess && !review.isFetching && !canConfigure && (
                <p role="alert" className="mt-5 text-red-700">
                  현재 검수 단계에서는 페르소나를 구성할 수 없어요.
                </p>
              )}
              {canConfigure && <QueryNotice query={questions} label="검증 문항 승인" />}
              {canConfigure && questions.isSuccess && !questions.isFetching && !approved && (
                <p role="alert" className="mt-5 text-red-700">
                  선택한 검증 문항의 기준답안을 모두 승인한 뒤 실험을 구성할 수 있어요.
                </p>
              )}
              {canEnter && (
                <>
                  {phase === 'configure' ? (
                    <PersonaOptionsPanel
                      selection={selection}
                      invalid={invalid}
                      onToggle={toggle}
                      onToggleAll={toggleAll}
                      onConfirm={showConfirmation}
                    />
                  ) : (
                    <PersonaConfirmation
                      selection={selection}
                      answers={answers}
                      canStart={readyToStart}
                      startRejected={startState === 'rejected'}
                      live={!canExecute}
                      onBack={() => updateDraft(selection, 'configure')}
                      onStart={() => void runExperiment()}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </ReviewWorkspaceLayout>
  );
}

export default function PersonaConfigurationPage(props) {
  const { reviewId } = useParams();
  const [search] = useSearchParams();
  const mock = import.meta.env.DEV && search.get('mock') === '1';
  const scenario = mock ? search.get('scenario') : null;
  const demo = PersonaHandoffDemo && scenario === 'handoff';
  const resumePath = `/personas/${encodeURIComponent(reviewId)}?mock=1&scenario=handoff`;
  const destination = search.get('demo');
  if (demo && ['home', 'report'].includes(destination)) {
    return (
      <Suspense fallback={<p role="status">목업 인계 화면을 불러오고 있어요.</p>}>
        <PersonaHandoffDemo
          reviewId={reviewId}
          destination={destination}
          experimentId={search.get('experimentId')}
          resumePath={resumePath}
        />
      </Suspense>
    );
  }
  return (
    <PersonaConfiguration
      key={JSON.stringify([reviewId, mock, scenario, props.activeExperimentId])}
      reviewId={reviewId}
      mock={mock}
      scenario={scenario}
      homePath={demo ? `${resumePath}&demo=home` : undefined}
      getReportPath={
        demo
          ? ({ experimentId }) =>
              `${resumePath}&demo=report&experimentId=${encodeURIComponent(experimentId)}`
          : undefined
      }
      {...props}
    />
  );
}
