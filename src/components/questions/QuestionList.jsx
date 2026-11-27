import { useId } from 'react';
import { questionTypes } from '@/pages/questionSelectionState';

const card = 'rounded-[calc(14*var(--q))] border border-[#e2e8f0] shadow-[0_2px_8px_#172b4d14]';
const action =
  'h-[calc(30*var(--q))] rounded-[calc(8*var(--q))] border border-[#e2e8f0] bg-white px-[calc(16*var(--q))] text-[length:calc(14*var(--q))] font-semibold disabled:opacity-60';
const heading = 'text-[length:calc(20*var(--q))] leading-[calc(24*var(--q))] font-medium';

function QuestionItem({
  question,
  selected,
  open,
  disabled,
  onToggle,
  onEvidence,
  onEdit,
  onRemove,
}) {
  const titleId = useId();
  const custom = question.type === 'custom';
  return (
    <li
      className={
        card +
        ' px-[calc(13*var(--q))] pt-[calc(15*var(--q))] pb-[calc(9*var(--q))] ' +
        (selected ? 'bg-[#e8f3fa]' : 'bg-white')
      }
    >
      <div className="flex items-start gap-[calc(12*var(--q))]">
        <label className="relative grid shrink-0 place-items-center">
          <input
            type="checkbox"
            aria-labelledby={titleId}
            checked={selected}
            disabled={disabled}
            onChange={() => onToggle(question.id)}
            className="peer size-[calc(26*var(--q))] appearance-none rounded-[calc(6*var(--q))] border border-[#e2e8f0] bg-white checked:border-[#0067ac] checked:bg-[#0067ac] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067ac]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute hidden text-[length:calc(17*var(--q))] text-white peer-checked:block"
          >
            ✓
          </span>
        </label>
        <div className="min-w-0 pt-[calc(3*var(--q))]">
          <p className="flex items-center gap-[calc(6*var(--q))] text-[length:calc(13*var(--q))] leading-[calc(17*var(--q))]">
            <span
              aria-hidden="true"
              className="h-[calc(12*var(--q))] w-[calc(3*var(--q))] shrink-0 bg-[#64748b]"
            />
            {questionTypes[question.type]}
          </p>
          <p
            id={titleId}
            className="mt-[calc(8*var(--q))] text-[length:calc(15*var(--q))] leading-[calc(21*var(--q))] wrap-anywhere"
          >
            {question.text}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-[calc(12*var(--q))]">
        {custom ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onEdit(question)}
              className={action + ' text-[#64748b]'}
            >
              수정
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(question.id)}
              className={action + ' text-[#dc2626]'}
            >
              삭제
            </button>
          </>
        ) : (
          <button
            type="button"
            aria-expanded={open}
            aria-controls="question-evidence"
            disabled={disabled}
            onClick={() => onEvidence(question.id)}
            className={action + ' text-[#0067ac]'}
          >
            근거 보기
          </button>
        )}
      </div>
    </li>
  );
}

export default function QuestionList({
  list,
  questions,
  selectedIds,
  evidenceId,
  disabled,
  onAdd,
  ...actions
}) {
  return (
    <section
      aria-labelledby="question-list-title"
      className={
        card +
        ' flex min-w-0 flex-col bg-white px-[calc(15*var(--q))] pt-[calc(11*var(--q))] pb-[calc(16*var(--q))] lg:h-[calc(432*var(--q))]'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="question-list-title" className={heading}>
          검증 질문
        </h2>
        <button
          type="button"
          disabled={disabled || !list.isSuccess}
          onClick={onAdd}
          className="h-[calc(37*var(--q))] min-w-[calc(128*var(--q))] rounded-[calc(10*var(--q))] bg-[#0067ac] px-2 text-[length:calc(14*var(--q))] font-semibold whitespace-nowrap text-white shadow-[0_2px_4px_#172b4d17] disabled:opacity-60"
        >
          {questions.some(({ type }) => type === 'custom') ? '+ 질문 추가' : '+ 직접 질문 작성'}
        </button>
      </div>
      <div
        className="mt-[calc(13*var(--q))] min-h-0 overflow-y-auto p-px"
        aria-busy={list.isPending}
      >
        {list.isPending && (
          <p role="status" className="text-[#64748b]">
            검증 질문을 불러오고 있어요.
          </p>
        )}
        {list.isError && (
          <div role="alert" className="text-[#64748b]">
            검증 질문을 불러오지 못했어요.{' '}
            <button
              type="button"
              onClick={() => void list.refetch()}
              disabled={list.isFetching}
              className="text-[#0067ac] underline"
            >
              다시 시도
            </button>
          </div>
        )}
        {list.isSuccess && list.data.questions.length === 0 && (
          <p className="text-[length:calc(15*var(--q))] text-[#64748b]">
            추천된 검증 질문이 없어요. 직접 질문을 작성해 주세요.
          </p>
        )}
        <ul className="grid gap-[calc(12*var(--q))]">
          {questions.map((question) => (
            <QuestionItem
              key={question.id}
              question={question}
              selected={selectedIds.has(question.id)}
              open={evidenceId === question.id}
              disabled={disabled}
              {...actions}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function EvidenceDetails({ details }) {
  return (
    <div className="text-[length:calc(14*var(--q))] leading-[calc(22*var(--q))] wrap-anywhere">
      {(details.basis || details.mock) && (
        <p className="mb-[calc(22*var(--q))] flex flex-wrap items-baseline gap-x-[calc(8*var(--q))]">
          {details.basis}
          {details.mock && (
            <span className="text-[length:calc(12*var(--q))] text-[#64748b]">목업 예시</span>
          )}
        </p>
      )}
      {details.sections.map(({ label, entries }) => (
        <section key={label} className="not-first:mt-[calc(20*var(--q))]">
          <h3 className="text-[length:calc(13*var(--q))] text-[#64748b]">{label}</h3>
          <ul className="mt-[calc(8*var(--q))] space-y-[calc(14*var(--q))]">
            {entries.map(({ id, title, text }) => (
              <li key={id}>
                <p className="text-[length:calc(17*var(--q))] leading-[calc(23*var(--q))] font-semibold">
                  {title}
                </p>
                {text && <p className="mt-[calc(10*var(--q))] text-[#64748b]">{text}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {details.references.length > 0 && (
        <ul aria-label="참고" className="mt-[calc(28*var(--q))] space-y-[calc(4*var(--q))]">
          {details.references.map((reference) => (
            <li key={reference}>참고 · {reference}</li>
          ))}
        </ul>
      )}
      {details.reason && (
        <div className={card + ' mt-[calc(18*var(--q))] p-[calc(14*var(--q))]'}>
          <h3 className="text-[#0067ac]">추천 이유</h3>
          <p className="mt-[calc(6*var(--q))] leading-[calc(26*var(--q))] whitespace-pre-line">
            {details.reason}
          </p>
        </div>
      )}
    </div>
  );
}

export function QuestionEvidence({ question, evidence }) {
  return (
    <section
      id="question-evidence"
      aria-labelledby="question-evidence-title"
      className={
        card + ' flex min-w-0 flex-col bg-white p-[calc(19*var(--q))] lg:h-[calc(432*var(--q))]'
      }
    >
      <h2 id="question-evidence-title" className={heading}>
        질문 추천 근거
      </h2>
      <div
        key={question?.id}
        className="mt-[calc(19*var(--q))] min-h-0 overflow-y-auto pb-[calc(6*var(--q))] text-[length:calc(15*var(--q))]"
        aria-live="polite"
        aria-busy={Boolean(question && evidence.isFetching)}
      >
        {!question && (
          <p className="text-[#64748b]">
            ‘근거 보기’를 누르면 질문의 추천 근거를 확인할 수 있어요.
          </p>
        )}
        {question && (
          <>
            {evidence.isPending && (
              <p role="status" className="mt-3 text-[#64748b]">
                추천 근거를 불러오고 있어요.
              </p>
            )}
            {evidence.isError && (
              <div role="alert" className="mt-3 text-[#64748b]">
                추천 근거를 불러오지 못했어요.{' '}
                <button
                  type="button"
                  onClick={() => void evidence.refetch()}
                  disabled={evidence.isFetching}
                  className="text-[#0067ac] underline"
                >
                  다시 시도
                </button>
              </div>
            )}
            {evidence.isSuccess && !evidence.data && (
              <p className="mt-3 text-[#64748b]">표시할 추천 근거가 없어요.</p>
            )}
            {evidence.data && <EvidenceDetails details={evidence.data} />}
          </>
        )}
      </div>
    </section>
  );
}
