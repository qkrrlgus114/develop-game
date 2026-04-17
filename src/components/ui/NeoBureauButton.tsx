import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type NeoBureauButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger';
    fullWidth?: boolean;
  }
>;

export function NeoBureauButton({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  ...props
}: NeoBureauButtonProps) {
  const classes = ['neo-bureau-button', `neo-bureau-button--${variant}`];

  if (fullWidth) {
    classes.push('neo-bureau-button--full-width');
  }

  if (className) {
    classes.push(className);
  }

  return (
    <button className={classes.join(' ')} {...props}>
      <span className="neo-bureau-button__label">{children}</span>
    </button>
  );
}
