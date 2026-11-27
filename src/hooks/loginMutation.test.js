import { MutationObserver, onlineManager, QueryClient } from '@tanstack/react-query';
import { createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from '@/api/auth';
import { createLoginSubmission, loginMutationOptions } from './loginMutation';

vi.mock('@/api/auth', () => ({ login: vi.fn() }));

// 테스트 전용 입력과 경로. 실제 계정이나 서버 응답을 사용하지 않는다.
const credentials = { employeeNumber: '32403332', password: 'Example9!' };
const reviewHomePath = '/test-review-home';

describe('login submission', () => {
  let queryClient;
  let router;
  let mutation;
  let submit;
  let setLoginError;

  beforeEach(() => {
    vi.mocked(login).mockReset();
    queryClient = new QueryClient();
    router = createMemoryRouter([{ path: '/login' }, { path: reviewHomePath }], {
      initialEntries: ['/login'],
    });
    setLoginError = vi.fn();
    const { requestLogin, submitLogin } = createLoginSubmission();
    mutation = new MutationObserver(
      queryClient,
      loginMutationOptions({
        requestLogin,
        onLoginSuccess: () => router.navigate(reviewHomePath, { replace: true }),
        setLoginError,
      }),
    );
    submit = (values = credentials) =>
      submitLogin(values, { mutateAsync: mutation.mutate, setLoginError });
  });

  afterEach(() => {
    mutation.reset();
    queryClient.clear();
    router.dispose();
    onlineManager.setOnline(true);
  });

  it('keeps an empty form from making a request', async () => {
    await submit({ ...credentials, password: '' });

    expect(login).not.toHaveBeenCalled();
    expect(mutation.getCurrentResult().status).toBe('idle');
  });

  it('reports invalid input without sending it to the API', async () => {
    await submit({ ...credentials, employeeNumber: '32403333' });

    expect(login).not.toHaveBeenCalled();
    expect(setLoginError).toHaveBeenLastCalledWith('사번 또는 비밀번호가 올바르지 않습니다.');
  });

  it('keeps a request pending, blocks duplicate submissions, and replaces the route on success', async () => {
    const response = Promise.withResolvers();
    vi.mocked(login).mockReturnValueOnce(response.promise);

    const firstSubmission = submit();
    await submit();
    expect(mutation.getCurrentResult().isPending).toBe(true);
    expect(router.state.location.pathname).toBe('/login');
    await vi.waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(vi.mocked(login).mock.calls[0][0]).toEqual(credentials);
    expect(queryClient.getMutationCache().getAll()[0].state.variables).toBeUndefined();

    // API 응답의 목적지는 사용하지 않고 라우터가 지정한 화면으로 이동한다.
    response.resolve({ reviewHomePath: '/unexpected' });
    await firstSubmission;
    expect(mutation.getCurrentResult().isSuccess).toBe(true);
    expect(queryClient.getMutationCache().getAll()[0].state).toMatchObject({
      data: undefined,
      variables: undefined,
    });
    expect(router.state.location.pathname).toBe(reviewHomePath);
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it.each([
    [
      Object.assign(new Error('Mock authentication failure'), { code: 'INVALID_CREDENTIALS' }),
      '사번 또는 비밀번호가 올바르지 않습니다.',
    ],
    [new Error('Mock network failure'), '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.'],
  ])('shows the error and allows a manual retry for %s', async (error, message) => {
    vi.mocked(login).mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);

    await submit();
    expect(setLoginError).toHaveBeenLastCalledWith(message);
    expect(login).toHaveBeenCalledTimes(1);
    expect(mutation.getCurrentResult().isError).toBe(true);
    expect(router.state.location.pathname).toBe('/login');

    await submit();
    expect(setLoginError).toHaveBeenLastCalledWith('');
    expect(login).toHaveBeenCalledTimes(2);
    expect(router.state.location.pathname).toBe(reviewHomePath);
  });

  it('reports offline submissions immediately and does not replay them after reconnecting', async () => {
    onlineManager.setOnline(false);

    await submit();
    expect(setLoginError).toHaveBeenLastCalledWith(
      '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
    expect(mutation.getCurrentResult().status).toBe('idle');
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);

    onlineManager.setOnline(true);
    await queryClient.resumePausedMutations();
    expect(login).not.toHaveBeenCalled();

    vi.mocked(login).mockResolvedValueOnce(undefined);
    await submit();
    expect(login).toHaveBeenCalledTimes(1);
    expect(mutation.getCurrentResult().isSuccess).toBe(true);
  });

  it('does not cache an API error that contains the submitted request body', async () => {
    const error = Object.assign(new Error('Mock transport failure'), {
      config: { data: credentials },
    });
    vi.mocked(login).mockRejectedValueOnce(error);

    await submit();

    const state = queryClient.getMutationCache().getAll()[0].state;
    expect(state.variables).toBeUndefined();
    expect(state.error.message).toBe('로그인하지 못했어요. 잠시 후 다시 시도해 주세요.');
    expect(state.error).not.toHaveProperty('config');
  });
});
