export const requiredDocumentKinds = ['summary', 'policy'];
export const maxDocumentBytes = 20 * 1024 * 1024;

export const fileErrors = {
  type: 'PDF 형식의 파일만 첨부할 수 있어요. PDF로 저장한 뒤 다시 선택해 주세요.',
  size: '파일은 20MB 이하만 첨부할 수 있어요. 용량을 줄인 PDF를 다시 선택해 주세요.',
  count: '한 번에 첨부할 수 있는 파일 수를 초과했어요. 파일을 나누어 첨부해 주세요.',
  duplicate: '이미 등록된 파일이에요.',
  unreadable: '파일을 읽을 수 없어요. 정상적인 PDF 파일을 다시 선택해 주세요.',
  encrypted: '암호가 설정된 파일이에요. 암호를 해제한 뒤 다시 선택해 주세요.',
  upload: '파일을 업로드하지 못했어요. 다시 시도해 주세요.',
};

const allowedPdfTypes = new Set(['', 'application/pdf', 'application/octet-stream']);

export function validateDocumentFiles(files, registered) {
  if (files.length !== 1) return 'count';
  const [file] = files;
  if (!/\.pdf$/i.test(file.name) || !allowedPdfTypes.has(file.type)) return 'type';
  if (file.size > maxDocumentBytes) return 'size';
  if (
    registered?.name === file.name &&
    registered.size === file.size &&
    registered.lastModified === file.lastModified
  ) {
    return 'duplicate';
  }
  return null;
}

export function createDocumentDraft() {
  return { documents: {}, revision: 0, saved: null, analysis: null };
}

export function documentDraftKey(reviewId, mock) {
  return ['document-registration', mock ? 'mock' : 'server', reviewId];
}

export function changeRegisteredDocument(draft, kind, document) {
  const documents = { ...draft.documents };
  if (document) documents[kind] = document;
  else delete documents[kind];
  return { documents, revision: draft.revision + 1, saved: null, analysis: null };
}

export function canStartAnalysis(draft, busy) {
  return !busy && !draft.analysis && requiredDocumentKinds.every((kind) => draft.documents[kind]);
}

export function uploadErrorKind(error) {
  // Internal adapter codes. Map server-specific failures at the API boundary.
  if (error?.code === 'DOCUMENT_UNREADABLE') return 'unreadable';
  if (error?.code === 'DOCUMENT_ENCRYPTED') return 'encrypted';
  return 'upload';
}

export async function saveAndStartAnalysis({ api, reviewId, draft, signal, onSaved, onAnalyzing }) {
  const operationId = JSON.stringify([
    reviewId,
    ...Object.entries(draft.documents)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kind, document]) => [kind, document.id]),
  ]);
  signal.throwIfAborted();
  const saved =
    draft.saved ?? (await api.save({ reviewId, documents: draft.documents, operationId, signal }));
  onSaved(saved);
  signal.throwIfAborted();
  onAnalyzing();
  return api.startAnalysis({ reviewId, saved, operationId, signal });
}

export async function uploadAndRegister({ api, onRegistered, ...request }) {
  const document = await api.upload(request);
  request.signal.throwIfAborted();
  onRegistered(document);
}

export function documentSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const format = (value) =>
    new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value);
  return bytes < 1024 ** 2 ? `${format(bytes / 1024)} KB` : `${format(bytes / 1024 ** 2)} MB`;
}
