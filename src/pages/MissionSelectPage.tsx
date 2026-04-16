import { DesktopWarning } from '../components/ui/DesktopWarning';
import { MissionCard } from '../components/ui/MissionCard';
import { VintagePanel } from '../components/ui/VintagePanel';
import type { MissionCardModel } from './types';

const defaultMissions: MissionCardModel[] = [
  {
    id: 'office-mail-001',
    title: '긴급 메일 발송',
    brief: '첨부를 넣고 CC를 정리한 뒤 진짜 보안 경고만 처리하고 전송하세요.',
    difficulty: 'easy',
    timeLimitSec: 120,
    estimatedPlayMinutes: 2,
    recommended: true,
  },
  {
    id: 'merge-conflict-001',
    title: '퇴근 전 긴급 푸시',
    brief: '가짜 업데이트 창을 무시하고 머지 충돌 2건을 해결해 푸시하세요.',
    difficulty: 'normal',
    timeLimitSec: 150,
    estimatedPlayMinutes: 3,
  },
];

type MissionSelectPageProps = {
  missions?: MissionCardModel[];
  onSelectMission?: (missionId: string) => void;
};

export function MissionSelectPage({ missions = defaultMissions, onSelectMission }: MissionSelectPageProps) {
  return (
    <main className="page-shell">
      <DesktopWarning />
      <header className="page-header">
        <p className="page-header__eyebrow">Mission Select</p>
        <h1>오늘 처리할 혼돈을 고르세요</h1>
        <p>추천 순서 → 난이도 → 제목 순으로 정렬된 미션입니다. 모든 카드는 데스크톱 기준 정보 밀도를 유지합니다.</p>
      </header>

      <VintagePanel title="미션 목록" eyebrow="Playable missions" className="mission-grid-panel">
        <div className="mission-grid">
          {missions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} onSelect={onSelectMission} />
          ))}
        </div>
      </VintagePanel>
    </main>
  );
}
