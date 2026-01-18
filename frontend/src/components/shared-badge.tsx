'use client';

import { Badge } from '@/components/ui/badge';
import type { CaseShareInfo } from '@/lib/types';

interface SharedBadgeProps {
  sharing?: CaseShareInfo;
  showPermission?: boolean;
}

export function SharedBadge({ sharing, showPermission = false }: SharedBadgeProps) {
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
    // Recipient - show who shared it
    const sharedByName = sharing.shared_by?.display_name || sharing.shared_by?.email?.split('@')[0] || 'iemand';
    const permissionText = sharing.my_permission === 'edit' ? '' : ' (alleen lezen)';

    return (
      <Badge
        variant="outline"
        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
        title={`Gedeeld door ${sharing.shared_by?.email || 'onbekend'}${permissionText}`}
      >
        Van {sharedByName}
        {showPermission && permissionText}
      </Badge>
    );
  }
}
