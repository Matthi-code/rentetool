'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getCase,
  updateCase,
  createVordering,
  updateVordering,
  deleteVordering,
  createDeelbetaling,
  updateDeelbetaling,
  deleteDeelbetaling,
  berekenRente,
  createSnapshot,
  getSnapshotPdf,
  logUsage,
  leaveSharedCase,
} from '@/lib/api';
import { formatBedrag, formatBedragParts, formatDatum, formatPercentage, getToday } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { ShareCaseDialog } from '@/components/share-case-dialog';
import { SharedBadge } from '@/components/shared-badge';
import {
  RENTETYPE_LABELS,
  RENTETYPE_SHORT,
  STRATEGIE_LABELS,
  type ItemType,
  type CaseWithLines,
  type Vordering,
  type Deelbetaling,
  type BerekeningResponse,
} from '@/lib/types';

function VorderingenSummary({ vorderingen }: { vorderingen: Vordering[] }) {
  if (vorderingen.length === 0) {
    return (
      <p className="text-sm text-muted-foreground mt-1">
        Voeg vorderingen toe waarvoor rente berekend moet worden
      </p>
    );
  }
  const vorderingenCount = vorderingen.filter(v => v.item_type !== 'kosten').length;
  const kostenCount = vorderingen.filter(v => v.item_type === 'kosten').length;
  const parts: string[] = [];
  if (vorderingenCount > 0) parts.push(`${vorderingenCount} ${vorderingenCount === 1 ? 'vordering' : 'vorderingen'}`);
  if (kostenCount > 0) parts.push(`${kostenCount} ${kostenCount === 1 ? 'kostenpost' : 'kostenposten'}`);
  return (
    <p className="text-sm text-muted-foreground mt-1">
      {parts.join(', ')}
    </p>
  );
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseWithLines | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [result, setResult] = useState<BerekeningResponse | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Form states
  const [vorderingDialogOpen, setVorderingDialogOpen] = useState(false);
  const [deelbetalingDialogOpen, setDeelbetalingDialogOpen] = useState(false);

  // Edit states
  const [editingVordering, setEditingVordering] = useState<Vordering | null>(null);
  const [editingDeelbetaling, setEditingDeelbetaling] = useState<Deelbetaling | null>(null);

  // Local state for controlled inputs
  const [localReference, setLocalReference] = useState<string>('');
  const [localEinddatum, setLocalEinddatum] = useState<string>('');

  // Vordering form
  const [vorderingForm, setVorderingForm] = useState({
    item_type: 'vordering' as ItemType,
    kenmerk: '',
    bedrag: '',
    datum: getToday(),
    rentetype: 1,
    kosten: '0',
    kosten_rentedatum: '',
    opslag: '',
    opslag_ingangsdatum: '',
    pauze_start: '',
    pauze_eind: '',
  });

  // Deelbetaling form
  const [deelbetalingForm, setDeelbetalingForm] = useState({
    kenmerk: '',
    bedrag: '',
    datum: getToday(),
    aangewezen: [] as string[],
  });

  // Leave shared case state
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Loading states for save/delete operations
  const [savingVordering, setSavingVordering] = useState(false);
  const [savingDeelbetaling, setSavingDeelbetaling] = useState(false);
  const [deletingVorderingId, setDeletingVorderingId] = useState<string | null>(null);
  const [deletingDeelbetalingId, setDeletingDeelbetalingId] = useState<string | null>(null);

  // Sort state for vorderingen (default: oldest first)
  const [vorderingenSortOrder, setVorderingenSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pauze section expanded state
  const [pauzeExpanded, setPauzeExpanded] = useState(false);

  // Inline add states
  const [showInlineVordering, setShowInlineVordering] = useState(false);
  const [showInlineDeelbetaling, setShowInlineDeelbetaling] = useState(false);
  const [inlineVorderingForm, setInlineVorderingForm] = useState({
    item_type: 'vordering' as ItemType,
    kenmerk: '',
    bedrag: '',
    datum: getToday(),
    rentetype: 1,
    kosten: '',
  });
  const [inlineDeelbetalingForm, setInlineDeelbetalingForm] = useState({
    kenmerk: '',
    bedrag: '',
    datum: getToday(),
    aangewezen: [] as string[],
  });

  // Computed: Can the user edit this case?
  const isOwner = caseData?.sharing?.is_owner !== false;
  const canEdit = isOwner || caseData?.sharing?.my_permission === 'edit';

  const resetVorderingForm = () => {
    setVorderingForm({
      item_type: 'vordering',
      kenmerk: '',
      bedrag: '',
      datum: getToday(),
      rentetype: 1,
      kosten: '',
      kosten_rentedatum: '',
      opslag: '',
      opslag_ingangsdatum: '',
      pauze_start: '',
      pauze_eind: '',
    });
    setEditingVordering(null);
    setPauzeExpanded(false);
  };

  const resetDeelbetalingForm = () => {
    setDeelbetalingForm({
      kenmerk: '',
      bedrag: '',
      datum: getToday(),
      aangewezen: [],
    });
    setEditingDeelbetaling(null);
  };

  const resetInlineVorderingForm = () => {
    setInlineVorderingForm({
      item_type: 'vordering',
      kenmerk: '',
      bedrag: '',
      datum: getToday(),
      rentetype: 1,
      kosten: '',
    });
  };

  const resetInlineDeelbetalingForm = () => {
    setInlineDeelbetalingForm({
      kenmerk: '',
      bedrag: '',
      datum: getToday(),
      aangewezen: [],
    });
  };

  const cancelInlineVordering = () => {
    setShowInlineVordering(false);
    resetInlineVorderingForm();
  };

  const cancelInlineDeelbetaling = () => {
    setShowInlineDeelbetaling(false);
    resetInlineDeelbetalingForm();
  };

  async function handleSaveInlineVordering() {
    if (!caseData || savingVordering) return;
    if (!inlineVorderingForm.kenmerk || !inlineVorderingForm.bedrag || !inlineVorderingForm.datum) return;

    const data = {
      item_type: inlineVorderingForm.item_type,
      kenmerk: inlineVorderingForm.kenmerk,
      bedrag: parseFloat(inlineVorderingForm.bedrag),
      datum: inlineVorderingForm.datum,
      rentetype: inlineVorderingForm.rentetype,
      kosten: parseFloat(inlineVorderingForm.kosten) || 0,
    };

    setSavingVordering(true);
    try {
      const created = await createVordering(caseId, data);
      setCaseData({
        ...caseData,
        vorderingen: [...caseData.vorderingen, created],
      });
      cancelInlineVordering();
      setResult(null);
    } catch (err) {
      console.error(err);
      setError('Kon vordering niet opslaan');
    } finally {
      setSavingVordering(false);
    }
  }

  async function handleSaveInlineDeelbetaling() {
    if (!caseData || savingDeelbetaling) return;
    if (!inlineDeelbetalingForm.bedrag || !inlineDeelbetalingForm.datum) return;

    const data = {
      kenmerk: inlineDeelbetalingForm.kenmerk || undefined,
      bedrag: parseFloat(inlineDeelbetalingForm.bedrag),
      datum: inlineDeelbetalingForm.datum,
      aangewezen: inlineDeelbetalingForm.aangewezen,
    };

    setSavingDeelbetaling(true);
    try {
      const created = await createDeelbetaling(caseId, data);
      setCaseData({
        ...caseData,
        deelbetalingen: [...caseData.deelbetalingen, created],
      });
      cancelInlineDeelbetaling();
      setResult(null);
    } catch (err) {
      console.error(err);
      setError('Kon deelbetaling niet opslaan');
    } finally {
      setSavingDeelbetaling(false);
    }
  }

  const loadCase = useCallback(async () => {
    try {
      const data = await getCase(caseId);
      setCaseData(data);
    } catch (err) {
      setError('Kon case niet laden');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadCase();
    }
  }, [user, authLoading, router, loadCase]);

  // Sync local state with caseData
  useEffect(() => {
    if (caseData) {
      setLocalReference(caseData.klant_referentie || '');
      setLocalEinddatum(caseData.einddatum || '');
    }
  }, [caseData]);

  async function handleCalculate() {
    if (!caseData || caseData.vorderingen.length === 0) return;

    setCalculating(true);
    setError(null);
    try {
      const res = await berekenRente(caseData);
      setResult(res);
      // Log usage
      logUsage({ action_type: 'calculation', case_id: caseId, case_name: caseData.naam });
      // Scroll to results after a short delay, accounting for sticky header
      setTimeout(() => {
        if (resultRef.current) {
          const headerOffset = 140; // Account for main header + sticky case header
          const elementPosition = resultRef.current.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      setError('Berekening mislukt');
      console.error(err);
    } finally {
      setCalculating(false);
    }
  }

  async function handleShowPdfPreview() {
    if (!caseData || caseData.vorderingen.length === 0) return;

    setGeneratingPdf(true);
    setError(null);
    try {
      // First create a snapshot (this generates the PDF)
      const snapshot = await createSnapshot(caseId);

      // Then get the PDF blob
      const blob = await getSnapshotPdf(snapshot.id);

      // Log usage
      logUsage({ action_type: 'pdf_view', case_id: caseId, case_name: caseData.naam });

      // Create URL for preview
      const url = window.URL.createObjectURL(blob);

      // Clean up old URL if exists
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }

      setPdfPreviewUrl(url);
      setPdfPreviewOpen(true);
    } catch (err) {
      setError('PDF genereren mislukt');
      console.error(err);
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function handleDownloadPdf() {
    if (!pdfPreviewUrl || !caseData) return;

    // Download the currently previewed PDF
    const a = document.createElement('a');
    a.href = pdfPreviewUrl;
    a.download = `renteberekening-${caseData.naam.replace(/[^a-zA-Z0-9]/g, '-')}-${caseData.einddatum}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function closePdfPreview() {
    setPdfPreviewOpen(false);
    // Clean up URL after a delay to allow animation
    setTimeout(() => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(null);
      }
    }, 300);
  }

  async function handleUpdateEinddatum(einddatum: string) {
    if (!caseData) return;
    try {
      await updateCase(caseId, {
        naam: caseData.naam,
        klant_referentie: caseData.klant_referentie,
        einddatum,
        strategie: caseData.strategie,
      });
      setCaseData({ ...caseData, einddatum });
      setResult(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUpdateReference(klant_referentie: string) {
    if (!caseData) return;
    try {
      await updateCase(caseId, {
        naam: caseData.naam,
        klant_referentie: klant_referentie || undefined,
        einddatum: caseData.einddatum,
        strategie: caseData.strategie,
      });
      setCaseData({ ...caseData, klant_referentie: klant_referentie || undefined });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUpdateStrategie(strategie: 'A' | 'B') {
    if (!caseData) return;
    try {
      await updateCase(caseId, {
        naam: caseData.naam,
        klant_referentie: caseData.klant_referentie,
        einddatum: caseData.einddatum,
        strategie,
      });
      setCaseData({ ...caseData, strategie });
      setResult(null);
    } catch (err) {
      console.error(err);
    }
  }

  // Open dialog for adding new vordering
  function openAddVordering() {
    resetVorderingForm();
    setVorderingDialogOpen(true);
  }

  // Open dialog for editing vordering
  function openEditVordering(v: Vordering) {
    setEditingVordering(v);
    const kostenValue = Number(v.kosten || 0);
    setVorderingForm({
      item_type: v.item_type || 'vordering',
      kenmerk: v.kenmerk,
      bedrag: Number(v.bedrag).toFixed(2),
      datum: v.datum,
      rentetype: v.rentetype,
      kosten: kostenValue > 0 ? kostenValue.toFixed(2) : '',
      kosten_rentedatum: v.kosten_rentedatum || '',
      opslag: v.opslag ? String(Number(v.opslag) * 100) : '',
      opslag_ingangsdatum: v.opslag_ingangsdatum || '',
      pauze_start: v.pauze_start || '',
      pauze_eind: v.pauze_eind || '',
    });
    // Expand pauze section if there are pause dates
    setPauzeExpanded(!!(v.pauze_start || v.pauze_eind));
    setVorderingDialogOpen(true);
  }

  async function handleSaveVordering() {
    if (!caseData || savingVordering) return;

    const data = {
      item_type: vorderingForm.item_type,
      kenmerk: vorderingForm.kenmerk,
      bedrag: parseFloat(vorderingForm.bedrag),
      datum: vorderingForm.datum,
      rentetype: vorderingForm.rentetype,
      kosten: parseFloat(vorderingForm.kosten) || 0,
      kosten_rentedatum: vorderingForm.kosten_rentedatum || undefined,
      opslag: vorderingForm.opslag ? parseFloat(vorderingForm.opslag) / 100 : undefined,
      opslag_ingangsdatum: vorderingForm.opslag_ingangsdatum || undefined,
      pauze_start: vorderingForm.pauze_start || undefined,
      pauze_eind: vorderingForm.pauze_eind || undefined,
    };

    console.log('Saving vordering with data:', data);

    setSavingVordering(true);
    try {
      if (editingVordering) {
        // Update existing
        const updated = await updateVordering(editingVordering.id, data);
        console.log('Updated vordering response:', updated);
        setCaseData({
          ...caseData,
          vorderingen: caseData.vorderingen.map((v) =>
            v.id === editingVordering.id ? updated : v
          ),
        });
      } else {
        // Create new
        const created = await createVordering(caseId, data);
        console.log('Created vordering response:', created);
        setCaseData({
          ...caseData,
          vorderingen: [...caseData.vorderingen, created],
        });
      }
      setVorderingDialogOpen(false);
      resetVorderingForm();
      setResult(null);
    } catch (err) {
      console.error(err);
      setError('Kon vordering niet opslaan');
    } finally {
      setSavingVordering(false);
    }
  }

  async function handleDeleteVordering(id: string) {
    if (!caseData || deletingVorderingId) return;
    setDeletingVorderingId(id);
    try {
      await deleteVordering(id);
      setCaseData({
        ...caseData,
        vorderingen: caseData.vorderingen.filter((v) => v.id !== id),
      });
      setResult(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingVorderingId(null);
    }
  }

  // Open dialog for adding new deelbetaling
  function openAddDeelbetaling() {
    resetDeelbetalingForm();
    setDeelbetalingDialogOpen(true);
  }

  // Open dialog for editing deelbetaling
  function openEditDeelbetaling(d: Deelbetaling) {
    setEditingDeelbetaling(d);
    setDeelbetalingForm({
      kenmerk: d.kenmerk || '',
      bedrag: Number(d.bedrag).toFixed(2),
      datum: d.datum,
      aangewezen: d.aangewezen || [],
    });
    setDeelbetalingDialogOpen(true);
  }

  async function handleSaveDeelbetaling() {
    if (!caseData || savingDeelbetaling) return;

    const data = {
      kenmerk: deelbetalingForm.kenmerk || undefined,
      bedrag: parseFloat(deelbetalingForm.bedrag),
      datum: deelbetalingForm.datum,
      aangewezen: deelbetalingForm.aangewezen,
    };

    setSavingDeelbetaling(true);
    try {
      if (editingDeelbetaling) {
        // Update existing
        const updated = await updateDeelbetaling(editingDeelbetaling.id, data);
        setCaseData({
          ...caseData,
          deelbetalingen: caseData.deelbetalingen.map((d) =>
            d.id === editingDeelbetaling.id ? updated : d
          ),
        });
      } else {
        // Create new
        const created = await createDeelbetaling(caseId, data);
        setCaseData({
          ...caseData,
          deelbetalingen: [...caseData.deelbetalingen, created],
        });
      }
      setDeelbetalingDialogOpen(false);
      resetDeelbetalingForm();
      setResult(null);
    } catch (err) {
      console.error(err);
      setError('Kon deelbetaling niet opslaan');
    } finally {
      setSavingDeelbetaling(false);
    }
  }

  async function handleDeleteDeelbetaling(id: string) {
    if (!caseData || deletingDeelbetalingId) return;
    setDeletingDeelbetalingId(id);
    try {
      await deleteDeelbetaling(id);
      setCaseData({
        ...caseData,
        deelbetalingen: caseData.deelbetalingen.filter((d) => d.id !== id),
      });
      setResult(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingDeelbetalingId(null);
    }
  }

  async function handleLeaveCase() {
    setIsLeaving(true);
    try {
      await leaveSharedCase(caseId);
      router.push('/');
    } catch (err) {
      console.error(err);
      setError('Kon deling niet beëindigen');
    } finally {
      setIsLeaving(false);
      setLeaveDialogOpen(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container py-8 max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-3">⟳</div>
            <div className="text-muted-foreground">
              {authLoading ? 'Authenticatie controleren...' : 'Zaak laden...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (!caseData) {
    return (
      <div className="container py-8 max-w-5xl mx-auto px-4">
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <div className="text-destructive text-lg font-medium mb-2">Zaak niet gevonden</div>
            <p className="text-muted-foreground mb-4">Deze zaak bestaat niet of is verwijderd.</p>
            <Button onClick={() => router.push('/')}>
              ← Terug naar Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl mx-auto px-4">
      {/* Read-only Banner */}
      {!canEdit && (
        <div className="bg-blue-50 border-b border-blue-200 text-blue-800 text-center py-2 px-4 text-sm">
          U bekijkt een gedeelde zaak (alleen lezen). Gedeeld door{' '}
          <strong>{caseData.sharing?.shared_by?.display_name || caseData.sharing?.shared_by?.email?.split('@')[0] || 'onbekend'}</strong>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-16 z-40 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-muted-foreground hover:text-foreground shrink-0">
              ← Terug
            </Button>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-primary truncate">{caseData.naam}</h1>
            <SharedBadge sharing={caseData.sharing} />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {isOwner ? (
              <ShareCaseDialog caseId={caseId} caseName={caseData.naam} onShareChange={loadCase}>
                <Button variant="outline" size="lg" className="shadow-sm">
                  Delen
                </Button>
              </ShareCaseDialog>
            ) : (
              <Button
                variant="outline"
                size="lg"
                className="shadow-sm"
                onClick={() => setLeaveDialogOpen(true)}
              >
                Niet meer volgen
              </Button>
            )}
            <Button
              size="lg"
              onClick={handleCalculate}
              disabled={calculating || caseData.vorderingen.length === 0}
              className="shadow-sm flex-1 sm:flex-none"
            >
              {calculating ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Berekenen...
                </>
              ) : (
                <>Bereken Rente</>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleShowPdfPreview}
              disabled={generatingPdf || caseData.vorderingen.length === 0}
              className="shadow-sm"
              title="PDF bekijken"
            >
              {generatingPdf ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <>PDF</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Zaak instellingen */}
      <Card className="mb-4">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Referentie</TableHead>
                <TableHead className="font-semibold">Einddatum berekening</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Input
                    value={localReference}
                    onChange={(e) => setLocalReference(e.target.value)}
                    onBlur={() => {
                      if (localReference !== (caseData.klant_referentie || '')) {
                        handleUpdateReference(localReference);
                      }
                    }}
                    placeholder="Uw dossiernummer"
                    className="h-9"
                    disabled={!canEdit}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={localEinddatum}
                    onChange={(e) => setLocalEinddatum(e.target.value)}
                    onBlur={() => {
                      if (localEinddatum !== caseData.einddatum) {
                        handleUpdateEinddatum(localEinddatum);
                      }
                    }}
                    className="h-9 w-44"
                    disabled={!canEdit}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vorderingen */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-serif">Vorderingen</CardTitle>
            <VorderingenSummary vorderingen={caseData.vorderingen} />
          </div>
          {canEdit && !showInlineVordering && (
            <Button size="sm" onClick={() => { resetInlineVorderingForm(); setShowInlineVordering(true); }} className="shadow-sm" disabled={savingVordering || deletingVorderingId !== null}>
              + Toevoegen
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {caseData.vorderingen.length === 0 && !showInlineVordering ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-3">
                Nog geen vorderingen toegevoegd
              </p>
              {canEdit && (
                <Button variant="outline" onClick={() => { resetInlineVorderingForm(); setShowInlineVordering(true); }} disabled={savingVordering}>
                  + Eerste vordering toevoegen
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold pl-10">Kenmerk</TableHead>
                    <TableHead className="text-right font-semibold">Bedrag</TableHead>
                    <TableHead className="font-semibold">
                      <button
                        onClick={() => setVorderingenSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                        title={vorderingenSortOrder === 'asc' ? 'Oudste eerst (klik voor nieuwste eerst)' : 'Nieuwste eerst (klik voor oudste eerst)'}
                      >
                        Startdatum
                        <span className="text-xs">{vorderingenSortOrder === 'asc' ? '↑' : '↓'}</span>
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold">Rentetype</TableHead>
                    {canEdit && <TableHead className="w-[100px] text-center font-semibold">Acties</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...caseData.vorderingen]
                    .sort((a, b) => {
                      const dateA = new Date(a.datum).getTime();
                      const dateB = new Date(b.datum).getTime();
                      return vorderingenSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                    })
                    .map((v) => (
                    <TableRow key={v.id} className={`group hover:bg-muted/30 ${v.item_type === 'kosten' ? 'bg-amber-50' : ''}`}>
                      <TableCell className="font-medium font-mono">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${
                              v.item_type === 'kosten'
                                ? 'bg-amber-500 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                            title={v.item_type === 'kosten' ? 'Kosten' : 'Vordering'}
                          >
                            {v.item_type === 'kosten' ? 'K' : 'V'}
                          </span>
                          <span>{v.kenmerk}</span>
                          {v.pauze_start && v.pauze_eind && (
                            <span className="text-orange-500" title={`Geschorst: ${formatDatum(v.pauze_start)} - ${formatDatum(v.pauze_eind)}`}>⏸</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="inline-flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">€</span>
                          <span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{formatBedragParts(v.bedrag).amount}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">{formatDatum(v.datum)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal" title={RENTETYPE_LABELS[v.rentetype]}>
                          {RENTETYPE_SHORT[v.rentetype]}
                          {v.rentetype === 5 && v.opslag ? ` ${(v.opslag * 100).toFixed(1)}%` : null}
                          {(v.rentetype === 6 || v.rentetype === 7) && v.opslag ? ` +${(v.opslag * 100).toFixed(1)}%` : null}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1 justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditVordering(v)}
                              title="Bewerken"
                              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              disabled={deletingVorderingId === v.id}
                            >
                              <span className="text-base">✎</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Vordering "${v.kenmerk}" verwijderen?`)) {
                                  handleDeleteVordering(v.id);
                                }
                              }}
                              title="Verwijderen"
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              disabled={deletingVorderingId !== null}
                            >
                              {deletingVorderingId === v.id ? (
                                <span className="animate-spin text-base">⟳</span>
                              ) : (
                                <span className="text-base">×</span>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {/* Inline add row */}
                  {showInlineVordering && canEdit && (
                    <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setInlineVorderingForm({ ...inlineVorderingForm, item_type: inlineVorderingForm.item_type === 'vordering' ? 'kosten' : 'vordering' })}
                            className={`shrink-0 w-6 h-6 rounded text-xs font-bold transition-colors ${
                              inlineVorderingForm.item_type === 'kosten'
                                ? 'bg-amber-500 text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                            title={inlineVorderingForm.item_type === 'kosten' ? 'Kosten (klik voor Vordering)' : 'Vordering (klik voor Kosten)'}
                          >
                            {inlineVorderingForm.item_type === 'kosten' ? 'K' : 'V'}
                          </button>
                          <Input
                            placeholder="Kenmerk"
                            value={inlineVorderingForm.kenmerk}
                            onChange={(e) => setInlineVorderingForm({ ...inlineVorderingForm, kenmerk: e.target.value })}
                            className="h-8 text-sm font-mono"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineVordering();
                              if (e.key === 'Escape') cancelInlineVordering();
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={inlineVorderingForm.bedrag}
                          onChange={(e) => setInlineVorderingForm({ ...inlineVorderingForm, bedrag: e.target.value })}
                          className="h-8 text-sm font-mono text-right"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineVordering();
                            if (e.key === 'Escape') cancelInlineVordering();
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={inlineVorderingForm.datum}
                          onChange={(e) => setInlineVorderingForm({ ...inlineVorderingForm, datum: e.target.value })}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineVordering();
                            if (e.key === 'Escape') cancelInlineVordering();
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={String(inlineVorderingForm.rentetype)}
                          onValueChange={(v) => setInlineVorderingForm({ ...inlineVorderingForm, rentetype: parseInt(v) })}
                        >
                          <SelectTrigger className="h-8 text-sm w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Wettelijk</SelectItem>
                            <SelectItem value="2">Handels</SelectItem>
                            <SelectItem value="3">Wett. enkel</SelectItem>
                            <SelectItem value="4">Hand. enkel</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveInlineVordering}
                            title="Opslaan (Enter)"
                            className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                            disabled={savingVordering || !inlineVorderingForm.kenmerk || !inlineVorderingForm.bedrag}
                          >
                            {savingVordering ? <span className="animate-spin">⟳</span> : '✓'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelInlineVordering}
                            title="Annuleren (Esc)"
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            disabled={savingVordering}
                          >
                            ×
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { cancelInlineVordering(); openAddVordering(); }}
                            title="Meer opties..."
                            className="h-8 px-2 text-xs hover:bg-muted"
                            disabled={savingVordering}
                          >
                            ⋯
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deelbetalingen */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-serif">Deelbetalingen</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {caseData.deelbetalingen.length === 0
                ? 'Optioneel: voeg ontvangen betalingen toe'
                : `${caseData.deelbetalingen.length} ${caseData.deelbetalingen.length === 1 ? 'betaling' : 'betalingen'}`}
            </p>
          </div>
          {canEdit && !showInlineDeelbetaling && (
            <Button size="sm" onClick={() => { resetInlineDeelbetalingForm(); setShowInlineDeelbetaling(true); }} className="shadow-sm" disabled={savingDeelbetaling || deletingDeelbetalingId !== null}>
              + Toevoegen
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {caseData.deelbetalingen.length === 0 && !showInlineDeelbetaling ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
              <p className="text-muted-foreground text-sm">
                Geen deelbetalingen - betalingen worden automatisch verwerkt indien toegevoegd
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Kenmerk</TableHead>
                    <TableHead className="text-right font-semibold">Bedrag</TableHead>
                    <TableHead className="font-semibold">Datum</TableHead>
                    <TableHead className="font-semibold">Aangewezen aan</TableHead>
                    {canEdit && <TableHead className="w-[100px] text-center font-semibold">Acties</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caseData.deelbetalingen.map((d) => (
                    <TableRow key={d.id} className="group hover:bg-muted/30">
                      <TableCell className="font-medium font-mono">{d.kenmerk || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="inline-flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">€</span>
                          <span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{formatBedragParts(d.bedrag).amount}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">{formatDatum(d.datum)}</TableCell>
                      <TableCell>
                        {d.aangewezen.length > 0 ? (
                          <span className="text-sm font-mono">{d.aangewezen.join(', ')}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">via strategie</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1 justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDeelbetaling(d)}
                              title="Bewerken"
                              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              disabled={deletingDeelbetalingId === d.id}
                            >
                              <span className="text-base">✎</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Deelbetaling "${d.kenmerk || formatDatum(d.datum)}" verwijderen?`)) {
                                  handleDeleteDeelbetaling(d.id);
                                }
                              }}
                              title="Verwijderen"
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              disabled={deletingDeelbetalingId !== null}
                            >
                              {deletingDeelbetalingId === d.id ? (
                                <span className="animate-spin text-base">⟳</span>
                              ) : (
                                <span className="text-base">×</span>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {/* Inline add row */}
                  {showInlineDeelbetaling && canEdit && (
                    <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                      <TableCell>
                        <Input
                          placeholder="Kenmerk"
                          value={inlineDeelbetalingForm.kenmerk}
                          onChange={(e) => setInlineDeelbetalingForm({ ...inlineDeelbetalingForm, kenmerk: e.target.value })}
                          className="h-8 text-sm font-mono"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineDeelbetaling();
                            if (e.key === 'Escape') cancelInlineDeelbetaling();
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={inlineDeelbetalingForm.bedrag}
                          onChange={(e) => setInlineDeelbetalingForm({ ...inlineDeelbetalingForm, bedrag: e.target.value })}
                          className="h-8 text-sm font-mono text-right"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineDeelbetaling();
                            if (e.key === 'Escape') cancelInlineDeelbetaling();
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={inlineDeelbetalingForm.datum}
                          onChange={(e) => setInlineDeelbetalingForm({ ...inlineDeelbetalingForm, datum: e.target.value })}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineDeelbetaling();
                            if (e.key === 'Escape') cancelInlineDeelbetaling();
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {caseData.vorderingen.length > 0 ? (
                          <Select
                            value={inlineDeelbetalingForm.aangewezen[0] || '_none'}
                            onValueChange={(v) => setInlineDeelbetalingForm({
                              ...inlineDeelbetalingForm,
                              aangewezen: v === '_none' ? [] : [v]
                            })}
                          >
                            <SelectTrigger className="h-8 text-sm w-[150px]">
                              <SelectValue placeholder="via strategie" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">via strategie</SelectItem>
                              {caseData.vorderingen.map((v) => (
                                <SelectItem key={v.id} value={v.kenmerk}>{v.kenmerk}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">via strategie</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveInlineDeelbetaling}
                            title="Opslaan (Enter)"
                            className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                            disabled={savingDeelbetaling || !inlineDeelbetalingForm.bedrag}
                          >
                            {savingDeelbetaling ? <span className="animate-spin">⟳</span> : '✓'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelInlineDeelbetaling}
                            title="Annuleren (Esc)"
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            disabled={savingDeelbetaling}
                          >
                            ×
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { cancelInlineDeelbetaling(); openAddDeelbetaling(); }}
                            title="Meer opties..."
                            className="h-8 px-2 text-xs hover:bg-muted"
                            disabled={savingDeelbetaling}
                          >
                            ⋯
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultaat */}
      {result && (
        <Card ref={resultRef} className="mb-6 border-2 border-primary shadow-lg">
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-serif flex items-center gap-3">
                Berekening Resultaat
                {result.controle_ok ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300 font-normal">
                    Controle OK
                  </Badge>
                ) : (
                  <Badge variant="destructive">Controle fout</Badge>
                )}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Per {formatDatum(caseData.einddatum)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Samenvatting - Totaal prominent */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Hoofdsom</div>
                <div className="text-sm font-semibold font-mono">{formatBedrag(result.totalen.oorspronkelijk)}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Kosten</div>
                <div className="text-sm font-semibold font-mono">{formatBedrag(result.totalen.kosten)}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Berekende rente</div>
                <div className="text-sm font-semibold font-mono">
                  {formatBedrag(Number(result.totalen.rente || 0) + Number(result.totalen.rente_kosten || 0))}
                </div>
                {result.totalen.rente_kosten > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    (incl. {formatBedrag(result.totalen.rente_kosten)} op kosten)
                  </div>
                )}
              </div>
              <div className="p-4 bg-primary rounded-lg text-primary-foreground">
                <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Totaal openstaand</div>
                <div className="text-lg font-bold font-mono">{formatBedrag(result.totalen.openstaand)}</div>
              </div>
            </div>

            {/* Afgelost detail */}
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs uppercase tracking-wider text-green-700 mb-2 font-semibold">Totaal afgelost</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-green-600">Hoofdsom:</span>{' '}
                  <span className="font-mono font-medium">{formatBedrag(result.totalen.afgelost_hoofdsom)}</span>
                </div>
                <div>
                  <span className="text-green-600">Kosten:</span>{' '}
                  <span className="font-mono font-medium">{formatBedrag(result.totalen.afgelost_kosten)}</span>
                </div>
                <div>
                  <span className="text-green-600">Rente:</span>{' '}
                  <span className="font-mono font-medium">
                    {formatBedrag(Number(result.totalen.afgelost_rente || 0) + Number(result.totalen.afgelost_rente_kosten || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Samenvatting per vordering */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Overzicht per vordering
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Vordering</TableHead>
                      <TableHead className="font-semibold">Startdatum</TableHead>
                      <TableHead className="text-right font-semibold">Hoofdsom</TableHead>
                      <TableHead className="text-right font-semibold">Rente</TableHead>
                      <TableHead className="text-right font-semibold">Afg. HS</TableHead>
                      <TableHead className="text-right font-semibold">Afg. Rnt</TableHead>
                      <TableHead className="text-right font-semibold">Openstaand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...result.vorderingen]
                      .sort((a, b) => {
                        const vordA = caseData.vorderingen.find(v => v.kenmerk === a.kenmerk);
                        const vordB = caseData.vorderingen.find(v => v.kenmerk === b.kenmerk);
                        const dateA = vordA ? new Date(vordA.datum).getTime() : 0;
                        const dateB = vordB ? new Date(vordB.datum).getTime() : 0;
                        return dateA - dateB;
                      })
                      .map((v) => {
                        const vordInfo = caseData.vorderingen.find(vd => vd.kenmerk === v.kenmerk);
                        const p = {
                          hs: formatBedragParts(v.oorspronkelijk_bedrag),
                          kst: formatBedragParts(v.kosten),
                          rnt: formatBedragParts(Number(v.totale_rente || 0) + Number(v.totale_rente_kosten || 0)),
                          afl_hs: formatBedragParts(v.afgelost_hoofdsom),
                          afl_kst: formatBedragParts(v.afgelost_kosten),
                          afl_rnt: formatBedragParts(Number(v.afgelost_rente || 0) + Number(v.afgelost_rente_kosten || 0)),
                          open: formatBedragParts(v.openstaand),
                        };
                        return (
                      <TableRow key={v.kenmerk} className={v.status === 'VOLDAAN' ? 'bg-green-50' : v.item_type === 'kosten' ? 'bg-amber-50/50' : ''}>
                        <TableCell className="font-mono">
                          <span className="inline-flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={`text-xs px-1 ${v.item_type === 'kosten' ? 'bg-amber-100 border-amber-300 text-amber-800' : ''}`}
                            >
                              {v.item_type === 'kosten' ? 'K' : 'V'}
                            </Badge>
                            {v.kenmerk}
                            {v.pauze_start && v.pauze_eind && (
                              <span className="text-orange-500" title={`Geschorst: ${formatDatum(v.pauze_start)} - ${formatDatum(v.pauze_eind)}`}>⏸</span>
                            )}
                          </span>
                          {v.status === 'VOLDAAN' && (
                            <Badge className="ml-2 bg-green-100 text-green-700 border-green-300 text-xs font-sans">
                              Voldaan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{vordInfo ? formatDatum(vordInfo.datum) : '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="inline-flex items-center justify-end gap-2"><span className="text-muted-foreground">{p.hs.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{p.hs.amount}</span></span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="inline-flex items-center justify-end gap-2"><span className="text-muted-foreground">{p.rnt.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{p.rnt.amount}</span></span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          <span className="inline-flex items-center justify-end gap-2"><span className="text-green-400">{p.afl_hs.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{p.afl_hs.amount}</span></span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          <span className="inline-flex items-center justify-end gap-2"><span className="text-green-400">{p.afl_rnt.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{p.afl_rnt.amount}</span></span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {v.status === 'VOLDAAN' ? (
                            <span className="text-green-600 inline-flex items-center justify-end gap-2"><span className="text-green-400">€</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>0,00</span></span>
                          ) : (
                            <span className="inline-flex items-center justify-end gap-2"><span className="text-muted-foreground">{p.open.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{p.open.amount}</span></span>
                          )}
                        </TableCell>
                      </TableRow>
                        );
                      })}
                    {/* Totaal rij */}
                    {(() => {
                      const t = {
                        hs: formatBedragParts(result.totalen.oorspronkelijk),
                        rnt: formatBedragParts(Number(result.totalen.rente || 0) + Number(result.totalen.rente_kosten || 0)),
                        afl_hs: formatBedragParts(result.totalen.afgelost_hoofdsom),
                        afl_rnt: formatBedragParts(Number(result.totalen.afgelost_rente || 0) + Number(result.totalen.afgelost_rente_kosten || 0)),
                        open: formatBedragParts(result.totalen.openstaand),
                      };
                      return (
                    <TableRow className="bg-muted/70 font-semibold border-t-2">
                      <TableCell className="font-mono">Totaal</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="inline-flex items-center justify-end gap-2"><span className="text-muted-foreground">{t.hs.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{t.hs.amount}</span></span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="inline-flex items-center justify-end gap-2"><span className="text-muted-foreground">{t.rnt.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{t.rnt.amount}</span></span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        <span className="inline-flex items-center justify-end gap-2"><span className="text-green-400">{t.afl_hs.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{t.afl_hs.amount}</span></span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        <span className="inline-flex items-center justify-end gap-2"><span className="text-green-400">{t.afl_rnt.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{t.afl_rnt.amount}</span></span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        <span className="inline-flex items-center justify-end gap-2"><span className="text-primary/60">{t.open.sign}</span><span className="tabular-nums text-right" style={{minWidth: '5rem'}}>{t.open.amount}</span></span>
                      </TableCell>
                    </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Detail per vordering */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Specificatie per vordering
              </h3>
            </div>
            <Accordion type="multiple" className="w-full border rounded-lg">
              {[...result.vorderingen]
                .sort((a, b) => {
                  const vordA = caseData.vorderingen.find(v => v.kenmerk === a.kenmerk);
                  const vordB = caseData.vorderingen.find(v => v.kenmerk === b.kenmerk);
                  const dateA = vordA ? new Date(vordA.datum).getTime() : 0;
                  const dateB = vordB ? new Date(vordB.datum).getTime() : 0;
                  return dateA - dateB;
                })
                .map((v, vIndex) => (
                <AccordionItem key={v.kenmerk} value={v.kenmerk} className={vIndex === 0 ? '' : 'border-t'}>
                  <AccordionTrigger className="hover:no-underline hover:bg-muted/30 px-4">
                    <div className="flex items-center w-full">
                      <Badge
                        variant="outline"
                        className={`text-xs px-1 mr-2 shrink-0 ${v.item_type === 'kosten' ? 'bg-amber-100 border-amber-300 text-amber-800' : ''}`}
                      >
                        {v.item_type === 'kosten' ? 'K' : 'V'}
                      </Badge>
                      <span className="font-medium font-mono w-28 shrink-0">
                        {v.kenmerk}
                        {v.pauze_start && v.pauze_eind && (
                          <span className="ml-1 text-orange-500">⏸</span>
                        )}
                      </span>
                      {(() => {
                        const vordInfo = caseData.vorderingen.find(vd => vd.kenmerk === v.kenmerk);
                        if (vordInfo) {
                          return (
                            <>
                              <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">{formatDatum(vordInfo.datum)}</span>
                              <Badge variant="outline" className="text-xs bg-muted/50 w-24 justify-center shrink-0">
                                {RENTETYPE_SHORT[vordInfo.rentetype] || `Type ${vordInfo.rentetype}`}
                                {vordInfo.opslag && vordInfo.rentetype === 5 ? ` ${(vordInfo.opslag * 100).toFixed(1)}%` : null}
                                {vordInfo.opslag && (vordInfo.rentetype === 6 || vordInfo.rentetype === 7) ? ` +${(vordInfo.opslag * 100).toFixed(1)}%` : null}
                              </Badge>
                            </>
                          );
                        }
                        return null;
                      })()}
                      <Badge
                        variant={v.status === 'VOLDAAN' ? 'outline' : 'default'}
                        className={`w-20 justify-center shrink-0 ml-2 ${v.status === 'VOLDAAN' ? 'bg-green-50 text-green-700 border-green-300' : ''}`}
                      >
                        {v.status}
                      </Badge>
                      <span className="ml-auto mr-4 font-semibold font-mono text-right w-28 shrink-0">
                        {formatBedrag(v.openstaand)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-muted/20 p-3 rounded-lg">
                        <div>
                          <span className="text-xs text-muted-foreground block">Hoofdsom</span>
                          <span className="font-medium font-mono">{formatBedrag(v.oorspronkelijk_bedrag)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">
                            Kosten
                            {v.kosten_rentedatum && (
                              <span className="ml-1 text-amber-600">⏱</span>
                            )}
                          </span>
                          <span className="font-medium font-mono">{formatBedrag(v.kosten)}</span>
                          {v.kosten_rentedatum && (
                            <span className="text-xs text-muted-foreground block">
                              rente vanaf {formatDatum(v.kosten_rentedatum)}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Rente op hoofdsom</span>
                          <span className="font-medium font-mono">{formatBedrag(v.totale_rente)}</span>
                        </div>
                        {(v.totale_rente_kosten || 0) > 0 && (
                          <div>
                            <span className="text-xs text-muted-foreground block">Rente op kosten</span>
                            <span className="font-medium font-mono">{formatBedrag(v.totale_rente_kosten)}</span>
                          </div>
                        )}
                        {v.voldaan_datum && (
                          <div>
                            <span className="text-xs text-muted-foreground block">Voldaan op</span>
                            <span className="font-medium">{formatDatum(v.voldaan_datum)}</span>
                          </div>
                        )}
                      </div>

                      {v.periodes.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Renteperiodes</div>
                          <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="font-semibold">Periode</TableHead>
                                <TableHead className="text-right font-semibold">Dagen</TableHead>
                                <TableHead className="text-right font-semibold">Hoofdsom</TableHead>
                                <TableHead className="text-right font-semibold">Rente %</TableHead>
                                <TableHead className="text-right font-semibold">Rente</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {v.periodes.map((p, i) => {
                                // Check if there's a payment on the end date of this period
                                const betalingOpEinddatum = result.deelbetalingen.find(
                                  db => db.datum === p.eind && db.toerekeningen.some(t => t.vordering === v.kenmerk)
                                );
                                const toerekeningen = betalingOpEinddatum?.toerekeningen.filter(t => t.vordering === v.kenmerk) || [];

                                return (
                                  <React.Fragment key={i}>
                                    <TableRow className={p.is_pauze ? 'bg-orange-50' : p.is_kapitalisatie ? 'bg-blue-50' : ''}>
                                      <TableCell className="font-mono">
                                        {formatDatum(p.start)} - {formatDatum(p.eind)}
                                        {p.is_pauze && <span className="ml-1 text-orange-500 font-medium">⏸</span>}
                                        {p.is_kapitalisatie && <span className="ml-1 text-blue-600 font-medium">↻</span>}
                                      </TableCell>
                                      <TableCell className="text-right font-mono">{p.dagen}</TableCell>
                                      <TableCell className="text-right font-mono">{formatBedrag(p.hoofdsom)}</TableCell>
                                      <TableCell className="text-right font-mono">{p.is_pauze ? <span className="text-orange-500">geschorst</span> : formatPercentage(p.rente_pct)}</TableCell>
                                      <TableCell className="text-right font-mono">{formatBedrag(p.rente)}</TableCell>
                                    </TableRow>
                                    {betalingOpEinddatum && toerekeningen.length > 0 && (
                                      <TableRow className="bg-green-100 border-green-300">
                                        <TableCell colSpan={5} className="py-2">
                                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <span className="font-semibold font-mono flex items-center gap-2 text-green-800">
                                              <span>💰</span>
                                              Betaling {betalingOpEinddatum.kenmerk || ''} op {formatDatum(betalingOpEinddatum.datum)}
                                            </span>
                                            <span className="font-mono flex flex-wrap gap-x-4 text-green-700">
                                              {toerekeningen.map((t, ti) => (
                                                <span key={ti} className="whitespace-nowrap">
                                                  <span className="text-green-600">{t.type}:</span>{' '}
                                                  <span className="font-semibold text-green-800">{formatBedrag(t.bedrag)}</span>
                                                </span>
                                              ))}
                                            </span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </TableBody>
                          </Table>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2 px-1">
                            <span><span className="text-blue-600">↻</span> = kapitalisatie (rente bij hoofdsom)</span>
                            <span><span className="text-orange-500">⏸</span> = geschorst</span>
                            <span><span className="text-green-600">💰</span> = betaling ontvangen</span>
                          </div>
                        </div>
                      )}

                      {/* Kosten renteperiodes */}
                      {v.periodes_kosten && v.periodes_kosten.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Renteperiodes Kosten
                            {v.kosten_rentedatum && <span className="ml-1 text-amber-600">⏱</span>}
                          </div>
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-amber-50">
                                  <TableHead className="font-semibold">Periode</TableHead>
                                  <TableHead className="text-right font-semibold">Dagen</TableHead>
                                  <TableHead className="text-right font-semibold">Kosten</TableHead>
                                  <TableHead className="text-right font-semibold">Rente %</TableHead>
                                  <TableHead className="text-right font-semibold">Rente</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {v.periodes_kosten.map((p, i) => (
                                  <TableRow key={i} className={p.is_pauze ? 'bg-orange-50' : ''}>
                                    <TableCell className="font-mono">
                                      {formatDatum(p.start)} - {formatDatum(p.eind)}
                                      {p.is_pauze && <span className="ml-1 text-orange-500 font-medium">⏸</span>}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{p.dagen}</TableCell>
                                    <TableCell className="text-right font-mono">{formatBedrag(p.kosten)}</TableCell>
                                    <TableCell className="text-right font-mono">{p.is_pauze ? <span className="text-orange-500">geschorst</span> : formatPercentage(p.rente_pct)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatBedrag(p.rente)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex justify-between items-center mt-2 px-1 text-sm">
                            <span className="text-muted-foreground">
                              <span className="text-amber-600">⏱</span> = kosten met afwijkende rentedatum
                            </span>
                            <span className="font-semibold font-mono">
                              Totaal rente kosten: {formatBedrag(v.totale_rente_kosten || 0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Vordering Dialog */}
      <Dialog open={vorderingDialogOpen} onOpenChange={(open) => {
        if (!open) resetVorderingForm();
        setVorderingDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVordering ? 'Vordering Bewerken' : 'Vordering Toevoegen'}
            </DialogTitle>
            <DialogDescription>
              Voer de gegevens van de vordering in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Item type selector - Professional card style */}
            <div>
              <label className="text-sm font-medium mb-3 block">Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVorderingForm({ ...vorderingForm, item_type: 'vordering' })}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    vorderingForm.item_type === 'vordering'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      vorderingForm.item_type === 'vordering'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      V
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">Vordering</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Factuur, lening, schadeclaim</div>
                    </div>
                  </div>
                  {vorderingForm.item_type === 'vordering' && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">✓</div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setVorderingForm({ ...vorderingForm, item_type: 'kosten' })}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    vorderingForm.item_type === 'kosten'
                      ? 'border-amber-500 bg-amber-50 shadow-sm'
                      : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      vorderingForm.item_type === 'kosten'
                        ? 'bg-amber-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      K
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">Kosten</div>
                      <div className="text-xs text-muted-foreground mt-0.5">BIK, incasso, proceskosten</div>
                    </div>
                  </div>
                  {vorderingForm.item_type === 'kosten' && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">✓</div>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Kenmerk *</label>
              <Input
                value={vorderingForm.kenmerk}
                onChange={(e) => setVorderingForm({ ...vorderingForm, kenmerk: e.target.value })}
                placeholder={vorderingForm.item_type === 'kosten' ? "BIK-001" : "FAC-2024-001"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Bedrag *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={vorderingForm.bedrag}
                  onChange={(e) => setVorderingForm({ ...vorderingForm, bedrag: e.target.value })}
                  placeholder="1000.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Startdatum *</label>
                <Input
                  type="date"
                  value={vorderingForm.datum}
                  onChange={(e) => setVorderingForm({ ...vorderingForm, datum: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Rentetype *</label>
              <Select
                value={String(vorderingForm.rentetype)}
                onValueChange={(v) => setVorderingForm({ ...vorderingForm, rentetype: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RENTETYPE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Pauze sectie - Collapsible */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setPauzeExpanded(!pauzeExpanded)}
                className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                  vorderingForm.pauze_start || vorderingForm.pauze_eind
                    ? 'bg-orange-50 hover:bg-orange-100/70'
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-base ${vorderingForm.pauze_start || vorderingForm.pauze_eind ? 'text-orange-500' : 'text-muted-foreground'}`}>⏸</span>
                  <span className="text-sm font-medium">Schorsing / Uitstel van betaling</span>
                  {!pauzeExpanded && vorderingForm.pauze_start && vorderingForm.pauze_eind && (
                    <span className="text-xs text-orange-600 ml-2 font-mono">
                      {formatDatum(vorderingForm.pauze_start)} - {formatDatum(vorderingForm.pauze_eind)}
                    </span>
                  )}
                </div>
                <span className={`text-xs text-muted-foreground transition-transform duration-200 ${pauzeExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {pauzeExpanded && (
                <div className="p-4 bg-orange-50/30 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Schorsing vanaf</label>
                      <Input
                        type="date"
                        value={vorderingForm.pauze_start}
                        onChange={(e) => setVorderingForm({ ...vorderingForm, pauze_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Hervatting op</label>
                      <Input
                        type="date"
                        value={vorderingForm.pauze_eind}
                        onChange={(e) => setVorderingForm({ ...vorderingForm, pauze_eind: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Tijdens schorsing of uitstel van betaling wordt geen rente berekend. Bij samengestelde rente wordt opgebouwde rente gekapitaliseerd bij aanvang.
                  </p>
                </div>
              )}
            </div>
            {vorderingForm.rentetype === 5 && (
              <div>
                <label className="text-sm font-medium">Rentepercentage % *</label>
                <Input
                  type="number"
                  step="0.1"
                  value={vorderingForm.opslag}
                  onChange={(e) => setVorderingForm({ ...vorderingForm, opslag: e.target.value })}
                  placeholder="Bijv. 8.5"
                />
                <p className="text-xs text-muted-foreground mt-1">Het vaste jaarlijkse rentepercentage</p>
              </div>
            )}
            {(vorderingForm.rentetype === 6 || vorderingForm.rentetype === 7) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Opslag %</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={vorderingForm.opslag}
                    onChange={(e) => setVorderingForm({ ...vorderingForm, opslag: e.target.value })}
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Opslag vanaf</label>
                  <Input
                    type="date"
                    value={vorderingForm.opslag_ingangsdatum}
                    onChange={(e) => setVorderingForm({ ...vorderingForm, opslag_ingangsdatum: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVorderingDialogOpen(false)} disabled={savingVordering}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveVordering}
              disabled={
                savingVordering ||
                !vorderingForm.kenmerk ||
                !vorderingForm.bedrag ||
                !vorderingForm.datum ||
                (vorderingForm.rentetype === 5 && !vorderingForm.opslag)
              }
            >
              {savingVordering ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Bezig...
                </>
              ) : (
                editingVordering ? 'Opslaan' : 'Toevoegen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deelbetaling Dialog */}
      <Dialog open={deelbetalingDialogOpen} onOpenChange={(open) => {
        if (!open) resetDeelbetalingForm();
        setDeelbetalingDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDeelbetaling ? 'Deelbetaling Bewerken' : 'Deelbetaling Toevoegen'}
            </DialogTitle>
            <DialogDescription>
              Voer de gegevens van de betaling in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Kenmerk</label>
              <Input
                value={deelbetalingForm.kenmerk}
                onChange={(e) => setDeelbetalingForm({ ...deelbetalingForm, kenmerk: e.target.value })}
                placeholder="BET-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Bedrag *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={deelbetalingForm.bedrag}
                  onChange={(e) => setDeelbetalingForm({ ...deelbetalingForm, bedrag: e.target.value })}
                  placeholder="500.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Datum *</label>
                <Input
                  type="date"
                  value={deelbetalingForm.datum}
                  onChange={(e) => setDeelbetalingForm({ ...deelbetalingForm, datum: e.target.value })}
                />
              </div>
            </div>
            {/* Warning if no vorderingen exist before this date */}
            {deelbetalingForm.datum && caseData && (() => {
              const vorderingenVoorDatum = caseData.vorderingen.filter(
                v => v.datum <= deelbetalingForm.datum
              );
              if (vorderingenVoorDatum.length === 0 && caseData.vorderingen.length > 0) {
                return (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Let op:</strong> Er zijn geen vorderingen met een startdatum op of voor {formatDatum(deelbetalingForm.datum)}.
                      De betaling kan niet worden toegerekend aan vorderingen die pas later ontstaan.
                    </p>
                  </div>
                );
              }
              if (caseData.vorderingen.length === 0) {
                return (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Let op:</strong> Er zijn nog geen vorderingen ingevoerd.
                      Voeg eerst vorderingen toe voordat u deelbetalingen invoert.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <div>
              <label className="text-sm font-medium">Aangewezen vorderingen</label>
              <p className="text-sm text-muted-foreground mb-2">
                Selecteer vorderingen waaraan deze betaling wordt toegerekend (laat leeg voor strategie {caseData?.strategie})
              </p>
              <div className="flex flex-wrap gap-2">
                {caseData?.vorderingen.map((v) => (
                  <Button
                    key={v.id}
                    size="sm"
                    variant={deelbetalingForm.aangewezen.includes(v.kenmerk) ? 'default' : 'outline'}
                    onClick={() => {
                      const current = deelbetalingForm.aangewezen;
                      if (current.includes(v.kenmerk)) {
                        setDeelbetalingForm({
                          ...deelbetalingForm,
                          aangewezen: current.filter((k) => k !== v.kenmerk),
                        });
                      } else {
                        setDeelbetalingForm({
                          ...deelbetalingForm,
                          aangewezen: [...current, v.kenmerk],
                        });
                      }
                    }}
                  >
                    {v.kenmerk}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeelbetalingDialogOpen(false)} disabled={savingDeelbetaling}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveDeelbetaling}
              disabled={savingDeelbetaling || !deelbetalingForm.bedrag || !deelbetalingForm.datum}
            >
              {savingDeelbetaling ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Bezig...
                </>
              ) : (
                editingDeelbetaling ? 'Opslaan' : 'Toevoegen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={pdfPreviewOpen} onOpenChange={(open) => {
        if (!open) closePdfPreview();
        else setPdfPreviewOpen(open);
      }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>PDF Preview</DialogTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                  Download
                </Button>
                <Button variant="ghost" size="sm" onClick={closePdfPreview}>
                  Sluiten
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {pdfPreviewUrl && (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Shared Case Confirmation Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Niet Meer Volgen</DialogTitle>
            <DialogDescription>
              Weet u zeker dat u deze gedeelde zaak niet meer wilt volgen?
              De eigenaar behoudt toegang en kan de zaak opnieuw met u delen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              variant="default"
              onClick={handleLeaveCase}
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
