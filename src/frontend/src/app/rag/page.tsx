"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { RAGResponse, RAGSearchResult } from '@/types/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function RAGPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<RAGSearchResult[]>([]);
  const [generatedResponse, setGeneratedResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('search');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSearch = async (): Promise<void> => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setActiveTab('search');
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
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setActiveTab('generate');
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
      const err = error as Error;
      console.error('Error generating response:', err.message);
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSearch();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        {/* User Info Section */}
        {user && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{user.name || 'User'}</CardTitle>
                  <CardDescription>
                    {user.role} • {user.expertise?.join(', ') || 'General'}
                  </CardDescription>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={logout}>
                Logout
              </Button>
            </CardHeader>
          </Card>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>RAG Search & Generate</CardTitle>
            <CardDescription>
              Search legal documents and generate AI-powered responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter your legal query..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                />
                <Button onClick={handleSearch} disabled={loading || !query.trim()}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
                <Button onClick={handleGenerate} disabled={loading || !query.trim()} variant="secondary">
                  {loading ? 'Generating...' : 'Generate'}
                </Button>
              </div>

              {error && (
                <div className="bg-destructive/15 border border-destructive rounded-md p-4">
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList>
                  <TabsTrigger value="search">Search Results</TabsTrigger>
                  <TabsTrigger value="generate">Generated Response</TabsTrigger>
                </TabsList>

                <TabsContent value="search">
                  {loading && activeTab === 'search' ? (
                    <div className="space-y-4 mt-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-4 mt-4">
                      {searchResults.map((result, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">
                              {result.metadata.country} - {result.metadata.fileName}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-4">
                              {result.text.substring(0, 300)}...
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Similarity: {(result.similarity * 100).toFixed(2)}%
                              </span>
                              <Button variant="outline" size="sm">
                                View Full Text
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No search results. Enter a query and click Search.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="generate">
                  {loading && activeTab === 'generate' ? (
                    <div className="space-y-2 mt-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : generatedResponse ? (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>AI-Generated Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap text-muted-foreground">
                          {generatedResponse}
                        </pre>
                        <Button variant="outline" size="sm" className="mt-4">
                          Copy Response
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No generated response. Enter a query and click Generate.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use RAG Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Search</h4>
                <p className="text-sm text-muted-foreground">
                  Find relevant legal documents and case law from our comprehensive database.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Generate</h4>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered analysis and responses based on your query and retrieved documents.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Examples</h4>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  <li>"What are the key principles of freedom of speech in democratic constitutions?"</li>
                  <li>"Compare judicial review processes in common law vs civil law systems"</li>
                  <li>"Find cases related to digital privacy rights in the last decade"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}