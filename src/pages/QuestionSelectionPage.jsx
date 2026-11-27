import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import wave from '@/assets/question-selection/wave.svg';
import ReviewWorkspaceLayout from '@/components/layout/ReviewWorkspaceLayout';
import ReviewSteps from '@/components/layout/ReviewSteps';
import QuestionEditor from '@/components/questions/QuestionEditor';
import QuestionList, { QuestionEvidence } from '@/components/questions/QuestionList';
import { useQuestionSelection } from '@/hooks/useQuestionSelection';
import { maxSelectedQuestions, selectionLimitMessage } from './questionSelectionState';

const steps = ['04 분석 진행', '05 검증 질문 선택', '06 검증 문항 승인'];
const previewCount = 3;
const previousLabel = '<  이전 단계 · 분석 완료';
const previousClass =
  'mr-auto mt-[calc(14*var(--review-pixel))] text-left text-[length:calc(14*var(--review-pixel))] font-bold whitespace-pre text-[#64748b]';

function SelectedQuestions({ selected }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = selected.length > previewCount;
  const open = hasMore && expanded;
  return (
    <section aria-label="선택한 질문" className="min-w-0 flex-1 text-[length:calc(14*var(--q))]">
      <div className="flex flex-wrap items-center gap-x-[calc(10*var(--q))]">
        <p aria-live="polite" className="font-medium">
          선택한 질문 {selected.length}개
        </p>
        {hasMore && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls="selected-questions"
            onClick={() => setExpanded(!expanded)}
            className="font-semibold text-[#0067ac]"
          >
            {open ? '접기' : '+' + (selected.length - previewCount) + '개 더보기'}
          </button>
        )}
      </div>
      {selected.length > 0 && (
        <ul
          id="selected-questions"
          className="mt-[calc(5*var(--q))] flex max-h-[calc(80*var(--q))] flex-wrap gap-[calc(5*var(--q))] overflow-y-auto py-0.5 text-[length:calc(12*var(--q))]"
        >
          {(open ? selected : selected.slice(0, previewCount)).map((question) => (
            <li
              key={question.id}
              title={question.text}
              className="max-w-full truncate rounded-[calc(6*var(--q))] bg-[#e8f3fa] px-[calc(7*var(--q))] py-[calc(3*var(--q))] text-[#172b4d]"
            >
              {question.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function QuestionSelection({
  reviewId,
  mock,
  scenario,
  homePath,
  reportPath,
  analysisPath,
  getApprovalPath,
}) {
  const navigate = useNavigate();
  const [evidenceId, setEvidenceId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [limitError, setLimitError] = useState('');
  const selection = useQuestionSelection({ reviewId, mock, scenario, evidenceId });
  const { list, questions, selected, selectionSaved, evidence, validating, saving, saveFailed } =
    selection;
  const savedWithoutDestination = selectionSaved && !getApprovalPath;
  const selectedIds = new Set(selected.map(({ id }) => id));
  const previous = analysisPath ? (
    <Link to={analysisPath} className={previousClass}>
      {previousLabel}
    </Link>
  ) : (
    <button type="button" disabled className={previousClass}>
      {previousLabel}
    </button>
  );

  function addQuestion() {
    if (selected.length >= maxSelectedQuestions) {
      setLimitError(selectionLimitMessage);
      return;
    }
    setLimitError('');
    setEditor({ question: null });
  }

  async function confirm() {
    if (await selection.confirm()) {
      if (getApprovalPath) navigate(getApprovalPath({ reviewId }));
    }
  }

  return (
    <ReviewWorkspaceLayout
      homePath={homePath}
      reportPath={reportPath}
      headerStart={previous}
      waveSrc={wave}
    >
      <div className="[--q:var(--review-pixel)]">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[length:calc(32*var(--q))] leading-[calc(45*var(--q))] font-semibold">
              검증 질문 선택
            </h1>
            <p className="mt-[calc(6*var(--q))] text-[length:calc(16*var(--q))] leading-[calc(23*var(--q))] text-[#64748b]">
              분석 결과를 바탕으로 실험에 사용할 검증 질문을 선택해 주세요.
            </p>
          </div>
          <div className="lg:mt-[calc(7*var(--q))]">
            <ReviewSteps steps={steps} current="05 검증 질문 선택" />
          </div>
        </div>
        <div className="mt-[calc(26*var(--q))] grid gap-[calc(20*var(--q))] lg:grid-cols-[minmax(0,564fr)_minmax(0,396fr)]">
          <QuestionList
            list={list}
            questions={questions}
            selectedIds={selectedIds}
            evidenceId={evidenceId}
            disabled={saving}
            onAdd={addQuestion}
            onToggle={(id) => setLimitError(selection.toggle(id) ? '' : selectionLimitMessage)}
            onEvidence={(id) => setEvidenceId((current) => (current === id ? null : id))}
            onEdit={(question) => {
              setLimitError('');
              setEditor({ question });
            }}
            onRemove={(id) => {
              selection.remove(id);
              setLimitError('');
            }}
          />
          <QuestionEvidence
            question={questions.find(({ id }) => id === evidenceId)}
            evidence={evidence}
          />
        </div>
        <footer
          aria-busy={saving}
          className="mt-[calc(24*var(--q))] flex flex-wrap items-start justify-between gap-[calc(12*var(--q))]"
        >
          <div className="min-w-0 flex-1">
            <SelectedQuestions selected={selected} />
            {limitError && (
              <p role="alert" className="mt-1 text-[length:calc(14*var(--q))] text-red-700">
                {limitError}
              </p>
            )}
            {saveFailed && (
              <p role="alert" className="mt-1 text-[length:calc(14*var(--q))] text-red-700">
                검증 질문을 저장하지 못했어요. 다시 시도해 주세요.
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!selected.length || saving || savedWithoutDestination}
            onClick={confirm}
            className="h-[calc(37*var(--q))] w-[calc(188*var(--q))] shrink-0 rounded-[calc(10*var(--q))] bg-[#0067ac] text-[length:calc(14*var(--q))] font-semibold text-white enabled:shadow-[0_2px_4px_#172b4d17] disabled:bg-[#e2e8f0] disabled:text-[#64748b] aria-busy:bg-[#0067ac] aria-busy:text-white"
            aria-busy={saving}
          >
            {saving ? '저장 중...' : savedWithoutDestination ? '저장 완료' : '검증 문항 승인으로'}
          </button>
        </footer>
        {editor && (
          <QuestionEditor
            question={editor.question}
            validating={validating}
            onClose={() => {
              selection.cancelValidation();
              setEditor(null);
            }}
            onSubmit={selection.submitCustom}
          />
        )}
      </div>
    </ReviewWorkspaceLayout>
  );
}

export default function QuestionSelectionPage(props) {
  const { reviewId } = useParams();
  const [search] = useSearchParams();
  const mock = import.meta.env.DEV && search.get('mock') === '1';
  const scenario = mock ? search.get('scenario') : null;
  return (
    <QuestionSelection
      key={JSON.stringify([reviewId, mock, scenario])}
      reviewId={reviewId}
      mock={mock}
      scenario={scenario}
      {...props}
    />
  );
}
