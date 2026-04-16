import type { MissionCardModel } from '../../pages/types';
import { VintageButton } from './VintageButton';
import { VintagePanel } from './VintagePanel';

type MissionCardProps = {
  mission: MissionCardModel;
  onSelect?: (missionId: string) => void;
};

export function MissionCard({ mission, onSelect }: MissionCardProps) {
  return (
    <VintagePanel
      className="mission-card"
      eyebrow={mission.recommended ? '추천 미션' : '업무 미션'}
      title={mission.title}
    >
      <p className="mission-card__brief">{mission.brief}</p>
      <dl className="mission-card__meta" aria-label={`${mission.title} 메타 정보`}>
        <div>
          <dt>난이도</dt>
          <dd>{mission.difficulty}</dd>
        </div>
        <div>
          <dt>제한 시간</dt>
          <dd>{mission.timeLimitSec}초</dd>
        </div>
        <div>
          <dt>예상 플레이</dt>
          <dd>{mission.estimatedPlayMinutes}분</dd>
        </div>
      </dl>
      <VintageButton fullWidth onClick={() => onSelect?.(mission.id)}>
        이 미션 플레이
      </VintageButton>
    </VintagePanel>
  );
}
