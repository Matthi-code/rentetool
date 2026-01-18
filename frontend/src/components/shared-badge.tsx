'use client';

import { Badge } from '@/components/ui/badge';
import type { CaseShareInfo } from '@/lib/types';

interface SharedBadgeProps {
  sharing?: CaseShareInfo;
}

export function SharedBadge({ sharing }: SharedBadgeProps) {
  if (!sharing?.is_shared) return null;

  if (sharing.is_owner) {
    // Owner - show how many people it's shared with
    const count = sharing.shared_with.length;
    return (
      <Badge
        variant="secondary"
        className="text-xs"
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
        className={`text-xs ${isReadOnly ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}
        title={`Gedeeld door ${sharing.shared_by?.email || 'onbekend'} - ${permissionTitle}`}
      >
        Van {sharedByName} {permissionLabel}
      </Badge>
    );
  }
}
