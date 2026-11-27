import { useState } from 'react';
import sonaWave from '@/assets/sona-wave.svg';
import LoginField from '@/components/login/LoginField';
import { useLogin } from '@/hooks/useLogin';
import { normalizeEmployeeNumber } from '@/pages/loginInput';
import './login.css';

export default function LoginPage({ onLoginSuccess }) {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ employeeNumber: false, password: false });
  const { submitLogin, pending, loginError, clearLoginError } = useLogin(onLoginSuccess);
  const canSubmit = Boolean(employeeNumber && password) && !pending;

  function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    void submitLogin({ employeeNumber, password });
  }

  return (
    <main className="@container bg-white font-['Pretendard',sans-serif] text-[#172b4d] lg:grid lg:min-h-dvh lg:place-items-center">
      <div className="login-grid grid min-h-dvh lg:min-h-[calc(780*var(--login-pixel))] lg:w-[calc(1280*var(--login-pixel))] lg:grid-cols-[40.234375%_minmax(0,1fr)]">
        <section className="relative min-h-[230px] overflow-hidden bg-[linear-gradient(108.67deg,#004c80_9.45%,#0067ac_88.19%)] text-white lg:min-h-0">
          <div className="relative z-10 px-6 pt-7 lg:px-[calc(48*var(--login-pixel))] lg:pt-[calc(54*var(--login-pixel))]">
            <p className="text-[length:calc(32*var(--login-pixel))] leading-[calc(38*var(--login-pixel))] font-bold">
              Sona
            </p>
            <div className="mt-7 lg:mt-[calc(117*var(--login-pixel))]">
              <h1 className="text-[length:clamp(24px,6.4vw,32px)] leading-[calc(38*var(--login-pixel))] font-bold lg:text-[length:calc(32*var(--login-pixel))]">
                약관 속 숨은 오해를 찾아요
              </h1>
              <p className="mt-3 text-[length:calc(18*var(--login-pixel))] leading-[calc(21*var(--login-pixel))] font-medium break-keep text-[#eaf5fc] lg:mt-[calc(24*var(--login-pixel))]">
                가상 고객의 시선으로 약관과 상품설명서를 읽고,{' '}
                <span className="lg:mt-[calc(7*var(--login-pixel))] lg:block">
                  다르게 해석될 수 있는 표현을 확인하세요.
                </span>
              </p>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[48px] overflow-hidden lg:top-[calc(355*var(--login-pixel))] lg:bottom-[calc(2*var(--login-pixel))] lg:h-auto"
          >
            <img
              src={sonaWave}
              alt=""
              width={515}
              height={350}
              className="absolute -bottom-[165px] left-0 block h-auto w-full lg:bottom-0"
            />
          </div>
        </section>

        <section className="flex min-w-0 justify-center px-6 py-6 lg:justify-start lg:pt-[calc(146*var(--login-pixel))] lg:pr-[calc(48*var(--login-pixel))] lg:pl-[calc(105*var(--login-pixel))]">
          <div className="w-full max-w-[calc(523*var(--login-pixel))]">
            <h2 className="text-[length:calc(32*var(--login-pixel))] leading-[calc(38*var(--login-pixel))] font-semibold lg:-ml-[var(--login-pixel)]">
              사번 로그인
            </h2>
            <p
              role={loginError ? 'alert' : undefined}
              className={`mt-2 min-h-[calc(19*var(--login-pixel))] text-[length:calc(16*var(--login-pixel))] leading-[calc(19*var(--login-pixel))] lg:mt-[calc(18*var(--login-pixel))] ${loginError ? 'text-[#dc2626]' : 'text-[#64748b]'}`}
            >
              {loginError || '사번과 비밀번호를 입력하세요.'}
            </p>

            <form
              onSubmit={submit}
              noValidate
              aria-busy={pending}
              className="mt-6 lg:mt-[calc(39*var(--login-pixel))]"
            >
              <LoginField
                id="employee-number"
                label="사번"
                name="employeeNumber"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                value={employeeNumber}
                disabled={pending}
                placeholder="사번 입력"
                error={touched.employeeNumber && !employeeNumber ? '사번을 입력해 주세요.' : ''}
                onChange={(event) => {
                  setEmployeeNumber(normalizeEmployeeNumber(event.target.value));
                  clearLoginError();
                }}
                onBlur={() => setTouched((current) => ({ ...current, employeeNumber: true }))}
              />

              <LoginField
                className="mt-4 lg:mt-[calc(28*var(--login-pixel))]"
                id="password"
                label="비밀번호"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={pending}
                placeholder="비밀번호 입력"
                error={touched.password && !password ? '비밀번호를 입력해 주세요.' : ''}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearLoginError();
                }}
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              />

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 block h-[calc(51*var(--login-pixel))] w-full rounded-[calc(10*var(--login-pixel))] bg-[#0067ac] text-[length:calc(17*var(--login-pixel))] font-medium text-white shadow-[0_2px_4px_rgba(23,43,77,0.09)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067ac] enabled:hover:bg-[#005b99] disabled:cursor-not-allowed disabled:text-[length:calc(18*var(--login-pixel))] lg:mt-[calc(52*var(--login-pixel))]"
              >
                {pending ? '로그인 중…' : '로그인'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
