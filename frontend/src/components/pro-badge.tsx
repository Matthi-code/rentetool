'use client';

import { Badge } from '@/components/ui/badge';

interface ProBadgeProps {
  className?: string;
}

export function ProBadge({ className = '' }: ProBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 font-semibold ${className}`}
    >
      PRO
    </Badge>
  );
}
