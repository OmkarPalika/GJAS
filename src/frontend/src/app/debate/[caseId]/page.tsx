"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ShieldAlert, FileText, CheckCircle2, Scale, Globe, Info, Loader2, Play } from 'lucide-react';
import { DebateState } from '@/types/debate';

function LocalBadge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" | "secondary" | "destructive" }) {
  const variants = {
    default: "bg-primary text-primary-foreground border-transparent",
    outline: "border",
    secondary: "bg-secondary text-secondary-foreground border-transparent",
    destructive: "bg-destructive text-destructive-foreground border-transparent"
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] transition-colors ${variants[variant]} rounded-sm ${className}`}>
      {children}
    </span>
  )
}

export default function SimulationDashboard() {
  const { data: session } = useSession();
  const { caseId } = useParams();
  const [state, setState] = useState<DebateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  const fetchState = useCallback(async () => {
    const token = session?.accessToken;
    if (!token) {
      if (!session) {
        setError('Authentication required for telemetry access.');
        setLoading(false);
        return;
      }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/simulate/${caseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      } else {
        setState(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [caseId, session, API_URL]);

  useEffect(() => {
    fetchState();
    // Poll every 3 seconds to catch backend async updates
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [caseId, fetchState]);

  const handleStartSimulation = async () => {
    setProcessing(true);
    const token = session?.accessToken;
    try {
      const res = await fetch(`${API_URL}/api/simulate/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "Test Case: Digital Privacy vs Security",
          facts: "A major tech company has refused a government warrant to decrypt user communications linked to a national security threat, citing fundamental privacy rights of its global user base.",
          countries: ["USA", "France", "India", "Germany", "Saudi Arabia"]
        })
      });

      const data = await res.json();
      if (data.caseId) {
        // Redirect to new caseId
        window.location.href = `/debate/${data.caseId}`;
      }
    } catch {
      setProcessing(false);
    }
  };

  const handleTick = async () => {
    setProcessing(true);
    const token = session?.accessToken;
    try {
      await fetch(`${API_URL}/api/simulate/tick/${caseId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchState();
    } catch {
      // Ignored
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2 className="animate-spin h-10 w-10 text-accent" />
    </div>
  );

  const getStatusColor = (status: string) => {
    if (status === 'complete') return 'bg-primary border-primary/20 text-primary-foreground';
    if (status === 'deliberating') return 'bg-accent border-accent/20 text-accent-foreground animate-pulse';
    return 'bg-secondary/20 border-secondary/20 text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-secondary/10">
      <div className="container mx-auto px-6 py-12 max-w-[1400px]">
        {/* Judicial Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8 border-b border-primary/10 pb-10">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="h-8 w-8 text-accent" />
              <h1 className="text-4xl font-bold tracking-tight">Hierarchical Simulation Engine</h1>
            </div>
            <p className="text-muted-foreground text-lg font-serif italic">
              Live Multi-National Processing Pipeline for Case: <span className="text-foreground font-bold not-italic underline decoration-accent/30">{state?.title || decodeURIComponent(caseId as string)}</span>
            </p>
          </div>
          <div className="flex gap-4">
            {!state ? (
              <Button onClick={handleStartSimulation} disabled={processing} className="px-8 h-12 shadow-premium font-bold uppercase tracking-widest text-[10px]">
                {processing ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2 h-4 w-4" />}
                Initialize Test Pipeline
              </Button>
            ) : (
              <Button onClick={handleTick} disabled={processing || state.status === 'complete'} className="px-8 h-12 shadow-premium font-bold uppercase tracking-widest text-[10px]">
                {processing ? <Loader2 className="animate-spin mr-2" /> : <Activity className="mr-2 h-4 w-4 text-accent" />}
                Force Pipeline Tick
              </Button>
            )}
          </div>
        </header>

        {!state ? (
          <div className="text-center py-32 bg-background border-2 border-dashed border-primary/5 rounded-2xl shadow-sm">
            <Globe className="mx-auto h-16 w-16 text-muted-foreground/20 mb-6" />
            <h2 className="text-2xl font-bold font-serif mb-2">Simulation Graph Uninitialized</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">This case has no active pipelines. Click Initialize to start a test simulation.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Global Assembly Status */}
            <Card className="rounded-2xl border-primary/30 shadow-premium overflow-hidden bg-background">
              <CardHeader className="bg-primary/5 border-b border-primary/10 py-4 px-8 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" /> Global Judicial Assembly
                  </CardTitle>
                </div>
                <LocalBadge variant="outline" className={`uppercase tracking-widest text-[9px] font-bold ${getStatusColor(state.globalAssembly?.status || 'pending')}`}>
                  {state.globalAssembly?.status || 'Pending'}
                </LocalBadge>
              </CardHeader>
              <CardContent className="p-8">
                {state.globalAssembly?.status === 'complete' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Final Global Consensus</h4>
                        <p className="font-serif text-xl leading-relaxed font-medium">{state.globalAssembly?.finalGlobalJudgement}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const token = session?.accessToken;
                          const res = await fetch(`${API_URL}/api/simulate/generate-verdict/${caseId}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          const data = await res.json();
                          alert("Resolution Generated (Markdown):\n\n" + data.markdown);
                        }}
                        className="border-primary/20 hover:bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-tighter"
                      >
                        Generate Assembly Resolution
                      </Button>
                    </div>
                    <div className="mt-4 p-6 bg-secondary/5 rounded-xl border border-primary/10">
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                        <Info className="h-3 w-3" /> Synthesis & Comparative Reasoning
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground italic font-serif bg-background/50 p-4 rounded-lg border border-primary/5">
                        {state.globalAssembly?.synthesisReasoning}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground italic font-serif">Assembly awaiting final national verdicts for cross-jurisdictional synthesis...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phase 5: ICC / The Hague Proceedings Card */}
            {state.iccProceedings && (
              <Card className="rounded-2xl border-destructive/30 shadow-premium overflow-hidden bg-background">
                <CardHeader className="bg-destructive/5 border-b border-destructive/10 py-4 px-8 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <Scale className="h-5 w-5 text-destructive" /> International Criminal Court (The Hague)
                    </CardTitle>
                  </div>
                  <LocalBadge variant="destructive" className={`uppercase tracking-widest text-[9px] font-bold ${getStatusColor(state.iccProceedings.status)}`}>
                    {state.iccProceedings.status}
                  </LocalBadge>
                </CardHeader>
                <CardContent className="p-8">
                  {state.iccProceedings.status === 'complete' ? (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-destructive">International Binding Verdict</h4>
                      <p className="font-serif text-lg leading-relaxed">{state.iccProceedings.verdict?.decision}</p>
                      <div className="mt-4 p-4 bg-destructive/5 rounded-lg border border-destructive/10">
                        <p className="text-xs font-bold uppercase text-destructive/50 mb-2">Rome Statute Basis & Reasoning</p>
                        <p className="text-sm">{state.iccProceedings.reasoning}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-destructive/30 mb-4" />
                      <p className="text-muted-foreground italic font-serif">ICC Chamber deliberating on referred jurisdictional failure...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Parallel Pipelines Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6`}>
              {Object.keys(state.pipelines || {}).map((country) => {
                const p = (state.pipelines || {})[country];
                const levels = ['investigation', 'trial', 'appellate', 'supreme'];

                return (
                  <div key={country} className="flex flex-col gap-4">
                    <div className="bg-background border border-primary/10 rounded-xl p-4 shadow-sm text-center">
                      <h3 className="font-bold text-lg">{country}</h3>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.legalSystem}</p>
                    </div>

                    {levels.map((lvl) => {
                      const node = p.nodes[lvl];
                      const statusColor = getStatusColor(node.status);

                      return (
                        <Card key={lvl} className={`border ${statusColor} shadow-sm overflow-hidden transition-all`}>
                          <div className={`py-2 px-3 flex justify-between items-center bg-background/50 border-b border-black/5`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{lvl}</span>
                            {node.status === 'complete' && <CheckCircle2 className="h-3 w-3 opacity-50" />}
                          </div>
                          <div className="p-4 bg-background h-[180px] overflow-y-auto">
                            {node.status === 'complete' ? (
                              <div className="space-y-3">
                                <LocalBadge variant="outline" className="text-[9px] font-black uppercase text-foreground bg-primary/5">
                                  {node.verdict?.decision}
                                </LocalBadge>
                                <p className="text-xs font-serif text-muted-foreground line-clamp-3 leading-relaxed">
                                  {node.reasoning}
                                </p>
                                {node.dissentingReasoning && (
                                  <div className="pt-2 mt-2 border-t border-destructive/10">
                                    <LocalBadge variant="destructive" className="text-[8px] font-black uppercase mb-1">Dissenting</LocalBadge>
                                    <p className="text-[10px] italic text-muted-foreground line-clamp-2">{node.dissentingReasoning}</p>
                                  </div>
                                )}
                                {node.legalReferences && node.legalReferences.length > 0 && (
                                  <div className="pt-2 border-t border-primary/5">
                                    <p className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1">Citing</p>
                                    <p className="text-[9px] font-medium truncate">{node.legalReferences[0]}</p>
                                  </div>
                                )}
                              </div>
                            ) : node.status === 'deliberating' ? (
                              <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                                <Loader2 className="h-6 w-6 animate-spin text-accent mb-2" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-accent">Analyzing Law</span>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center opacity-20">
                                <span className="text-xs uppercase font-bold">Awaiting Esc.</span>
                              </div>
                            )}
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Phase 6: Ecosystem Insights (Ombudsman & Regional Enforcement) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 pb-20">
              {/* Ombudsman Scrutiny Log */}
              <Card className="rounded-2xl border-amber-500/30 shadow-premium overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader className="bg-amber-500/5 border-b border-amber-500/10 py-4 px-8">
                  <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2 text-amber-500">
                    <ShieldAlert className="h-5 w-5" /> Administrative Ombudsman Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {state.ombudsmanReports && state.ombudsmanReports.length > 0 ? (
                    <div className="space-y-4">
                      {state.ombudsmanReports.map((report, i) => (
                        <div key={i} className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-amber-600 uppercase text-[10px]">Node: {report.nodeId}</span>
                            <span className="text-[10px] opacity-50">{new Date(report.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="italic text-muted-foreground">&ldquo;{report.critique}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 opacity-30 italic font-serif">
                      No administrative discrepancies detected by federal oversight.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Regional Enforcement & Clemency Desk */}
              <Card className="rounded-2xl border-indigo-500/30 shadow-premium overflow-hidden bg-background/50 backdrop-blur-sm">
                <CardHeader className="bg-indigo-500/5 border-b border-indigo-500/10 py-4 px-8">
                  <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2 text-indigo-500">
                    <FileText className="h-5 w-5" /> Executive Desk & Correctional Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 max-h-[400px] overflow-y-auto">
                  <div className="space-y-6">
                    {Array.from(Object.entries(state.pipelines || {})).map(([country, p]) => (
                      <div key={country} className="border-b border-white/5 pb-4 last:border-0">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-sm tracking-wide">{country} Status</h4>
                          {p.executiveReview?.status !== 'none' && (
                            <LocalBadge variant="outline" className={`text-[9px] ${p.executiveReview?.status === 'granted' ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`}>
                              EXEC REVIEW: {p.executiveReview?.status.toUpperCase()}
                            </LocalBadge>
                          )}
                        </div>

                        {p.executiveReview?.reasoning && (
                          <div className="mb-3 p-3 bg-white/5 rounded text-xs italic text-muted-foreground border-l-2 border-indigo-500/50">
                            <span className="font-bold text-[9px] uppercase block mb-1">Executive Reasoning:</span>
                            {p.executiveReview.reasoning}
                          </div>
                        )}

                        {p.corrections && (
                          <div className="p-3 bg-slate-900/50 rounded border border-white/5 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-[11px]">
                              <Activity className="h-3 w-3 text-indigo-400" />
                              <span className="font-mono text-indigo-300">COREX STATUS: {p.corrections.status}</span>
                            </div>
                            {p.corrections.inmateId && (
                              <div className="flex justify-between text-[10px] opacity-60 font-mono pl-5">
                                <span>ID: {p.corrections.inmateId}</span>
                                <span>{p.corrections.paroleEligibility}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


