'use client';

import * as React from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {ShieldCheck} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {portalSsoErrorMessage} from '@/lib/sso-helpers';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const errorMessage = portalSsoErrorMessage(errorCode);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', {credentials: 'include'})
      .then((res) => {
        if (!cancelled && res.ok) {
          router.replace('/');
        }
      })
      .catch(() => {
        /* stay on login */
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">SafetySight</CardTitle>
          <CardDescription>HIRAC — Hazard Identification, Risk Assessment and Control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertTitle>Portal sign-in</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <p className="text-center text-sm text-muted-foreground">
            {checking
              ? 'Checking sign-in…'
              : 'Open HIRAC from the iScout portal to complete single sign-on.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginContent />
    </React.Suspense>
  );
}
