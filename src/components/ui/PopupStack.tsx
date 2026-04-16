import type { PopupCardModel } from '../../pages/types';
import { VintageButton } from './VintageButton';

type PopupStackProps = {
  popups: PopupCardModel[];
};

export function PopupStack({ popups }: PopupStackProps) {
  return (
    <div className="popup-stack" aria-label="활성 팝업 레이어">
      {popups.map((popup) => (
        <article key={popup.id} className={`popup-window popup-window--${popup.tone}`}>
          <header className="popup-window__header">
            <strong>{popup.title}</strong>
            <span className="popup-window__badge">{popup.tone === 'real' ? '실제 방해' : '가짜 팝업'}</span>
          </header>
          <p className="popup-window__body">{popup.body}</p>
          <div className="popup-window__actions">
            <VintageButton variant={popup.tone === 'real' ? 'danger' : 'secondary'}>
              {popup.actionLabel}
            </VintageButton>
            {popup.secondaryLabel ? <VintageButton variant="secondary">{popup.secondaryLabel}</VintageButton> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
