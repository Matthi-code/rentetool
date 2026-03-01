'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, signInWithMagicLink, signUp, resetPassword, updatePassword, isPasswordRecovery } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [isSetNewPassword, setIsSetNewPassword] = useState(false);

  // Auto-detect password recovery from auth context
  useEffect(() => {
    if (isPasswordRecovery) {
      console.log('Setting isSetNewPassword from isPasswordRecovery');
      setIsSetNewPassword(true);
    }
  }, [isPasswordRecovery]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [freeTrialSubmitting, setFreeTrialSubmitting] = useState(false);
  const [freeTrialMessage, setFreeTrialMessage] = useState<string | null>(null);
  const [freeTrialError, setFreeTrialError] = useState<string | null>(null);

  // Check for password reset token or errors in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);

      console.log('URL hash:', hash);
      console.log('URL search:', window.location.search);

      // Check for recovery token in hash (multiple formats)
      if (hash) {
        if (hash.includes('type=recovery')) {
          setIsSetNewPassword(true);
        }
        // Also check hash params
        const hashParams = new URLSearchParams(hash.substring(1));
        if (hashParams.get('type') === 'recovery') {
          setIsSetNewPassword(true);
        }
      }

      // Check for reset=true in query params (our redirect indicator)
      if (params.get('reset') === 'true' && !params.get('error_code')) {
        // User came from reset link, check if we have a session
        setIsSetNewPassword(true);
      }

      // Check for errors from Supabase redirect
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');
      if (errorCode === 'otp_expired') {
        setError('De reset link is verlopen. Vraag een nieuwe aan.');
        setIsResetPassword(true);
      } else if (errorCode) {
        setError(errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : 'Er is een fout opgetreden');
      }
    }
  }, []);

  useEffect(() => {
    // Don't redirect if user is setting new password or in password recovery mode
    if (!loading && user && !isSetNewPassword && !isPasswordRecovery) {
      router.push('/');
    }
  }, [user, loading, router, isSetNewPassword, isPasswordRecovery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (isSetNewPassword) {
        if (password !== confirmPassword) {
          setError('Wachtwoorden komen niet overeen');
          return;
        }
        if (password.length < 6) {
          setError('Wachtwoord moet minimaal 6 tekens zijn');
          return;
        }
        const { error } = await updatePassword(password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Wachtwoord succesvol gewijzigd!');
          // Clear URL hash and redirect after short delay
          window.location.hash = '';
          setTimeout(() => router.push('/'), 1500);
        }
      } else if (isResetPassword) {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Wachtwoord reset e-mail verzonden. Controleer uw inbox.');
        }
      } else if (isMagicLink) {
        const { error } = await signInWithMagicLink(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Login link verzonden! Controleer uw inbox.');
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          router.push('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Account aangemaakt. Controleer uw e-mail voor verificatie.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8 max-w-md mx-auto px-4">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-3">⟳</div>
            <div className="text-muted-foreground">Laden...</div>
          </div>
        </div>
      </div>
    );
  }

  const showFreeTrialCard = isLogin && !isSetNewPassword && !isResetPassword && !isMagicLink;

  const handleFreeTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFreeTrialError(null);
    setFreeTrialMessage(null);
    setFreeTrialSubmitting(true);
    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        setFreeTrialError(error.message);
      } else {
        setFreeTrialMessage('Link verzonden! Controleer uw inbox.');
      }
    } finally {
      setFreeTrialSubmitting(false);
    }
  };

  return (
    <div className="container py-8 max-w-md mx-auto px-4">
      {/* Decorative goose */}
      <div className="flex justify-center mb-6">
        <Image src="/gans.png" alt="Rentetool" width={120} height={120} className="opacity-80" />
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl">
            {isSetNewPassword
              ? 'Nieuw wachtwoord instellen'
              : isResetPassword
              ? 'Wachtwoord vergeten'
              : isMagicLink
              ? 'Inloggen via e-mail'
              : isLogin
              ? 'Inloggen'
              : 'Registreren'}
          </CardTitle>
          <CardDescription>
            {isSetNewPassword
              ? 'Kies een nieuw wachtwoord voor uw account'
              : isResetPassword
              ? 'Voer uw e-mailadres in om een reset link te ontvangen'
              : isMagicLink
              ? 'Ontvang een login link in uw inbox — geen wachtwoord nodig'
              : isLogin
              ? 'Log in met uw account'
              : 'Maak een account aan om te beginnen'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="magic-link-form" onSubmit={handleSubmit} className="space-y-4">
            {!isSetNewPassword && (
              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@voorbeeld.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            )}
            {!isResetPassword && !isMagicLink && (
              <div className="space-y-2">
                <Label htmlFor="password">{isSetNewPassword ? 'Nieuw wachtwoord' : 'Wachtwoord'}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSetNewPassword ? 'new-password' : isLogin ? 'current-password' : 'new-password'}
                  minLength={6}
                />
              </div>
            )}
            {isSetNewPassword && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 text-sm text-green-700 bg-green-50 rounded-md">
                {message}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? 'Even geduld...'
                : isSetNewPassword
                ? 'Wachtwoord opslaan'
                : isResetPassword
                ? 'Verstuur reset link'
                : isMagicLink
                ? 'Verstuur login link'
                : isLogin
                ? 'Inloggen'
                : 'Account aanmaken'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm space-y-2">
            {isSetNewPassword ? (
              null // No navigation needed when setting new password
            ) : isResetPassword ? (
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => {
                  setIsResetPassword(false);
                  setError(null);
                  setMessage(null);
                }}
              >
                ← Terug naar inloggen
              </button>
            ) : isMagicLink ? (
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => {
                  setIsMagicLink(false);
                  setIsLogin(true);
                  setError(null);
                  setMessage(null);
                }}
              >
                Inloggen met wachtwoord
              </button>
            ) : isLogin ? (
              <>
                <div>
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => {
                      setIsMagicLink(true);
                      setIsLogin(false);
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    Inloggen via e-mail link
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:underline text-xs"
                    onClick={() => {
                      setIsResetPassword(true);
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>
                <div>
                  Nog geen account?{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => {
                      setIsLogin(false);
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    Registreren
                  </button>
                </div>
              </>
            ) : (
              <div>
                Al een account?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => {
                    setIsLogin(true);
                    setError(null);
                    setMessage(null);
                  }}
                >
                  Inloggen
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gratis uitproberen */}
      {showFreeTrialCard && (
        <>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">of</span>
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Gratis uitproberen</p>
            <form onSubmit={handleFreeTrial} className="flex gap-2">
              <Input
                type="email"
                placeholder="uw@email.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="flex-1 h-9 text-sm"
              />
              <Button type="submit" variant="outline" size="sm" disabled={freeTrialSubmitting || !email}>
                {freeTrialSubmitting ? 'Even geduld...' : 'Start gratis'}
              </Button>
            </form>
            {freeTrialMessage && (
              <div className="p-2 text-sm text-green-700 bg-green-50 rounded-md">
                {freeTrialMessage}
              </div>
            )}
            {freeTrialError && (
              <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">
                {freeTrialError}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Ontvang een login link per e-mail — geen wachtwoord nodig
            </p>
          </div>
        </>
      )}
    </div>
  );
}
