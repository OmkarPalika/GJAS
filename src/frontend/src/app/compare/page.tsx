"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Scale, SplitSquareHorizontal, Sparkles, Loader2, Link as LinkIcon, BrainCircuit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CompareDocument {
  id: string;
  country: string;
  text: string;
  region: string;
  year: number;
}

export default function ComparePage() {
  const [doc1Loading, setDoc1Loading] = useState(false);
  const [doc2Loading, setDoc2Loading] = useState(false);
  const [document1, setDocument1] = useState<CompareDocument | null>(null);
  const [document2, setDocument2] = useState<CompareDocument | null>(null);
  
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Hardcoded options for MVP scope
  const availableDocs = [
    { id: "United States", name: "United States (1789) - Common Law" },
    { id: "France", name: "France (1958) - Civil Law" },
    { id: "Brazil", name: "Brazil (1988) - Civil Law" },
    { id: "South Africa", name: "South Africa (1996) - Mixed" },
    { id: "India", name: "India (1950) - Common Law" }
  ];

  const fetchDocument = async (countryId: string, setDoc: (doc: CompareDocument) => void, setLoading: (l: boolean) => void) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/constitutions/${countryId}`);
      if (response.ok) {
        const data = await response.json();
        setDoc({
           ...data,
           id: countryId,
           region: data.region || "Global",
           year: data.year || 2024
        } as CompareDocument);
      }
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const generateStructuralAnalysis = async () => {
    if (!document1 || !document2) return;
    setAnalysisLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/rag/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           query: `Perform a structural comparison between the constitutions of ${document1.country} and ${document2.country}. Focus on fundamental rights, separation of powers, and the legal framework. Be concise and format as formal legal briefing notes.` 
        }),
      });
      const data = await response.json();
      setAnalysisResult(data.response);
    } catch (e) {
       console.error(e);
       setAnalysisResult("AI Analysis generation failed. Ensure LLM service is active.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/10 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-primary/10 py-4 shadow-sm">
        <div className="container mx-auto px-6 max-w-screen-2xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" asChild className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-accent p-0">
              <Link href="/archives"><ArrowLeft className="h-3.5 w-3.5 mr-2" /> Archives</Link>
            </Button>
            <div className="h-4 w-px bg-border hidden md:block" />
            <h1 className="text-xl font-bold font-serif flex items-center gap-2">
               <SplitSquareHorizontal className="h-5 w-5 text-accent" /> Jurisdictional Comparison Engine
            </h1>
          </div>
          <div className="flex gap-3">
             <Button 
                variant="default" 
                size="sm" 
                onClick={generateStructuralAnalysis}
                disabled={!document1 || !document2 || analysisLoading}
                className="h-9 text-[10px] uppercase font-bold tracking-widest shadow-sm"
             >
                {analysisLoading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />} 
                AI Structural Analysis
             </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-screen-2xl flex flex-col h-[calc(100vh-73px)]">
        
        {/* Top Control Bar */}
        <div className="grid grid-cols-2 gap-8 mb-6 flex-shrink-0">
           {/* Document 1 Control */}
           <div className="bg-background rounded-xl p-4 shadow-sm border border-primary/5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center border-2 border-primary/10 flex-shrink-0">
                 <span className="font-serif font-bold text-primary">A</span>
              </div>
              <div className="flex-1">
                 <Select onValueChange={(val) => fetchDocument(val, setDocument1, setDoc1Loading)}>
                   <SelectTrigger className="w-full bg-secondary/10 border-none shadow-none font-serif text-lg font-bold">
                     <SelectValue placeholder="Select Origin Jurisdiction..." />
                   </SelectTrigger>
                   <SelectContent>
                     {availableDocs.map(doc => (
                        <SelectItem key={`doc1-${doc.id}`} value={doc.id}>{doc.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
           </div>

           {/* Document 2 Control */}
           <div className="bg-background rounded-xl p-4 shadow-sm border border-accent/10 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-accent/5 flex items-center justify-center border-2 border-accent/20 flex-shrink-0">
                 <span className="font-serif font-bold text-accent">B</span>
              </div>
              <div className="flex-1">
                 <Select onValueChange={(val) => fetchDocument(val, setDocument2, setDoc2Loading)}>
                   <SelectTrigger className="w-full bg-secondary/10 border-none shadow-none font-serif text-lg font-bold">
                     <SelectValue placeholder="Select Target Jurisdiction..." />
                   </SelectTrigger>
                   <SelectContent>
                     {availableDocs.map(doc => (
                        <SelectItem key={`doc2-${doc.id}`} value={doc.id}>{doc.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
           </div>
        </div>

        {/* AI Analysis Overlay (if active) */}
        {analysisResult && (
           <div className="mb-6 p-8 bg-background border-2 border-accent/20 rounded-2xl shadow-premium relative flex-shrink-0">
              <div className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1 bg-accent rounded-full text-[9px] font-black uppercase tracking-widest text-accent-foreground shadow-sm">
                 Synthesis Complete
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                 <BrainCircuit className="h-3.5 w-3.5 text-primary" /> <span className="text-accent-foreground">Mistral Engines Active</span>
              </h3>
              <div className="prose prose-sm dark:prose-invert prose-serif max-w-none text-foreground/90 font-medium leading-relaxed prose-headings:font-bold prose-headings:tracking-tight hover:prose-a:text-accent">
                 <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResult}</ReactMarkdown>
              </div>
              <div className="mt-6 flex justify-end">
                 <Button variant="ghost" size="sm" onClick={() => setAnalysisResult(null)} className="text-[10px] uppercase font-bold tracking-widest">Dismiss Assessment</Button>
              </div>
           </div>
        )}

        {/* Side by Side Viewers */}
        <div className="grid grid-cols-2 gap-8 flex-1 min-h-0">
           {/* Viewer A */}
           <Card className="flex flex-col overflow-hidden border-primary/10 shadow-sm">
              {document1 && !doc1Loading && (
                 <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex justify-between items-center flex-shrink-0 flex-wrap gap-2">
                    <div>
                       <div className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">Jurisdiction A</div>
                       <Badge variant="outline" className="bg-background text-[9px]">{document1.region}</Badge>
                       <Badge variant="outline" className="bg-background text-[9px] ml-2">Adopted {document1.year}</Badge>
                    </div>
                    <Button variant="secondary" size="sm" className="h-7 text-[9px] uppercase font-bold px-3">
                       <LinkIcon className="h-3 w-3 mr-1" /> View Full
                    </Button>
                 </div>
              )}
              <CardContent className="flex-1 overflow-y-auto p-8 relative scroll-smooth bg-card">
                 {doc1Loading ? (
                    <div className="space-y-4">
                       <Skeleton className="h-8 w-3/4 mb-8" />
                       <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
                    </div>
                 ) : document1 ? (
                    <div className="prose prose-serif max-w-none">
                       <pre className="whitespace-pre-wrap font-serif text-[17px] leading-[1.9] text-muted-foreground bg-transparent p-0 border-none">
                          {document1.text.substring(0, 5000)}...
                          <span className="block mt-8 text-sm italic text-muted-foreground/50 text-center">- Text truncated for comparison view -</span>
                       </pre>
                    </div>
                 ) : (
                    <div className="absolute inset-0 flex items-center justify-center flex-col text-muted-foreground">
                       <Scale className="h-16 w-16 mb-4 opacity-10" />
                       <div className="font-serif italic text-xl">Awaiting Jurisdiction A...</div>
                    </div>
                 )}
              </CardContent>
           </Card>

           {/* Viewer B */}
           <Card className="flex flex-col overflow-hidden border-accent/10 shadow-sm">
              {document2 && !doc2Loading && (
                 <div className="bg-accent/5 px-6 py-4 border-b border-accent/10 flex justify-between items-center flex-shrink-0 flex-wrap gap-2">
                    <div>
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-foreground block mb-1">Source Authentication</span>
                       <Badge variant="outline" className="bg-background text-[9px] border-accent/20">{document2.region}</Badge>
                       <Badge variant="outline" className="text-[9px] bg-accent/20 border-accent/20 text-accent-foreground font-black tracking-widest ml-2">Adopted {document2.year}</Badge>
                    </div>
                    <Button variant="secondary" size="sm" className="h-7 text-[9px] uppercase font-bold px-3">
                       <LinkIcon className="h-3 w-3 mr-1" /> View Full
                    </Button>
                 </div>
              )}
              <CardContent className="flex-1 overflow-y-auto p-8 relative scroll-smooth bg-card">
                 {doc2Loading ? (
                    <div className="space-y-4">
                       <Skeleton className="h-8 w-3/4 mb-8" />
                       <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
                    </div>
                 ) : document2 ? (
                    <div className="prose prose-serif max-w-none">
                       <pre className="whitespace-pre-wrap font-serif text-[17px] leading-[1.9] text-muted-foreground bg-transparent p-0 border-none">
                          {document2.text.substring(0, 5000)}...
                          <span className="block mt-8 text-sm italic text-muted-foreground/50 text-center">- Text truncated for comparison view -</span>
                       </pre>
                    </div>
                 ) : (
                    <div className="absolute inset-0 flex items-center justify-center flex-col text-muted-foreground">
                       <Scale className="h-16 w-16 mb-4 opacity-10" />
                       <div className="font-serif italic text-xl">Awaiting Jurisdiction B...</div>
                    </div>
                 )}
              </CardContent>
           </Card>
        </div>
      </main>
    </div>
  );
}
