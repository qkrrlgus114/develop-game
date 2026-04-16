import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type VintageButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger';
    fullWidth?: boolean;
  }
>;

export function VintageButton({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  ...props
}: VintageButtonProps) {
  const classes = ['vintage-button', `vintage-button--${variant}`];

  if (fullWidth) {
    classes.push('vintage-button--full-width');
  }

  if (className) {
    classes.push(className);
  }

  return (
    <button className={classes.join(' ')} {...props}>
      <span className="vintage-button__label">{children}</span>
    </button>
  );
}
