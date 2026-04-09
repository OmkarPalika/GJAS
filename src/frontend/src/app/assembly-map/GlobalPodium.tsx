"use client";

import { Scale, X, Loader2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulation } from './SimulationContext';

export function GlobalPodium() {
    const { isPodiumOpen, setIsPodiumOpen, liveCase, ENHANCED_NATIONS } = useSimulation();

    const supremeComplete = ENHANCED_NATIONS.filter(n => n.pipelineData?.nodes.supreme.status === 'complete');

    return (
        <>
            {/* Overlay */}
            {isPodiumOpen && (
                <div
                    className="fixed inset-0 z-[240] bg-black/10 backdrop-blur-[2px]"
                    onClick={() => setIsPodiumOpen(false)}
                />
            )}

            {/* Slide-up panel */}
            <div className={`fixed bottom-0 left-0 w-full h-[60vh] bg-background/95 backdrop-blur-3xl border-t border-border shadow-[0_-50px_100px_rgba(0,0,0,0.8)] z-[250] transform transition-transform duration-500 ease-in-out flex flex-col ${isPodiumOpen ? 'translate-y-0' : 'translate-y-[110%]'}`}>

                {/* Header */}
                <div className="flex justify-between items-center px-8 py-5 border-b border-border/50 bg-muted/10" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                        <Scale className="w-5 h-5 text-accent" stroke="currentColor" />
                        <h2 className="text-[16px] font-black uppercase tracking-widest text-foreground">Global Resolution Podium</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsPodiumOpen(false)} className="p-2 bg-muted/40 hover:bg-accent/20 rounded-full transition-colors group">
                        <X className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" stroke="currentColor" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 gap-6 flex flex-col" onClick={e => e.stopPropagation()}>

                    {/* Global Synthesis Banner */}
                    {liveCase?.globalAssembly?.status === 'complete' && (
                        <div className="w-full p-6 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border border-accent/30 rounded-2xl flex flex-col gap-4 shadow-[0_0_30px_rgba(var(--accent),0.1)]">
                            <div className="flex items-center gap-3">
                                <Scale className="w-5 h-5 text-accent" stroke="currentColor" />
                                <span className="text-[11px] uppercase font-black tracking-[0.25em] text-accent">Global Consensus Judgement</span>
                                <span className="ml-auto text-[9px] uppercase tracking-widest text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">Assembly Complete</span>
                            </div>
                            <p className="text-[13px] font-bold text-foreground leading-relaxed">
                                &ldquo;{liveCase.globalAssembly.finalGlobalJudgement}&rdquo;
                            </p>
                            {liveCase.globalAssembly.synthesisReasoning && (
                                <p className="text-[11px] text-muted-foreground italic leading-relaxed border-t border-border/30 pt-3">
                                    {liveCase.globalAssembly.synthesisReasoning}
                                </p>
                            )}
                        </div>
                    )}

                    {liveCase?.globalAssembly?.status === 'deliberating' && (
                        <div className="w-full p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center gap-4">
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-widest text-blue-500">Global Assembly Deliberating</span>
                                <span className="text-[10px] text-muted-foreground">
                                    Synthesizing {supremeComplete.length} national supreme verdicts...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* National Supreme Verdicts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {supremeComplete.map(n => (
                            <div key={n.id} className="bg-muted/10 border border-border/50 rounded-xl p-5 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className={`text-[10px] uppercase font-black tracking-widest ${n.color}`}>{n.name}</span>
                                    <Trophy className="w-4 h-4 text-yellow-500" stroke="currentColor" />
                                </div>
                                <span className={`text-[9px] uppercase font-black tracking-wider ${n.pipelineData?.nodes.supreme.verdict?.decision?.toLowerCase().includes('guilty') ? 'text-red-400' : 'text-green-400'}`}>
                                    {n.pipelineData?.nodes.supreme.verdict?.decision || 'Adjudicated'}
                                </span>
                                <p className="text-[11px] text-muted-foreground font-medium italic line-clamp-3">
                                    &ldquo;{n.pipelineData?.nodes.supreme?.reasoning || 'Reasoning processed.'}&rdquo;
                                </p>
                            </div>
                        ))}

                        {(!liveCase || supremeComplete.length === 0) && (
                            <div className="col-span-full h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-20 border border-dashed border-border/50 rounded-xl">
                                <Scale className="w-12 h-12 mb-4" stroke="currentColor" />
                                <span className="text-[12px] uppercase tracking-[0.2em] font-bold">No High Court Resolutions Delivered Yet</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
