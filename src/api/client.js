import axios from 'axios';

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') || '/api/v1';
const baseURL = configuredBase.endsWith('/api') ? configuredBase + '/v1' : configuredBase;
const timeout = 10_000;
const csrfPath = '/auth/csrf';
const refreshPath = '/auth/refresh';
const loginPath = '/auth/login';
const writeMethods = new Set(['post', 'put', 'patch', 'delete']);
const sensitiveKey = /password|passwd|secret|token|authorization|cookie/i;

const client = axios.create({
  baseURL,
  timeout,
  withCredentials: true,
  withXSRFToken: false,
  adapter: 'fetch',
  // A redirect can forward a custom CSRF header beyond the configured API.
  fetchOptions: { redirect: 'error' },
});
const safeFailures = new WeakSet();

function rejectRequest(status, code, message) {
  const failure = { status, code, message };
  safeFailures.add(failure);
  throw failure;
}

// Health predates the versioned API and does not use its authentication flow.
export const healthClient = axios.create({
  baseURL: configuredBase.replace(/\/api\/v1$/, '/api'),
  timeout,
  withXSRFToken: false,
});

function readCsrfCookie() {
  const prefix = 'XSRF-TOKEN=';
  try {
    const cookie = globalThis.document?.cookie
      .split(/;\s*/)
      .find((part) => part.startsWith(prefix));
    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : '';
  } catch {
    return '';
  }
}

function normalizeError(error = {}) {
  const config = error.config;
  const payload = error.response?.data;
  const secrets = [config?.headers?.get?.('X-XSRF-TOKEN'), readCsrfCookie()];
  if (config?.apiPath === loginPath && typeof config.data === 'string') {
    try {
      secrets.push(JSON.parse(config.data).password);
    } catch {
      // A non-JSON body has no password field to inspect.
    }
  }
  const redact = (value) => {
    if (typeof value === 'string') {
      return secrets
        .filter((secret) => typeof secret === 'string' && secret.length > 0)
        .reduce((safe, secret) => safe.replaceAll(secret, '[REDACTED]'), value)
        .replace(
          /\b(?:Bearer\s+|(?:accessToken|refreshToken|XSRF-TOKEN)=)[^\s;,]+/gi,
          '[REDACTED]',
        );
    }
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !sensitiveKey.test(key))
          .map(([key, item]) => [redact(key), redact(item)]),
      );
    }
    return value;
  };
  const timeoutError = ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code);
  const status = error.response?.status ?? error.status ?? null;
  const failure = {
    status,
    code: typeof payload?.code === 'string' ? redact(payload.code) : (error.code ?? null),
    message:
      typeof payload?.message === 'string'
        ? redact(payload.message)
        : timeoutError
          ? '요청 시간이 초과되었습니다.'
          : status
            ? '요청을 처리하지 못했습니다.'
            : '서버에 연결할 수 없습니다.',
    ...(payload?.details === undefined ? {} : { details: redact(payload.details) }),
  };
  safeFailures.add(failure);
  return failure;
}

let csrfRequest;
export function issueCsrfToken() {
  csrfRequest ??= client
    .get(csrfPath)
    .then(() => {
      if (!readCsrfCookie()) {
        rejectRequest(403, 'INVALID_CSRF_TOKEN', 'CSRF 토큰을 확인할 수 없습니다.');
      }
    })
    .finally(() => {
      csrfRequest = undefined;
    });
  return csrfRequest;
}

let refreshVersion = 0;
let refreshAttempt;

function refreshSession(requestVersion) {
  // Requests sent with old cookies can return 401 after rotation has already completed.
  if (refreshAttempt && (refreshAttempt.pending || requestVersion < refreshAttempt.version)) {
    return refreshAttempt.promise;
  }
  const attempt = { version: ++refreshVersion, pending: true };
  refreshAttempt = attempt;
  attempt.promise = client
    .post(refreshPath)
    .catch((error) => {
      const location = globalThis.location;
      if (
        error.status === 401 &&
        error.code === 'UNAUTHORIZED' &&
        location?.pathname !== '/login'
      ) {
        location?.replace('/login');
      }
      throw error;
    })
    .finally(() => {
      attempt.pending = false;
    });
  return attempt.promise;
}

function trustedApiPath(config) {
  if (config.baseURL !== baseURL || !/^\/(?![/\\])/.test(config.url ?? '')) return null;
  try {
    const origin = globalThis.location?.origin ?? 'http://localhost';
    const base = new URL(baseURL, origin);
    const target = new URL(client.getUri(config), origin);
    if (!(
      ['http:', 'https:'].includes(base.protocol) &&
      !base.username &&
      !base.password &&
      !base.search &&
      !base.hash &&
      target.origin === base.origin &&
      target.pathname.startsWith(base.pathname + '/') &&
      !/%(?:2f|5c)/i.test(target.pathname)
    ))
      return null;
    return decodeURIComponent(target.pathname.slice(base.pathname.length));
  } catch {
    return null;
  }
}

client.interceptors.request.use(async (config) => {
  const apiPath = trustedApiPath(config);
  if (!apiPath) {
    rejectRequest(null, 'UNTRUSTED_API_URL', '허용되지 않은 API 주소입니다.');
  }
  config.apiPath = apiPath;
  config.withCredentials = true;
  config.withXSRFToken = false;
  delete config.auth;
  config.headers.delete(['Authorization', 'Cookie', 'X-XSRF-TOKEN']);
  if (writeMethods.has(config.method)) {
    if (!readCsrfCookie()) await issueCsrfToken();
    const token = readCsrfCookie();
    if (!token) {
      rejectRequest(403, 'INVALID_CSRF_TOKEN', 'CSRF 토큰을 확인할 수 없습니다.');
    }
    config.headers.set('X-XSRF-TOKEN', token);
  }
  if (config.data instanceof FormData) config.headers.setContentType(false, true);
  config.authVersion = refreshAttempt?.pending ? refreshVersion - 1 : refreshVersion;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (safeFailures.has(error)) throw error;
    const failure = normalizeError(error);
    const config = error.config;
    if (
      failure.status !== 401 ||
      failure.code !== 'UNAUTHORIZED' ||
      !config ||
      config.authRetried ||
      config.signal?.aborted ||
      [loginPath, refreshPath, csrfPath].includes(config.apiPath)
    ) {
      throw failure;
    }
    await refreshSession(config.authVersion);
    return client.request({ ...config, authRetried: true });
  },
);

healthClient.interceptors.response.use(undefined, (error) => Promise.reject(normalizeError(error)));

export default client;
