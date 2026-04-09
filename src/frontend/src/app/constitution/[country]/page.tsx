"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Scale, Download, Share2, Quote, ArrowLeft, Bookmark } from 'lucide-react';

interface Constitution {
  country: string;
  text: string;
  region?: string;
  year?: number;
}

export default function ConstitutionPage({ params }: { params: Promise<{ country: string }> }) {
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [loading, setLoading] = useState(true);
  const [countryName, setCountryName] = useState<string>('');

  useEffect(() => {
    const fetchConstitution = async () => {
      try {
        const { country } = await params;
        setCountryName(decodeURIComponent(country));
        const response = await fetch(`http://localhost:5000/api/constitutions/${country}`);
        if (!response.ok) throw new Error('Not found');
        const data = await response.json();
        setConstitution(data);
      } catch (error) {
        console.error('Error fetching constitution:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConstitution();
  }, [params]);

  return (
    <div className="min-h-screen bg-secondary/20 flex flex-col">
      {/* Top action bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-primary/10 py-3 px-6 shadow-sm">
        <div className="container mx-auto flex items-center justify-between max-w-7xl">
          <Button variant="ghost" size="sm" asChild className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-accent">
            <Link href="/archives"><ArrowLeft className="h-3.5 w-3.5 mr-2" /> Back to Archives</Link>
          </Button>
          <div className="flex gap-3">
             <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest border-primary/20"><Download className="h-3.5 w-3.5 mr-2" /> Export</Button>
             <Button variant="default" size="sm" asChild className="h-8 text-[10px] uppercase font-bold tracking-widest shadow-sm">
                <Link href={`/debate/${encodeURIComponent(countryName)}`}><Scale className="h-3.5 w-3.5 mr-2" /> Launch Trial</Link>
             </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-7xl flex gap-12">
        {/* Left Sidebar - Meta */}
        <aside className="w-72 flex-shrink-0 hidden lg:block space-y-8">
          <div className="sticky top-24">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-32 w-full mt-6 rounded-lg" />
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <Badge className="bg-accent/20 text-accent-foreground border-accent/20 px-2.5 py-0.5 text-[9px] uppercase font-black tracking-widest mb-4">Official Document</Badge>
                  <h1 className="text-3xl font-bold font-serif leading-tight mb-2">{constitution?.country || countryName}</h1>
                  <p className="text-muted-foreground italic font-serif">Sovereign Constitution</p>
                </div>

                <div className="bg-background border border-primary/5 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60">Geographic Region</p>
                    <p className="font-medium text-sm">{constitution?.region || 'Global'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60">Chronological Era</p>
                    <p className="font-medium text-sm">{constitution?.year || 'Current'}</p>
                  </div>
                  <div className="pt-4 border-t border-primary/5 space-y-3">
                    <Button variant="ghost" className="w-full justify-start text-[10px] uppercase font-bold tracking-widest h-8"><Quote className="h-3.5 w-3.5 mr-3 text-accent" /> Cite Document</Button>
                    <Button variant="ghost" className="w-full justify-start text-[10px] uppercase font-bold tracking-widest h-8"><Bookmark className="h-3.5 w-3.5 mr-3 text-accent" /> Save to Briefcase</Button>
                    <Button variant="ghost" className="w-full justify-start text-[10px] uppercase font-bold tracking-widest h-8"><Share2 className="h-3.5 w-3.5 mr-3 text-accent" /> Share Link</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Center - Document Viewer */}
        <article className="flex-1 bg-background rounded-2xl border-x border-b border-t-[8px] border-primary/5 border-t-accent shadow-premium overflow-hidden">
          {loading ? (
             <div className="p-16 space-y-6">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-6 w-full mt-10" />
                <Skeleton className="h-6 w-11/12" />
             </div>
          ) : (
            <div className="p-12 md:p-20">
               <div className="flex justify-center mb-16">
                  <BookOpen className="h-10 w-10 text-muted-foreground/20" />
               </div>
               <div className="prose prose-lg prose-serif max-w-none prose-headings:font-normal prose-headings:text-center prose-h1:text-4xl prose-h2:text-2xl prose-p:leading-relaxed prose-p:text-muted-foreground">
                 {constitution?.text ? (
                   <pre className="whitespace-pre-wrap font-serif text-lg leading-[2] text-foreground/80 bg-transparent border-none p-0 overflow-visible">
                     {constitution.text}
                   </pre>
                 ) : (
                   <div className="text-center py-20 italic text-muted-foreground">
                      Document content is currently unavailable in the repository.
                   </div>
                 )}
               </div>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}