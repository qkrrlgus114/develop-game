import type { RunChecklistItem } from '../../pages/types';
import { NeoBureauPanel } from './NeoBureauPanel';

type ChecklistPanelProps = {
  items: RunChecklistItem[];
};

export function ChecklistPanel({ items }: ChecklistPanelProps) {
  return (
    <NeoBureauPanel title="오늘의 체크리스트" eyebrow="Run HUD" className="checklist-panel">
      <ol className="checklist-panel__list">
        {items.map((item) => (
          <li key={item.id} className={`checklist-panel__item checklist-panel__item--${item.status}`}>
            <span aria-hidden="true" className="checklist-panel__marker">
              {item.status === 'done' ? '■' : item.status === 'current' ? '▶' : '□'}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ol>
    </NeoBureauPanel>
  );
}
