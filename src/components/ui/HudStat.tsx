import type { ReactNode } from 'react';

type HudStatProps = {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'warning' | 'danger' | 'success';
};

export function HudStat({ label, value, tone = 'default' }: HudStatProps) {
  return (
    <div className={`hud-stat hud-stat--${tone}`}>
      <span className="hud-stat__label">{label}</span>
      <strong className="hud-stat__value">{value}</strong>
    </div>
  );
}
