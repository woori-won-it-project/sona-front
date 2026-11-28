import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let client;
let healthClient;
let auth;
let redirect;

function response(config, data = {}, status = 200) {
  return { config, data, status, headers: {} };
}

function reject(config, status, code, data = {}) {
  throw Object.assign(new Error('Raw Axios error'), {
    config,
    response: response(config, { code, ...data }, status),
  });
}

function unauthorized(config) {
  reject(config, 401, 'UNAUTHORIZED');
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', '/api');
  redirect = vi.fn();
  vi.stubGlobal('location', {
    origin: 'http://localhost:5173',
    pathname: '/questions/1',
    replace: redirect,
  });
  vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=original' });
  ({ default: client, healthClient } = await import('./client'));
  auth = await import('./auth');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('request configuration', () => {
  it('rejects a CSRF response without a readable cookie and allows issuance to be retried', async () => {
    document.cookie = '';
    const adapter = vi.fn(async (config) => response(config, '', 204));
    client.defaults.adapter = adapter;

    await expect(auth.issueCsrfToken()).rejects.toMatchObject({ code: 'INVALID_CSRF_TOKEN' });
    adapter.mockImplementationOnce(async (config) => {
      document.cookie = 'XSRF-TOKEN=issued';
      return response(config, '', 204);
    });
    await expect(auth.issueCsrfToken()).resolves.toBeUndefined();
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual(['/auth/csrf', '/auth/csrf']);
  });

  it('uses the versioned API with credentials and keeps the legacy health URL', async () => {
    client.defaults.adapter = async (config) => {
      expect(client.getUri(config)).toBe('/api/v1/reviews');
      expect(config.withCredentials).toBe(true);
      expect(config.headers.has('X-XSRF-TOKEN')).toBe(false);
      return response(config, { data: [] });
    };
    healthClient.defaults.adapter = async (config) => {
      expect(healthClient.getUri(config)).toBe('/api/health');
      expect(config.headers.has('X-XSRF-TOKEN')).toBe(false);
      return response(config, { healthy: true });
    };

    expect((await client.get('/reviews')).data).toEqual({ data: [] });
    const { getHealth } = await import('./health');
    expect(await getHealth()).toEqual({ healthy: true });
  });

  it('requests CSRF once, uses the rotated cookie after login, and leaves multipart boundary unset', async () => {
    document.cookie = '';
    const adapter = vi.fn(async (config) => {
      if (config.url === '/auth/csrf') {
        expect(config.headers.has('X-XSRF-TOKEN')).toBe(false);
        document.cookie = 'XSRF-TOKEN=issued%2Bvalue';
        return response(config, '', 204);
      }
      if (config.url === '/auth/login') {
        expect(config.headers.get('X-XSRF-TOKEN')).toBe('issued+value');
        expect(JSON.parse(config.data)).toEqual({ employeeNumber: 'EMP001', password: 'example' });
        document.cookie = 'XSRF-TOKEN=rotated';
        return response(config, { data: { member: { id: 1 } } });
      }
      expect(config.headers.get('X-XSRF-TOKEN')).toBe('rotated');
      expect(config.headers.toJSON()['Content-Type']).toBeUndefined();
      expect(config.data).toBeInstanceOf(FormData);
      return response(config, { data: { reviewId: 1 } }, 201);
    });
    client.defaults.adapter = adapter;

    await Promise.all([auth.issueCsrfToken(), auth.issueCsrfToken()]);
    expect(await auth.login({ employeeNumber: 'EMP001', password: 'example' })).toEqual({
      member: { id: 1 },
    });
    const form = new FormData();
    form.append('terms', new Blob(['sample']), 'terms.pdf');
    await client.post('/reviews', form, { headers: { 'Content-Type': 'application/json' } });
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      '/auth/csrf',
      '/auth/login',
      '/reviews',
    ]);
  });

  it('blocks foreign URLs, base URL overrides and paths outside the API before dispatch', async () => {
    const adapter = vi.fn();
    client.defaults.adapter = adapter;
    for (const [path, options] of [
      ['https://example.invalid/api/v1/reviews'],
      ['//example.invalid/reviews'],
      ['/reviews', { baseURL: 'https://example.invalid/api/v1' }],
      ['/../health'],
    ]) {
      await expect(client.post(path, null, options)).rejects.toMatchObject({
        code: 'UNTRUSTED_API_URL',
      });
    }
    expect(adapter).not.toHaveBeenCalled();
  });

  it('keeps the document registration request on Fetch with automatic boundary and redirects blocked', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/api/v1');
    const { default: absoluteClient } = await import('./client');
    const { documentRegistrationApi } = await import('./documentRegistration');
    const transport = vi.fn(async (request) => {
      expect(request.url).toBe('https://api.example.test/api/v1/reviews');
      expect(request.credentials).toBe('include');
      expect(request.redirect).toBe('error');
      expect(request.headers.get('X-XSRF-TOKEN')).toBe('original');
      expect(request.headers.get('Content-Type')).toMatch(/^multipart\/form-data; boundary=/);
      const form = await request.formData();
      expect([...form.keys()]).toEqual(['terms', 'productGuide']);
      return Response.json({ data: { reviewId: 19 } }, { status: 201 });
    });
    absoluteClient.defaults.env = { ...absoluteClient.defaults.env, fetch: transport };
    const files = {
      policy: new File(['sample'], 'terms.pdf'),
      summary: new File(['sample'], 'guide.pdf'),
    };
    await expect(documentRegistrationApi.createReview({ files })).resolves.toEqual({
      reviewId: 19,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('bootstraps a missing CSRF cookie and sends the current token on all write methods', async () => {
    document.cookie = '';
    client.defaults.adapter = async (config) => {
      if (config.url === '/auth/csrf') {
        document.cookie = 'XSRF-TOKEN=first';
        return response(config, '', 204);
      }
      expect(config.headers.get('X-XSRF-TOKEN')).toBe(
        config.method === 'post' ? 'first' : 'current',
      );
      return response(config);
    };
    await client.post('/reviews');
    document.cookie = 'XSRF-TOKEN=current';
    await Promise.all(['put', 'patch', 'delete'].map((method) => client[method]('/reviews/1')));
  });
});

describe('authentication refresh', () => {
  it('renews the session and sends the latest CSRF token on the retried request', async () => {
    const urls = [];
    client.defaults.adapter = async (config) => {
      urls.push(config.url);
      if (config.url === '/auth/refresh') {
        expect(config.headers.get('X-XSRF-TOKEN')).toBe('original');
        document.cookie = 'XSRF-TOKEN=rotated';
        return response(config);
      }
      if (config.headers.get('X-XSRF-TOKEN') === 'original') unauthorized(config);
      expect(config.headers.get('X-XSRF-TOKEN')).toBe('rotated');
      return response(config);
    };
    await client.patch('/questions/1', { questionText: '예시 질문' });
    expect(urls).toEqual(['/questions/1', '/auth/refresh', '/questions/1']);
  });

  it('shares one refresh across concurrent and delayed 401 responses from the old session', async () => {
    const allStarted = Promise.withResolvers();
    const refreshStarted = Promise.withResolvers();
    const duringRefreshStarted = Promise.withResolvers();
    const releaseRefresh = Promise.withResolvers();
    const releaseLate = Promise.withResolvers();
    let initialRequests = 0;
    let refreshes = 0;
    client.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshes++;
        refreshStarted.resolve();
        await releaseRefresh.promise;
      } else if (!config.authRetried) {
        if (++initialRequests === 3) allStarted.resolve();
        if (config.url === '/during-refresh') duringRefreshStarted.resolve();
        if (['/late', '/during-refresh'].includes(config.url)) await releaseLate.promise;
        unauthorized(config);
      }
      return response(config);
    };

    const first = client.get('/first');
    const second = client.get('/second');
    const late = client.get('/late');
    await allStarted.promise;
    await refreshStarted.promise;
    const duringRefresh = client.get('/during-refresh');
    await duringRefreshStarted.promise;
    releaseRefresh.resolve();
    await Promise.all([first, second]);
    releaseLate.resolve();
    await Promise.all([late, duringRefresh]);
    expect(refreshes).toBe(1);
  });

  it('never refreshes for a failed login or CSRF rejection', async () => {
    const adapter = vi.fn(async (config) => {
      if (config.url === '/auth/login') reject(config, 401, 'LOGIN_FAILED');
      reject(config, 403, 'INVALID_CSRF_TOKEN');
    });
    client.defaults.adapter = adapter;
    await expect(
      auth.login({ employeeNumber: 'EMP001', password: 'example' }),
    ).rejects.toMatchObject({
      code: 'LOGIN_FAILED',
    });
    await expect(client.delete('/reviews/1')).rejects.toMatchObject({ code: 'INVALID_CSRF_TOKEN' });
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual(['/auth/login', '/reviews/1']);
  });

  it('only retries the original request once when a second 401 follows successful refresh', async () => {
    const adapter = vi.fn(async (config) => {
      if (config.url === '/auth/refresh') return response(config);
      unauthorized(config);
    });
    client.defaults.adapter = adapter;
    await expect(client.get('/reviews')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      '/reviews',
      '/auth/refresh',
      '/reviews',
    ]);
  });

  it('redirects once when refresh is unauthorized and does not retry refresh recursively', async () => {
    const adapter = vi.fn(async (config) => unauthorized(config));
    client.defaults.adapter = adapter;
    const results = await Promise.allSettled([client.get('/reviews'), client.get('/questions/1')]);
    expect(results.every(({ reason }) => reason?.code === 'UNAUTHORIZED')).toBe(true);
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      '/reviews',
      '/questions/1',
      '/auth/refresh',
    ]);
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('calls logout using credentials and CSRF and returns the server message', async () => {
    client.defaults.adapter = async (config) => {
      expect(config.url).toBe('/auth/logout');
      expect(config.method).toBe('post');
      expect(config.withCredentials).toBe(true);
      expect(config.headers.get('X-XSRF-TOKEN')).toBe('original');
      return response(config, { message: '로그아웃되었습니다.' });
    };
    expect(await auth.logout()).toEqual({ message: '로그아웃되었습니다.' });
  });
});

describe('API errors', () => {
  it('preserves safe error details and omits credentials and raw request objects', async () => {
    client.defaults.adapter = async (config) =>
      reject(config, 400, 'INVALID_INPUT', {
        message: 'Rejected example-password',
        details: { field: 'employeeNumber', password: 'example-password', refreshToken: 'secret' },
      });
    await expect(
      auth.login({ employeeNumber: 'EMP001', password: 'example-password' }),
    ).rejects.toEqual({
      status: 400,
      code: 'INVALID_INPUT',
      message: 'Rejected [REDACTED]',
      details: { field: 'employeeNumber' },
    });
  });

  it.each([
    ['ERR_NETWORK', '서버에 연결할 수 없습니다.'],
    ['ECONNABORTED', '요청 시간이 초과되었습니다.'],
    ['ETIMEDOUT', '요청 시간이 초과되었습니다.'],
  ])('maps %s without exposing the original error', async (code, message) => {
    client.defaults.adapter = async (config) => {
      throw Object.assign(new Error('internal request information'), { code, config });
    };
    await expect(client.get('/reviews')).rejects.toEqual({ status: null, code, message });
  });
});
