import { Link } from 'react-router';
import homeBlue from '@/assets/document-registration/home-blue.svg';
import homeWhite from '@/assets/document-registration/home-white.svg';
import reportIcon from '@/assets/document-registration/report.svg';
import wave from '@/assets/document-registration/wave.svg';
import './reviewWorkspace.css';

function Destination({ to, className, children }) {
  return to ? (
    <Link className={className} to={to}>
      {children}
    </Link>
  ) : (
    <button className={className} type="button" disabled>
      {children}
    </button>
  );
}

export default function ReviewWorkspaceLayout({ children, homePath, reportPath }) {
  return (
    <div className="@container bg-white lg:grid lg:min-h-dvh lg:place-items-center">
      <div className="review-workspace min-h-dvh bg-[#f7f9fc] font-['Pretendard',sans-serif] text-[#172b4d] lg:grid lg:min-h-[calc(780*var(--review-pixel))] lg:w-[calc(1280*var(--review-pixel))] lg:grid-cols-[calc(212*var(--review-pixel))_minmax(0,1fr)]">
        <aside className="relative overflow-hidden bg-[linear-gradient(97.92deg,#004c80_9.45%,#0067ac_88.19%)] px-[calc(12*var(--review-pixel))] text-white">
          <p className="px-[calc(12*var(--review-pixel))] pt-[calc(30*var(--review-pixel))] text-[length:calc(25*var(--review-pixel))] leading-[calc(30*var(--review-pixel))] font-bold">
            Sona
          </p>
          <nav
            aria-label="검수 메뉴"
            className="relative z-10 mt-3 flex gap-2 pb-3 lg:mt-[calc(44*var(--review-pixel))] lg:grid"
          >
            <Destination
              to={homePath}
              className="flex min-h-[calc(46*var(--review-pixel))] items-center gap-[calc(14*var(--review-pixel))] rounded-[calc(8*var(--review-pixel))] bg-white/12 px-[calc(14*var(--review-pixel))] text-left text-[length:calc(16*var(--review-pixel))] font-bold"
            >
              <img
                src={homeWhite}
                alt=""
                width={20}
                height={20}
                className="h-auto w-[calc(20*var(--review-pixel))]"
              />
              검수 홈
            </Destination>
            <Destination
              to={reportPath}
              className="flex min-h-[calc(46*var(--review-pixel))] items-center gap-[calc(14*var(--review-pixel))] rounded-[calc(8*var(--review-pixel))] px-[calc(14*var(--review-pixel))] text-left text-[length:calc(16*var(--review-pixel))] font-medium text-[#e2e8f0]"
            >
              <img
                src={reportIcon}
                alt=""
                width={20}
                height={20}
                className="h-auto w-[calc(20*var(--review-pixel))]"
              />
              분석 리포트
            </Destination>
          </nav>
          <img
            src={wave}
            alt=""
            width={292}
            className="pointer-events-none absolute bottom-[calc(20*var(--review-pixel))] left-1/2 hidden w-[calc(292*var(--review-pixel))] max-w-none -translate-x-1/2 lg:block"
          />
        </aside>
        <div className="min-w-0">
          <header className="flex h-[calc(57*var(--review-pixel))] items-start justify-end border-b border-[#e2e8f0] px-4 pt-[calc(4*var(--review-pixel))] lg:pr-[calc(34*var(--review-pixel))]">
            <Destination
              to={homePath}
              className="flex h-[calc(44*var(--review-pixel))] w-[calc(132*var(--review-pixel))] items-center gap-[calc(6*var(--review-pixel))] px-[calc(12*var(--review-pixel))] text-[length:calc(13*var(--review-pixel))] leading-[calc(20*var(--review-pixel))] whitespace-nowrap text-[#0067ac]"
            >
              <img
                src={homeBlue}
                alt=""
                width={18}
                height={18}
                className="h-auto w-[calc(18*var(--review-pixel))]"
              />
              홈으로 돌아가기
            </Destination>
          </header>
          <main className="px-4 pt-[calc(19*var(--review-pixel))] pb-[calc(32*var(--review-pixel))] sm:px-6 lg:pr-[calc(48*var(--review-pixel))] lg:pl-[calc(40*var(--review-pixel))]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
