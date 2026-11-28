import { onlineManager } from '@tanstack/react-query';
import { issueCsrfToken, login } from '@/api/auth';
import { hasValidLoginFormat } from '@/pages/loginInput';

const invalidCredentials = '사번 또는 비밀번호가 올바르지 않습니다.';
const loginUnavailable = '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
const loginErrors = {
  LOGIN_FAILED: invalidCredentials,
  INVALID_INPUT: '사번과 비밀번호의 입력 형식을 확인해 주세요.',
  INVALID_CSRF_TOKEN: '로그인 연결을 다시 준비해 주세요.',
};
export const csrfUnavailable = '로그인 연결을 준비하지 못했어요.';

export const loginCsrfQueryOptions = {
  queryKey: ['login-csrf'],
  queryFn: async () => {
    try {
      await issueCsrfToken();
      return true;
    } catch {
      throw new Error(csrfUnavailable);
    }
  },
  networkMode: 'always',
  retry: false,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  gcTime: 0,
};

function toLoginError(error) {
  // Axios 오류에는 요청 본문이 포함될 수 있으므로 화면에 필요한 오류만 전달한다.
  if (Object.hasOwn(loginErrors, error?.code)) {
    return Object.assign(new Error(loginErrors[error.code]), { code: error.code });
  }
  return new Error(loginUnavailable);
}

export function loginMutationOptions({ requestLogin, onLoginSuccess, setLoginError }) {
  return {
    mutationFn: requestLogin,
    networkMode: 'always',
    retry: false,
    onSuccess: () => onLoginSuccess?.(),
    onError: (error) => setLoginError(error.message),
  };
}

export function createLoginSubmission() {
  let submitting = false;
  let credentials;

  async function requestLogin() {
    const input = credentials;
    credentials = undefined;
    if (!input || !onlineManager.isOnline()) throw new Error(loginUnavailable);
    try {
      await login(input);
    } catch (error) {
      throw toLoginError(error);
    }
  }

  async function submitLogin({ employeeNumber, password }, { mutateAsync, setLoginError }) {
    if (!employeeNumber || !password || submitting) return;

    if (!hasValidLoginFormat(employeeNumber, password)) {
      setLoginError(invalidCredentials);
      return;
    }
    if (!onlineManager.isOnline()) {
      setLoginError(loginUnavailable);
      return;
    }

    submitting = true;
    credentials = { employeeNumber, password };
    setLoginError('');
    try {
      await mutateAsync();
    } catch {
      // 오류 안내는 mutation의 onError에서 처리한다.
    } finally {
      credentials = undefined;
      submitting = false;
    }
  }

  return { requestLogin, submitLogin };
}
