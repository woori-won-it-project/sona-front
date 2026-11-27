import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  canStartAnalysis,
  changeRegisteredDocument,
  createDocumentDraft,
  documentDraftKey,
  maxDocumentBytes,
  saveAndStartAnalysis,
  uploadAndRegister,
  uploadErrorKind,
  validateDocumentFiles,
} from './documentRegistrationState';

const file = { name: 'summary.PDF', type: 'application/pdf', size: 100, lastModified: 7 };
const summary = { ...file, id: 'summary-asset' };
const policy = { id: 'policy-asset', name: 'policy.pdf', size: 120, lastModified: 9 };

function completeDraft() {
  const draft = changeRegisteredDocument(createDocumentDraft(), 'summary', summary);
  return changeRegisteredDocument(draft, 'policy', policy);
}

describe('document registration', () => {
  it('accepts a PDF at the limit and rejects invalid types, size, count, and duplicates', () => {
    expect(validateDocumentFiles([{ ...file, size: maxDocumentBytes }])).toBeNull();
    expect(validateDocumentFiles([{ ...file, type: '' }])).toBeNull();
    expect(validateDocumentFiles([{ ...file, name: 'summary.txt' }])).toBe('type');
    expect(validateDocumentFiles([{ ...file, type: 'text/plain' }])).toBe('type');
    expect(validateDocumentFiles([{ ...file, size: maxDocumentBytes + 1 }])).toBe('size');
    expect(validateDocumentFiles([file, file])).toBe('count');
    expect(validateDocumentFiles([file], summary)).toBe('duplicate');
    expect(validateDocumentFiles([file], { ...summary, lastModified: 8 })).toBeNull();
  });

  it('keeps the existing attachment on a failed replacement and commits a successful retry', async () => {
    let draft = completeDraft();
    const nextFile = { ...file, name: 'replacement.pdf' };
    const replacement = { ...nextFile, id: 'replacement' };
    const api = {
      upload: vi
        .fn()
        .mockRejectedValueOnce(new Error('Network'))
        .mockResolvedValueOnce(replacement),
    };
    const request = {
      api,
      file: nextFile,
      signal: new AbortController().signal,
      onRegistered(document) {
        draft = changeRegisteredDocument(draft, 'summary', document);
      },
    };

    await expect(uploadAndRegister(request)).rejects.toThrow('Network');
    expect(draft.documents).toEqual({ summary, policy });

    await uploadAndRegister(request);
    expect(draft.documents).toEqual({ summary: replacement, policy });
    expect(api.upload.mock.calls.map(([request]) => request.file)).toEqual([nextFile, nextFile]);
  });

  it('does not commit an upload result after leaving or canceling the transfer', async () => {
    const controller = new AbortController();
    const onRegistered = vi.fn();
    const upload = vi.fn(async () => {
      controller.abort();
      return summary;
    });
    await expect(
      uploadAndRegister({ api: { upload }, onRegistered, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it('keeps registered files scoped to each review, including mock and real work', () => {
    const cache = new QueryClient();
    const first = documentDraftKey('review-1', true);
    cache.setQueryData(first, completeDraft());
    expect(cache.getQueryData(documentDraftKey('review-2', true))).toBeUndefined();
    expect(cache.getQueryData(documentDraftKey('review-1', false))).toBeUndefined();

    cache.setQueryData(first, (draft) => changeRegisteredDocument(draft, 'summary', null));
    expect(cache.getQueryData(first).documents).toEqual({ policy });
    cache.clear();
  });

  it('enables analysis only for two registered required files with no pending or completed run', () => {
    const ready = completeDraft();
    expect(canStartAnalysis(createDocumentDraft(), false)).toBe(false);
    expect(canStartAnalysis(changeRegisteredDocument(ready, 'summary', null), false)).toBe(false);
    expect(canStartAnalysis(ready, true)).toBe(false);
    expect(canStartAnalysis(ready, false)).toBe(true);
    expect(canStartAnalysis({ ...ready, analysis: { id: 'run' } }, false)).toBe(false);
  });

  it('reuses a saved batch and operation ID after only analysis fails', async () => {
    let draft = completeDraft();
    const storedBatch = { id: 'saved-batch' };
    const analysis = { id: 'analysis-run' };
    const api = {
      save: vi.fn().mockResolvedValue(storedBatch),
      startAnalysis: vi
        .fn()
        .mockRejectedValueOnce(new Error('Network'))
        .mockResolvedValueOnce(analysis),
    };
    const run = () =>
      saveAndStartAnalysis({
        api,
        reviewId: 'review-1',
        draft,
        signal: new AbortController().signal,
        onSaved: (saved) => {
          draft = { ...draft, saved };
        },
        onAnalyzing: vi.fn(),
      });

    await expect(run()).rejects.toThrow('Network');
    expect(draft.documents).toEqual({ summary, policy });
    await expect(run()).resolves.toEqual(analysis);
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.startAnalysis).toHaveBeenCalledTimes(2);
    const [first, second] = api.startAnalysis.mock.calls.map(([request]) => request);
    expect(first.operationId).toBe(second.operationId);
    expect(second.saved).toEqual(storedBatch);
  });

  it('distinguishes invalid PDFs, encrypted PDFs, and upload failures at the UI adapter boundary', () => {
    expect(uploadErrorKind({ code: 'DOCUMENT_UNREADABLE' })).toBe('unreadable');
    expect(uploadErrorKind({ code: 'DOCUMENT_ENCRYPTED' })).toBe('encrypted');
    expect(uploadErrorKind(new Error('Network'))).toBe('upload');
  });
});
