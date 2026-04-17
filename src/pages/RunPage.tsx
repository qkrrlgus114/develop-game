import { ChecklistPanel } from '../components/ui/ChecklistPanel';
import { DesktopWarning } from '../components/ui/DesktopWarning';
import { HudStat } from '../components/ui/HudStat';
import { PopupStack } from '../components/ui/PopupStack';
import { NeoBureauButton } from '../components/ui/NeoBureauButton';
import { NeoBureauPanel } from '../components/ui/NeoBureauPanel';
import type { PopupCardModel, RunChecklistItem } from './types';

const defaultChecklist: RunChecklistItem[] = [
  { id: 'step-1', label: '첨부 파일 이름 점검', status: 'done' },
  { id: 'step-2', label: 'CC 대상 검토', status: 'current' },
  { id: 'step-3', label: '메일 전송', status: 'locked' },
];

const defaultPopups: PopupCardModel[] = [
  {
    id: 'popup-1',
    title: '백신 경고: 첨부파일 검역 필요',
    body: '실제 방해 요소입니다. 검역 확인을 완료해야 메일 전송 단계가 열립니다.',
    tone: 'real',
    actionLabel: '검역 확인',
    secondaryLabel: '나중에',
  },
  {
    id: 'popup-2',
    title: '지금 바로 무료 폰트 팩 설치!',
    body: '가짜 팝업입니다. 닫고 업무에 집중하세요.',
    tone: 'fake',
    actionLabel: '닫기',
  },
];

type RunPageProps = {
  checklist?: RunChecklistItem[];
  popups?: PopupCardModel[];
};

export function RunPage({ checklist = defaultChecklist, popups = defaultPopups }: RunPageProps) {
  return (
    <main className="page-shell page-shell--run">
      <DesktopWarning />
      <header className="page-header page-header--compact">
        <div>
          <p className="page-header__eyebrow">Run / office-mail-001</p>
          <h1>긴급 메일 발송</h1>
        </div>
        <NeoBureauButton variant="secondary">미션 포기</NeoBureauButton>
      </header>

      <section className="run-layout" aria-label="플레이 화면">
        <aside className="run-layout__sidebar">
          <div className="hud-grid" aria-label="미션 HUD">
            <HudStat label="남은 시간" value="01:12" tone="warning" />
            <HudStat label="스트라이크" value="1 / 3" tone="danger" />
            <HudStat label="카오스" value="62%" tone="warning" />
            <HudStat label="실제 방해" value="1건 활성" tone="success" />
          </div>
          <ChecklistPanel items={checklist} />
        </aside>

        <section className="run-layout__workspace" aria-label="업무 작업 영역">
          <NeoBureauPanel title="메일 작성 창" eyebrow="Workspace" className="workspace-panel">
            <div className="workspace-mail-form">
              <label>
                받는 사람
                <input value="boss@corp.example" readOnly aria-readonly="true" />
              </label>
              <label>
                참조
                <input value="design@corp.example" readOnly aria-readonly="true" />
              </label>
              <label>
                제목
                <input value="[긴급] 오늘 안건 공유" readOnly aria-readonly="true" />
              </label>
              <label>
                본문
                <textarea readOnly aria-readonly="true" value={'자료 정리 완료. 첨부 확인 후 전송 예정입니다.'} />
              </label>
            </div>
            <div className="workspace-panel__actions">
              <NeoBureauButton>현재 단계 완료</NeoBureauButton>
              <NeoBureauButton variant="secondary">가짜 팝업 무시 연습</NeoBureauButton>
            </div>
          </NeoBureauPanel>
          <PopupStack popups={popups} />
        </section>
      </section>
    </main>
  );
}
