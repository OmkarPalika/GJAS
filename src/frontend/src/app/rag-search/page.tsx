"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { RAGResponse, RAGSearchResult } from '@/types/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Sparkles, BookOpen, Quote, Shield, Info, Copy, Share2, CornerDownRight } from "lucide-react";

export default function RAGPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<RAGSearchResult[]>([]);
  const [generatedResponse, setGeneratedResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('search');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-accent">
         <Loader2 className="animate-spin h-10 w-10 text-accent" />
      </div>
    );
  }

  const handleSearch = async (): Promise<void> => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setActiveTab('search');
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/rag/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error('Search failure');
      const data: RAGResponse = await response.json();
      setSearchResults(data.results || []);
    } catch {
      setError('Vector retrieval failed. Ensure backend service is active.');
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
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/rag/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setGeneratedResponse(data.response);
    } catch {
      setError('LLM generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/10">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Scholar Meta Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 bg-background p-6 rounded-xl border border-primary/5 shadow-card">
          <div className="flex items-center gap-5">
            <Avatar className="h-14 w-14 border-2 border-accent/20">
              <AvatarFallback className="bg-accent/10 text-accent-foreground font-bold">
                 {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold font-serif">{user?.name || 'Academic Scholar'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="text-[9px] px-2 py-0 bg-accent/20 border-accent/20 text-accent-foreground font-bold uppercase tracking-wider">Expert Level</Badge>
                <span className="text-xs text-muted-foreground font-medium italic">{user?.expertise?.join(', ') || 'Global Constitutional Law'}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-destructive">
            Terminate Session
          </Button>
        </div>

        {/* Central Search Laboratory */}
        <div className="space-y-10">
          <header className="text-center max-w-2xl mx-auto mb-10">
            <h1 className="text-4xl font-bold tracking-tight mb-4 flex items-center justify-center gap-3">
               <BookOpen className="h-8 w-8 text-accent" /> RAG Research Laboratory
            </h1>
            <p className="text-muted-foreground font-serif italic italic-muted">
               Simulate deep retrieval across the Global Judicial Assembly dataset using state-of-the-art vector similarity.
            </p>
          </header>

          <section className="bg-background rounded-2xl shadow-premium border border-primary/5 p-8 max-w-4xl mx-auto overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
               <Shield className="h-32 w-32" />
            </div>
            
            <div className="relative space-y-6">
              <div className="relative group">
                <Input
                  type="text"
                  placeholder="Enter your legal hypothesis or inquiry..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={loading}
                  className="h-16 pl-6 pr-16 text-lg rounded-lg border-2 border-primary/10 focus-visible:ring-offset-0 focus-visible:ring-accent/20 transition-all focus:border-accent/30 font-serif italic"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   <Search className="h-6 w-6 text-muted-foreground/30 group-focus-within:text-accent transition-colors" />
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleSearch} disabled={loading || !query.trim()} className="flex-1 h-14 font-bold uppercase tracking-widest text-xs shadow-sm">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2 h-4 w-4" />} Explore Database
                </Button>
                <Button onClick={handleGenerate} disabled={loading || !query.trim()} variant="secondary" className="flex-1 h-14 font-bold uppercase tracking-widest text-xs shadow-sm bg-accent/10 text-accent-foreground border border-accent/20 hover:bg-accent/20">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />} Synthesize Response
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-destructive/5 border border-destructive/10 rounded-lg text-destructive text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                   <Info className="h-4 w-4" /> {error}
                </div>
              )}
            </div>
          </section>

          {/* Results Analysis */}
          <section className="max-w-5xl mx-auto pt-10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center mb-10">
                <TabsList className="h-12 bg-secondary/20 p-1 rounded-full border border-primary/5 backdrop-blur-sm shadow-sm">
                  <TabsTrigger value="search" className="rounded-full px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase tracking-widest text-[10px]">Reference Clips</TabsTrigger>
                  <TabsTrigger value="generate" className="rounded-full px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold uppercase tracking-widest text-[10px]">AI Synthesis</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="search" className="space-y-8 min-h-[400px]">
                {loading && activeTab === 'search' ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="border-primary/5 shadow-sm opacity-60">
                        <CardHeader className="pb-2">
                          <Skeleton className="h-4 w-1/3" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {searchResults.map((result, index) => (
                      <div key={index} className="group relative bg-background border border-primary/5 rounded-xl p-8 hover:shadow-premium transition-all duration-300">
                        <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="icon" className="h-8 w-8"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8"><Share2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                        </div>
                        <header className="mb-6 border-b border-primary/5 pb-4 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent block mb-1">Source Authentication</span>
                            <h3 className="text-lg font-bold font-serif">{result.metadata.country} &bull; <span className="text-muted-foreground/60">{result.metadata.fileName}</span></h3>
                          </div>
                          <Badge variant="outline" className="text-[9px] bg-accent/5 border-accent/20 text-accent font-black tracking-widest">Similarity Index: {(result.similarity * 100).toFixed(0)}%</Badge>
                        </header>
                        <div className="relative overflow-hidden pl-4 border-l-2 border-accent/20">
                           <Quote className="absolute top-0 right-0 h-10 w-10 text-accent/5 pointer-events-none" />
                           <p className="text-muted-foreground font-serif text-lg leading-relaxed italic">
                             {result.text.substring(0, 450)}...
                           </p>
                        </div>
                        <footer className="mt-8 flex justify-end">
                           <Button variant="link" className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-accent">
                             Access Primary Document <CornerDownRight className="h-3 w-3" />
                           </Button>
                        </footer>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-32 text-center text-muted-foreground/30 font-serif italic text-2xl">
                    Pending vector query execution...
                  </div>
                )}
              </TabsContent>

              <TabsContent value="generate" className="min-h-[400px]">
                {loading && activeTab === 'generate' ? (
                  <Card className="border-primary/5 p-12">
                     <div className="space-y-4">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                     </div>
                  </Card>
                ) : generatedResponse ? (
                  <div className="relative max-w-4xl mx-auto">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-background border shadow-sm rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-accent z-10">
                       Synthesized Jurisprudential Opinion
                    </div>
                    <Card className="rounded-2xl border-accent/10 shadow-premium overflow-hidden bg-background/50 backdrop-blur-sm">
                      <CardContent className="p-16 leading-relaxed text-xl font-serif text-muted-foreground">
                        <div className="prose prose-sm dark:prose-invert prose-serif max-w-none text-foreground/90 font-medium leading-relaxed prose-headings:font-bold prose-headings:tracking-tight hover:prose-a:text-accent">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedResponse}</ReactMarkdown>
                        </div>
                        <div className="mt-12 pt-10 border-t border-accent/10 flex justify-between items-center text-xs">
                           <span className="text-muted-foreground italic">&mdash; Simulated Opinion via Mistral Intelligence</span>
                           <div className="flex gap-4">
                              <Button variant="outline" className="h-10 px-6 font-bold uppercase tracking-widest text-[9px]"><Copy className="h-3.5 w-3.5 mr-2" /> Copy to Briefing</Button>
                              <Button variant="default" className="h-10 px-6 font-bold uppercase tracking-widest text-[9px] shadow-sm"><Share2 className="h-3.5 w-3.5 mr-2" /> Citational Broadcast</Button>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="py-32 text-center text-muted-foreground/30 font-serif italic text-2xl">
                    Awaiting synthesis command...
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" | "secondary" | "destructive" }) {
  const variants = {
    default: "bg-primary text-primary-foreground border-transparent",
    outline: "text-foreground border-border bg-transparent",
    secondary: "bg-secondary text-secondary-foreground border-transparent",
    destructive: "bg-destructive text-destructive-foreground border-transparent"
  }
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs border transition-colors ${variants[variant]} rounded-full ${className}`}>
      {children}
    </span>
  )
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={`animate-spin ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}