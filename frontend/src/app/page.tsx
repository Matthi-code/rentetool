'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getCases, createCase } from '@/lib/api';
import { formatDatum, getToday } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import type { Case } from '@/lib/types';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadCases();
    }
  }, [user, authLoading, router]);

  async function loadCases() {
    try {
      const data = await getCases();
      setCases(data);
    } catch (err) {
      setError('Kon cases niet laden. Is de backend gestart?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCase() {
    if (!newCaseName.trim()) return;

    setIsCreating(true);
    try {
      const newCase = await createCase({
        naam: newCaseName.trim(),
        einddatum: getToday(),
        strategie: 'A',
      });
      setCases([newCase, ...cases]);
      setNewCaseName('');
      setDialogOpen(false);
      router.push(`/case/${newCase.id}`);
    } catch (err) {
      setError('Kon case niet aanmaken');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container py-8 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-3">⟳</div>
            <div className="text-muted-foreground">
              {authLoading ? 'Authenticatie controleren...' : 'Zaken laden...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto px-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary leading-tight">Uw Zaken</h1>
          <p className="text-muted-foreground mt-1">
            {cases.length === 0
              ? 'Maak uw eerste renteberekening aan'
              : `${cases.length} ${cases.length === 1 ? 'zaak' : 'zaken'} in beheer`}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-sm shrink-0">
              <span className="mr-2">+</span> Nieuwe Zaak
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Nieuwe Zaak Aanmaken</DialogTitle>
              <DialogDescription>
                Voer een naam in voor de nieuwe zaak (bijv. klantnaam of zaaknummer).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Zaaknaam</label>
              <Input
                placeholder="Bijv. Jansen/De Vries of 2024-001"
                value={newCaseName}
                onChange={(e) => setNewCaseName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCase()}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleCreateCase} disabled={isCreating || !newCaseName.trim()}>
                {isCreating ? 'Aanmaken...' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start de backend met: <code className="bg-muted px-1 rounded">uvicorn app.main:app --reload</code>
            </p>
          </CardContent>
        </Card>
      )}

      {cases.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl text-primary">+</span>
            </div>
            <h3 className="font-serif text-xl font-semibold text-primary mb-2">
              Nog geen zaken
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Begin met het aanmaken van uw eerste zaak om wettelijke rente te berekenen.
            </p>
            <Button size="lg" onClick={() => setDialogOpen(true)}>
              <span className="mr-2 text-lg">+</span> Nieuwe Zaak Aanmaken
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary hover:shadow-md transition-all group flex flex-col"
              onClick={() => router.push(`/case/${c.id}`)}
            >
              <CardHeader className="pb-3 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="font-serif text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {c.naam}
                  </CardTitle>
                  <Badge variant="secondary" className="shrink-0 text-xs mt-0.5">
                    {c.strategie}
                  </Badge>
                </div>
                {c.klant_referentie && (
                  <CardDescription className="text-xs mt-1">
                    Ref: {c.klant_referentie}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <div className="grid grid-cols-2 gap-4 text-sm border-t pt-3">
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Einddatum</span>
                    <span className="font-medium">{formatDatum(c.einddatum)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">Aangemaakt</span>
                    <span className="font-medium">{formatDatum(c.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
