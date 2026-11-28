import client from './client';

export { issueCsrfToken } from './client';

export async function login({ employeeNumber, password }) {
  const { data } = await client.post('/auth/login', { employeeNumber, password });
  return data.data;
}

export async function logout() {
  const { data } = await client.post('/auth/logout');
  return data;
}
