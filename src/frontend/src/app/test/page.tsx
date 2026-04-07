'use client';

import { useAuth } from '@/context/AuthContext';

export default function TestPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Test Page</h1>
      {user ? (
        <div>
          <p>Welcome, {user.name}!</p>
          <p>Role: {user.role}</p>
        </div>
      ) : (
        <div>
          <p>Not authenticated</p>
        </div>
      )}
    </div>
  );
}