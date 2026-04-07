"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Constitution {
  country: string;
  region?: string;
  year?: number;
  // Add other properties as needed
}

export default function CasesPage() {
  const [constitutions, setConstitutions] = useState<Constitution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  useEffect(() => {
    const fetchConstitutions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('http://localhost:5000/api/constitutions');
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
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`http://localhost:5000/api/constitutions/search/${searchTerm}`);
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
    // Apply region filter
    if (filterRegion !== 'all' && constitution.region !== filterRegion) {
      return false;
    }
    // Apply year filter
    if (filterYear !== 'all') {
      if (filterYear === 'recent' && constitution.year && constitution.year < 2000) {
        return false;
      }
      if (filterYear === 'old' && constitution.year && constitution.year >= 2000) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Constitutions Database</h1>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Input
              type="text"
              placeholder="Search constitutions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 md:flex-none md:w-64"
            />
            <Button onClick={handleSearch}>
              Search
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-4">
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="africa">Africa</SelectItem>
                <SelectItem value="americas">Americas</SelectItem>
                <SelectItem value="asia">Asia</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="oceania">Oceania</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="recent">Recent (2000+)</SelectItem>
                <SelectItem value="old">Older (Pre-2000)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/15 border border-destructive rounded-md p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConstitutions.length > 0 ? (
              filteredConstitutions.map((constitution, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>
                      <Link href={`/constitution/${encodeURIComponent(constitution.country)}`} className="hover:text-primary transition-colors">
                        {constitution.country}
                      </Link>
                    </CardTitle>
                    {constitution.region && (
                      <CardDescription className="capitalize">{constitution.region}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      {constitution.year && (
                        <span className="text-sm text-muted-foreground">
                          Adopted: {constitution.year}
                        </span>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/constitution/${encodeURIComponent(constitution.country)}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No constitutions found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}