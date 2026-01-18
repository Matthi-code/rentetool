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
import { formatBedrag, formatDatum, formatPercentage, getToday } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { ShareCaseDialog } from '@/components/share-case-dialog';
import { SharedBadge } from '@/components/shared-badge';
import {
  RENTETYPE_LABELS,
  RENTETYPE_SHORT,
  STRATEGIE_LABELS,
  type CaseWithLines,
  type Vordering,
  type Deelbetaling,
  type BerekeningResponse,
} from '@/lib/types';

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

  // Vordering form
  const [vorderingForm, setVorderingForm] = useState({
    kenmerk: '',
    bedrag: '',
    datum: getToday(),
    rentetype: 1,
    kosten: '0',
    opslag: '',
    opslag_ingangsdatum: '',
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

  // Computed: Can the user edit this case?
  const isOwner = caseData?.sharing?.is_owner !== false;
  const canEdit = isOwner || caseData?.sharing?.my_permission === 'edit';

  const resetVorderingForm = () => {
    setVorderingForm({
      kenmerk: '',
      bedrag: '',
      datum: getToday(),
      rentetype: 1,
      kosten: '0',
      opslag: '',
      opslag_ingangsdatum: '',
    });
    setEditingVordering(null);
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

  async function handleCalculate() {
    if (!caseData || caseData.vorderingen.length === 0) return;

    setCalculating(true);
    setError(null);
    try {
      const res = await berekenRente(caseData);
      setResult(res);
      // Log usage
      logUsage({ action_type: 'calculation', case_id: caseId, case_name: caseData.naam });
      // Scroll to results after a short delay
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    setVorderingForm({
      kenmerk: v.kenmerk,
      bedrag: String(v.bedrag),
      datum: v.datum,
      rentetype: v.rentetype,
      kosten: String(v.kosten || 0),
      opslag: v.opslag ? String(v.opslag * 100) : '',
      opslag_ingangsdatum: v.opslag_ingangsdatum || '',
    });
    setVorderingDialogOpen(true);
  }

  async function handleSaveVordering() {
    if (!caseData) return;

    const data = {
      kenmerk: vorderingForm.kenmerk,
      bedrag: parseFloat(vorderingForm.bedrag),
      datum: vorderingForm.datum,
      rentetype: vorderingForm.rentetype,
      kosten: parseFloat(vorderingForm.kosten) || 0,
      opslag: vorderingForm.opslag ? parseFloat(vorderingForm.opslag) / 100 : undefined,
      opslag_ingangsdatum: vorderingForm.opslag_ingangsdatum || undefined,
    };

    try {
      if (editingVordering) {
        // Update existing
        const updated = await updateVordering(editingVordering.id, data);
        setCaseData({
          ...caseData,
          vorderingen: caseData.vorderingen.map((v) =>
            v.id === editingVordering.id ? updated : v
          ),
        });
      } else {
        // Create new
        const created = await createVordering(caseId, data);
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
    }
  }

  async function handleDeleteVordering(id: string) {
    if (!caseData) return;
    try {
      await deleteVordering(id);
      setCaseData({
        ...caseData,
        vorderingen: caseData.vorderingen.filter((v) => v.id !== id),
      });
      setResult(null);
    } catch (err) {
      console.error(err);
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
      bedrag: String(d.bedrag),
      datum: d.datum,
      aangewezen: d.aangewezen || [],
    });
    setDeelbetalingDialogOpen(true);
  }

  async function handleSaveDeelbetaling() {
    if (!caseData) return;

    const data = {
      kenmerk: deelbetalingForm.kenmerk || undefined,
      bedrag: parseFloat(deelbetalingForm.bedrag),
      datum: deelbetalingForm.datum,
      aangewezen: deelbetalingForm.aangewezen,
    };

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
    }
  }

  async function handleDeleteDeelbetaling(id: string) {
    if (!caseData) return;
    try {
      await deleteDeelbetaling(id);
      setCaseData({
        ...caseData,
        deelbetalingen: caseData.deelbetalingen.filter((d) => d.id !== id),
      });
      setResult(null);
    } catch (err) {
      console.error(err);
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

      {/* Instellingen */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-serif">Instellingen</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Berekeningsparameters voor deze zaak
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Einddatum berekening</label>
              <Input
                type="date"
                value={caseData.einddatum}
                onChange={(e) => handleUpdateEinddatum(e.target.value)}
                className="w-full"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Toerekeningsstrategie</label>
              <Select value={caseData.strategie} onValueChange={(v) => handleUpdateStrategie(v as 'A' | 'B')} disabled={!canEdit}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">{STRATEGIE_LABELS.A}</SelectItem>
                  <SelectItem value="B">{STRATEGIE_LABELS.B}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vorderingen */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-serif">Vorderingen</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {caseData.vorderingen.length === 0
                ? 'Voeg vorderingen toe waarvoor rente berekend moet worden'
                : `${caseData.vorderingen.length} ${caseData.vorderingen.length === 1 ? 'vordering' : 'vorderingen'}`}
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openAddVordering} className="shadow-sm">
              + Toevoegen
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {caseData.vorderingen.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-3">
                Nog geen vorderingen toegevoegd
              </p>
              {canEdit && (
                <Button variant="outline" onClick={openAddVordering}>
                  + Eerste vordering toevoegen
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Kenmerk</TableHead>
                    <TableHead className="text-right font-semibold">Bedrag</TableHead>
                    <TableHead className="font-semibold">Startdatum</TableHead>
                    <TableHead className="font-semibold">Rentetype</TableHead>
                    <TableHead className="text-right font-semibold">Kosten</TableHead>
                    {canEdit && <TableHead className="w-[100px] text-center font-semibold">Acties</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caseData.vorderingen.map((v) => (
                    <TableRow key={v.id} className="group hover:bg-muted/30">
                      <TableCell className="font-medium">{v.kenmerk}</TableCell>
                      <TableCell className="text-right font-mono">{formatBedrag(v.bedrag)}</TableCell>
                      <TableCell>{formatDatum(v.datum)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal" title={RENTETYPE_LABELS[v.rentetype]}>
                          {RENTETYPE_SHORT[v.rentetype]}
                          {v.opslag && ` +${(v.opslag * 100).toFixed(0)}%`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatBedrag(v.kosten)}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1 justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditVordering(v)}
                              title="Bewerken"
                              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
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
                            >
                              <span className="text-base">×</span>
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
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
          {canEdit && (
            <Button size="sm" onClick={openAddDeelbetaling} className="shadow-sm">
              + Toevoegen
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {caseData.deelbetalingen.length === 0 ? (
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
                      <TableCell className="font-medium">{d.kenmerk || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{formatBedrag(d.bedrag)}</TableCell>
                      <TableCell>{formatDatum(d.datum)}</TableCell>
                      <TableCell>
                        {d.aangewezen.length > 0 ? (
                          <span className="text-sm">{d.aangewezen.join(', ')}</span>
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
                            >
                              <span className="text-base">×</span>
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
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
                <div className="text-sm font-semibold font-mono">{formatBedrag(result.totalen.rente)}</div>
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
                  <span className="font-mono font-medium">{formatBedrag(result.totalen.afgelost_rente)}</span>
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
                      <TableHead className="text-right font-semibold">Hoofdsom</TableHead>
                      <TableHead className="text-right font-semibold">Kosten</TableHead>
                      <TableHead className="text-right font-semibold">Rente</TableHead>
                      <TableHead className="text-right font-semibold">Afg. HS</TableHead>
                      <TableHead className="text-right font-semibold">Afg. Kst</TableHead>
                      <TableHead className="text-right font-semibold">Afg. Rnt</TableHead>
                      <TableHead className="text-right font-semibold">Openstaand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.vorderingen.map((v) => (
                      <TableRow key={v.kenmerk} className={v.status === 'VOLDAAN' ? 'bg-green-50' : ''}>
                        <TableCell className="font-medium">
                          {v.kenmerk}
                          {v.status === 'VOLDAAN' && (
                            <Badge className="ml-2 bg-green-100 text-green-700 border-green-300 text-xs">
                              Voldaan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatBedrag(v.oorspronkelijk_bedrag)}</TableCell>
                        <TableCell className="text-right font-mono">{formatBedrag(v.kosten)}</TableCell>
                        <TableCell className="text-right font-mono">{formatBedrag(v.totale_rente)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatBedrag(v.afgelost_hoofdsom)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatBedrag(v.afgelost_kosten)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatBedrag(v.afgelost_rente)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {v.status === 'VOLDAAN' ? (
                            <span className="text-green-600">€ 0,00</span>
                          ) : (
                            formatBedrag(v.openstaand)
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totaal rij */}
                    <TableRow className="bg-muted/70 font-semibold border-t-2">
                      <TableCell>Totaal</TableCell>
                      <TableCell className="text-right font-mono">{formatBedrag(result.totalen.oorspronkelijk)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBedrag(result.totalen.kosten)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBedrag(result.totalen.rente)}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">{formatBedrag(result.totalen.afgelost_hoofdsom)}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">{formatBedrag(result.totalen.afgelost_kosten)}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">{formatBedrag(result.totalen.afgelost_rente)}</TableCell>
                      <TableCell className="text-right font-mono text-primary">{formatBedrag(result.totalen.openstaand)}</TableCell>
                    </TableRow>
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
              {result.vorderingen.map((v, vIndex) => (
                <AccordionItem key={v.kenmerk} value={v.kenmerk} className={vIndex === 0 ? '' : 'border-t'}>
                  <AccordionTrigger className="hover:no-underline hover:bg-muted/30 px-4">
                    <div className="flex items-center gap-3 w-full">
                      <span className="font-medium">{v.kenmerk}</span>
                      {(() => {
                        const vordInfo = caseData.vorderingen.find(vd => vd.kenmerk === v.kenmerk);
                        if (vordInfo) {
                          return (
                            <Badge variant="outline" className="text-xs bg-muted/50">
                              {RENTETYPE_SHORT[vordInfo.rentetype] || `Type ${vordInfo.rentetype}`}
                              {vordInfo.opslag ? ` +${vordInfo.opslag > 1 ? vordInfo.opslag : vordInfo.opslag * 100}%` : ''}
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                      <Badge
                        variant={v.status === 'VOLDAAN' ? 'outline' : 'default'}
                        className={v.status === 'VOLDAAN' ? 'bg-green-50 text-green-700 border-green-300' : ''}
                      >
                        {v.status}
                      </Badge>
                      <span className="ml-auto mr-4 font-semibold font-mono">
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
                          <span className="text-xs text-muted-foreground block">Kosten</span>
                          <span className="font-medium font-mono">{formatBedrag(v.kosten)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Berekende rente</span>
                          <span className="font-medium font-mono">{formatBedrag(v.totale_rente)}</span>
                        </div>
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
                                    <TableRow className={p.is_kapitalisatie ? 'bg-blue-50' : ''}>
                                      <TableCell className="font-mono">
                                        {formatDatum(p.start)} - {formatDatum(p.eind)}
                                        {p.is_kapitalisatie && <span className="ml-1 text-blue-600 font-medium">↻</span>}
                                      </TableCell>
                                      <TableCell className="text-right font-mono">{p.dagen}</TableCell>
                                      <TableCell className="text-right font-mono">{formatBedrag(p.hoofdsom)}</TableCell>
                                      <TableCell className="text-right font-mono">{formatPercentage(p.rente_pct)}</TableCell>
                                      <TableCell className="text-right font-mono">{formatBedrag(p.rente)}</TableCell>
                                    </TableRow>
                                    {betalingOpEinddatum && toerekeningen.length > 0 && (
                                      <TableRow className="bg-green-100 border-l-4 border-l-green-500">
                                        <TableCell colSpan={5} className="py-2">
                                          <div className="flex items-center gap-2 text-green-800">
                                            <span className="font-bold text-lg">💰</span>
                                            <span className="font-medium font-mono">
                                              Betaling {betalingOpEinddatum.kenmerk || ''} op {formatDatum(betalingOpEinddatum.datum)}:
                                            </span>
                                            <span className="ml-2 font-mono">
                                              {toerekeningen.map((t, ti) => (
                                                <span key={ti} className="mr-3">
                                                  <span className="text-green-600">{t.type}:</span>{' '}
                                                  <strong>{formatBedrag(t.bedrag)}</strong>
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
                          <div className="flex gap-4 text-xs text-muted-foreground mt-2 px-1">
                            <span><span className="text-blue-600">↻</span> = kapitalisatie (rente bij hoofdsom)</span>
                            <span><span className="text-green-600">💰</span> = betaling ontvangen</span>
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
            <div>
              <label className="text-sm font-medium">Kenmerk *</label>
              <Input
                value={vorderingForm.kenmerk}
                onChange={(e) => setVorderingForm({ ...vorderingForm, kenmerk: e.target.value })}
                placeholder="FAC-2024-001"
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
            <div>
              <label className="text-sm font-medium">Kosten (BIK, proceskosten)</label>
              <Input
                type="number"
                step="0.01"
                value={vorderingForm.kosten}
                onChange={(e) => setVorderingForm({ ...vorderingForm, kosten: e.target.value })}
                placeholder="0.00"
              />
            </div>
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
            <Button variant="outline" onClick={() => setVorderingDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveVordering}
              disabled={!vorderingForm.kenmerk || !vorderingForm.bedrag || !vorderingForm.datum}
            >
              {editingVordering ? 'Opslaan' : 'Toevoegen'}
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
            <Button variant="outline" onClick={() => setDeelbetalingDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveDeelbetaling}
              disabled={!deelbetalingForm.bedrag || !deelbetalingForm.datum}
            >
              {editingDeelbetaling ? 'Opslaan' : 'Toevoegen'}
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
