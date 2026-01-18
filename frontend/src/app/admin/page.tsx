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
import { checkAdmin, getAdminStats, getAdminUsers, type AdminStats, type UserStats } from '@/lib/api';
import { formatDatum } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Gebruikers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Email</TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead>Domein</TableHead>
                  <TableHead className="text-center">Zaken</TableHead>
                  <TableHead className="text-center">Gedeeld</TableHead>
                  <TableHead>Geregistreerd</TableHead>
                  <TableHead>Laatste activiteit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.display_name || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="bg-muted px-2 py-0.5 rounded text-xs">
                        {u.email_domain}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{u.cases_count}</TableCell>
                    <TableCell className="text-center">{u.shared_with_count}</TableCell>
                    <TableCell>{formatDatum(u.created_at)}</TableCell>
                    <TableCell>
                      {u.last_activity ? formatDatum(u.last_activity) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Geen gebruikers gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
