import { useHealth } from '@/hooks/useHealth';

export default function HomePage() {
  const { data, error, isPending, isError, refetch, isFetching } = useHealth();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">백엔드 연결 확인</h1>

      {isPending && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-500">
          서버 상태 확인 중…
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">서버 연결 실패</p>
          <p className="mt-1 text-sm">
            {error.status ? `[${error.status}] ` : ''}
            {error.message}
          </p>
        </div>
      )}

      {!isPending && !isError && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <p className="font-medium">서버 연결 성공</p>
          <pre className="mt-2 overflow-x-auto text-sm">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        다시 확인
      </button>
    </section>
  );
}
