'use client';

import { ProBadge } from './pro-badge';

interface TierLimitBannerProps {
  current: number;
  max: number | null;
  label: string;
  onUpgrade: () => void;
}

export function TierLimitBanner({ current, max, label, onUpgrade }: TierLimitBannerProps) {
  if (max === null) return null; // Unlimited

  const remaining = max - current;
  const atLimit = remaining <= 0;

  return (
    <div className={`text-xs flex items-center gap-1.5 ${atLimit ? 'text-amber-700' : 'text-muted-foreground'}`}>
      <span>
        {current} van {max} {label}
      </span>
      {atLimit && (
        <button
          onClick={onUpgrade}
          className="underline text-amber-700 hover:text-amber-800 font-medium inline-flex items-center gap-1"
        >
          <ProBadge /> Upgrade
        </button>
      )}
    </div>
  );
}
