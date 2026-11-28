import { Link } from 'react-router';
import { usePersonaExperiment } from '@/hooks/usePersonaExperiment';
import { answerLabels, hasSavedExperimentResults } from '@/pages/personaConfigurationState';

function ReportPreview({ reviewId, experimentId }) {
  const { experiment } = usePersonaExperiment({
    reviewId,
    experimentId,
    mock: true,
    scenario: 'handoff',
  });
  const result = experiment.data;
  if (experiment.isPending) return <p role="status">목업 실험을 불러오고 있어요.</p>;
  if (experiment.isError || !hasSavedExperimentResults(result)) {
    return <p role="alert">완료된 목업 실험을 확인할 수 없어요.</p>;
  }
  const { selection, questions, targetDocuments, revisedDocuments, settings } = result.conditions;
  const revisedGuide = revisedDocuments.find(
    ({ documentType }) => documentType === 'PRODUCT_GUIDE',
  );
  const rerunDocuments = targetDocuments.map((document) =>
    document.documentType === revisedGuide?.documentType ? revisedGuide : document,
  );
  const versions = (documents) =>
    documents.map(({ documentType, version }) => `${documentType} v${version}`).join(' · ');
  return (
    <>
      <p>
        전달값 {reviewId} / {experimentId}
      </p>
      <details className="mt-4">
        <summary>최초 조건과 재실험 인계 확인</summary>
        <p>선택 특성 {Object.values(selection).flat().join(' · ')}</p>
        <p>최초 설정 {settings.experimentType}</p>
        <ol className="list-decimal pl-5">
          {questions.map(({ questionId, questionText, referenceAnswer }) => (
            <li key={questionId}>
              {questionText} {answerLabels[referenceAnswer]}
            </li>
          ))}
        </ol>
        <p>최초 대상 문서 {versions(targetDocuments)}</p>
        <p>재실험 후보 문서 {versions(rerunDocuments)}</p>
        <p>
          재실험에도 위 특성, 문항, 기준답안을 사용합니다. 이 미리보기에서는 실험을 실행하지
          않습니다.
        </p>
      </details>
    </>
  );
}

export default function PersonaHandoffDemo({ reviewId, destination, experimentId, resumePath }) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-8 text-[#172b4d]">
      <h1 className="text-xl font-semibold">
        07번 목업 인계 · {destination === 'report' ? '08 연결 확인' : '02 연결 확인'}
      </h1>
      {destination === 'report' && experimentId && (
        <ReportPreview reviewId={reviewId} experimentId={Number(experimentId)} />
      )}
      <Link className="font-semibold text-[#0067ac] underline" to={resumePath}>
        검수 이어하기
      </Link>
    </main>
  );
}
