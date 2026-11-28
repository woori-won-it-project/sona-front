function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const failures = {
  'upload-error': { status: 415, code: 'INVALID_FILE_TYPE' },
  'save-error': { status: 400, code: 'INVALID_INPUT' },
  unreadable: { status: 400, code: 'INVALID_INPUT' },
  encrypted: { status: 400, code: 'INVALID_INPUT' },
  'file-too-large': { status: 413, code: 'FILE_TOO_LARGE' },
  'required-document-missing': { status: 409, code: 'REQUIRED_DOCUMENT_MISSING' },
};

let nextReviewId = 2;
const reviews = new Map([
  [
    1,
    {
      reviewId: 1,
      title: '예시 상품설명서.pdf',
      status: 'IN_PROGRESS',
      currentStep: 'DOC_UPLOAD',
      documents: [
        {
          documentId: 1,
          documentType: 'TERMS',
          filename: '예시 보험약관.pdf',
          version: 1,
          fileSize: 2048,
        },
        {
          documentId: 2,
          documentType: 'PRODUCT_GUIDE',
          filename: '예시 상품설명서.pdf',
          version: 1,
          fileSize: 4096,
        },
      ],
    },
  ],
]);

// Development only. Retain metadata for detail navigation within this browser session.
export function createMockDocumentRegistrationApi(scenario) {
  let failed = false;

  return {
    async getReview({ reviewId, signal }) {
      await wait(120, signal);
      const review = reviews.get(Number(reviewId));
      if (!review) throw { status: 404, code: 'NOT_FOUND' };
      return review;
    },

    async createReview({ files, signal, onProgress }) {
      for (const progress of [0, 25, 50, 75, 100]) {
        await wait(180, signal);
        onProgress(progress);
      }
      await wait(400, signal);
      if (!failed && Object.hasOwn(failures, scenario)) {
        failed = true;
        throw failures[scenario];
      }
      const reviewId = nextReviewId++;
      const documents = [
        ['TERMS', files.policy],
        ['PRODUCT_GUIDE', files.summary],
      ].map(([documentType, file], index) => ({
        documentId: reviewId * 2 - 1 + index,
        documentType,
        filename: file.name,
        version: 1,
        fileSize: file.size,
      }));
      const review = {
        reviewId,
        title: files.summary.name,
        status: 'IN_PROGRESS',
        currentStep: 'DOC_UPLOAD',
        documents,
      };
      reviews.set(reviewId, review);
      if (scenario === 'response-lost') throw { status: null, code: 'ERR_NETWORK' };
      return review;
    },
  };
}
