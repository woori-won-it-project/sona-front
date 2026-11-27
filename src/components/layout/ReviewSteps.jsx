import { Fragment } from 'react';

export default function ReviewSteps({ steps, current }) {
  return (
    <ol
      aria-label="검수 단계"
      className="flex items-center text-[length:calc(13*var(--review-pixel,1px))] text-nowrap text-[#64748b]"
    >
      {steps.map((step, index) => (
        <Fragment key={step}>
          {index > 0 && (
            <li
              aria-hidden="true"
              className="w-4 shrink-0 text-center text-[length:calc(14*var(--review-pixel,1px))] lg:w-[calc(18*var(--review-pixel,1px))]"
            >
              →
            </li>
          )}
          <li
            aria-current={step === current ? 'step' : undefined}
            className="relative grid h-[calc(32*var(--review-pixel,1px))] max-w-[calc(136*var(--review-pixel,1px))] flex-1 place-items-center px-1.5 text-center aria-[current=step]:font-medium aria-[current=step]:text-[#0067ac] lg:w-[calc(136*var(--review-pixel,1px))] lg:flex-none"
          >
            {step}
            {step === current && (
              <span className="absolute inset-x-2 bottom-0 h-[calc(2*var(--review-pixel,1px))] bg-[#0067ac] lg:inset-x-[calc(10*var(--review-pixel,1px))]" />
            )}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
