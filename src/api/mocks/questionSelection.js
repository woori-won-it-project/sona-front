const recommendations = [
  { id: 'mock-case-1', type: 'case', text: '암 진단만으로 암주요치료비를 받을 수 있나요?' },
  {
    id: 'mock-predicted-1',
    type: 'predicted',
    text: '면역력 강화 치료는 암 주요치료에서 제외되나요?',
  },
];

const extraQuestions = [
  '입원 없이 받은 치료도 보장 대상인가요?',
  '진단일 당일부터 보장이 시작되나요?',
  '동일한 질병으로 재입원하면 보장이 이어지나요?',
  '치료 목적의 수술에만 보험금이 지급되나요?',
  '갱신 후에도 기존 보장 조건이 유지되나요?',
  '특약을 가입하지 않아도 해당 치료가 보장되나요?',
  '외래 치료에도 자기부담금이 적용되나요?',
  '타 병원에서 받은 검사 결과로 보험금을 신청할 수 있나요?',
  '보장 기간이 끝난 뒤 청구해도 되나요?',
].map((text, index) => ({ id: 'mock-extra-' + index, type: 'predicted', text }));

const validationScenarios = {
  unrelated: 'unrelated',
  vague: 'vague',
  'not-binary': 'notBinary',
  duplicate: 'duplicate',
};

const longEvidenceFixture = [
  '보장 개시일과 진단일의 관계를 확인하는 예시입니다.',
  '진단만 받은 경우와 치료를 시작한 경우를 구분하는 예시입니다.',
  '치료 목적의 시술과 예방 목적의 시술을 구분하는 예시입니다.',
  '입원과 통원에서 적용되는 지급 조건을 비교하는 예시입니다.',
  '특약 가입 여부에 따라 달라지는 조건을 확인하는 예시입니다.',
  '면책기간과 감액기간을 서로 구분하는 예시입니다.',
  '같은 질병으로 재치료를 받은 경우를 확인하는 예시입니다.',
  '보험금 청구 시 제출해야 할 서류를 확인하는 예시입니다.',
].map((text, index) => ({
  id: 'mock-detail-' + index,
  title: '목업 항목 ' + (index + 1),
  text,
}));

const sampleEvidence = {
  'mock-case-1': {
    basis: '약관 근거 기반',
    sections: [
      {
        label: '관련 약관',
        entries: [
          {
            id: 'mock-payment-clause',
            title: '보험약관 제11조 제1호 · 지급사유 · PDF p.32',
            text: '암 진단뿐 아니라 주요치료 시행 여부를 확인해요.',
          },
        ],
      },
    ],
    references: ['보험약관 제11조 제1호, PDF p.32'],
    reason: '암 진단만으로 치료비가 지급된다고\n이해할 가능성이 있어 지급 조건을 점검해요.',
  },
  'mock-predicted-1': {
    basis: '약관 근거 기반',
    sections: [
      {
        label: '관련 약관',
        entries: [
          {
            id: 'mock-treatment-clause',
            title: '암 주요치료의 보장 범위',
            text: '보장 대상에 포함되는 치료와 제외되는 항목을 확인해요.',
          },
        ],
      },
    ],
    references: [],
    reason: '치료의 목적에 따라 보장 대상이 달라지는지 점검해요.',
  },
};

function wait(signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, 550);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function createMockQuestionSelectionApi(scenario) {
  const failed = new Set();

  function failOnce(step) {
    if (scenario === step + '-error' && !failed.has(step)) {
      failed.add(step);
      throw new Error('Simulated question selection failure.');
    }
  }

  return {
    async list({ signal }) {
      await wait(signal);
      failOnce('list');
      const questions =
        scenario === 'empty'
          ? []
          : scenario === 'many'
            ? [...recommendations, ...extraQuestions]
            : recommendations;
      return { questions, customQuestions: [], selectedIds: [] };
    },
    async evidence({ questionId, signal }) {
      await wait(signal);
      failOnce('evidence');
      if (scenario === 'long-evidence') {
        return {
          mock: true,
          basis: '약관 근거 기반',
          sections: [{ label: '관련 약관', entries: longEvidenceFixture }],
          references: [],
          reason: '근거가 길 때 영역 안에서 스크롤할 수 있는지 확인하는 예시예요.',
        };
      }
      return Object.hasOwn(sampleEvidence, questionId)
        ? { ...sampleEvidence[questionId], mock: true }
        : null;
    },
    async validate({ text, questionId, questions, signal }) {
      await wait(signal);
      failOnce('validation');
      const scenarioReason =
        Object.hasOwn(validationScenarios, scenario) && validationScenarios[scenario];
      const duplicate = questions.some(
        (question) => question.id !== questionId && question.text === text,
      );
      return { reason: scenarioReason || (duplicate ? 'duplicate' : null) };
    },
    async save({ signal }) {
      await wait(signal);
      failOnce('save');
    },
  };
}
