import type { PopupCardModel } from '../../pages/types';
import { NeoBureauButton } from './NeoBureauButton';

type PopupStackProps = {
  popups: PopupCardModel[];
};

export function PopupStack({ popups }: PopupStackProps) {
  const sorted = [...popups].sort((a, b) => {
    if (a.tone === 'real' && b.tone !== 'real') return 1;
    if (a.tone !== 'real' && b.tone === 'real') return -1;
    return 0;
  });

  return (
    <div className="popup-stack" aria-label="활성 팝업 레이어">
      {sorted.map((popup) => (
        <article key={popup.id} className={`popup-window popup-window--${popup.tone}`}>
          <header className="popup-window__header">
            <strong>{popup.title}</strong>
          </header>
          <p className="popup-window__body">{popup.body}</p>
          <div className="popup-window__actions">
            <NeoBureauButton variant={popup.tone === 'real' ? 'danger' : 'secondary'}>
              {popup.actionLabel}
            </NeoBureauButton>
            {popup.secondaryLabel ? <NeoBureauButton variant="secondary">{popup.secondaryLabel}</NeoBureauButton> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
