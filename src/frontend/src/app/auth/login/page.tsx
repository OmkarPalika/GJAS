'use client';

import { useState, SyntheticEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/'
      });

      if (result?.error) {
        setError(result.error || 'Login failed. Please check your credentials.');
      } else {
        router.push('/');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Simple credentials for testing (can be configured via env)
  const testCredentials = [
    { email: 'admin@gjas.org', password: 'admin123' },
    { email: 'user@gjas.org', password: 'user123' },
    { email: 'legal@gjas.org', password: 'legal123' }
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign in to GJAS</CardTitle>
          <CardDescription>Global Judicial Assembly Simulator</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 border border-destructive rounded-md p-3 text-destructive mb-4">
              <strong className="font-bold">Error!</strong>
              <span className="ml-2">{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" name="remember-me" />
                <Label htmlFor="remember-me" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Remember me
                </Label>
              </div>

              <div className="text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-primary hover:text-primary/80">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Test credentials for development */}
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Test Credentials (Development)</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              {testCredentials.map((cred, index) => (
                <div key={index} className="flex justify-between">
                  <span>{cred.email}</span>
                  <span>{cred.password}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-medium text-primary hover:text-primary/80">
              Register here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}