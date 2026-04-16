import { DesktopWarning } from '../components/ui/DesktopWarning';
import { VintageButton } from '../components/ui/VintageButton';
import { VintagePanel } from '../components/ui/VintagePanel';

export function HowToPlayPage() {
  return (
    <main className="page-shell">
      <DesktopWarning />
      <header className="page-header">
        <p className="page-header__eyebrow">How to Play</p>
        <h1>무시해야 할 팝업과 해결해야 할 방해 요소를 구분하세요</h1>
        <p>
          색상만 보지 말고 문맥을 읽으세요. 실제 방해 요소는 미션 진행을 막고, 가짜 팝업은
          여러분의 집중력만 흔듭니다.
        </p>
      </header>

      <section className="two-column-grid">
        <VintagePanel title="실제 방해 요소" eyebrow="Real blocker">
          <ul className="bullet-list">
            <li>필수 단계 진행을 막는 오류 또는 승인 요청</li>
            <li>방치하면 시간 손실, 블로킹, 즉시 실패로 이어지는 항목</li>
            <li>정답 액션이 미션 문맥과 연결됨</li>
          </ul>
        </VintagePanel>
        <VintagePanel title="가짜 팝업" eyebrow="Fake popup">
          <ul className="bullet-list">
            <li>과장된 경고, 쓸모없는 업데이트, 주의 분산용 모달</li>
            <li>대부분 무시 또는 닫기가 정답</li>
            <li>섣부르게 눌렀을 때 시간 손실이나 스트라이크 발생</li>
          </ul>
        </VintagePanel>
      </section>

      <section className="three-column-grid">
        <VintagePanel title="승리" eyebrow="Goal">
          <p>체크리스트를 완료하고 필수 실제 방해 요소를 모두 해결하세요.</p>
        </VintagePanel>
        <VintagePanel title="실패" eyebrow="Fail states">
          <p>시간 초과, 스트라이크 초과, 또는 실제 방해 요소 미처리 상태로 마지막 단계 시도.</p>
        </VintagePanel>
        <VintagePanel title="힌트" eyebrow="Beginner aid">
          <p>쉬움 미션은 초반 힌트 문구를 제공해 첫 세션에서 규칙을 이해하도록 돕습니다.</p>
        </VintagePanel>
      </section>

      <div className="page-actions">
        <VintageButton>미션 선택으로 이동</VintageButton>
      </div>
    </main>
  );
}
