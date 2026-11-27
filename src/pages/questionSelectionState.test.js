import { describe, expect, it, vi } from 'vitest';
import { createMockQuestionSelectionApi } from '@/api/mocks/questionSelection';
import {
  checkQuestionText,
  getSelectedQuestions,
  removeCustomQuestion,
  saveCustomQuestion,
  selectionSignature,
  toggleQuestionSelection,
} from './questionSelectionState';

describe('question selection', () => {
  it('starts empty and allows deselection after refusing an eleventh question', () => {
    const ids = Array.from({ length: 10 }, (_, index) => 'question-' + index);
    const selected = ids.reduce(toggleQuestionSelection, []);
    expect(selected).toEqual(ids);
    expect(toggleQuestionSelection(selected, 'overflow')).toBe(selected);
    expect(toggleQuestionSelection(selected, ids[0])).toEqual(ids.slice(1));
  });

  it('adds and selects a custom question, preserves selection when editing, and removes both by ID', () => {
    const draft = { customQuestions: [], selectedIds: ['existing'] };
    const question = { id: 'custom', text: '보장이 되나요?', type: 'custom' };
    const next = saveCustomQuestion(draft, question);
    expect(next.selectedIds).toEqual(['existing', 'custom']);
    const edited = saveCustomQuestion(next, { ...question, text: '입원하면 보장이 되나요?' });
    expect(edited.selectedIds).toBe(next.selectedIds);
    expect(getSelectedQuestions(edited.customQuestions, edited.selectedIds)).toEqual([
      { ...question, text: '입원하면 보장이 되나요?' },
    ]);
    const unselected = { ...edited, selectedIds: ['existing'] };
    expect(saveCustomQuestion(unselected, question).selectedIds).toBe(unselected.selectedIds);
    expect(removeCustomQuestion(edited, 'custom')).toEqual(draft);
  });

  it('does not append a custom question if the selection is full', () => {
    const draft = {
      customQuestions: [],
      selectedIds: Array.from({ length: 10 }, (_, index) => index),
    };
    expect(saveCustomQuestion(draft, { id: 'custom', text: '질문' })).toBe(draft);
  });

  it('trims outer spaces and counts inner spaces and Unicode characters', () => {
    expect(checkQuestionText('   ')).toBe('empty');
    expect(checkQuestionText(' ' + '가'.repeat(150) + ' ')).toBeNull();
    expect(checkQuestionText('가 '.repeat(75) + '🙂')).toBe('length');
    expect(checkQuestionText('🙂'.repeat(150))).toBeNull();
  });

  it('detects changes to the saved selection or custom question text', () => {
    const recommended = { id: 'r1', type: 'case', text: '입원 치료도 보장되나요?' };
    const custom = { id: 'c1', type: 'custom', text: '통원 치료도 보장되나요?' };
    const saved = selectionSignature([recommended], [custom]);
    expect(selectionSignature([{ ...recommended }], [{ ...custom }])).toBe(saved);
    expect(selectionSignature([recommended, custom], [custom])).not.toBe(saved);
    expect(selectionSignature([recommended], [{ ...custom, text: '다른 질문인가요?' }])).not.toBe(
      saved,
    );
  });
});

async function complete(promise) {
  const result = promise.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await vi.runAllTimersAsync();
  return result;
}

describe('development question fixtures', () => {
  it('cancels pending validation and allows a new validation immediately', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createMockQuestionSelectionApi();
      const controller = new AbortController();
      const request = { text: '통원 치료도 보장되나요?', questions: [] };
      const canceled = fixture.validate({ ...request, signal: controller.signal });
      controller.abort();
      expect((await complete(canceled)).error.name).toBe('AbortError');
      const signal = new AbortController().signal;
      expect((await complete(fixture.validate({ ...request, signal }))).value).toEqual({
        reason: null,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns enough distinct synthetic evidence entries to exercise scrolling', async () => {
    vi.useFakeTimers();
    try {
      const signal = new AbortController().signal;
      const fixture = createMockQuestionSelectionApi('long-evidence');
      const { value } = await complete(fixture.evidence({ questionId: 'mock-case-1', signal }));
      const entries = value.sections[0].entries;
      expect(entries).toHaveLength(8);
      expect(new Set(entries.map(({ id }) => id)).size).toBe(entries.length);
      expect(value.mock).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns an unselected review, supports a genuinely empty recommendation list, and keeps evidence synthetic', async () => {
    vi.useFakeTimers();
    try {
      const signal = new AbortController().signal;
      const fixture = createMockQuestionSelectionApi();
      const { value } = await complete(fixture.list({ signal }));
      expect(value.selectedIds).toEqual([]);
      expect(value.questions.map(({ type }) => type)).toEqual(['case', 'predicted']);
      expect(
        (await complete(createMockQuestionSelectionApi('empty').list({ signal }))).value.questions,
      ).toEqual([]);
      const evidence = await complete(
        fixture.evidence({ questionId: value.questions[0].id, signal }),
      );
      expect(evidence.value).toMatchObject({
        mock: true,
        basis: '약관 근거 기반',
        references: ['보험약관 제11조 제1호, PDF p.32'],
      });
      expect(evidence.value.sections[0].label).toBe('관련 약관');
      expect(evidence.value.reason).toContain('지급 조건');
      expect(
        (await complete(fixture.evidence({ questionId: 'unknown', signal }))).value,
      ).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('simulates a remote validation failure, excludes the edited question, and permits retry', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createMockQuestionSelectionApi('validation-error');
      const signal = new AbortController().signal;
      const questions = [{ id: 'one', text: '보장이 되나요?' }];
      const request = { signal, questions, questionId: 'one', text: questions[0].text };
      expect((await complete(fixture.validate(request))).error).toBeInstanceOf(Error);
      expect((await complete(fixture.validate(request))).value).toEqual({ reason: null });
      expect((await complete(fixture.validate({ ...request, questionId: 'other' }))).value).toEqual(
        { reason: 'duplicate' },
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('simulates the four AI rejection outcomes independently of the input', async () => {
    vi.useFakeTimers();
    try {
      const signal = new AbortController().signal;
      for (const [scenario, reason] of [
        ['unrelated', 'unrelated'],
        ['vague', 'vague'],
        ['not-binary', 'notBinary'],
        ['duplicate', 'duplicate'],
      ]) {
        const result = await complete(
          createMockQuestionSelectionApi(scenario).validate({
            signal,
            questions: [],
            text: '테스트',
          }),
        );
        expect(result.value).toEqual({ reason });
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('allows retry after the first mock save fails and aborts pending work', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createMockQuestionSelectionApi('save-error');
      const controller = new AbortController();
      expect((await complete(fixture.save({ signal: controller.signal }))).error).toBeInstanceOf(
        Error,
      );
      expect(await complete(fixture.save({ signal: controller.signal }))).toEqual({
        value: undefined,
      });
      const pending = fixture.save({ signal: controller.signal });
      controller.abort();
      expect((await complete(pending)).error.name).toBe('AbortError');
    } finally {
      vi.useRealTimers();
    }
  });
});
