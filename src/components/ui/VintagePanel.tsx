import type { PropsWithChildren, ReactNode } from 'react';

type VintagePanelProps = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function VintagePanel({ title, eyebrow, actions, className, children }: VintagePanelProps) {
  const classes = ['vintage-panel'];

  if (className) {
    classes.push(className);
  }

  return (
    <section className={classes.join(' ')}>
      {(title || eyebrow || actions) && (
        <header className="vintage-panel__header">
          <div>
            {eyebrow ? <p className="vintage-panel__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="vintage-panel__title">{title}</h2> : null}
          </div>
          {actions ? <div className="vintage-panel__actions">{actions}</div> : null}
        </header>
      )}
      <div className="vintage-panel__body">{children}</div>
    </section>
  );
}
