'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatBedrag } from '@/lib/format';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface BikDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (bik: number) => void;
}

export function BikDialog({ open, onOpenChange, onApply }: BikDialogProps) {
  const [hoofdsom, setHoofdsom] = useState('');
  const [bik, setBik] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBerekenen() {
    if (!hoofdsom || parseFloat(hoofdsom) <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/bik/bereken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoofdsom: parseFloat(hoofdsom) }),
      });
      if (!response.ok) throw new Error('Berekening mislukt');
      const data = await response.json();
      setBik(data.bik);
    } catch {
      setError('BIK berekening mislukt');
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (bik !== null) {
      onApply(bik);
      handleClose();
    }
  }

  function handleClose() {
    setHoofdsom('');
    setBik(null);
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>BIK Berekenen</DialogTitle>
          <DialogDescription>
            Bereken buitengerechtelijke incassokosten conform het Besluit vergoeding BIK.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <label className="text-sm font-medium">Hoofdsom</label>
            <Input
              type="number"
              step="0.01"
              value={hoofdsom}
              onChange={(e) => { setHoofdsom(e.target.value); setBik(null); }}
              placeholder="Bijv. 5000.00"
              onKeyDown={(e) => { if (e.key === 'Enter') handleBerekenen(); }}
            />
          </div>
          {bik !== null && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Berekende BIK</div>
              <div className="text-2xl font-bold font-mono mt-1">{formatBedrag(bik)}</div>
              <div className="text-xs text-muted-foreground mt-2">
                Staffel: 15% over eerste €2.500, 10% over volgende €2.500, 5% over volgende €5.000, 1% over volgende €190.000, 0,5% daarboven. Min. €40, max. €6.775.
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Annuleren</Button>
          {bik === null ? (
            <Button onClick={handleBerekenen} disabled={loading || !hoofdsom || parseFloat(hoofdsom) <= 0}>
              {loading ? 'Berekenen...' : 'Bereken BIK'}
            </Button>
          ) : (
            <Button onClick={handleApply}>
              Toevoegen als kostenpost
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
