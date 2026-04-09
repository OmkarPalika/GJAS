"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gavel, Search, Shield, Loader2, X, MessageSquare, Play, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimulationProvider, useSimulation } from './SimulationContext';
import { GlobalPodium } from './GlobalPodium';
import { NationDrawer } from './NationDrawer';
import { CaseBriefingModal } from './CaseBriefingModal';

// ─── Tier Layout Constants ─────────────────────────────────────────────────────

const tiers = [
    { count: 12, radiusVW: 12 },
    { count: 20, radiusVW: 18 },
    { count: 28, radiusVW: 25 },
    { count: 36, radiusVW: 32 },
    { count: 45, radiusVW: 39 },
    { count: 54, radiusVW: 46 }
];

// ─── Inner page (uses context) ────────────────────────────────────────────────

function AssemblyMapInner() {
    const {
        liveCase, liveCaseId, isSimulating, isPaused, isOrchestrating,
        startError, setStartError, tPlus,
        caseContext, setCaseContext,
        setIsBriefingOpen, setIsPodiumOpen,
        hoveredNode, setHoveredNode, setActiveNode,
        search, setSearch, filter, setFilter,
        chatBubbles, ENHANCED_NATIONS,
        handlePauseResume, handleStop, handleReset,
        fetchFullPipelineForNode,
    } = useSimulation();

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const h = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(h);
    }, []);

    // ── Seat layout ──
    const catOrder: Record<string, number> = { Common: 1, Civil: 2, Mixed: 3, Islamic: 4 };
    const sortedNations = [...ENHANCED_NATIONS].sort((a, b) => (catOrder[a.category] || 99) - (catOrder[b.category] || 99));

    const allSeats: { xOffsetPercent: number; yOffsetPercent: number; angle: number }[] = [];
    let remaining = sortedNations.length;
    const actualTiers = [];
    for (const t of tiers) {
        if (remaining <= 0) break;
        const c = Math.min(t.count, remaining);
        actualTiers.push({ count: c, radiusVW: t.radiusVW });
        remaining -= c;
    }
    actualTiers.forEach(tier => {
        const startAngle = Math.PI - 0.04, endAngle = 0.04;
        const angleStep = tier.count > 1 ? (startAngle - endAngle) / (tier.count - 1) : 0;
        for (let i = 0; i < tier.count; i++) {
            const angle = startAngle - i * angleStep;
            allSeats.push({ 
                xOffsetPercent: tier.radiusVW * Math.cos(angle), 
                yOffsetPercent: tier.radiusVW * 2 * Math.sin(angle), // x2 to account for 2:1 aspect ratio of the map container
                angle 
            });
        }
    });
    allSeats.sort((a, b) => b.angle - a.angle);

    const positionedNodes = sortedNations.map((nation, idx) => {
        const seat = allSeats[idx] || allSeats[0];
        return { ...nation, xOffsetPercent: seat.xOffsetPercent, yOffsetPercent: seat.yOffsetPercent };
    });

    // ── Progress metrics ──
    const progressMetrics = useMemo(() => {
        if (!liveCase) return null;
        const allNodes = Object.values(liveCase.pipelines).flatMap(pl => Object.values(pl.nodes)) as { status: string }[];
        const total = Object.keys(liveCase.pipelines).length;
        const complete = Object.values(liveCase.pipelines).filter(pl => pl.nodes.supreme?.status === 'complete').length;
        const deliberating = allNodes.filter(n => n.status === 'deliberating').length;
        const anomalies = allNodes.filter(n => n.status === 'edge_case').length;
        return { total, complete, deliberating, anomalies, pct: Math.round((complete / total) * 100) };
    }, [liveCase]);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans overflow-hidden relative">

            {/* Orchestration overlay */}
            {isOrchestrating && (
                <div className="fixed inset-0 z-[500] bg-background/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-700">
                    <div className="flex flex-col items-center gap-6 p-12 bg-card/50 border border-border/50 rounded-3xl shadow-2xl scale-110">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Scale className="w-8 h-8 text-accent animate-pulse" />
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <h2 className="text-[18px] font-black uppercase tracking-[0.3em] text-foreground">Initiating Global Engine</h2>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Synchronizing Jurisdictional Vector Bases</p>
                        </div>
                        <div className="flex items-center gap-4 bg-muted/30 px-6 py-2 rounded-full border border-border/50 font-mono text-xl font-black text-muted-foreground/40 shadow-inner">
                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mr-2">Elapsed:</span>
                            T+ {tPlus}
                        </div>
                        <div className="w-64 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-accent animate-orchestra-load" style={{ width: '40%' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Control Bar */}
            <div className="relative z-10 py-3 px-8 flex flex-col md:flex-row items-center justify-between bg-background/80 backdrop-blur-md border-b border-border shadow-sm gap-4">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" asChild className="text-muted-foreground hover:text-accent uppercase tracking-widest text-xs font-bold px-0">
                        <Link href="/assembly"><ArrowLeft className="mr-2 h-4 w-4" /> Return</Link>
                    </Button>

                    <div className="flex items-center bg-muted/20 px-2 py-0.5 rounded-md border border-border focus-within:border-accent transition-colors w-[34rem] shadow-sm">
                        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-black mx-2 whitespace-nowrap">Active Scenario:</span>
                        <Input
                            type="text"
                            value={caseContext}
                            onChange={e => setCaseContext(e.target.value)}
                            disabled={isSimulating}
                            className="bg-transparent border-none outline-none text-xs font-bold text-muted-foreground/50 tracking-wide w-full h-8 flex-1"
                        />
                        {!isSimulating ? (
                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                <Button
                                    onClick={() => setIsBriefingOpen(true)}
                                    className="h-7 text-[10px] font-black uppercase tracking-widest px-4 shrink-0 transition-all border-none bg-primary hover:bg-accent hover:text-primary-foreground"
                                >
                                    <Play className="w-3 h-3 mr-2 fill-current" /> Initiate System
                                </Button>
                                {liveCaseId && (
                                    <>
                                        <Button disabled className="h-7 text-[9px] font-black uppercase tracking-widest px-3 bg-red-500/10 text-red-500/40 border-none opacity-50 cursor-not-allowed">Stopped</Button>
                                        <Button onClick={handleReset} className="h-7 text-[9px] font-black uppercase tracking-widest px-3 bg-muted/40 text-muted-foreground hover:bg-muted/60 border-none transition-colors">Reset</Button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                <Button
                                    onClick={handlePauseResume}
                                    className={`h-7 text-[9px] font-black uppercase tracking-widest px-3 border-none transition-colors ${isPaused ? 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30' : 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30'}`}
                                >{isPaused ? 'Resume' : 'Pause'}</Button>
                                <Button onClick={handleStop} className="h-7 text-[9px] font-black uppercase tracking-widest px-3 bg-red-500/20 text-red-500 hover:bg-red-500/30 border-none transition-colors">Stop</Button>
                                <Button onClick={handleReset} className="h-7 text-[9px] font-black uppercase tracking-widest px-3 bg-muted/30 text-muted-foreground hover:bg-muted/50 border-none transition-colors">Reset</Button>
                                <div className="flex items-center bg-muted/20 px-3 h-7 rounded border border-border/50 shadow-inner">
                                    <Loader2 className={`w-3 h-3 mr-2 animate-spin ${isPaused ? 'text-orange-500' : 'text-green-500'}`} />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isPaused ? 'text-orange-500' : 'text-green-500'}`}>
                                        {isPaused ? 'Paused' : 'Executing'}
                                    </span>
                                    {liveCase?.startedAt && (
                                        <span className="ml-3 text-[9px] font-mono text-muted-foreground border-l border-border/30 pl-3">T+ {tPlus}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter pills + Search */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-muted/20 px-4 py-1.5 rounded-full border border-border">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mr-2">Highlight By Framework:</span>
                        {[
                            { cat: 'Common', bg: 'bg-blue-500', color: 'shadow-[0_0_10px_rgba(59,130,246,0.8)]' },
                            { cat: 'Civil', bg: 'bg-orange-500', color: 'shadow-[0_0_10px_rgba(249,115,22,0.8)]' },
                            { cat: 'Mixed', bg: 'bg-purple-500', color: 'shadow-[0_0_10px_rgba(168,85,247,0.8)]' },
                            { cat: 'Islamic', bg: 'bg-emerald-500', color: 'shadow-[0_0_10px_rgba(16,185,129,0.8)]' }
                        ].map(f => (
                            <Button
                                variant="ghost" size="icon" key={f.cat}
                                onClick={() => setFilter(filter === f.cat ? null : f.cat)}
                                className={`w-3.5 h-3.5 rounded-full border border-background transition-all duration-300 ${f.bg} ${filter === f.cat ? f.color + ' scale-150 border-2' : 'opacity-40 hover:opacity-100 hover:scale-125'}`}
                                title={`Highlight ${f.cat} Law`}
                            />
                        ))}
                    </div>
                    <div className="flex items-center bg-muted/30 px-3 py-2 rounded-md border border-border focus-within:border-accent transition-colors w-64 lg:w-80 shadow-sm">
                        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" stroke="currentColor" />
                        <Input
                            type="text" placeholder="SEARCH ALL NATIONS..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-bold text-foreground placeholder:text-muted-foreground uppercase tracking-widest w-full ml-3"
                        />
                    </div>
                </div>
            </div>

            {/* Global Progress Bar */}
            {isSimulating && progressMetrics && (
                <div className="relative z-10 px-8 py-2 bg-background/60 backdrop-blur-sm border-b border-border/40 flex items-center gap-6">
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Global Progress</span>
                        <span className="text-[9px] font-mono font-black text-foreground">{progressMetrics.complete}<span className="text-muted-foreground">/{progressMetrics.total}</span></span>
                    </div>
                    <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-accent to-green-500 transition-all duration-1000 rounded-full" style={{ width: `${progressMetrics.pct}%` }} />
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        {progressMetrics.deliberating > 0 && <span className="text-[9px] font-black text-blue-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />{progressMetrics.deliberating} Deliberating</span>}
                        {progressMetrics.anomalies > 0 && <span className="text-[9px] font-black text-yellow-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />{progressMetrics.anomalies} Anomalies</span>}
                        <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-full capitalize">{liveCase?.status}</span>
                    </div>
                </div>
            )}

            {/* Error Banner */}
            {startError && (
                <div className="relative z-10 px-8 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Simulation Error:</span>
                        <span className="text-[10px] text-red-400 font-medium">{startError}</span>
                    </div>
                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => setStartError(null)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-500"
                    >
                        <X size={14} />
                    </Button>
                </div>
            )}

            {/* Main Map Canvas */}
            <div className="flex-1 w-full relative flex items-end justify-center pb-12 pt-8">
                <main className="relative w-full max-w-[90vw] aspect-[2/1] mx-auto overflow-visible pointer-events-none mt-16 lg:mt-0">

                    <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center bottom, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    {positionedNodes.map(node => {
                        const left = `calc(50% + ${node.xOffsetPercent}%)`;
                        const bottom = `${node.yOffsetPercent}%`;
                        const isHovered = hoveredNode?.id === node.id;
                        const hasConstraints = filter !== null || search !== '';
                        const isHighlighted = (filter ? node.category === filter : true) &&
                            (search ? node.name.toLowerCase().includes(search.toLowerCase()) || node.id.toLowerCase().includes(search.toLowerCase()) : true);
                        const inactiveOp = hasConstraints && !isHighlighted
                            ? 'opacity-[0.03] pointer-events-none scale-75 grayscale'
                            : node.state === 'inactive' && !isHovered ? 'opacity-30 grayscale scale-100' : 'opacity-100 grayscale-0 scale-100';

                        return (
                            <div
                                key={node.id}
                                onClick={() => { setActiveNode(node); fetchFullPipelineForNode(node.id); }}
                                onMouseEnter={() => setHoveredNode(node)}
                                onMouseLeave={() => setHoveredNode(null)}
                                className={`absolute pointer-events-auto group cursor-pointer transition-all duration-300 ease-out ${inactiveOp} ${chatBubbles[node.id] ? 'z-40' : 'z-20'} ${isHovered ? '!z-50' : ''}`}
                                style={{ left, bottom, transform: isHovered ? 'translate(-50%, 50%) scale(1.6)' : 'translate(-50%, 50%) scale(1)' }}
                            >
                                <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${isHovered ? 'bg-accent opacity-50' : 'opacity-0'}`} />

                                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border bg-background shadow-lg transition-all duration-300 ${isHovered ? 'border-accent shadow-[0_0_20px_hsl(var(--accent))] border-2' : 'border-primary/20'}`}>
                                    <span className={`text-[7px] font-black tracking-widest ${isHovered ? 'text-accent' : node.color}`}>{node.id}</span>
                                    <div className={`absolute -top-1 -right-0.5 w-2.5 h-2.5 rounded-full border border-background shadow-sm transition-all duration-500
                                        ${node.state === 'working' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' : ''}
                                        ${node.state === 'active_not_working' ? 'bg-green-500' : ''}
                                        ${node.state === 'stopped' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-bounce' : ''}
                                        ${node.state === 'failed' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : ''}
                                        ${node.state === 'inactive' ? 'bg-muted-foreground/30 scale-75' : 'scale-100'}
                                    `} />
                                </div>

                                {/* Chat Bubble */}
                                {chatBubbles[node.id] && (
                                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-max max-w-[280px] bg-card/90 backdrop-blur-xl text-foreground text-[11px] px-5 py-3.5 rounded-2xl rounded-bl-none border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] z-[100] animate-in fade-in zoom-in slide-in-from-bottom-3 flex items-start gap-3 ring-1 ring-white/5">
                                        <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${node.color}`} stroke="currentColor" fill="currentColor" fillOpacity="0.1" />
                                        <span className="font-semibold leading-relaxed italic text-foreground/90 whitespace-pre-wrap flex-1 tracking-wide">
                                            &ldquo;{chatBubbles[node.id].text}&rdquo;
                                        </span>
                                    </div>
                                )}

                                {/* Hover Tooltip */}
                                {isHovered && (
                                    <div className={`absolute w-64 bg-card/95 backdrop-blur-xl border border-border shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-xl p-4 flex flex-col z-50 pointer-events-none transition-all animate-in fade-in zoom-in-95
                                        ${(node.yOffsetPercent ?? 0) > 32 ? 'top-10' : 'bottom-10'}
                                        ${(node.xOffsetPercent ?? 0) < -25 ? 'left-0' : (node.xOffsetPercent ?? 0) > 25 ? 'right-0' : 'left-1/2 -translate-x-1/2'}
                                    `}>
                                        <div className="flex items-center gap-2 mb-3 border-b border-border/50 pb-2">
                                            <Shield className={`w-4 h-4 ${node.color}`} stroke="currentColor" />
                                            <h2 className="text-[12px] font-black text-foreground uppercase tracking-widest leading-none">{node.name}</h2>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] text-muted-foreground tracking-widest uppercase mb-1">Judicial Framework</span>
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${node.color}`}>{node.sys}</span>
                                            </div>
                                            <div className="flex flex-col bg-muted/40 p-2 rounded-lg border border-border/50">
                                                <span className="text-[8px] text-muted-foreground tracking-widest uppercase mb-1">Active Pipeline Status</span>
                                                <span className="text-[10px] text-foreground font-bold tracking-wide">{node.phase}</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-2 pt-1">
                                                <div className={`w-2.5 h-2.5 rounded-full
                                                    ${node.state === 'working' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' : ''}
                                                    ${node.state === 'active_not_working' ? 'bg-green-500' : ''}
                                                    ${node.state === 'stopped' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ''}
                                                    ${node.state === 'inactive' ? 'bg-muted-foreground' : ''}
                                                `} />
                                                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">
                                                    {node.state === 'working' ? 'Active / Computing' : node.state === 'active_not_working' ? 'Active / Awaiting' : node.state === 'stopped' ? 'Halted / Mistrial' : 'Dormant'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Central Podium Button */}
                    <div onClick={() => setIsPodiumOpen(true)} className="absolute bottom-0 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center group translate-y-1/2 cursor-pointer">
                        <div className="bg-accent text-accent-foreground text-[10px] font-black uppercase tracking-[0.2em] px-6 py-1.5 rounded-t-lg translate-y-1 shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
                            Global Podium
                        </div>
                        <div className="relative w-32 h-24 bg-background/90 backdrop-blur-md border border-border rounded-xl flex items-center justify-center shadow-premium overflow-hidden transition-all duration-300 group-hover:border-accent">
                            <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent" />
                            <Gavel className="w-8 h-8 text-primary -rotate-12 group-hover:animate-bounce mt-2 group-hover:text-accent transition-colors" strokeWidth={1.5} stroke="currentColor" />
                        </div>
                    </div>

                </main>
            </div>

            {/* Extracted Panels */}
            <GlobalPodium />
            <NationDrawer />
            <CaseBriefingModal />

        </div>
    );
}

// ─── Default Export — Provider Wrapper ────────────────────────────────────────

export default function AssemblyMapPage() {
    return (
        <SimulationProvider>
            <AssemblyMapInner />
        </SimulationProvider>
    );
}
