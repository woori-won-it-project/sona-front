import client from './client';

export async function getHealth() {
  const { data } = await client.get('/health');
  return data;
}
