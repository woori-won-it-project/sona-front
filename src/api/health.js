import { healthClient } from './client';

export async function getHealth() {
  const { data } = await healthClient.get('/health');
  return data;
}
