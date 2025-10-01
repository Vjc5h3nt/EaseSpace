'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not authenticated
      if (!user || !appUser) {
        router.push(redirectTo);
        return;
      }

      // Check role requirements
      if (requiredRole && appUser.role !== requiredRole) {
        const defaultRedirect = appUser.role === 'admin' ? '/dashboard/admin' : '/dashboard/user';
        router.push(defaultRedirect);
        return;
      }

      // Check if user account is active
      if (appUser.status !== 'active') {
        if (appUser.status === 'pending') {
          router.push('/pending-approval');
        } else if (appUser.status === 'rejected') {
          router.push('/access-denied');
        } else {
          router.push('/login');
        }
        return;
      }
    }
  }, [user, appUser, loading, requiredRole, redirectTo, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!user || !appUser || (requiredRole && appUser.role !== requiredRole) || appUser.status !== 'active') {
    return null;
  }

  return <>{children}</>;
}