export const requiredDocumentKinds = ['summary', 'policy'];
export const maxDocumentBytes = 20 * 1024 * 1024;

export const fileErrors = {
  type: 'PDF 형식의 파일만 첨부할 수 있어요. PDF로 저장한 뒤 다시 선택해 주세요.',
  size: '파일은 20MB 이하만 첨부할 수 있어요. 용량을 줄인 PDF를 다시 선택해 주세요.',
  count: '한 번에 첨부할 수 있는 파일 수를 초과했어요. 파일을 나누어 첨부해 주세요.',
  duplicate: '이미 등록된 파일이에요.',
  empty: '내용이 있는 PDF 파일을 첨부해 주세요.',
};

const allowedPdfTypes = new Set(['', 'application/pdf', 'application/octet-stream']);

export function validateDocumentFiles(files, attached) {
  if (files.length !== 1) return 'count';
  const [file] = files;
  if (!/\.pdf$/i.test(file.name) || !allowedPdfTypes.has(file.type)) return 'type';
  if (file.size > maxDocumentBytes) return 'size';
  if (!file.size) return 'empty';
  if (
    attached?.name === file.name &&
    attached.size === file.size &&
    attached.lastModified === file.lastModified
  ) {
    return 'duplicate';
  }
  return null;
}

export function reviewDocuments(review) {
  const kinds = { TERMS: 'policy', PRODUCT_GUIDE: 'summary' };
  const documents = {};
  for (const { documentType, filename, fileSize } of review?.documents ?? []) {
    if (Object.hasOwn(kinds, documentType)) {
      documents[kinds[documentType]] = { name: filename, size: fileSize };
    }
  }
  return documents;
}

export function documentReviewKey(reviewId, mock) {
  return ['document-registration', mock ? 'mock' : 'server', String(reviewId)];
}

export function documentReviewPath(reviewId, search = '') {
  return '/documents/' + encodeURIComponent(reviewId) + search;
}

export function hasRequiredDocuments(documents) {
  return requiredDocumentKinds.every((kind) => Boolean(documents[kind]));
}

const registrationErrors = {
  FILE_TOO_LARGE: fileErrors.size,
  INVALID_FILE_TYPE: fileErrors.type,
  REQUIRED_DOCUMENT_MISSING: '보험약관과 상품설명서를 모두 첨부해 주세요.',
  INVALID_INPUT: '첨부한 PDF를 확인한 뒤 다시 시도해 주세요.',
  UNAUTHORIZED: '로그인한 뒤 다시 시도해 주세요.',
  INVALID_CSRF_TOKEN: '로그인 연결을 확인한 뒤 다시 시도해 주세요.',
};

export function registrationFailure(error) {
  if (error?.code === 'REGISTRATION_GUARD_UNAVAILABLE') {
    return {
      uncertain: false,
      message: '등록을 준비하지 못했어요. HTTPS 또는 로컬 개발 주소에서 다시 시도해 주세요.',
    };
  }
  if (Object.hasOwn(registrationErrors, error?.code)) {
    return { uncertain: false, message: registrationErrors[error.code] };
  }
  return {
    uncertain: true,
    message:
      '같은 첨부의 등록 여부를 확인하지 못했어요. 검수 목록이나 담당자에게 등록 상태를 확인해 주세요.',
  };
}

async function registrationAttempt(scope, files) {
  // Keep only a digest of the file names and sizes, never the files or their contents.
  if (!globalThis.crypto?.subtle) throw { code: 'REGISTRATION_GUARD_UNAVAILABLE' };
  const metadata = requiredDocumentKinds.map((kind) => [files[kind].name, files[kind].size]);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(metadata)),
  );
  const id = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
  return pendingReviewWrite(scope, 'registration', id);
}

export function createRegistrationSubmission(scope = 'server') {
  let pending;
  let completed = false;

  return {
    isPending: () => Boolean(pending),
    abort: () => pending?.abort(),
    async submit({ files, createReview, onProgress }) {
      if (pending || completed || !hasRequiredDocuments(files)) return null;
      const controller = new AbortController();
      pending = controller;
      try {
        const attempt = await registrationAttempt(scope, files);
        controller.signal.throwIfAborted();
        if (attempt.isPending()) throw { code: 'REGISTRATION_UNCONFIRMED' };
        attempt.mark();
        try {
          const review = await createReview({ files, signal: controller.signal, onProgress });
          attempt.clear();
          controller.signal.throwIfAborted();
          completed = true;
          return review;
        } catch (error) {
          if (!controller.signal.aborted && !registrationFailure(error).uncertain) attempt.clear();
          throw error;
        }
      } finally {
        pending = undefined;
      }
    },
  };
}

export function documentSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const format = (value) =>
    new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value);
  return bytes < 1024 ** 2 ? `${format(bytes / 1024)} KB` : `${format(bytes / 1024 ** 2)} MB`;
}
import { pendingReviewWrite } from '@/hooks/pendingReviewWrites';
