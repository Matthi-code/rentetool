'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { checkAdmin, type AdminCheckResponse } from '@/lib/api';

export function Header() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [adminStatus, setAdminStatus] = useState<AdminCheckResponse | null>(null);

  useEffect(() => {
    if (user && !loading) {
      checkAdmin().then(setAdminStatus).catch(() => setAdminStatus(null));
    } else {
      setAdminStatus(null);
    }
  }, [user, loading]);

  const hasAdminAccess = adminStatus?.is_admin || adminStatus?.is_org_admin;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
      <div className="container flex h-16 items-center px-4 max-w-6xl mx-auto">
        <a href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors overflow-hidden">
            <Image src="/gans.png" alt="Rentetool" width={32} height={32} />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg leading-tight">Rentetool</span>
            <span className="text-xs opacity-70 leading-tight">Wettelijke Rente Calculator</span>
          </div>
        </a>
        <nav className="ml-auto flex items-center space-x-2">
          {!loading && (
            <>
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/help')}
                    className="text-primary-foreground hover:bg-white/10"
                  >
                    <span className="mr-1">?</span> Help
                  </Button>
                  {hasAdminAccess && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/admin')}
                      className="text-primary-foreground hover:bg-white/10"
                    >
                      <span className="mr-1">⚙</span> Beheer
                    </Button>
                  )}
                  <span className="text-sm opacity-70 hidden sm:block">
                    {user.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-primary-foreground hover:bg-white/10"
                  >
                    Uitloggen
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="text-primary-foreground hover:bg-white/10"
                >
                  Inloggen
                </Button>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
