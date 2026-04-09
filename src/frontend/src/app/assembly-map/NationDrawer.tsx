"use client";

import { Shield, Book, Gavel, Search, X, Loader2, Play, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GLOBAL_COURT_REGISTRY } from '@/lib/court_registry';
import type { CountryCode } from '@/lib/court_registry';
import { useSimulation, type INode, type CustomSession } from './SimulationContext';
import { JudicialThought } from './JudicialThought';

export function NationDrawer() {
    const {
        activeNode, setActiveNode,
        liveCase, liveCaseId, session,
        thinkingTicker, expandedLevels, toggleExpand,
        interventionText, setInterventionText,
        isResolving, setIsResolving,
    } = useSimulation();

    return (
        <>
            {/* Overlay */}
            {activeNode && (
                <div
                    className="fixed inset-0 z-[190] bg-black/10 backdrop-blur-[2px]"
                    onClick={() => setActiveNode(null)}
                />
            )}

            {/* Slide-out drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-[450px] bg-background/95 backdrop-blur-3xl border-l border-border shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[200] transform transition-transform duration-500 ease-in-out flex flex-col ${activeNode ? 'translate-x-0' : 'translate-x-[110%]'}`}
                onClick={e => e.stopPropagation()}
            >
                {activeNode && (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/10" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3">
                                <Shield className={`w-6 h-6 ${activeNode.color}`} stroke="currentColor" />
                                <div className="flex flex-col">
                                    <h2 className="text-[18px] font-black text-foreground uppercase tracking-widest leading-none">
                                        {activeNode.name}
                                    </h2>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${activeNode.color} mt-1.5`}>
                                        {activeNode.sys}
                                    </span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setActiveNode(null)} className="p-2 bg-muted/40 hover:bg-accent/20 rounded-full transition-colors group">
                                <X className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" stroke="currentColor" />
                            </Button>
                        </div>

                        {/* Pipeline DAG */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center pb-20" onClick={e => e.stopPropagation()}>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] text-center mb-8 border border-border/50 px-4 py-2 rounded-full bg-muted/20">
                                National Adjudication Pipeline
                            </p>

                            {(['supreme', 'appellate', 'trial', 'investigation'] as const).map((lvl, index) => {
                                const isExpanded = expandedLevels.includes(lvl);
                                const nodeData = activeNode?.pipelineData?.nodes[lvl] as INode | undefined;

                                const isSupreme = lvl === 'supreme';
                                const isAppellate = lvl === 'appellate';
                                const isTrial = lvl === 'trial';

                                const themeColor = isSupreme ? 'text-yellow-500' : isAppellate ? 'text-blue-500' : isTrial ? 'text-emerald-500' : 'text-cyan-500';
                                const borderColorHover = isSupreme ? 'hover:border-yellow-500/50' : isAppellate ? 'hover:border-blue-500/50' : isTrial ? 'hover:border-emerald-500/50' : 'hover:border-cyan-500/50';
                                const pillBg = isSupreme ? 'bg-[#1a170a]' : isAppellate ? 'bg-[#0c1322]' : isTrial ? 'bg-[#0a1a14]' : 'bg-[#08151c]';
                                const pillBorder = isSupreme ? 'border-[#443810]' : isAppellate ? 'border-[#142340]' : isTrial ? 'border-[#0f3322]' : 'border-[#132a35]';

                                const activeId = activeNode.id as CountryCode;
                                const originalNames = GLOBAL_COURT_REGISTRY[activeId] || {
                                    supreme: `${activeNode.name} Supreme Bench`,
                                    appellate: `${activeNode.name} Fast-Track Appellate`,
                                    trial: `${activeNode.name} Primary Tribunal`,
                                    investigation: `${activeNode.name} Central Investigation Bureau`
                                };
                                const names = originalNames as unknown as Record<string, string>;
                                if (!names[lvl] || names[lvl] === 'null') return null;
                                const title = names[lvl];
                                const Icon = isSupreme ? Shield : isAppellate ? Book : isTrial ? Gavel : Search;

                                let nodeStateText = 'DORMANT VENUE';
                                let nodeStateColors = 'text-muted-foreground';
                                let progressAmt = '0%';
                                let progressColor = 'bg-muted-foreground/30';

                                if (nodeData) {
                                    if (nodeData.status === 'deliberating') {
                                        nodeStateText = thinkingTicker[lvl] || 'DELIBERATING...';
                                        nodeStateColors = 'text-blue-400 font-bold animate-pulse';
                                        progressAmt = '50%';
                                        progressColor = 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
                                    } else if (nodeData.status === 'edge_case') {
                                        nodeStateText = 'JUDICIAL STALEMATE';
                                        nodeStateColors = 'text-yellow-500 font-black tracking-tighter shadow-sm';
                                        progressAmt = '50%';
                                        progressColor = 'bg-yellow-500 animate-pulse';
                                    } else if (nodeData.status === 'complete') {
                                        nodeStateText = 'RESOLUTION GENERATED';
                                        nodeStateColors = 'text-green-500 font-bold';
                                        progressAmt = '100%';
                                        progressColor = 'bg-green-500';
                                    }
                                }

                                const getDuration = (node: INode | undefined) => {
                                    if (!node?.startedAt) return null;
                                    const end = node.completedAt ? new Date(node.completedAt).getTime() : Date.now();
                                    return ((end - new Date(node.startedAt).getTime()) / 1000).toFixed(1) + 's';
                                };
                                const duration = getDuration(nodeData);
                                const nodeId = `${activeNode.id}-${lvl}`;
                                const edgeCase = liveCase?.edgeCaseLog.find(e => e.nodeId === nodeId && !e.resolved);

                                return (
                                    <div key={lvl} className="flex flex-col items-center w-full">
                                        {index > 0 && <div className="w-px h-12 bg-border/60" />}

                                        {!isExpanded ? (
                                            <div onClick={() => toggleExpand(lvl)} className={`w-64 flex items-center justify-between px-4 py-3 border ${pillBorder} ${pillBg} rounded-full shadow-lg relative z-10 group cursor-pointer ${borderColorHover} transition-colors`}>
                                                <div className="flex items-center gap-2 max-w-[85%]">
                                                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${themeColor}`} stroke="currentColor" />
                                                    <span className="text-[11px] font-bold text-foreground/90 uppercase tracking-[0.2em] truncate">{title}</span>
                                                </div>
                                                <Maximize2 className="w-3 h-3 text-muted-foreground flex-shrink-0" stroke="currentColor" />
                                            </div>
                                        ) : (
                                            <div onClick={() => toggleExpand(lvl)} className="w-[300px] sm:w-[360px] bg-[#0a0e14] border border-[#1e293b] hover:border-accent/50 transition-colors rounded-xl p-5 shadow-2xl relative z-10 cursor-pointer group">
                                                {/* Top Row */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-muted/40 text-muted-foreground border border-border/50">{activeNode.id}</span>
                                                        <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">{lvl}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {duration && <span className="text-[9px] font-mono text-muted-foreground mr-1.5 font-bold">[{duration}]</span>}
                                                        {nodeData && <span className="text-[10px] font-black text-foreground">{progressAmt}</span>}
                                                        <div className={`w-2 h-2 rounded-full ${nodeData?.status === 'deliberating' ? 'bg-blue-500 animate-pulse' : nodeData?.status === 'complete' ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                                                        <X className="w-3 h-3 text-muted-foreground ml-1.5 opacity-40 group-hover:opacity-100 transition-opacity" stroke="currentColor" />
                                                    </div>
                                                </div>

                                                {/* Court Title */}
                                                <h3 className="text-[15px] flex items-start gap-2.5 font-black tracking-widest text-foreground uppercase mb-5 leading-tight">
                                                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${themeColor}`} stroke="currentColor" /> {title}
                                                </h3>

                                                {/* Status / Verdict */}
                                                <div className="flex flex-col gap-2">
                                                    {nodeData ? (
                                                        <>
                                                            <div className="flex items-center gap-2 px-1">
                                                                {nodeData.status === 'deliberating' && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />}
                                                                {nodeData.status === 'edge_case' && <Shield className="w-3.5 h-3.5 text-yellow-500 animate-pulse flex-shrink-0" />}
                                                                <span className={`text-[10px] uppercase tracking-[0.2em] line-clamp-3 ${nodeStateColors}`}>
                                                                    {nodeData.status === 'deliberating' ? nodeStateText : nodeData.status === 'edge_case' ? 'INTERVENTION REQUIRED' : (nodeData.verdict?.decision || nodeStateText)}
                                                                </span>
                                                            </div>

                                                            {/* Edge Case Resolver */}
                                                            {nodeData.status === 'edge_case' && (
                                                                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-3">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-[8px] uppercase font-black tracking-widest text-yellow-500">Anomaly Detected</span>
                                                                        <p className="text-[10px] text-yellow-200/80 italic">
                                                                            {edgeCase?.description || 'A procedural anomaly has stalled the court.'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                                                                        <Textarea
                                                                            className="w-full bg-[#0a0e14] border border-yellow-500/30 rounded-lg p-3 text-[10px] text-foreground placeholder:text-muted-foreground focus:border-yellow-500 outline-none transition-colors"
                                                                            placeholder="Enter User Advocate Directive..."
                                                                            rows={3}
                                                                            value={interventionText[nodeId] || ''}
                                                                            onChange={e => { e.stopPropagation(); setInterventionText(prev => ({ ...prev, [nodeId]: e.target.value })); }}
                                                                            onFocus={e => e.stopPropagation()}
                                                                        />
                                                                        <Button
                                                                            onClick={async e => {
                                                                                e.stopPropagation();
                                                                                const text = interventionText[nodeId];
                                                                                if (!text) return;
                                                                                setIsResolving(true);
                                                                                try {
                                                                                    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/simulate/resolve-edge-case/${liveCaseId}`, {
                                                                                        method: 'POST',
                                                                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(session as CustomSession)?.accessToken}` },
                                                                                        body: JSON.stringify({ nodeId, userInterventionText: text })
                                                                                    });
                                                                                    setInterventionText(prev => { const n = { ...prev }; delete n[nodeId]; return n; });
                                                                                } finally { setIsResolving(false); }
                                                                            }}
                                                                            disabled={isResolving || !interventionText[nodeId]}
                                                                            className="w-full h-8 bg-yellow-500 hover:bg-yellow-600 text-[#0a0e14] text-[9px] font-black uppercase tracking-widest"
                                                                        >
                                                                            {isResolving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Play className="w-3 h-3 mr-2" />}
                                                                            Resolve &amp; Resume
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Judicial Monologue Dropdown */}
                                                            <JudicialThought 
                                                                thinkingLog={nodeData.thinkingLog || ''}
                                                                status={nodeData.status}
                                                                startedAt={nodeData.startedAt}
                                                                completedAt={nodeData.completedAt}
                                                            />

                                                            {nodeData.reasoning && (
                                                                <div className="mt-1 text-[11px] text-muted-foreground/80 italic leading-relaxed border-t border-border/30 pt-3">
                                                                    &ldquo;{nodeData.reasoning}&rdquo;
                                                                </div>
                                                            )}
                                                            {nodeData.dissentingReasoning && (
                                                                <div className="mt-2 text-[11px] text-red-400/80 italic leading-relaxed border-t border-border/30 pt-3 flex flex-col gap-1">
                                                                    <strong className="text-[9px] uppercase tracking-widest text-red-500">
                                                                        Dissent: {nodeData.dissentingAgents?.join(', ') || 'Dissenting Opinion'}
                                                                    </strong>
                                                                    &ldquo;{nodeData.dissentingReasoning}&rdquo;
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-1">
                                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Dormant Venue</span>
                                                        </div>
                                                    )}

                                                    {/* Progress bar */}
                                                    {nodeData && (
                                                        <div className="w-full h-1 bg-[#1e293b] rounded-full mt-3 overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-1000 ${progressColor}`} style={{ width: progressAmt }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
