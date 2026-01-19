'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (isResetPassword) {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Wachtwoord reset e-mail verzonden. Controleer uw inbox.');
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

  return (
    <div className="container py-8 max-w-md mx-auto px-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl">
            {isResetPassword ? 'Wachtwoord vergeten' : isLogin ? 'Inloggen' : 'Registreren'}
          </CardTitle>
          <CardDescription>
            {isResetPassword
              ? 'Voer uw e-mailadres in om een reset link te ontvangen'
              : isLogin
              ? 'Log in om uw renteberekeningen te beheren'
              : 'Maak een account aan om te beginnen'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            {!isResetPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
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
                : isResetPassword
                ? 'Verstuur reset link'
                : isLogin
                ? 'Inloggen'
                : 'Account aanmaken'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm space-y-2">
            {isResetPassword ? (
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
            ) : isLogin ? (
              <>
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
    </div>
  );
}
