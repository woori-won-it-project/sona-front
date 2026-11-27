export default function LoginField({ id, label, error, className, ...inputProps }) {
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-[length:calc(15*var(--login-pixel))] leading-[calc(18*var(--login-pixel))]"
      >
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-[calc(7*var(--login-pixel))] block h-[calc(47*var(--login-pixel))] w-full rounded-[calc(10*var(--login-pixel))] border border-[#e2e8f0] bg-white px-[calc(15*var(--login-pixel))] text-[length:calc(16*var(--login-pixel))] font-medium text-[#64748b] placeholder:text-[#64748b] focus:border-[#0067ac] focus:ring-2 focus:ring-[#0067ac]/20 focus:outline-none disabled:opacity-60"
      />
      {error && (
        <p
          id={errorId}
          className="mt-[calc(4*var(--login-pixel))] text-[length:calc(14*var(--login-pixel))] text-[#dc2626]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
