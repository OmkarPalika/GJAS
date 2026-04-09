'use client';

import { useState, SyntheticEvent } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // In a real application, this would call your backend password reset endpoint
      console.log('Password reset request for:', email);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setMessage('If an account exists for ' + email + ', you will receive a password reset link shortly.');

    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to send password reset email. Please try again.');
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Enter your email to reset your password</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 border border-destructive rounded-md p-3 text-destructive mb-4">
              <strong className="font-bold">Error!</strong>
              <span className="ml-2">{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-green-100 border border-green-400 rounded-md p-3 text-green-700 mb-4">
              <strong className="font-bold">Success!</strong>
              <span className="ml-2">{message}</span>
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

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:text-primary/80">
              Sign in here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}