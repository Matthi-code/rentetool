'use client';

import { Badge } from '@/components/ui/badge';
import type { CaseShareInfo } from '@/lib/types';

type FontSize = 'small' | 'medium' | 'large';

interface SharedBadgeProps {
  sharing?: CaseShareInfo;
  fontSize?: FontSize;
}

const badgeSizeClasses: Record<FontSize, string> = {
  small: 'text-[8px] px-1 py-0',
  medium: 'text-[10px] px-1.5 py-0',
  large: 'text-xs px-2 py-0.5',
};

export function SharedBadge({ sharing, fontSize = 'medium' }: SharedBadgeProps) {
  if (!sharing?.is_shared) return null;

  const sizeClass = badgeSizeClasses[fontSize];

  if (sharing.is_owner) {
    // Owner - show how many people it's shared with
    const count = sharing.shared_with.length;
    return (
      <Badge
        variant="secondary"
        className={sizeClass}
        title={`Gedeeld met ${count} ${count === 1 ? 'persoon' : 'personen'}`}
      >
        Gedeeld ({count})
      </Badge>
    );
  } else {
    // Recipient - show who shared it and permission
    const sharedByName = sharing.shared_by?.display_name || sharing.shared_by?.email?.split('@')[0] || 'iemand';
    const isReadOnly = sharing.my_permission !== 'edit';
    const permissionLabel = isReadOnly ? '👁' : '✏️';
    const permissionTitle = isReadOnly ? 'Alleen lezen' : 'Kan bewerken';

    return (
      <Badge
        variant="outline"
        className={`${sizeClass} ${isReadOnly ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}
        title={`Gedeeld door ${sharing.shared_by?.email || 'onbekend'} - ${permissionTitle}`}
      >
        Van {sharedByName} {permissionLabel}
      </Badge>
    );
  }
}
