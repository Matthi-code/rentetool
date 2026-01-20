'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import {
  checkAdmin,
  viewAsUser,
  type ViewAsUserResponse,
  type AdminCheckResponse,
} from '@/lib/api';
import { formatDatum } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { STRATEGIE_LABELS } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  org_admin: 'Org Beheerder',
  user: 'Gebruiker',
};

export default function ViewAsUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [adminStatus, setAdminStatus] = useState<AdminCheckResponse | null>(null);
  const [userData, setUserData] = useState<ViewAsUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && userId) {
      loadData();
    }
  }, [user, authLoading, userId, router]);

  async function loadData() {
    try {
      const status = await checkAdmin();
      setAdminStatus(status);

      if (!status.is_admin) {
        setError('Alleen admins kunnen deze pagina bekijken');
        setLoading(false);
        return;
      }

      const data = await viewAsUser(userId);
      setUserData(data);
    } catch (err) {
      console.error(err);
      setError('Kon gebruikersgegevens niet laden');
    } finally {
      setLoading(false);
    }
  }

  function getPrimaryRole(roles: string[]): string {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('org_admin')) return 'org_admin';
    return 'user';
  }

  if (authLoading || loading) {
    return (
      <div className="container py-8 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-3">&#x27F3;</div>
            <div className="text-muted-foreground">Gebruikersgegevens laden...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !adminStatus?.is_admin) {
    return (
      <div className="container py-8 max-w-6xl mx-auto px-4">
        <Card className="border-destructive">
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">&#x1F6AB;</div>
            <h2 className="font-serif text-2xl font-bold text-destructive mb-2">
              {error || 'Geen Toegang'}
            </h2>
            <Button onClick={() => router.push('/admin')} className="mt-4">
              Terug naar Beheer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const { user: viewedUser, cases, stats } = userData;
  const primaryRole = getPrimaryRole(viewedUser.roles);

  return (
    <div className="container py-8 max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="h-6 px-2">
              &#x2190; Beheer
            </Button>
            <span>/</span>
            <span>Bekijk als gebruiker</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-primary">{viewedUser.email}</h1>
          <p className="text-muted-foreground mt-1">
            {viewedUser.display_name || 'Geen weergavenaam'} &middot; {viewedUser.email_domain}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${
            primaryRole === 'admin' ? 'bg-red-100 text-red-800' :
            primaryRole === 'org_admin' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {ROLE_LABELS[primaryRole] || primaryRole}
          </Badge>
        </div>
      </div>

      {/* Stats Cards - Like user's dashboard */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zaken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.cases_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Berekeningen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.calculations_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PDF Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pdf_views_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif">Gebruikersinformatie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{viewedUser.email}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Domein</div>
              <div className="font-medium">{viewedUser.email_domain}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Aangemeld sinds</div>
              <div className="font-medium">{formatDatum(viewedUser.created_at)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Rollen</div>
              <div className="flex gap-1 flex-wrap">
                {viewedUser.roles.map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {ROLE_LABELS[role] || role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table - What the user sees */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Zaken van deze gebruiker</CardTitle>
        </CardHeader>
        <CardContent>
          {cases.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Naam</TableHead>
                    <TableHead>Referentie</TableHead>
                    <TableHead>Strategie</TableHead>
                    <TableHead className="text-center">Vorderingen</TableHead>
                    <TableHead className="text-center">Betalingen</TableHead>
                    <TableHead>Einddatum</TableHead>
                    <TableHead>Laatst gewijzigd</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{c.naam}</TableCell>
                      <TableCell className="text-muted-foreground">{c.klant_referentie || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {c.strategie}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{c.vorderingen_count}</TableCell>
                      <TableCell className="text-center">{c.deelbetalingen_count}</TableCell>
                      <TableCell>{formatDatum(c.einddatum)}</TableCell>
                      <TableCell>{formatDatum(c.updated_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/case/${c.id}`)}
                          className="h-8"
                        >
                          Openen &#x2192;
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <div className="text-4xl mb-3">&#x1F4C1;</div>
              <p>Deze gebruiker heeft nog geen zaken aangemaakt.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
