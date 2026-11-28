export const personaGroups = [
  {
    id: 'age',
    label: '나이',
    description: '검증할 소비자의 연령대',
    values: ['20대', '30대', '40대', '50대', '60대 이상'],
  },
  { id: 'gender', label: '성별', description: '검증할 소비자의 성별', values: ['남', '여'] },
  {
    id: 'literacy',
    label: '금융 이해도',
    description: '금융 및 보험 용어에 대한 이해 수준',
    values: ['낮음', '중간', '높음'],
  },
];

export function personaSelection(selected = false) {
  return Object.fromEntries(
    personaGroups.map(({ id, values }) => [id, selected ? [...values] : []]),
  );
}

export function togglePersonaOption(selection, group, value) {
  return {
    ...selection,
    [group.id]: group.values.filter((option) =>
      option === value
        ? !selection[group.id].includes(option)
        : selection[group.id].includes(option),
    ),
  };
}

export function hasCompleteConditions(selection) {
  return personaGroups.every(({ id }) => selection[id].length > 0);
}

export function hasAllConditions(selection) {
  return personaGroups.every(({ id, values }) => selection[id].length === values.length);
}

export const answerLabels = { YES: '예', NO: '아니요' };

export function hasSavedExperimentResults(experiment) {
  return experiment?.status === 'COMPLETED' && experiment.resultsSaved === true;
}

export function experimentProgress(experiment) {
  if (hasSavedExperimentResults(experiment)) return 100;
  const { completedResponses, totalResponses } = experiment ?? {};
  if (
    !Number.isFinite(completedResponses) ||
    !Number.isFinite(totalResponses) ||
    totalResponses <= 0
  ) {
    return null;
  }
  return Math.min(99, Math.max(0, Math.floor((completedResponses / totalResponses) * 100)));
}

function normalizedSelection(selection) {
  return Object.fromEntries(
    personaGroups.map(({ id, values }) => [
      id,
      values.filter((value) => Array.isArray(selection?.[id]) && selection[id].includes(value)),
    ]),
  );
}

export function readPersonaDraft(key, storage) {
  try {
    const draft = JSON.parse((storage ?? globalThis.sessionStorage)?.getItem(key) ?? 'null');
    const selection = normalizedSelection(draft?.selection);
    const phase =
      draft?.phase === 'confirm' && hasCompleteConditions(selection) ? 'confirm' : 'configure';
    return { selection, phase };
  } catch {
    return { selection: personaSelection(), phase: 'configure' };
  }
}

export function savePersonaDraft(key, selection, phase, storage) {
  try {
    (storage ?? globalThis.sessionStorage)?.setItem(
      key,
      JSON.stringify({ selection: normalizedSelection(selection), phase }),
    );
  } catch {
    // Storage can be unavailable. The active layout still retains its draft in memory.
  }
}
