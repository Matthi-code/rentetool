'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { checkAdmin, getAdminStats, getAdminUsers, getAdminCases, getAdminUsageLogs, type AdminStats, type UserStats, type AdminCase, type AdminUsageLog } from '@/lib/api';
import { formatDatum, formatBedrag } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

type ActiveView = 'users' | 'cases' | 'calculations' | 'pdf_views';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [usageLogs, setUsageLogs] = useState<AdminUsageLog[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('users');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      verifyAdminAndLoad();
    }
  }, [user, authLoading, router]);

  async function verifyAdminAndLoad() {
    try {
      const adminStatus = await checkAdmin();
      setIsAdmin(adminStatus);

      if (adminStatus) {
        const [statsData, usersData] = await Promise.all([
          getAdminStats(),
          getAdminUsers(),
        ]);
        setStats(statsData);
        setUsers(usersData);
      }
    } catch (err) {
      setError('Kon admin gegevens niet laden');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewChange(view: ActiveView) {
    setActiveView(view);
    setDetailLoading(true);
    try {
      if (view === 'cases' && cases.length === 0) {
        const casesData = await getAdminCases();
        setCases(casesData);
      } else if ((view === 'calculations' || view === 'pdf_views') && usageLogs.length === 0) {
        const logsData = await getAdminUsageLogs();
        setUsageLogs(logsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  const filteredLogs = usageLogs.filter(log =>
    activeView === 'calculations' ? log.action_type === 'calculation' : log.action_type === 'pdf_view'
  );

  // Group users by domain with totals
  const usersByDomain = users.reduce((acc, user) => {
    const domain = user.email_domain;
    if (!acc[domain]) {
      acc[domain] = { users: [], totalCalcs: 0, totalPdfs: 0 };
    }
    acc[domain].users.push(user);
    acc[domain].totalCalcs += user.calculations_count;
    acc[domain].totalPdfs += user.pdf_views_count;
    return acc;
  }, {} as Record<string, { users: UserStats[]; totalCalcs: number; totalPdfs: number }>);

  const sortedDomains = Object.keys(usersByDomain).sort((a, b) =>
    usersByDomain[b].users.length - usersByDomain[a].users.length
  );

  if (authLoading || loading) {
    return (
      <div className="container py-8 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-3">⟳</div>
            <div className="text-muted-foreground">
              {authLoading ? 'Authenticatie controleren...' : 'Admin gegevens laden...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isAdmin === false) {
    return (
      <div className="container py-8 max-w-6xl mx-auto px-4">
        <Card className="border-destructive">
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="font-serif text-2xl font-bold text-destructive mb-2">
              Geen Toegang
            </h2>
            <p className="text-muted-foreground mb-6">
              U heeft geen admin rechten om deze pagina te bekijken.
            </p>
            <Button onClick={() => router.push('/')}>
              Terug naar Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto px-4">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">Beheer</h1>
          <p className="text-muted-foreground mt-1">Systeem overzicht en gebruikersbeheer</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          ← Terug
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeView === 'users' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleViewChange('users')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gebruikers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_users}</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeView === 'cases' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleViewChange('cases')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Zaken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_cases}</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeView === 'calculations' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleViewChange('calculations')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Berekeningen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_calculations}</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeView === 'pdf_views' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleViewChange('pdf_views')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                PDF Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_pdf_views}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Tables */}
      {detailLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-spin text-2xl mb-2">⟳</div>
            <div className="text-muted-foreground">Laden...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Users Table - Grouped by Domain */}
          {activeView === 'users' && (
            <div className="space-y-4">
              {sortedDomains.map((domain) => {
                const domainData = usersByDomain[domain];
                const isExpanded = expandedDomain === domain;
                return (
                  <Card key={domain} className="overflow-hidden">
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedDomain(isExpanded ? null : domain)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                          <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium">
                            {domain}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {domainData.users.length} {domainData.users.length === 1 ? 'gebruiker' : 'gebruikers'}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-lg">{domainData.totalCalcs}</div>
                            <div className="text-muted-foreground text-xs">Berekeningen</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg">{domainData.totalPdfs}</div>
                            <div className="text-muted-foreground text-xs">PDF Views</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <CardContent className="pt-0 border-t">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead>Email</TableHead>
                                <TableHead>Naam</TableHead>
                                <TableHead className="text-center">Zaken</TableHead>
                                <TableHead className="text-center">Berekeningen</TableHead>
                                <TableHead className="text-center">PDF Views</TableHead>
                                <TableHead>Laatste activiteit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {domainData.users.map((u) => (
                                <TableRow key={u.id}>
                                  <TableCell className="font-medium">{u.email}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {u.display_name || '-'}
                                  </TableCell>
                                  <TableCell className="text-center">{u.cases_count}</TableCell>
                                  <TableCell className="text-center font-mono">{u.calculations_count}</TableCell>
                                  <TableCell className="text-center font-mono">{u.pdf_views_count}</TableCell>
                                  <TableCell>
                                    {u.last_activity ? formatDatum(u.last_activity) : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
              {users.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Geen gebruikers gevonden
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Cases Table */}
          {activeView === 'cases' && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Zaken</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Naam</TableHead>
                        <TableHead>Eigenaar</TableHead>
                        <TableHead>Referentie</TableHead>
                        <TableHead className="text-center">Vorderingen</TableHead>
                        <TableHead className="text-center">Betalingen</TableHead>
                        <TableHead>Einddatum</TableHead>
                        <TableHead>Aangemaakt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cases.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.naam}</TableCell>
                          <TableCell className="text-muted-foreground">{c.owner_email}</TableCell>
                          <TableCell>{c.klant_referentie || '-'}</TableCell>
                          <TableCell className="text-center">{c.vorderingen_count}</TableCell>
                          <TableCell className="text-center">{c.deelbetalingen_count}</TableCell>
                          <TableCell>{formatDatum(c.einddatum)}</TableCell>
                          <TableCell>{formatDatum(c.created_at)}</TableCell>
                        </TableRow>
                      ))}
                      {cases.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Geen zaken gevonden
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Logs Table (Calculations or PDF Views) */}
          {(activeView === 'calculations' || activeView === 'pdf_views') && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">
                  {activeView === 'calculations' ? 'Berekeningen' : 'PDF Views'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Gebruiker</TableHead>
                        <TableHead>Zaak</TableHead>
                        <TableHead>Datum/Tijd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.user_email}</TableCell>
                          <TableCell>{log.case_name || '-'}</TableCell>
                          <TableCell>{formatDatum(log.created_at)}</TableCell>
                        </TableRow>
                      ))}
                      {filteredLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            Geen {activeView === 'calculations' ? 'berekeningen' : 'PDF views'} gevonden
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
