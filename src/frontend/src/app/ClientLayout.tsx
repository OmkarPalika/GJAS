'use client';

import { AuthProvider } from '@/context/AuthContext';
import { SessionProvider } from "next-auth/react";
import { MainNavigation } from '@/components/ui/navigation';
import { SocketProvider } from '@/context/SocketContext';
import { Footer } from '@/components/ui/footer';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <SocketProvider>
          <ErrorBoundary>
            <div className="flex flex-col min-h-screen">
              <MainNavigation />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </ErrorBoundary>
        </SocketProvider>
      </AuthProvider>
    </SessionProvider>
  );
}