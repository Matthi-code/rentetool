'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getColleagues, shareCase, unshareCase, getCaseShares, updateSharePermission } from '@/lib/api';
import type { Colleague, CaseShare } from '@/lib/types';

interface ShareCaseDialogProps {
  caseId: string;
  caseName: string;
  onShareChange?: () => void;
  children?: React.ReactNode;
}

export function ShareCaseDialog({ caseId, caseName, onShareChange, children }: ShareCaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [shares, setShares] = useState<CaseShare[]>([]);
  const [selectedColleague, setSelectedColleague] = useState<string>('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, caseId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [colleaguesData, sharesData] = await Promise.all([
        getColleagues(),
        getCaseShares(caseId),
      ]);
      setColleagues(colleaguesData);
      setShares(sharesData);
    } catch (err) {
      setError('Kon gegevens niet laden');
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!selectedColleague) return;

    setLoading(true);
    setError(null);
    try {
      await shareCase(caseId, {
        shared_with_user_id: selectedColleague,
        permission,
      });
      setSelectedColleague('');
      await loadData();
      onShareChange?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delen mislukt';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnshare(userId: string) {
    setLoading(true);
    try {
      await unshareCase(caseId, userId);
      await loadData();
      onShareChange?.();
    } catch (err) {
      setError('Verwijderen mislukt');
    } finally {
      setLoading(false);
    }
  }

  async function handlePermissionChange(userId: string, newPermission: 'view' | 'edit') {
    setLoading(true);
    try {
      await updateSharePermission(caseId, userId, newPermission);
      await loadData();
      onShareChange?.();
    } catch (err) {
      setError('Wijzigen mislukt');
    } finally {
      setLoading(false);
    }
  }

  // Filter out already shared colleagues
  const availableColleagues = colleagues.filter(
    c => !shares.some(s => s.shared_with_user_id === c.id)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            Delen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Zaak Delen</DialogTitle>
          <DialogDescription>
            Deel &quot;{caseName}&quot; met collega&apos;s van uw organisatie.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Current shares */}
        {shares.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Gedeeld met:</label>
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">
                      {share.shared_with_user?.display_name || share.shared_with_user?.email}
                    </span>
                  </div>
                  <Select
                    value={share.permission}
                    onValueChange={(v) => handlePermissionChange(share.shared_with_user_id, v as 'view' | 'edit')}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">Bekijken</SelectItem>
                      <SelectItem value="edit">Bewerken</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnshare(share.shared_with_user_id)}
                    disabled={loading}
                    className="shrink-0"
                  >
                    Verwijderen
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new share */}
        {availableColleagues.length > 0 ? (
          <div className="space-y-3">
            <label className="text-sm font-medium">Deel met collega:</label>
            <div className="flex gap-2">
              <Select value={selectedColleague} onValueChange={setSelectedColleague}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecteer collega..." />
                </SelectTrigger>
                <SelectContent>
                  {availableColleagues.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.display_name || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={permission} onValueChange={(v) => setPermission(v as 'view' | 'edit')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Bekijken</SelectItem>
                  <SelectItem value="edit">Bewerken</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : colleagues.length === 0 && !loading ? (
          <div className="p-4 bg-muted/50 rounded-md text-center">
            <p className="text-muted-foreground text-sm">
              Er zijn nog geen collega&apos;s van uw organisatie geregistreerd.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Nodig collega&apos;s uit om een account aan te maken met hetzelfde e-maildomein.
            </p>
          </div>
        ) : shares.length > 0 && availableColleagues.length === 0 ? (
          <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
            Deze zaak is al gedeeld met alle beschikbare collega&apos;s.
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Sluiten
          </Button>
          {selectedColleague && (
            <Button onClick={handleShare} disabled={loading}>
              {loading ? 'Delen...' : 'Delen'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
