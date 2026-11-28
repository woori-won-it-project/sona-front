import { useEffect, useId, useRef, useState } from 'react';
import {
  checkQuestionText,
  maxQuestionLength,
  selectionLimitMessage,
  validationErrors,
} from '@/pages/questionSelectionState';

export default function QuestionEditor({ question, validating, onClose, onSubmit }) {
  const [value, setValue] = useState(question?.text ?? '');
  const [showInputError, setShowInputError] = useState(false);
  const [serverError, setServerError] = useState('');
  const dialog = useRef(null);
  const titleId = useId();
  const fieldId = useId();
  const inputError = checkQuestionText(value);
  const message =
    (showInputError || inputError === 'length') && inputError
      ? validationErrors[inputError]
      : serverError;

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  async function submit(event) {
    event.preventDefault();
    setShowInputError(true);
    if (validating || inputError) return;
    setServerError('');
    const result = await onSubmit(value.trim(), question?.id);
    if (result.status === 'success') onClose();
    if (result.status === 'invalid') setServerError(validationErrors[result.reason]);
    if (result.status === 'limit') setServerError(selectionLimitMessage);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!validating) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(560*var(--q))] max-w-[calc(100%-2rem)] overflow-auto rounded-[calc(16*var(--q))] border border-[#e2e8f0] bg-white p-[calc(23*var(--q))] text-[#172b4d] shadow-[0_2px_8px_#172b4d14] backdrop:bg-[#172b4d]/20"
    >
      <form onSubmit={submit} aria-busy={validating}>
        <h2
          id={titleId}
          className="text-[length:calc(22*var(--q))] leading-[calc(28*var(--q))] font-medium"
        >
          {question ? '질문 수정' : '질문 직접 작성'}
        </h2>
        <label
          htmlFor={fieldId}
          className="mt-[calc(21*var(--q))] block text-[length:calc(14*var(--q))] text-[#64748b]"
        >
          검증 질문
        </label>
        <textarea
          id={fieldId}
          rows={3}
          value={value}
          disabled={validating}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? fieldId + '-count ' + fieldId + '-error' : fieldId + '-count'}
          placeholder="검증하고 싶은 질문을 입력하세요."
          onChange={(event) => {
            setValue(event.target.value);
            setServerError('');
            setShowInputError(false);
          }}
          onBlur={() => setShowInputError(true)}
          className="mt-[calc(8*var(--q))] block h-[calc(112*var(--q))] w-full resize-none rounded-[calc(14*var(--q))] border border-[#dce5ef] px-[calc(15*var(--q))] py-[calc(10*var(--q))] text-[length:calc(16*var(--q))] shadow-[0_2px_8px_#172b4d14] placeholder:text-[#64748b] focus-visible:outline-2 focus-visible:outline-[#0067ac] aria-invalid:border-red-600"
        />
        <div className="mt-1 flex min-h-[calc(21*var(--q))] justify-between gap-2 text-[length:calc(12*var(--q))]">
          <p id={fieldId + '-error'} role="alert" className="text-red-700">
            {message}
          </p>
          <span id={fieldId + '-count'} className="shrink-0 text-[#64748b]">
            {[...value.trim()].length}/{maxQuestionLength}
          </span>
        </div>
        <div className="mt-[calc(6*var(--q))] flex justify-end gap-[calc(8*var(--q))] text-[length:calc(14*var(--q))] font-semibold">
          <button
            type="button"
            disabled={validating}
            onClick={onClose}
            className="h-[calc(40*var(--q))] w-[calc(85*var(--q))] rounded-[calc(10*var(--q))] border border-[#dce5ef] text-[#64748b]"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={Boolean(inputError) || validating}
            className="h-[calc(40*var(--q))] w-[calc(156*var(--q))] rounded-[calc(10*var(--q))] bg-[#0067ac] text-white shadow-[0_2px_4px_#172b4d17] disabled:text-[#dbe7f1]"
          >
            {validating ? '저장 중...' : question ? '수정 저장' : '추가하고 선택'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
