import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDocumentRegistrationApi } from './documentRegistration';

const file = new File(['Synthetic file data'], 'sample.pdf', {
  type: 'application/pdf',
  lastModified: 1,
});

describe('development document registration mock', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function upload(api, onProgress = vi.fn(), signal = new AbortController().signal) {
    return api.upload({ file, onProgress, signal });
  }

  it('reports increasing progress and returns mock metadata only after completion', async () => {
    const api = createMockDocumentRegistrationApi();
    const onProgress = vi.fn();
    const pending = upload(api, onProgress);
    await vi.advanceTimersByTimeAsync(500);
    expect(onProgress.mock.lastCall[0]).toBeGreaterThan(0);
    expect(onProgress.mock.lastCall[0]).toBeLessThan(100);
    await vi.runAllTimersAsync();
    expect(onProgress.mock.lastCall[0]).toBe(100);
    await expect(pending).resolves.toMatchObject({ name: file.name, size: file.size });
  });

  it.each([
    ['upload-error', undefined],
    ['unreadable', 'DOCUMENT_UNREADABLE'],
    ['encrypted', 'DOCUMENT_ENCRYPTED'],
  ])('simulates %s once and accepts another attempt', async (scenario, code) => {
    const api = createMockDocumentRegistrationApi(scenario);
    const rejection = expect(upload(api)).rejects.toMatchObject({ code });
    await vi.runAllTimersAsync();
    await rejection;

    const retry = upload(api);
    await vi.runAllTimersAsync();
    await expect(retry).resolves.toMatchObject({ name: file.name });
  });

  it.each([
    ['save-error', 'save'],
    ['analysis-error', 'startAnalysis'],
  ])('simulates %s once and resolves the retry with the same operation', async (scenario, step) => {
    const api = createMockDocumentRegistrationApi(scenario);
    const input = { operationId: 'sample-operation', signal: new AbortController().signal };
    const rejection = expect(api[step](input)).rejects.toThrow('Simulated');
    await vi.runAllTimersAsync();
    await rejection;

    const retry = api[step](input);
    await vi.runAllTimersAsync();
    await expect(retry).resolves.toEqual({ id: input.operationId });
  });

  it('stops progress when the upload is canceled', async () => {
    const api = createMockDocumentRegistrationApi();
    const onProgress = vi.fn();
    const controller = new AbortController();
    const rejection = expect(upload(api, onProgress, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    await vi.advanceTimersByTimeAsync(300);
    controller.abort();
    const calls = onProgress.mock.calls.length;
    await vi.runAllTimersAsync();
    await rejection;
    expect(onProgress).toHaveBeenCalledTimes(calls);
  });
});
