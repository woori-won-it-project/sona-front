import { useId } from 'react';
import { answerLabels, hasAllConditions, personaGroups } from '@/pages/personaConfigurationState';

export const personaCard =
  'min-w-0 rounded-[calc(14*var(--review-pixel))] border border-[#dce5ef] shadow-[0_2px_6px_#172b4d12]';
const primary =
  'persona-action persona-action--primary rounded-[calc(10*var(--review-pixel))] bg-[#0067ac] px-4 text-[length:calc(15*var(--review-pixel))] font-semibold text-white hover:bg-[#005b99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067ac] disabled:cursor-not-allowed disabled:bg-[#e8f3fa] disabled:text-[#64748b]';
const secondary =
  'persona-action persona-action--secondary rounded-[calc(10*var(--review-pixel))] border border-[#dce5ef] bg-white px-4 font-semibold text-[#64748b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067ac] disabled:opacity-60';
const incompleteMessage = '선택이 더 필요해요. 나이·성별·금융 이해도를 각각 선택해 주세요.';

function PersonaOptions({ group, number, selected, onToggle }) {
  const heading = useId();
  return (
    <section
      aria-labelledby={heading}
      className="rounded-[calc(12*var(--review-pixel))] border border-[#dce5ef] px-[calc(15*var(--review-pixel))] pt-[calc(15*var(--review-pixel))] pb-[calc(13*var(--review-pixel))]"
    >
      <div className="flex items-start gap-[calc(9*var(--review-pixel))]">
        <span
          aria-hidden="true"
          className="mt-[calc(4*var(--review-pixel))] grid size-[calc(31*var(--review-pixel))] shrink-0 place-items-center rounded-md bg-[#e8f3fa] text-[length:calc(13*var(--review-pixel))] font-bold text-[#0067ac]"
        >
          {String(number).padStart(2, '0')}
        </span>
        <div>
          <h3
            id={heading}
            className="text-[length:calc(17*var(--review-pixel))] leading-[calc(21*var(--review-pixel))] font-semibold text-[#004c80]"
          >
            {group.label}
          </h3>
          <p className="mt-[calc(5*var(--review-pixel))] text-[length:calc(13*var(--review-pixel))] text-[#64748b]">
            {group.description}
          </p>
        </div>
      </div>
      <div
        className="mt-[calc(19*var(--review-pixel))] grid gap-[calc(12*var(--review-pixel))]"
        style={{ gridTemplateColumns: `repeat(${group.values.length}, minmax(0, 1fr))` }}
      >
        {group.values.map((value) => {
          const checked = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={checked}
              onClick={() => onToggle(group, value)}
              className="persona-option min-h-[calc(45*var(--review-pixel))] rounded-[calc(6*var(--review-pixel))] border border-[#dce5ef] px-1 text-[length:calc(15*var(--review-pixel))] break-keep text-[#004c80] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067ac] aria-pressed:bg-[#e8f3fa] aria-pressed:font-semibold aria-pressed:text-[#0067ac]"
            >
              <span className="persona-option-label">
                <span aria-hidden="true" className="persona-option-check">
                  ✓{' '}
                </span>
                {value}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PersonaOptionsPanel({ selection, invalid, onToggle, onToggleAll, onConfirm }) {
  const allSelected = hasAllConditions(selection);
  return (
    <>
      <section
        className={
          personaCard +
          ' mt-[calc(30*var(--review-pixel))] bg-white px-[calc(23*var(--review-pixel))] pt-[calc(16*var(--review-pixel))] pb-[calc(31*var(--review-pixel))]'
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[length:calc(18*var(--review-pixel))] leading-[calc(23*var(--review-pixel))] font-semibold text-[#004c80]">
              실험 대상 설정
            </h2>
            <p className="mt-[calc(3*var(--review-pixel))] text-[length:calc(15*var(--review-pixel))] text-[#64748b]">
              나이, 성별, 금융 이해도는 각각 복수 선택할 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleAll}
            className="persona-action persona-action--secondary h-[calc(34*var(--review-pixel))] min-w-[calc(100*var(--review-pixel))] shrink-0 rounded-md border border-[#dce5ef] text-[length:calc(14*var(--review-pixel))] text-[#004c80] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067ac]"
          >
            <span key={String(allSelected)} className="persona-content-fade">
              {allSelected ? '전체 해제' : '전체 선택'}
            </span>
          </button>
        </div>
        <div className="mt-[calc(19*var(--review-pixel))] grid gap-x-[calc(20*var(--review-pixel))] gap-y-[calc(28*var(--review-pixel))] md:grid-cols-2 [&>section:first-child]:md:col-span-2">
          {personaGroups.map((group, index) => (
            <PersonaOptions
              key={group.id}
              group={group}
              number={index + 1}
              selected={selection[group.id]}
              onToggle={onToggle}
            />
          ))}
        </div>
      </section>
      <footer
        className={
          personaCard +
          ' mt-[calc(42*var(--review-pixel))] flex min-h-[calc(86*var(--review-pixel))] flex-wrap items-center justify-between gap-3 bg-white px-[calc(13*var(--review-pixel))] py-2 lg:pl-[calc(76*var(--review-pixel))]'
        }
      >
        <div>
          <p className="text-[length:calc(17*var(--review-pixel))] font-semibold text-[#004c80]">
            실험에 반영할 소비자 조건
          </p>
          <p className="persona-guidance mt-[calc(4*var(--review-pixel))] text-[length:calc(14*var(--review-pixel))]">
            <span aria-hidden={invalid} className="text-[#64748b]">
              나이·성별·금융 이해도를 하나 이상씩 선택하세요.
            </span>
            <span aria-hidden={!invalid} role="alert" className="text-red-600">
              {incompleteMessage}
            </span>
          </p>
        </div>
        <button
          type="button"
          className={
            primary + ' h-[calc(52*var(--review-pixel))] w-[calc(208*var(--review-pixel))]'
          }
          onClick={onConfirm}
        >
          실험 조건 확인
        </button>
      </footer>
    </>
  );
}

export function PersonaConfirmation({
  selection,
  answers,
  canStart,
  startRejected,
  live,
  onBack,
  onStart,
}) {
  return (
    <>
      <div className="mt-[calc(26*var(--review-pixel))] grid gap-[calc(20*var(--review-pixel))] lg:grid-cols-[minmax(0,344fr)_minmax(0,616fr)]">
        <section
          aria-labelledby="persona-summary-heading"
          className={
            personaCard +
            ' bg-[#e8f3fa] p-[calc(13*var(--review-pixel))] lg:h-[calc(432*var(--review-pixel))]'
          }
        >
          <h2
            id="persona-summary-heading"
            className="px-0.5 text-[length:calc(18*var(--review-pixel))] leading-[calc(27*var(--review-pixel))] font-medium"
          >
            선택한 소비자 특성
          </h2>
          <dl className="mt-[calc(26*var(--review-pixel))] grid gap-[calc(17*var(--review-pixel))]">
            {personaGroups.map(({ id, label }) => (
              <div
                key={id}
                className="min-h-[calc(98*var(--review-pixel))] rounded-[calc(12*var(--review-pixel))] border border-[#dce5ef] bg-white px-[calc(15*var(--review-pixel))] py-[calc(10*var(--review-pixel))]"
              >
                <dt className="text-[length:calc(17*var(--review-pixel))] font-medium text-[#004c80]">
                  {label}
                </dt>
                <dd className="mt-[calc(5*var(--review-pixel))] flex flex-wrap gap-[calc(5*var(--review-pixel))]">
                  {selection[id].map((value) => (
                    <span
                      key={value}
                      className="rounded-md bg-[#e8f3fa] px-[calc(8*var(--review-pixel))] py-[calc(4*var(--review-pixel))] text-[length:calc(14*var(--review-pixel))] text-[#004c80]"
                    >
                      {value}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section
          aria-labelledby="persona-answers-heading"
          aria-busy={answers.isFetching}
          className={
            personaCard +
            ' flex flex-col bg-white p-[calc(19*var(--review-pixel))] lg:h-[calc(432*var(--review-pixel))]'
          }
        >
          <h2
            id="persona-answers-heading"
            className="text-[length:calc(18*var(--review-pixel))] leading-[calc(24*var(--review-pixel))] font-medium"
          >
            검증 문항과 채점 기준
          </h2>
          <div
            tabIndex={0}
            className="persona-answer-list mt-[calc(18*var(--review-pixel))] min-h-0 overflow-y-auto rounded-md p-px focus-visible:outline-2 focus-visible:outline-[#0067ac]"
          >
            {answers.isPending && (
              <p role="status" className="persona-content-fade">
                승인한 검증 문항을 불러오고 있어요.
              </p>
            )}
            {answers.isError && (
              <div role="alert" className="persona-content-fade text-red-700">
                승인 문항과 기준답안을 불러오지 못했어요.{' '}
                <button
                  type="button"
                  className="font-semibold text-[#0067ac] underline"
                  onClick={() => void answers.refetch({ cancelRefetch: false })}
                  disabled={answers.isFetching}
                >
                  다시 시도
                </button>
              </div>
            )}
            {answers.isSuccess && !answers.data.length && <p>승인한 검증 문항이 없어요.</p>}
            {answers.data?.length > 0 && (
              <ol className="persona-content-fade grid gap-[calc(10*var(--review-pixel))]">
                {answers.data.map((question, index) => (
                  <li
                    key={question.questionId}
                    className="rounded-[calc(12*var(--review-pixel))] border border-[#dce5ef] px-[calc(14*var(--review-pixel))] pt-[calc(12*var(--review-pixel))] pb-[calc(15*var(--review-pixel))] text-[#004c80] shadow-[0_2px_5px_#172b4d12]"
                  >
                    <div className="flex items-start gap-[calc(18*var(--review-pixel))]">
                      <span
                        aria-hidden="true"
                        className="pt-0.5 text-[length:calc(12*var(--review-pixel))] text-[#0067ac]"
                      >
                        Q{index + 1}
                      </span>
                      <p className="text-[length:calc(15*var(--review-pixel))] wrap-anywhere">
                        {question.questionText}
                      </p>
                    </div>
                    <p className="mt-[calc(15*var(--review-pixel))] flex justify-end">
                      <span className="rounded-md border border-[#dce5ef] bg-[#f4f7fa] px-[calc(10*var(--review-pixel))] py-[calc(3*var(--review-pixel))] text-[length:calc(14*var(--review-pixel))] text-[#008a37]">
                        <span className="mr-2 text-[length:calc(11*var(--review-pixel))]">
                          정답
                        </span>
                        {answerLabels[question.referenceAnswer]}
                      </span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
      <footer
        className={
          personaCard +
          ' mt-[calc(26*var(--review-pixel))] flex min-h-[calc(94*var(--review-pixel))] flex-wrap items-center justify-between gap-3 bg-white px-[calc(19*var(--review-pixel))] py-2'
        }
      >
        <div className="text-[length:calc(14*var(--review-pixel))] text-[#64748b]">
          <p>페르소나가 기준답안과 같은 답을 하면 정답으로 채점해요.</p>
          {live && (
            <p id="persona-start-note" className="mt-1">
              서버 연동 확정 후 실험을 실행할 수 있어요.
            </p>
          )}
          {startRejected && (
            <p role="alert" className="persona-content-fade mt-1 text-red-700">
              실험을 시작하지 못했어요. 기존 조건으로 다시 시도할 수 있어요.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-[calc(17*var(--review-pixel))]">
          <button
            type="button"
            onClick={onBack}
            className={
              secondary +
              ' h-[calc(46*var(--review-pixel))] w-[calc(154*var(--review-pixel))] text-[length:calc(15*var(--review-pixel))]'
            }
          >
            조건 변경
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            aria-describedby={live ? 'persona-start-note' : undefined}
            className={
              primary + ' h-[calc(46*var(--review-pixel))] w-[calc(200*var(--review-pixel))]'
            }
          >
            실험 실행
          </button>
        </div>
      </footer>
    </>
  );
}
