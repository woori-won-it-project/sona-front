const progressStart = 50;
const progressDuration = 1150;
const completionDelay = 160;

function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal.reason);
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const failures = {
  'upload-error': { step: 'upload' },
  unreadable: { step: 'upload', code: 'DOCUMENT_UNREADABLE' },
  encrypted: { step: 'upload', code: 'DOCUMENT_ENCRYPTED' },
  'save-error': { step: 'save' },
  'analysis-error': { step: 'analysis' },
};

// The selected step fails once per mounted mock. No file bytes leave the browser.
export function createMockDocumentRegistrationApi(scenario) {
  const failure = Object.hasOwn(failures, scenario) ? failures[scenario] : undefined;
  let failed = false;

  function failOnce(step) {
    if (failed || step !== failure?.step) return;
    failed = true;
    throw Object.assign(new Error('Simulated document registration failure.'), {
      code: failure.code,
    });
  }

  return {
    async upload({ file, onProgress, signal }) {
      await wait(progressStart, signal);
      const startedAt = performance.now();
      let progress = 0;
      while (progress < 100) {
        await wait(50, signal);
        progress = Math.min(100, ((performance.now() - startedAt) / progressDuration) * 100);
        onProgress(progress);
      }
      await wait(completionDelay, signal);
      failOnce('upload');
      return {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
      };
    },
    async save({ operationId, signal }) {
      await wait(1200, signal);
      failOnce('save');
      return { id: operationId };
    },
    async startAnalysis({ operationId, signal }) {
      await wait(900, signal);
      failOnce('analysis');
      return { id: operationId };
    },
  };
}
