"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 8) {
      return setError('Password must be at least 8 characters long');
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Invalid Reset Link</h2>
        <p className="text-muted-foreground">This password reset link is invalid or has expired.</p>
        <Button asChild variant="outline">
          <Link href="/auth/forgot-password">Request New Link</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-6 py-4">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto animate-in zoom-in duration-300" />
        <h2 className="text-3xl font-bold font-serif">Security Updated</h2>
        <p className="text-muted-foreground">Your password has been reset successfully. Redirecting you to the login portal...</p>
        <Button asChild className="w-full">
          <Link href="/auth/login">Login Now</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-destructive animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full h-11 font-bold uppercase tracking-widest text-[10px]" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
        Update Credentials
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-secondary/10 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <Link href="/" className="flex justify-center mb-6 hover:opacity-80 transition-opacity">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-premium ring-4 ring-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
        </Link>
      </div>

      <Card className="sm:mx-auto sm:w-full sm:max-w-md shadow-premium border-primary/5 bg-background overflow-hidden">
        <div className="h-1.5 w-full bg-primary" />
        <CardHeader className="space-y-1 pb-8">
          <CardTitle className="text-3xl font-serif font-bold text-center">Reset Password</CardTitle>
          <p className="text-center text-sm text-muted-foreground italic font-serif">
            Securely re-authenticate your institutional account.
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary/30" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <Button variant="ghost" asChild className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary">
          <Link href="/auth/login">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to Authentication
          </Link>
        </Button>
      </div>
    </div>
  );
}
