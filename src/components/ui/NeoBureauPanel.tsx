import type { PropsWithChildren, ReactNode } from 'react';

type NeoBureauPanelProps = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function NeoBureauPanel({ title, eyebrow, actions, className, children }: NeoBureauPanelProps) {
  const classes = ['neo-bureau-panel'];

  if (className) {
    classes.push(className);
  }

  return (
    <section className={classes.join(' ')}>
      {(title || eyebrow || actions) && (
        <header className="neo-bureau-panel__header">
          <div>
            {eyebrow ? <p className="neo-bureau-panel__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="neo-bureau-panel__title">{title}</h2> : null}
          </div>
          {actions ? <div className="neo-bureau-panel__actions">{actions}</div> : null}
        </header>
      )}
      <div className="neo-bureau-panel__body">{children}</div>
    </section>
  );
}
