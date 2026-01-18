'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCases, createCase, deleteCase, leaveSharedCase } from '@/lib/api';
import { formatDatum, getToday } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { SharedBadge } from '@/components/shared-badge';
import type { Case } from '@/lib/types';

type ViewMode = 'cards' | 'table';
type SortField = 'naam' | 'einddatum' | 'created_at' | 'vorderingen_count' | 'deelbetalingen_count';
type SortDirection = 'asc' | 'desc';
type OwnershipFilter = 'all' | 'own' | 'shared';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // View mode (persisted in localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [viewModeLoaded, setViewModeLoaded] = useState(false);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Leave shared case state
  const [leaveConfirmId, setLeaveConfirmId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // Load view mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('casesViewMode') as ViewMode | null;
    if (saved === 'cards' || saved === 'table') {
      setViewMode(saved);
    }
    setViewModeLoaded(true);
  }, []);

  // Persist view mode to localStorage
  useEffect(() => {
    if (viewModeLoaded) {
      localStorage.setItem('casesViewMode', viewMode);
    }
  }, [viewMode, viewModeLoaded]);

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

  async function handleDeleteCase(id: string) {
    setIsDeleting(true);
    try {
      await deleteCase(id);
      setCases(cases.filter(c => c.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      setError('Kon case niet verwijderen');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleLeaveCase(id: string) {
    setIsLeaving(true);
    try {
      await leaveSharedCase(id);
      setCases(cases.filter(c => c.id !== id));
      setLeaveConfirmId(null);
    } catch (err) {
      setError('Kon deling niet beëindigen');
      console.error(err);
    } finally {
      setIsLeaving(false);
    }
  }

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-muted-foreground/30 ml-1">↕</span>;
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Filtered and sorted cases
  const filteredCases = useMemo(() => {
    let result = cases;

    // Ownership filter
    if (ownershipFilter === 'own') {
      result = result.filter(c => c.sharing?.is_owner !== false);
    } else if (ownershipFilter === 'shared') {
      result = result.filter(c => c.sharing?.is_owner === false);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.naam.toLowerCase().includes(q) ||
        c.klant_referentie?.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [cases, searchQuery, ownershipFilter, sortField, sortDirection]);

  // Count of shared cases for badge
  const sharedCount = useMemo(() => {
    return cases.filter(c => c.sharing?.is_owner === false).length;
  }, [cases]);

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
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

      {/* Toolbar */}
      {cases.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            <Input
              placeholder="Zoek op naam of referentie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Ownership filter */}
          <Select value={ownershipFilter} onValueChange={(v) => setOwnershipFilter(v as OwnershipFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle zaken</SelectItem>
              <SelectItem value="own">Mijn zaken</SelectItem>
              <SelectItem value="shared">
                Gedeeld met mij {sharedCount > 0 && `(${sharedCount})`}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none px-3"
              onClick={() => setViewMode('cards')}
              title="Kaartweergave"
            >
              ▤
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none px-3"
              onClick={() => setViewMode('table')}
              title="Tabelweergave"
            >
              ☰
            </Button>
          </div>
        </div>
      )}

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
      ) : filteredCases.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Geen zaken gevonden voor &quot;{searchQuery}&quot;
            </p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => setSearchQuery('')}
            >
              Zoekopdracht wissen
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* Card View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCases.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary hover:shadow-md transition-all group flex flex-col"
              onClick={() => router.push(`/case/${c.id}`)}
            >
              <CardHeader className="pb-3 flex-1">
                <CardTitle className="font-serif text-lg leading-snug group-hover:text-primary transition-colors">
                  {c.naam}
                </CardTitle>
                {c.klant_referentie && (
                  <CardDescription className="text-xs mt-1">
                    Ref: {c.klant_referentie}
                  </CardDescription>
                )}
                <div className="flex gap-1.5 flex-wrap mt-2">
                  <Badge variant="outline" className="text-xs" title="Vorderingen">
                    {c.vorderingen_count ?? 0} V
                  </Badge>
                  <Badge variant="outline" className="text-xs" title="Betalingen">
                    {c.deelbetalingen_count ?? 0} B
                  </Badge>
                  <SharedBadge sharing={c.sharing} />
                </div>
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
      ) : (
        /* Table View */
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead
                    className="cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('naam')}
                  >
                    Naam <SortIndicator field="naam" />
                  </TableHead>
                  <TableHead>Referentie</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/80 select-none text-center"
                    onClick={() => handleSort('vorderingen_count')}
                  >
                    Vord. <SortIndicator field="vorderingen_count" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/80 select-none text-center"
                    onClick={() => handleSort('deelbetalingen_count')}
                  >
                    Bet. <SortIndicator field="deelbetalingen_count" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('einddatum')}
                  >
                    Einddatum <SortIndicator field="einddatum" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    Aangemaakt <SortIndicator field="created_at" />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px] text-center">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push(`/case/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.naam}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.klant_referentie || '-'}
                    </TableCell>
                    <TableCell className="text-center">{c.vorderingen_count ?? 0}</TableCell>
                    <TableCell className="text-center">{c.deelbetalingen_count ?? 0}</TableCell>
                    <TableCell>{formatDatum(c.einddatum)}</TableCell>
                    <TableCell>{formatDatum(c.created_at)}</TableCell>
                    <TableCell>
                      <SharedBadge sharing={c.sharing} />
                    </TableCell>
                    <TableCell className="text-center">
                      {c.sharing?.is_owner === false ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeaveConfirmId(c.id);
                          }}
                          title="Niet meer volgen"
                        >
                          ✕
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(c.id);
                          }}
                          title="Verwijderen"
                        >
                          🗑
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Zaak Verwijderen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u deze zaak wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteCase(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Verwijderen...' : 'Verwijderen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Shared Case Confirmation Dialog */}
      <Dialog open={leaveConfirmId !== null} onOpenChange={(open) => !open && setLeaveConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Niet Meer Volgen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u deze gedeelde zaak niet meer wilt volgen?
              De eigenaar behoudt toegang en kan de zaak opnieuw met u delen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLeaveConfirmId(null)}>
              Annuleren
            </Button>
            <Button
              variant="default"
              onClick={() => leaveConfirmId && handleLeaveCase(leaveConfirmId)}
              disabled={isLeaving}
            >
              {isLeaving ? 'Bezig...' : 'Niet meer volgen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
