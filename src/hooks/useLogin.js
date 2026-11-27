import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createLoginSubmission, loginMutationOptions } from './loginMutation';

export function useLogin(onLoginSuccess) {
  const [{ requestLogin, submitLogin }] = useState(createLoginSubmission);
  const [loginError, setLoginError] = useState('');
  const { mutateAsync, isPending: pending } = useMutation(
    loginMutationOptions({ requestLogin, onLoginSuccess, setLoginError }),
  );

  return {
    pending,
    loginError,
    submitLogin: (values) => submitLogin(values, { mutateAsync, setLoginError }),
    clearLoginError: () => setLoginError(''),
  };
}
