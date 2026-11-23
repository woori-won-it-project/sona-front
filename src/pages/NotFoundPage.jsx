import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="space-y-4 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <Link to="/" className="inline-block text-indigo-600 hover:underline">
        홈으로 돌아가기
      </Link>
    </section>
  );
}
