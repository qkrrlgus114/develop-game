import { DesktopWarning } from '../components/ui/DesktopWarning';
import { NeoBureauButton } from '../components/ui/NeoBureauButton';
import { NeoBureauPanel } from '../components/ui/NeoBureauPanel';

export function LandingPage() {
  return (
    <main className="page-shell page-shell--landing">
      <DesktopWarning />
      <section className="hero-panel">
        <p className="hero-panel__eyebrow">Neo-Bureaucrat 업무 혼돈 시뮬레이터</p>
        <h1>Error Popup Hell</h1>
        <p className="hero-panel__lede">
          진짜 문제만 골라내서 업무를 끝내세요. 모든 팝업을 닫는 게임이 아니라,
          무엇을 무시하고 무엇을 해결해야 하는지 판단하는 게임입니다.
        </p>
        <div className="hero-panel__actions">
          <NeoBureauButton>게임 시작</NeoBureauButton>
          <NeoBureauButton variant="secondary">플레이 방법 보기</NeoBureauButton>
        </div>
      </section>

      <section className="three-column-grid" aria-label="핵심 규칙 요약">
        <NeoBureauPanel title="승리 조건" eyebrow="Rule 01">
          <p>핵심 체크리스트를 끝내고 실제 방해 요소를 처리하면 클리어입니다.</p>
        </NeoBureauPanel>
        <NeoBureauPanel title="오판 패널티" eyebrow="Rule 02">
          <p>가짜 팝업에 낚이면 시간 손실 또는 스트라이크가 누적됩니다.</p>
        </NeoBureauPanel>
        <NeoBureauPanel title="짧은 한 판" eyebrow="Rule 03">
          <p>한 세션은 약 2~3분, 데스크톱 브라우저에서 바로 다시 도전할 수 있습니다.</p>
        </NeoBureauPanel>
      </section>

      <section className="landing-bottom-grid">
        <NeoBureauPanel title="대표 미션 예시" eyebrow="Mission Preview">
          <ul className="bullet-list">
            <li>메일 첨부 전에 진짜 보안 경고만 처리하기</li>
            <li>가짜 업데이트 창을 무시하고 머지 충돌 해결하기</li>
          </ul>
        </NeoBureauPanel>
        <NeoBureauPanel title="실패 조건" eyebrow="Watch Out">
          <ul className="bullet-list">
            <li>제한 시간이 0초가 되면 즉시 실패</li>
            <li>스트라이크를 모두 소진하면 실패</li>
            <li>실제 방해 요소를 남긴 채 마지막 단계를 누르면 실패</li>
          </ul>
        </NeoBureauPanel>
      </section>
    </main>
  );
}
