import axios from 'axios';

// 서버 호출은 반드시 src/api/ 안에서만 이 인스턴스를 통해 한다.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? null;

    // TODO(auth): 인증 도입 시 401(토큰 만료 등) 처리 위치
    // if (status === 401) { ... }

    const message =
      error.response?.data?.message ??
      (error.code === 'ECONNABORTED' ? '요청 시간이 초과되었습니다.' : null) ??
      (error.response ? error.message : '서버에 연결할 수 없습니다.');

    return Promise.reject({ status, message });
  },
);

export default client;
