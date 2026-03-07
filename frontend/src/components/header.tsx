'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { checkAdmin, type AdminCheckResponse } from '@/lib/api';

export function Header() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [adminStatus, setAdminStatus] = useState<AdminCheckResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && !loading) {
      checkAdmin().then(setAdminStatus).catch(() => setAdminStatus(null));
    } else {
      setAdminStatus(null);
    }
  }, [user, loading]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const hasAdminAccess = adminStatus?.is_admin || adminStatus?.is_org_admin;

  const handleSignOut = async () => {
    setMenuOpen(false);
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
            <span className="text-xs opacity-70 leading-tight hidden sm:block">Wettelijke Rente Calculator</span>
          </div>
        </a>
        <nav className="ml-auto flex items-center space-x-2">
          {!loading && (
            <>
              {user ? (
                <>
                  {/* Desktop nav */}
                  <div className="hidden sm:flex items-center space-x-2">
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
                        <span className="mr-1">&#x2699;</span> Beheer
                      </Button>
                    )}
                    <span className="text-sm opacity-70">
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
                  </div>

                  {/* Mobile hamburger */}
                  <div className="sm:hidden relative" ref={menuRef}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="text-primary-foreground hover:bg-white/10 p-2"
                      aria-label="Menu"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {menuOpen ? (
                          <>
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </>
                        ) : (
                          <>
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                          </>
                        )}
                      </svg>
                    </Button>
                    {menuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover text-popover-foreground shadow-lg py-1 z-50">
                        <div className="px-3 py-2 text-xs text-muted-foreground border-b truncate">
                          {user.email}
                        </div>
                        <button
                          onClick={() => { setMenuOpen(false); router.push('/help'); }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          ? Help
                        </button>
                        {hasAdminAccess && (
                          <button
                            onClick={() => { setMenuOpen(false); router.push('/admin'); }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                          >
                            &#x2699; Beheer
                          </button>
                        )}
                        <div className="border-t my-1" />
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors text-destructive"
                        >
                          Uitloggen
                        </button>
                      </div>
                    )}
                  </div>
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
