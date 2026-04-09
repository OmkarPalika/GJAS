'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    const updateUserState = () => {
      if (status === 'authenticated' && session?.user) {
        // Type assertion for NextAuth session user which may have custom properties
        const nextAuthUser = session.user as {
          id?: string;
          name?: string | null;
          email?: string | null;
          role?: string;
          expertise?: string[];
        };
        
        const authUser: User = {
          id: nextAuthUser.id || '',
          name: nextAuthUser.name || 'User',
          email: nextAuthUser.email || '',
          role: (nextAuthUser.role as 'user' | 'expert' | 'admin' | undefined) || 'user',
          expertise: nextAuthUser.expertise || [],
          accessToken: session.accessToken || ''
        };
        setUser(authUser);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };
    
    updateUserState();
  }, [session, status]);

  const login = async () => {
    // Handled by NextAuth signIn
  };

  const logout = async (): Promise<void> => {
    try {
      // Call backend logout
      if (user?.accessToken) {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.accessToken}`
          }
        });
      }
      
      // Sign out from NextAuth
      await nextAuthSignOut({ callbackUrl: '/auth/login' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const hasRole = (requiredRoles: string[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  const hasExpertise = (requiredExpertise: string[]): boolean => {
    if (!user) return false;
    return requiredExpertise.some(exp => user.expertise.includes(exp));
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    hasRole,
    hasExpertise
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/auth/login');
      }
    }, [user, loading, router]);

    if (loading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}

export function withRole(requiredRoles: string[]) {
  return function RoleProtectedComponent<P extends object>(Component: React.ComponentType<P>) {
    return function WrappedComponent(props: P) {
      const { user, loading } = useAuth();
      const router = useRouter();

      useEffect(() => {
        if (!loading && (!user || !requiredRoles.includes(user.role))) {
          router.push('/');
        }
      }, [user, loading, router]);

      if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
      }

      if (!user || !requiredRoles.includes(user.role)) {
        return <div className="text-center py-10">Access Denied</div>;
      }

      return <Component {...props} />;
    };
  };
}