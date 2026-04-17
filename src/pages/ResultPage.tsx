import { DesktopWarning } from '../components/ui/DesktopWarning';
import { NeoBureauButton } from '../components/ui/NeoBureauButton';
import { NeoBureauPanel } from '../components/ui/NeoBureauPanel';
import type { ResultSummary } from './types';

const defaultSummary: ResultSummary = {
  title: '긴급 메일 발송',
  cleared: true,
  grade: 'A',
  timeLeftSec: 18,
  mistakes: 1,
  resolvedBlockers: 2,
};

type ResultPageProps = {
  summary?: ResultSummary;
};

export function ResultPage({ summary = defaultSummary }: ResultPageProps) {
  return (
    <main className="page-shell">
      <DesktopWarning />
      <header className="page-header">
        <p className="page-header__eyebrow">Run Result</p>
        <h1>{summary.cleared ? '업무 완료!' : '오늘의 혼돈은 패배했습니다'}</h1>
        <p>
          {summary.cleared
            ? '진짜 방해 요소만 골라 처리하며 체크리스트를 마쳤습니다.'
            : summary.lastFailureReason ?? '실패 원인을 확인하고 바로 다시 시도하세요.'}
        </p>
      </header>

      <section className="result-grid">
        <NeoBureauPanel title="결과 요약" eyebrow="Summary">
          <dl className="result-stats" aria-label="결과 요약 통계">
            <div>
              <dt>등급</dt>
              <dd>{summary.grade}</dd>
            </div>
            <div>
              <dt>남은 시간</dt>
              <dd>{summary.timeLeftSec}초</dd>
            </div>
            <div>
              <dt>실수 횟수</dt>
              <dd>{summary.mistakes}회</dd>
            </div>
            <div>
              <dt>해결한 실제 방해</dt>
              <dd>{summary.resolvedBlockers}건</dd>
            </div>
          </dl>
        </NeoBureauPanel>
        <NeoBureauPanel title="회고 메모" eyebrow="Debrief">
          <ul className="bullet-list">
            <li>가짜 업데이트 팝업은 무시해도 진행 가능했습니다.</li>
            <li>실제 검역 경고를 늦게 처리하면 타이머 손실이 커집니다.</li>
            <li>다음 도전에서는 스트라이크를 0회로 유지해 S 등급을 노려보세요.</li>
          </ul>
        </NeoBureauPanel>
      </section>

      <div className="page-actions">
        <NeoBureauButton>같은 미션 다시 하기</NeoBureauButton>
        <NeoBureauButton variant="secondary">다른 미션 선택</NeoBureauButton>
      </div>
    </main>
  );
}
