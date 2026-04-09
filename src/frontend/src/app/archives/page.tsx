"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Book, Scale, Globe, Calendar } from "lucide-react";
import { Label } from '@/components/ui/label';

interface Constitution {
  country: string;
  region?: string;
  legal_system?: string;
  year?: number;
}

export default function CasesPage() {
  const [constitutions, setConstitutions] = useState<Constitution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterSystem, setFilterSystem] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchConstitutions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/api/constitutions`);
        if (!response.ok) {
          throw new Error('Failed to fetch constitutions');
        }
        const data = await response.json();
        setConstitutions(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching constitutions:', error);
        setError('Failed to load constitutions. Please try again later.');
        setLoading(false);
      }
    };

    fetchConstitutions();
  }, [API_URL]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = searchTerm.trim() 
        ? `${API_URL}/api/constitutions/search/${searchTerm}`
        : `${API_URL}/api/constitutions`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      setConstitutions(data);
    } catch (error) {
      console.error('Error searching constitutions:', error);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredConstitutions = constitutions.filter((constitution) => {
    // Region Filter (Case-insensitive match if backend returns capitalized)
    if (filterRegion !== 'all') {
      const reg = (constitution.region || '').toLowerCase();
      if (reg !== filterRegion) return false;
    }
    
    // Legal System Filter
    if (filterSystem !== 'all') {
      const sys = (constitution.legal_system || '').toLowerCase().replace(/_/g, ' ');
      if (!sys.includes(filterSystem.toLowerCase().replace(/_/g, ' '))) return false;
    }

    if (filterYear !== 'all') {
      const year = constitution.year || 0;
      if (filterYear === 'recent' && year < 2000) return false;
      if (filterYear === 'old' && year >= 2000) return false;
      if (year === 0 && filterYear !== 'all') return false; // Hide 0/missing years if filtered
    }
    return true;
  });

  // Group and sort by alphabet
  const sortedConstitutions = [...filteredConstitutions].sort((a, b) => a.country.localeCompare(b.country));
  
  const groupedConstitutions = sortedConstitutions.reduce((acc, constitution) => {
    const letter = (constitution.country.charAt(0) || '#').toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(constitution);
    return acc;
  }, {} as Record<string, Constitution[]>);

  const activeLetters = Object.keys(groupedConstitutions).sort();

  return (
    <div className="min-h-screen bg-secondary/10">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header Section */}
        <div className="mb-12">
          <Badge className="mb-4 px-3 py-1 bg-primary/5 text-primary border-primary/10 tracking-[0.2em] font-sans text-[9px] uppercase font-bold">
            Global Jurisdictional Archives
          </Badge>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Sovereign Constitutions</h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Explore the foundational documents of 190+ nations. Analyze legal frameworks, study jurisdictional shifts, and launch simulations.
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto mt-6 md:mt-0">
              <div className="relative flex-1 md:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  type="text"
                  placeholder="Query nations or clear to reset..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 h-11 bg-background border-primary/10 focus-visible:ring-offset-0 focus-visible:ring-primary/20"
                />
              </div>
              <Button onClick={handleSearch} className="h-11 px-6 shadow-sm font-bold uppercase tracking-widest text-[10px]">
                Execute Search
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and Body */}
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0 space-y-8">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <Filter className="h-3 w-3" /> Filter Parameters
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/70 ml-1 italic font-serif">Geographic Region</Label>
                  <Select value={filterRegion} onValueChange={setFilterRegion}>
                    <SelectTrigger className="h-10 bg-background border-primary/5">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Global (All)</SelectItem>
                      <SelectItem value="africa">Africa</SelectItem>
                      <SelectItem value="americas">Americas</SelectItem>
                      <SelectItem value="asia">Asia</SelectItem>
                      <SelectItem value="europe">Europe</SelectItem>
                      <SelectItem value="oceania">Oceania</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/70 ml-1 italic font-serif">Jurisdictional System</Label>
                  <Select value={filterSystem} onValueChange={setFilterSystem}>
                    <SelectTrigger className="h-10 bg-background border-primary/5">
                      <SelectValue placeholder="All Systems" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Universal (All)</SelectItem>
                      <SelectItem value="common_law">Common Law</SelectItem>
                      <SelectItem value="civil_law">Civil Law</SelectItem>
                      <SelectItem value="islamic_law">Islamic Law</SelectItem>
                      <SelectItem value="mixed">Mixed System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/70 ml-1 italic font-serif">Chronological Era</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="h-10 bg-background border-primary/5">
                      <SelectValue placeholder="All Eras" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Universal Era</SelectItem>
                      <SelectItem value="recent">Modern (2000+)</SelectItem>
                      <SelectItem value="old">Legacy (Pre-2000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-lg bg-accent/5 border border-accent/10">
              <h4 className="text-[9px] font-bold uppercase tracking-widest mb-3 text-accent">Summary Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Active Documents</span>
                  <span className="font-bold">{constitutions.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Matching Criteria</span>
                  <span className="font-bold">{filteredConstitutions.length}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Grid Content */}
          <div className="flex-1">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-8 text-center">
                <p className="text-destructive font-semibold">{error}</p>
                <Button variant="link" onClick={() => window.location.reload()} className="mt-2">Retry Connection</Button>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, index) => (
                  <Card key={index} className="border-primary/5 shadow-sm">
                    <CardHeader className="pb-4">
                      <Skeleton className="h-3 w-12 mb-3" />
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-10 w-full rounded-md" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex w-full gap-8 relative items-start">
                {/* Main Grid Area */}
                <div className="flex-1">
                  {activeLetters.length > 0 ? (
                    <div className="space-y-16">
                      {activeLetters.map(letter => (
                        <div key={letter} id={`letter-${letter}`} className="scroll-mt-32">
                          <h2 className="text-7xl font-serif font-bold text-muted mb-8 border-b pb-4">{letter}</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {groupedConstitutions[letter].map((constitution, index) => (
                              <Card key={index} className="group hover:shadow-premium transition-all duration-300 border-primary/5 overflow-hidden flex flex-col">
                                <div className="h-1.5 w-full bg-secondary group-hover:bg-accent transition-colors" />
                                <CardHeader className="pb-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                                      <Globe className="h-2.5 w-2.5" /> {constitution.region || "N/A"}
                                    </span>
                                    {constitution.year && (
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                                        <Calendar className="h-2.5 w-2.5" /> {constitution.year}
                                      </span>
                                    )}
                                  </div>
                                  <CardTitle className="text-2xl font-serif">
                                    <Link href={`/constitution/${encodeURIComponent(constitution.country)}`} className="group-hover:text-accent transition-colors">
                                      {constitution.country}
                                    </Link>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="mt-auto pt-6 border-t border-secondary/30 flex items-center justify-between gap-3">
                                  <Button variant="ghost" size="sm" className="flex-1 font-bold uppercase tracking-widest text-[9px] hover:bg-accent/5 hover:text-accent" asChild>
                                    <Link href={`/constitution/${encodeURIComponent(constitution.country)}`}>
                                      <Book className="h-3 w-3 mr-2" /> View Details
                                    </Link>
                                  </Button>
                                  <Button size="sm" className="flex-1 font-bold uppercase tracking-widest text-[9px] shadow-sm" asChild>
                                    <Link href={`/debate/${encodeURIComponent(constitution.country)}`}>
                                      <Scale className="h-3 w-3 mr-2" /> Launch Debate
                                    </Link>
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-24 text-center border-2 border-dashed border-primary/5 bg-secondary/5 rounded-2xl w-full">
                      <Book className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">No Documents Found</h3>
                      <p className="text-muted-foreground">The specified search parameters did not return any records in the sovereign database.</p>
                    </div>
                  )}
                </div>

                {/* Vertical Alphabet Navigation */}
                {activeLetters.length > 0 && (
                  <div className="alphabet-nav md:hidden w-12">
                    {activeLetters.map(letter => (
                      <Link
                        key={letter} 
                        href={`#letter-${letter}`} 
                        className="alphabet-link"
                      >
                        {letter}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-block border rounded-full ${className}`}>
      {children}
    </span>
  )
}
