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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  checkAdmin,
  getAdminStats,
  getAdminUsers,
  getAdminCases,
  getAdminUsageLogs,
  getDomainStats,
  assignRole,
  removeRole,
  type AdminStats,
  type UserStats,
  type AdminCase,
  type AdminUsageLog,
  type AdminCheckResponse,
  type UserRole,
  type DomainOverview,
} from '@/lib/api';
import { formatDatum, formatDatumTijd } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ActiveTab = 'dashboard' | 'users' | 'domains' | 'activity';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  org_admin: 'Org Beheerder',
  user: 'Gebruiker',
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [adminStatus, setAdminStatus] = useState<AdminCheckResponse | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cachedAdminStatus');
      if (cached) try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });
  const [stats, setStats] = useState<AdminStats | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cachedAdminStats');
      if (cached) try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });
  const [domainStats, setDomainStats] = useState<DomainOverview | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cachedDomainStats');
      if (cached) try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });
  const [users, setUsers] = useState<UserStats[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cachedAdminUsers');
      if (cached) try { return JSON.parse(cached); } catch { return []; }
    }
    return [];
  });
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [usageLogs, setUsageLogs] = useState<AdminUsageLog[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

  // Activity tab state
  const [activityDomainFilter, setActivityDomainFilter] = useState<string>('all');
  const [activitySortOrder, setActivitySortOrder] = useState<'desc' | 'asc'>('desc');
  type ActivitySortField = 'user_email' | 'user_domain' | 'case_name' | 'created_at';
  const [activitySortField, setActivitySortField] = useState<ActivitySortField>('created_at');

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
      const status = await checkAdmin();
      setAdminStatus(status);
      localStorage.setItem('cachedAdminStatus', JSON.stringify(status));

      if (status.is_admin || status.is_org_admin) {
        const [statsData, usersData, domainData] = await Promise.all([
          getAdminStats().catch(() => null),
          getAdminUsers(),
          status.is_admin ? getDomainStats().catch(() => null) : Promise.resolve(null),
        ]);
        if (statsData) {
          setStats(statsData);
          localStorage.setItem('cachedAdminStats', JSON.stringify(statsData));
        }
        if (domainData) {
          setDomainStats(domainData);
          localStorage.setItem('cachedDomainStats', JSON.stringify(domainData));
        }
        setUsers(usersData);
        localStorage.setItem('cachedAdminUsers', JSON.stringify(usersData));
      }
    } catch (err) {
      setError('Kon admin gegevens niet laden');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, currentRoles: string[], newRole: UserRole) {
    if (roleUpdating) return;

    const roleLabel = ROLE_LABELS[newRole] || newRole;
    if (!confirm(`Weet u zeker dat u de rol "${roleLabel}" wilt toekennen?`)) {
      return;
    }

    setRoleUpdating(userId);
    try {
      for (const role of currentRoles) {
        if (role !== newRole && role !== 'user') {
          await removeRole(userId, role);
        }
      }

      if (!currentRoles.includes(newRole)) {
        await assignRole(userId, newRole);
      }

      const usersData = await getAdminUsers();
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to update role:', err);
      setError('Kon rol niet wijzigen');
    } finally {
      setRoleUpdating(null);
    }
  }

  function getPrimaryRole(roles: string[]): string {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('org_admin')) return 'org_admin';
    return 'user';
  }

  async function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    setTabLoading(true);
    try {
      if (tab === 'activity' && usageLogs.length === 0) {
        const [casesData, logsData] = await Promise.all([
          cases.length === 0 ? getAdminCases() : Promise.resolve(cases),
          getAdminUsageLogs(),
        ]);
        if (casesData !== cases) setCases(casesData);
        setUsageLogs(logsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTabLoading(false);
    }
  }

  // Group users by domain
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

  // Show cached content immediately if available
  const hasCachedData = adminStatus !== null && users.length > 0;
  if ((authLoading || loading) && !hasCachedData) {
    return (
      <div className="container py-8 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-3">&#x27F3;</div>
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

  const isAdmin = adminStatus?.is_admin ?? false;
  const isOrgAdmin = adminStatus?.is_org_admin ?? false;
  const hasAccess = isAdmin || isOrgAdmin;

  if (adminStatus && !hasAccess) {
    return (
      <div className="container py-8 max-w-6xl mx-auto px-4">
        <Card className="border-destructive">
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">&#x1F6AB;</div>
            <h2 className="font-serif text-2xl font-bold text-destructive mb-2">
              Geen Toegang
            </h2>
            <p className="text-muted-foreground mb-6">
              U heeft geen beheerrechten om deze pagina te bekijken.
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
          <h1 className="font-serif text-3xl font-bold text-primary">
            Beheer
            {loading && hasCachedData && (
              <span className="ml-2 text-sm font-normal text-muted-foreground animate-pulse">
                &#x27F3;
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Systeem overzicht en gebruikersbeheer' : `Organisatie beheer (${adminStatus?.domain})`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${isAdmin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
            {isAdmin ? 'Admin' : 'Org Beheerder'}
          </span>
          <Button variant="outline" onClick={() => router.push('/')}>
            &#x2190; Terug
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as ActiveTab)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Gebruikers</TabsTrigger>
          {isAdmin && <TabsTrigger value="domains">Domeinen</TabsTrigger>}
          <TabsTrigger value="activity">Activiteit</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Gebruikers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.total_users}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Zaken
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.total_cases}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Berekeningen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.total_calculations}</div>
                </CardContent>
              </Card>
              <Card>
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

          {/* Domain Overview (Admin only) */}
          {isAdmin && domainStats && (
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">
                    Totaal Domeinen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{domainStats.total_domains}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">
                    Organisaties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900">{domainStats.organization_domains}</div>
                  <p className="text-xs text-green-600 mt-1">Zakelijke domeinen</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Consumer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{domainStats.consumer_domains}</div>
                  <p className="text-xs text-gray-600 mt-1">Gmail, Outlook, etc.</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Domain List */}
          {isAdmin && domainStats && domainStats.domains.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Domeinen Overzicht</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Domein</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Gebruikers</TableHead>
                        <TableHead className="text-center">Zaken</TableHead>
                        <TableHead className="text-center">Berekeningen</TableHead>
                        <TableHead>Org Admin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {domainStats.domains.slice(0, 10).map((d) => (
                        <TableRow key={d.domain}>
                          <TableCell className="font-medium">{d.domain}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              d.is_consumer
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {d.is_consumer ? 'Consumer' : 'Organisatie'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{d.users_count}</TableCell>
                          <TableCell className="text-center">{d.cases_count}</TableCell>
                          <TableCell className="text-center">{d.calculations_count}</TableCell>
                          <TableCell>
                            {d.has_org_admin ? (
                              <span className="text-green-600">&#x2713;</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {domainStats.domains.length > 10 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={() => setActiveTab('domains')}>
                      Bekijk alle {domainStats.domains.length} domeinen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
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
                              <TableHead>Rol</TableHead>
                              <TableHead className="text-center">Zaken</TableHead>
                              <TableHead className="text-center">Berekeningen</TableHead>
                              <TableHead className="text-center">PDF Views</TableHead>
                              <TableHead>Laatste activiteit</TableHead>
                              {isAdmin && <TableHead className="text-center">Acties</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {domainData.users.map((u) => {
                              const primaryRole = getPrimaryRole(u.roles);
                              const canChangeRole = isAdmin || (isOrgAdmin && primaryRole !== 'admin');
                              const isCurrentUser = u.id === user?.id;

                              return (
                                <TableRow key={u.id}>
                                  <TableCell className="font-medium">{u.email}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {u.display_name || '-'}
                                  </TableCell>
                                  <TableCell>
                                    {canChangeRole && !isCurrentUser ? (
                                      <Select
                                        value={primaryRole}
                                        onValueChange={(value) => handleRoleChange(u.id, u.roles, value as UserRole)}
                                        disabled={roleUpdating === u.id}
                                      >
                                        <SelectTrigger className="w-[140px] h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                                          <SelectItem value="org_admin">Org Beheerder</SelectItem>
                                          <SelectItem value="user">Gebruiker</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        primaryRole === 'admin' ? 'bg-red-100 text-red-800' :
                                        primaryRole === 'org_admin' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {ROLE_LABELS[primaryRole] || primaryRole}
                                        {isCurrentUser && ' (jij)'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">{u.cases_count}</TableCell>
                                  <TableCell className="text-center font-mono">{u.calculations_count}</TableCell>
                                  <TableCell className="text-center font-mono">{u.pdf_views_count}</TableCell>
                                  <TableCell>
                                    {u.last_activity ? formatDatum(u.last_activity) : '-'}
                                  </TableCell>
                                  {isAdmin && (
                                    <TableCell className="text-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.push(`/admin/user/${u.id}`)}
                                        className="h-7 px-2 text-xs"
                                      >
                                        Bekijk &#x2192;
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
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
        </TabsContent>

        {/* Domains Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="domains">
            {domainStats ? (
              <div className="space-y-6">
                {/* Organization Domains */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      Organisaties ({domainStats.organization_domains})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Domein</TableHead>
                            <TableHead className="text-center">Gebruikers</TableHead>
                            <TableHead className="text-center">Zaken</TableHead>
                            <TableHead className="text-center">Berekeningen</TableHead>
                            <TableHead className="text-center">PDF Views</TableHead>
                            <TableHead>Org Admin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {domainStats.domains
                            .filter((d) => !d.is_consumer)
                            .map((d) => (
                              <TableRow key={d.domain}>
                                <TableCell className="font-medium">{d.domain}</TableCell>
                                <TableCell className="text-center">{d.users_count}</TableCell>
                                <TableCell className="text-center">{d.cases_count}</TableCell>
                                <TableCell className="text-center font-mono">{d.calculations_count}</TableCell>
                                <TableCell className="text-center font-mono">{d.pdf_views_count}</TableCell>
                                <TableCell>
                                  {d.has_org_admin ? (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                      Toegewezen
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                      Niet ingesteld
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          {domainStats.domains.filter((d) => !d.is_consumer).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                Geen organisatie-domeinen gevonden
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Consumer Domains */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                      Consumer Domeinen ({domainStats.consumer_domains})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Domein</TableHead>
                            <TableHead className="text-center">Gebruikers</TableHead>
                            <TableHead className="text-center">Zaken</TableHead>
                            <TableHead className="text-center">Berekeningen</TableHead>
                            <TableHead className="text-center">PDF Views</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {domainStats.domains
                            .filter((d) => d.is_consumer)
                            .map((d) => (
                              <TableRow key={d.domain} className="text-muted-foreground">
                                <TableCell className="font-medium">{d.domain}</TableCell>
                                <TableCell className="text-center">{d.users_count}</TableCell>
                                <TableCell className="text-center">{d.cases_count}</TableCell>
                                <TableCell className="text-center font-mono">{d.calculations_count}</TableCell>
                                <TableCell className="text-center font-mono">{d.pdf_views_count}</TableCell>
                              </TableRow>
                            ))}
                          {domainStats.domains.filter((d) => d.is_consumer).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                Geen consumer-domeinen gevonden
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Domein statistieken laden...
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Activity Tab */}
        <TabsContent value="activity">
          {tabLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="animate-spin text-2xl mb-2">&#x27F3;</div>
                <div className="text-muted-foreground">Laden...</div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Filter op domein:</span>
                      <Select value={activityDomainFilter} onValueChange={setActivityDomainFilter}>
                        <SelectTrigger className="w-[200px] h-9">
                          <SelectValue placeholder="Alle domeinen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle domeinen</SelectItem>
                          {Array.from(new Set(usageLogs.map(l => l.user_domain).filter((d): d is string => d !== null))).sort().map(domain => (
                            <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Calculations */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Recente Berekeningen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>
                            <button
                              onClick={() => { setActivitySortField('user_email'); setActivitySortOrder(prev => activitySortField === 'user_email' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                              className={`flex items-center gap-1 hover:text-primary ${activitySortField === 'user_email' ? 'text-primary font-semibold' : ''}`}
                            >
                              Gebruiker {activitySortField === 'user_email' && (activitySortOrder === 'asc' ? '↑' : '↓')}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => { setActivitySortField('user_domain'); setActivitySortOrder(prev => activitySortField === 'user_domain' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                              className={`flex items-center gap-1 hover:text-primary ${activitySortField === 'user_domain' ? 'text-primary font-semibold' : ''}`}
                            >
                              Domein {activitySortField === 'user_domain' && (activitySortOrder === 'asc' ? '↑' : '↓')}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => { setActivitySortField('case_name'); setActivitySortOrder(prev => activitySortField === 'case_name' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                              className={`flex items-center gap-1 hover:text-primary ${activitySortField === 'case_name' ? 'text-primary font-semibold' : ''}`}
                            >
                              Zaak {activitySortField === 'case_name' && (activitySortOrder === 'asc' ? '↑' : '↓')}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => { setActivitySortField('created_at'); setActivitySortOrder(prev => activitySortField === 'created_at' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'); }}
                              className={`flex items-center gap-1 hover:text-primary ${activitySortField === 'created_at' ? 'text-primary font-semibold' : ''}`}
                            >
                              Datum/Tijd {activitySortField === 'created_at' && (activitySortOrder === 'asc' ? '↑' : '↓')}
                            </button>
                          </TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageLogs
                          .filter((log) => log.action_type === 'calculation')
                          .filter((log) => activityDomainFilter === 'all' || log.user_domain === activityDomainFilter)
                          .sort((a, b) => {
                            let comparison = 0;
                            switch (activitySortField) {
                              case 'user_email':
                                comparison = (a.user_email || '').localeCompare(b.user_email || '');
                                break;
                              case 'user_domain':
                                comparison = (a.user_domain || '').localeCompare(b.user_domain || '');
                                break;
                              case 'case_name':
                                comparison = (a.case_name || '').localeCompare(b.case_name || '');
                                break;
                              case 'created_at':
                                comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                                break;
                            }
                            return activitySortOrder === 'asc' ? comparison : -comparison;
                          })
                          .slice(0, 50)
                          .map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium">{log.user_email}</TableCell>
                              <TableCell className="text-muted-foreground">{log.user_domain || '-'}</TableCell>
                              <TableCell>{log.case_name || '-'}</TableCell>
                              <TableCell className="font-mono text-sm">{formatDatumTijd(log.created_at)}</TableCell>
                              <TableCell>
                                {log.case_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/case/${log.case_id}`)}
                                    className="h-8"
                                  >
                                    Openen →
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        {usageLogs.filter((log) => log.action_type === 'calculation').filter((log) => activityDomainFilter === 'all' || log.user_domain === activityDomainFilter).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Geen berekeningen gevonden
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Recent PDF Views */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Recente PDF Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>
                            <button
                              onClick={() => { setActivitySortField('user_email'); setActivitySortOrder(prev => activitySortField === 'user_email' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                              className={`flex items-center gap-1 hover:text-primary ${activitySortField === 'user_email' ? 'text-primary font-semibold' : ''}`}
                            >
                              Gebruiker {activitySortField === 'user_email' && (activitySortOrder === 'asc' ? '↑' : '↓')}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => { setActivitySortField('user_domain'); setActivitySortOrder(prev => activitySortField === 'user_domain' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                              className={`flex items-center gap-1 hover:text-primary ${activitySortField === 'user_domain' ? 'text-primary font-semibold' : ''}`}
                            >
                              Domein {activitySortField === 'user_domain' && (activitySortOrder === 'asc' ? '↑' : '↓')}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => { setActivitySortField('case_name'); setActivitySortOrder(prev => activitySortField === 'case_name' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}
                              className={`flex items-center gap-1 hover:text-primary ${activitySortField === 'case_name' ? 'text-primary font-semibold' : ''}`}
                            >
                              Zaak {activitySortField === 'case_name' && (activitySortOrder === 'asc' ? '↑' : '↓')}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => { setActivitySortField('created_at'); setActivitySortOrder(prev => activitySortField === 'created_at' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'); }}
                              className={`flex items-center gap-1 hover:text-primary ${activitySortField === 'created_at' ? 'text-primary font-semibold' : ''}`}
                            >
                              Datum/Tijd {activitySortField === 'created_at' && (activitySortOrder === 'asc' ? '↑' : '↓')}
                            </button>
                          </TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageLogs
                          .filter((log) => log.action_type === 'pdf_view')
                          .filter((log) => activityDomainFilter === 'all' || log.user_domain === activityDomainFilter)
                          .sort((a, b) => {
                            let comparison = 0;
                            switch (activitySortField) {
                              case 'user_email':
                                comparison = (a.user_email || '').localeCompare(b.user_email || '');
                                break;
                              case 'user_domain':
                                comparison = (a.user_domain || '').localeCompare(b.user_domain || '');
                                break;
                              case 'case_name':
                                comparison = (a.case_name || '').localeCompare(b.case_name || '');
                                break;
                              case 'created_at':
                                comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                                break;
                            }
                            return activitySortOrder === 'asc' ? comparison : -comparison;
                          })
                          .slice(0, 50)
                          .map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium">{log.user_email}</TableCell>
                              <TableCell className="text-muted-foreground">{log.user_domain || '-'}</TableCell>
                              <TableCell>{log.case_name || '-'}</TableCell>
                              <TableCell className="font-mono text-sm">{formatDatumTijd(log.created_at)}</TableCell>
                              <TableCell>
                                {log.case_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/case/${log.case_id}`)}
                                    className="h-8"
                                  >
                                    Openen →
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        {usageLogs.filter((log) => log.action_type === 'pdf_view').filter((log) => activityDomainFilter === 'all' || log.user_domain === activityDomainFilter).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Geen PDF views gevonden
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
