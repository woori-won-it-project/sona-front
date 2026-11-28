import { useId, useRef, useState } from 'react';
import { documentSize } from '@/pages/documentRegistrationState';

const primaryButton =
  'h-[calc(38*var(--review-pixel))] rounded-[calc(10*var(--review-pixel))] border border-[#004c80] bg-[#0067ac] px-[calc(15*var(--review-pixel))] text-[length:calc(14*var(--review-pixel))] text-white shadow-[0_2px_4px_#172b4d17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067ac] disabled:opacity-60';

export default function DocumentUploadCard({
  title,
  description,
  illustration,
  document,
  uploading,
  saved,
  disabled,
  errorId,
  onAttach,
  onRemove,
}) {
  const headingId = useId();
  const picker = useRef(null);
  const [dragging, setDragging] = useState(false);
  const locked = disabled || uploading;
  const status = uploading
    ? '업로드 중'
    : document
      ? saved
        ? '등록 완료'
        : '첨부 완료'
      : '등록 필요';

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={errorId}
      aria-busy={uploading}
      className={`flex min-h-[calc(310*var(--review-pixel))] min-w-0 flex-col rounded-[calc(14*var(--review-pixel))] border bg-white shadow-[0_2px_8px_#172b4d14] ${dragging && !locked ? 'border-[#0067ac]' : 'border-[#e2e8f0]'}`}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = locked ? 'none' : 'copy';
        if (!locked) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!locked) void onAttach(Array.from(event.dataTransfer.files));
      }}
    >
      <div className="flex items-start justify-between gap-[calc(8*var(--review-pixel))] pt-[calc(20*var(--review-pixel))] pr-[calc(24*var(--review-pixel))] pl-[calc(18*var(--review-pixel))]">
        <h2
          id={headingId}
          className="text-[length:calc(22*var(--review-pixel))] leading-[calc(28*var(--review-pixel))] font-medium"
        >
          {title}
        </h2>
        <span
          className={`grid h-[calc(28*var(--review-pixel))] w-[calc(94*var(--review-pixel))] shrink-0 place-items-center rounded-[calc(7*var(--review-pixel))] bg-[#e2e8f0] text-[length:calc(13*var(--review-pixel))] font-medium ${document ? 'text-[#008a37]' : 'text-[#64748b]'}`}
          role="status"
        >
          {status}
        </span>
      </div>
      <div className="mt-[calc(24*var(--review-pixel))] flex min-h-[calc(142*var(--review-pixel))] items-center justify-between gap-1 px-[calc(24*var(--review-pixel))] pr-[calc(29*var(--review-pixel))]">
        <div className="min-w-0">
          {document ? (
            <>
              <p className="text-[length:calc(17*var(--review-pixel))] leading-[calc(24*var(--review-pixel))] font-medium break-all">
                {document.name}
              </p>
              <p className="mt-[calc(8*var(--review-pixel))] text-[length:calc(14*var(--review-pixel))] text-[#64748b]">
                {documentSize(document.size)}
              </p>
            </>
          ) : (
            <p className="text-[length:calc(15*var(--review-pixel))] text-[#64748b]">
              {description}
            </p>
          )}
        </div>
        <img
          src={illustration}
          alt=""
          width={124}
          height={102}
          className="h-auto w-[calc(124*var(--review-pixel))] shrink-0"
        />
      </div>
      {!saved && (
        <div className="mt-auto flex items-end justify-between gap-[calc(12*var(--review-pixel))] pt-[calc(8*var(--review-pixel))] pr-[calc(17*var(--review-pixel))] pb-[calc(24*var(--review-pixel))] pl-[calc(23*var(--review-pixel))]">
          <input
            ref={picker}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            hidden
            disabled={locked}
            aria-label={`${title} PDF 파일 선택`}
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files);
              event.currentTarget.value = '';
              void onAttach(files);
            }}
          />
          <button
            type="button"
            disabled={locked}
            onClick={() => picker.current?.click()}
            className={primaryButton}
            aria-label={`${title} ${document ? '파일 교체' : '파일 선택'}`}
          >
            {document ? '파일 교체' : '파일 선택'}
          </button>
          {document && (
            <button
              type="button"
              disabled={locked}
              onClick={onRemove}
              aria-label={`${title} 삭제`}
              className="h-[calc(34*var(--review-pixel))] w-[calc(66*var(--review-pixel))] rounded-md border border-[#e2e8f0] bg-white text-[length:calc(14*var(--review-pixel))] text-[#dc2626] disabled:opacity-60"
            >
              삭제
            </button>
          )}
        </div>
      )}
    </section>
  );
}
