"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { RAGResponse, RAGSearchResult } from '@/types/api';

export default function RAGPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<RAGSearchResult[]>([]);
  const [generatedResponse, setGeneratedResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleSearch = async (): Promise<void> => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/rag/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data: RAGResponse = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      const err = error as Error;
      console.error('Error searching documents:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/rag/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setGeneratedResponse(data.response);
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add user info section
  const userInfo = user ? (
    <div className="flex items-center justify-between w-full mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
          {user.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <div className="font-semibold text-black dark:text-white">{user.name || 'User'}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {user.role} • {user.expertise?.join(', ') || 'General'}
          </div>
        </div>
      </div>
      <button
        onClick={logout}
        className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  ) : null;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-16 px-16 bg-white dark:bg-black sm:items-start">
        {userInfo}
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left w-full">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            RAG Search & Generate
          </h1>
          <div className="w-full flex gap-2">
            <input
              type="text"
              placeholder="Enter your query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={handleSearch}
              className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={handleGenerate}
              className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="w-full max-h-96 overflow-y-auto text-left mt-4">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">Search Results:</h2>
              {searchResults.map((result, index) => (
                <div key={index} className="p-4 mb-4 border border-gray-200 rounded-md dark:border-gray-700">
                  <h3 className="font-medium text-black dark:text-zinc-50">
                    {result.metadata.country} ({result.metadata.fileName})
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                    {result.text.substring(0, 200)}...
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                    Similarity: {result.similarity ? result.similarity.toFixed(4) : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}
          {generatedResponse && (
            <div className="w-full text-left mt-4">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">Generated Response:</h2>
              <pre className="whitespace-pre-wrap p-4 border border-gray-200 rounded-md dark:border-gray-700 text-zinc-600 dark:text-zinc-400">
                {generatedResponse}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}