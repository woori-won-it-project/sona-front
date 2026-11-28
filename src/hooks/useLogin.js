import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createLoginSubmission,
  csrfUnavailable,
  loginCsrfQueryOptions,
  loginMutationOptions,
} from './loginMutation';

export function useLogin(onLoginSuccess) {
  const [{ requestLogin, submitLogin }] = useState(createLoginSubmission);
  const [loginError, setLoginError] = useState('');
  const csrf = useQuery(loginCsrfQueryOptions);
  const login = useMutation(loginMutationOptions({ requestLogin, onLoginSuccess, setLoginError }));
  const csrfRejected = login.error?.code === 'INVALID_CSRF_TOKEN';
  const csrfReady = csrf.isSuccess && !csrf.isFetching && !csrfRejected;

  async function retryCsrf() {
    if (login.isPending) return;
    const result = await csrf.refetch({ cancelRefetch: false });
    if (result.isSuccess) {
      login.reset();
      setLoginError('');
    }
  }

  return {
    pending: login.isPending,
    complete: login.isSuccess,
    csrfReady,
    csrfPreparing: csrf.isFetching,
    csrfError: csrf.isError ? csrfUnavailable : csrfRejected ? login.error.message : '',
    loginError,
    retryCsrf,
    submitLogin: (values) => {
      if (csrfReady && !login.isSuccess) {
        return submitLogin(values, { mutateAsync: login.mutateAsync, setLoginError });
      }
    },
    clearLoginError: () => setLoginError(''),
  };
}
