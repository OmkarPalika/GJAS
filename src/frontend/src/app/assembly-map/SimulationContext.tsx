"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { GLOBAL_COURT_REGISTRY, ALL_NATIONS, fetchRegistry } from '@/lib/court_registry';
import { useSocket } from '@/context/SocketContext';
import { applySimulationEvent, SimulationEvent, SimulationState } from '@/lib/simulation_sync';

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type CustomSession = (ReturnType<typeof useSession>['data']) & { accessToken?: string };

export interface IEdgeCaseEvent {
    nodeId: string;
    type: string;
    description: string;
    resolved: boolean;
    userInterventionText?: string;
    timestamp: string;
}

export interface INode {
    status: 'dormant' | 'deliberating' | 'complete' | 'edge_case' | 'pending' | 'failed';
    startedAt?: string;
    completedAt?: string;
    reasoning?: string;
    dissentingReasoning?: string;
    dissentingAgents?: string[];
    legalReferences?: string[];
    verdict?: {
        decision: string;
        sentenceOrRemedy?: string;
        majorityRatio?: string;
    };
    thinkingLog?: string;
    agentsInvolved?: string[];
}

export interface IGlobalAssembly {
    status: 'pending' | 'deliberating' | 'complete' | 'failed';
    finalGlobalJudgement?: string;
    synthesisReasoning?: string;
}

export interface ICase {
    id: string;
    title?: string;
    facts?: string;
    caseType?: string;
    status: 'investigation' | 'trial' | 'appellate' | 'supreme' | 'assembly' | 'executive_review' | 'complete';
    startedAt: string;
    updatedAt: string;
    parties?: { prosecution?: string; defense?: string; accused?: string };
    pipelines: Record<string, {
        nodes: Record<string, INode>;
        finalVerdict?: { decision: string; sentenceOrRemedy?: string };
        executiveReview?: { status: string; reasoning?: string };
    }>;
    edgeCaseLog: IEdgeCaseEvent[];
    globalAssembly?: IGlobalAssembly;
    iccProceedings?: {
        status: 'pending' | 'deliberating' | 'complete' | 'failed';
        reasoning?: string;
        verdict?: { decision: string; sentenceOrRemedy?: string };
    };
    ombudsmanReports?: { nodeId: string; critique: string; severity: string; timestamp: string }[];
}

export interface INationNode {
    id: string;
    name: string;
    category: string;
    sys: string;
    color: string;
    state: string;
    phase: string;
    pipelineData: { nodes: Record<string, INode>; finalVerdict?: { decision: string } } | null;
    xOffsetPercent?: number;
    yOffsetPercent?: number;
}

// ─── Context Shape ─────────────────────────────────────────────────────────────

interface SimulationContextValue {
    // Session
    session: ReturnType<typeof useSession>['data'];
    // URLs
    BASE_URL: string;
    API_URL: string;
    // Simulation state
    liveCase: ICase | null;
    setLiveCase: React.Dispatch<React.SetStateAction<ICase | null>>;
    liveCaseId: string | null;
    setLiveCaseId: React.Dispatch<React.SetStateAction<string | null>>;
    isSimulating: boolean;
    setIsSimulating: React.Dispatch<React.SetStateAction<boolean>>;
    isPaused: boolean;
    setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
    isOrchestrating: boolean;
    setIsOrchestrating: React.Dispatch<React.SetStateAction<boolean>>;
    orchestrationStartTime: number | null;
    setOrchestrationStartTime: React.Dispatch<React.SetStateAction<number | null>>;
    isResolving: boolean;
    setIsResolving: React.Dispatch<React.SetStateAction<boolean>>;
    startError: string | null;
    setStartError: React.Dispatch<React.SetStateAction<string | null>>;
    tPlus: string;
    // Briefing modal
    isBriefingOpen: boolean;
    setIsBriefingOpen: React.Dispatch<React.SetStateAction<boolean>>;
    caseContext: string;
    setCaseContext: React.Dispatch<React.SetStateAction<string>>;
    briefingFacts: string;
    setBriefingFacts: React.Dispatch<React.SetStateAction<string>>;
    briefingAccused: string;
    setBriefingAccused: React.Dispatch<React.SetStateAction<string>>;
    briefingProsecution: string;
    setBriefingProsecution: React.Dispatch<React.SetStateAction<string>>;
    briefingDefense: string;
    setBriefingDefense: React.Dispatch<React.SetStateAction<string>>;
    briefingCaseType: 'criminal' | 'civil' | 'constitutional';
    setBriefingCaseType: React.Dispatch<React.SetStateAction<'criminal' | 'civil' | 'constitutional'>>;
    // UI state
    hoveredNode: INationNode | null;
    setHoveredNode: React.Dispatch<React.SetStateAction<INationNode | null>>;
    activeNode: INationNode | null;
    setActiveNode: React.Dispatch<React.SetStateAction<INationNode | null>>;
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    filter: string | null;
    setFilter: React.Dispatch<React.SetStateAction<string | null>>;
    isPodiumOpen: boolean;
    setIsPodiumOpen: React.Dispatch<React.SetStateAction<boolean>>;
    chatBubbles: Record<string, { text: string; time: number }>;
    setChatBubbles: React.Dispatch<React.SetStateAction<Record<string, { text: string; time: number }>>>;
    interventionText: Record<string, string>;
    setInterventionText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    thinkingTicker: Record<string, string>;
    manualExpandedLevels: string[];
    setManualExpandedLevels: React.Dispatch<React.SetStateAction<string[]>>;
    // Derived
    ENHANCED_NATIONS: INationNode[];
    activePipeline: { nodes: Record<string, INode>; finalVerdict?: { decision: string } } | null;
    runningLvl: string | null;
    expandedLevels: string[];
    toggleExpand: (lvl: string) => void;
    // Actions
    handlePauseResume: () => Promise<void>;
    handleStop: () => Promise<void>;
    handleReset: () => Promise<void>;
    handleStartSimulation: () => Promise<void>;
    fetchFullPipelineForNode: (countryCode: string) => Promise<void>;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export const useSimulation = () => {
    const ctx = useContext(SimulationContext);
    if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
    return ctx;
};

// ─── Provider ──────────────────────────────────────────────────────────────────

const uniqueSet = Array.from(new Set(ALL_NATIONS)).slice(0, 195);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();

    const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const API_URL = `${BASE_URL}/api/simulate`;

    // ── Core simulation state ──
    const [liveCase, setLiveCase] = useState<ICase | null>(null);
    const [liveCaseId, setLiveCaseId] = useState<string | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isOrchestrating, setIsOrchestrating] = useState(false);
    const [orchestrationStartTime, setOrchestrationStartTime] = useState<number | null>(null);
    const [isResolving, setIsResolving] = useState(false);
    const [registryLoaded, setRegistryLoaded] = useState(false);

    // Fetch registry on mount
    useEffect(() => {
        fetchRegistry().then(() => {
            setRegistryLoaded(true);
        });
    }, []);
    const [startError, setStartError] = useState<string | null>(null);

    // ── Briefing modal state ──
    const [isBriefingOpen, setIsBriefingOpen] = useState(false);
    const [caseContext, setCaseContext] = useState('Copyright Infringement via Generative AI Base Models');
    const [briefingFacts, setBriefingFacts] = useState('');
    const [briefingAccused, setBriefingAccused] = useState('');
    const [briefingProsecution, setBriefingProsecution] = useState('International Prosecution Office');
    const [briefingDefense, setBriefingDefense] = useState('Defense Counsel');
    const [briefingCaseType, setBriefingCaseType] = useState<'criminal' | 'civil' | 'constitutional'>('criminal');

    // ── UI state ──
    const [hoveredNode, setHoveredNode] = useState<INationNode | null>(null);
    const [activeNode, setActiveNode] = useState<INationNode | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<string | null>(null);
    const [isPodiumOpen, setIsPodiumOpen] = useState(false);
    const [chatBubbles, setChatBubbles] = useState<Record<string, { text: string; time: number }>>({});
    const [interventionText, setInterventionText] = useState<Record<string, string>>({});
    const [thinkingTicker, setThinkingTicker] = useState<Record<string, string>>({});
    const [manualExpandedLevels, setManualExpandedLevels] = useState<string[]>([]);
    const [autoExpandedLevels, setAutoExpandedLevels] = useState<string[]>([]);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const { socket, connected } = useSocket();

    // ── Timers ──
    useEffect(() => {
        const h = setInterval(() => setCurrentTime(Date.now()), 100);
        return () => clearInterval(h);
    }, []);

    const thinkingNodes = useMemo(() => ({
        investigation: ['Analyzing forensic data', 'Scrutinizing metadata', 'Cross-referencing warrants', 'Reviewing evidence chain'],
        trial: ['Evaluating witness credibility', 'Analyzing legal precedents', 'Drafting jury instructions', 'Debating closing arguments'],
        appellate: ['Reviewing trial records', 'Assessing procedural errors', 'Parsing constitutional validity', 'Drafting majority opinion'],
        supreme: ['Interpreting constitutional doctrine', 'Weighing fundamental rights', 'Establishing landmark precedent', 'Finalizing sovereign resolution'],
    }), []);

    useEffect(() => {
        const h = setInterval(() => {
            setThinkingTicker(prev => {
                const next = { ...prev };
                (['investigation', 'trial', 'appellate', 'supreme'] as const).forEach(lvl => {
                    const opts = thinkingNodes[lvl];
                    next[lvl] = opts[Math.floor(Math.random() * opts.length)];
                });
                return next;
            });
        }, 3000);
        return () => clearInterval(h);
    }, [thinkingNodes]);

    // ── T+ counter ──
    const tPlus = useMemo(() => {
        if (isOrchestrating && orchestrationStartTime) {
            return ((currentTime - orchestrationStartTime) / 1000).toFixed(1) + 's';
        }
        if (!liveCase?.startedAt) return '0.0s';
        return ((currentTime - new Date(liveCase.startedAt).getTime()) / 1000).toFixed(1) + 's';
    }, [isOrchestrating, orchestrationStartTime, liveCase?.startedAt, currentTime]);

    // ── WebSocket Simulation Sync ──
    useEffect(() => {
        if (!liveCaseId || !socket || !connected) return;

        // Subscribe to this specific case room
        socket.emit('join-case', liveCaseId);

        const handleCaseUpdate = (data: Record<string, unknown> & { _id?: string, event?: string }) => {
            console.log('[Map WS] Received update:', data);
            
            // If it's a full case object, replace everything
            if (data._id && data.pipelines) {
               const mappedData = { ...data, id: data._id };
               setLiveCase(mappedData as unknown as ICase);
               setIsOrchestrating(false);
               return;
            }

            // Handle granular events
            if (data.event) {
                if (data.event === 'CASE_COMPLETE') {
                    setIsSimulating(false);
                    setIsOrchestrating(false);
                }
                
                if (data.event === 'PHASE_TRANSITION' || data.event === 'GLOBAL_ASSEMBLY_START' || data.event === 'EXECUTIVE_REVIEW_START') {
                    setIsOrchestrating(false);
                }

                setLiveCase(prev => applySimulationEvent(prev as unknown as SimulationState, data as unknown as SimulationEvent) as unknown as ICase);
            }
        };

        socket.on('case-updated', handleCaseUpdate);

        return () => {
            socket.off('case-updated', handleCaseUpdate);
        };
    }, [liveCaseId, socket, connected]);

    // Keep a very slow fallback poll (once every 10s) just in case socket drops
    useEffect(() => {
        if (!liveCaseId) return;
        const fallback = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/live/${liveCaseId}`, {
                    cache: 'no-store',
                    headers: { 'Authorization': `Bearer ${(session as CustomSession)?.accessToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setLiveCase(() => ({ ...data, id: data.id } as ICase));
                }
            } catch { /* ignore */ }
        }, 10000);
        return () => clearInterval(fallback);
    }, [liveCaseId, API_URL, session]);

    // ── Chat Bubble generator ──
    useEffect(() => {
        if (!liveCase?.pipelines) return;
        const id = setInterval(() => {
            const working = Object.entries(liveCase.pipelines).filter(([, pl]) =>
                Object.values(pl.nodes).some((n: INode) => n.status === 'deliberating')
            );
            if (!working.length) return;
            const [randomCode, pl] = working[Math.floor(Math.random() * working.length)];
            let reason = 'Deliberating...';
            if (pl.nodes.supreme.status === 'complete') reason = `FINAL VERDICT: ${pl.nodes.supreme.verdict?.decision || 'Adjudicated'}`;
            else {
                const deliberatingNode = (['supreme', 'appellate', 'trial', 'investigation'] as const)
                    .find(lvl => pl.nodes[lvl].status === 'deliberating');
                if (deliberatingNode) {
                    const log = pl.nodes[deliberatingNode].thinkingLog || '';
                    reason = log.split('\n').filter(Boolean).pop()?.slice(-100) || `Processing ${deliberatingNode}...`;
                }
            }
            setChatBubbles(prev => ({ ...prev, [randomCode]: { text: reason, time: Date.now() } }));
            setTimeout(() => setChatBubbles(prev => { const n = { ...prev }; delete n[randomCode]; return n; }), 8000);
        }, 4000);
        return () => clearInterval(id);
    }, [liveCase?.pipelines]);

    // ── Derived: nation map ──
    const ENHANCED_NATIONS = useMemo<INationNode[]>(() => uniqueSet.map(code => {
        let state = 'inactive', phase = 'Dormant Entity';
        let pipelineDataJson = null;
        if (liveCase?.pipelines?.[code]) {
            const pl = liveCase.pipelines[code];
            pipelineDataJson = pl;
            const nodes = Object.values(pl.nodes);
            if (nodes.some(n => n.status === 'failed')) { state = 'failed'; phase = 'Judicial Failure (Check Logs)'; }
            else if (nodes.some(n => n.status === 'edge_case')) { state = 'stopped'; phase = 'Halted (Edge Case Intercept)'; }
            else if (pl.nodes.supreme.status === 'complete') { state = 'active_not_working'; phase = 'Finalized Resolution'; }
            else if (pl.nodes.supreme.status === 'deliberating') { state = 'working'; phase = 'Supreme Court Deliberation'; }
            else if (pl.nodes.appellate.status === 'complete') { state = 'active_not_working'; phase = 'Appellate Resolution'; }
            else if (pl.nodes.appellate.status === 'deliberating') { state = 'working'; phase = 'Appellate Review'; }
            else if (pl.nodes.trial.status === 'complete') { state = 'active_not_working'; phase = 'Trial Verdict Reached'; }
            else if (pl.nodes.trial.status === 'deliberating') { state = 'working'; phase = 'Initial Trial Fact-Finding'; }
            else if (pl.nodes.investigation.status === 'complete') { state = 'active_not_working'; phase = 'Investigation Finalized'; }
            else if (pl.nodes.investigation.status === 'deliberating') { state = 'working'; phase = 'Active Investigation'; }
        }
        const reg = GLOBAL_COURT_REGISTRY[code];
        return { id: code, ...reg, state, phase, pipelineData: pipelineDataJson } as INationNode;
    }), [liveCase]);

    // ── Derived: active pipeline ──
    const activePipeline = useMemo(() =>
        activeNode?.id && liveCase?.pipelines ? liveCase.pipelines[activeNode.id] ?? null : null
    , [activeNode?.id, liveCase?.pipelines]);

    const runningLvl = useMemo(() => {
        if (!activePipeline) return null;
        return Object.keys(activePipeline.nodes).find(lvl => activePipeline.nodes[lvl].status === 'deliberating') ?? null;
    }, [activePipeline]);

    // Trigger auto-expand when a level starts running
    useEffect(() => {
        if (runningLvl && !autoExpandedLevels.includes(runningLvl)) {
            setAutoExpandedLevels(prev => [...prev, runningLvl]);
            setManualExpandedLevels(prev => Array.from(new Set([...prev, runningLvl])));
        }
    }, [runningLvl, autoExpandedLevels]);

    const expandedLevels = manualExpandedLevels;

    const toggleExpand = useCallback((lvl: string) => {
        setManualExpandedLevels(prev => prev.includes(lvl) ? prev.filter(l => l !== lvl) : [...prev, lvl]);
    }, []);

    // ── Actions ──
    const fetchFullPipelineForNode = useCallback(async (countryCode: string) => {
        if (!liveCaseId) return;
        try {
            const res = await fetch(`${API_URL}/${liveCaseId}`, {
                cache: 'no-store',
                headers: { 'Authorization': `Bearer ${(session as CustomSession)?.accessToken}` }
            });
            if (res.ok) {
                const full = await res.json();
                if (full?.pipelines?.[countryCode]) {
                    setLiveCase(prev => prev ? {
                        ...prev,
                        pipelines: { ...prev.pipelines, [countryCode]: full.pipelines[countryCode] }
                    } : prev);
                }
            }
        } catch { /* drawer still opens, just without rich data */ }
    }, [liveCaseId, API_URL, session]);

    const handlePauseResume = useCallback(async () => {
        const endpoint = isPaused ? 'resume' : 'pause';
        try {
            const res = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${(session as CustomSession)?.accessToken}` }
            });
            if (res.ok) setIsPaused(p => !p);
        } catch { /* ignore */ }
    }, [isPaused, API_URL, session]);

    const handleStop = useCallback(async () => {
        try {
            if (liveCaseId) {
                const res = await fetch(`${API_URL}/stop?caseId=${liveCaseId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${(session as CustomSession)?.accessToken}` }
                });
                if (res.ok) { setIsSimulating(false); setIsPaused(false); setIsOrchestrating(false); }
            }
        } catch { /* ignore */ } finally {
            setIsSimulating(false); setIsOrchestrating(false);
        }
    }, [liveCaseId, API_URL, session]);

    const handleReset = useCallback(async () => {
        await handleStop();
        setLiveCase(null); setLiveCaseId(null); setActiveNode(null);
        setHoveredNode(null); setChatBubbles({}); setInterventionText({});
        setSearch(''); setFilter(null); setManualExpandedLevels([]); setThinkingTicker({});
        setOrchestrationStartTime(null);
    }, [handleStop]);

    const handleStartSimulation = useCallback(async () => {
        if (isSimulating) return;
        setStartError(null);
        try {
            setIsSimulating(true); setIsPaused(false); setIsOrchestrating(true);
            setOrchestrationStartTime(Date.now());
            const res = await fetch(`${API_URL}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(session as CustomSession)?.accessToken}` },
                body: JSON.stringify({
                    title: caseContext,
                    facts: briefingFacts || caseContext,
                    accused: briefingAccused || caseContext,
                    prosecution: briefingProsecution,
                    defense: briefingDefense,
                    caseType: briefingCaseType,
                    countries: uniqueSet
                })
            });
            if (res.ok) {
                const data = await res.json();
                setLiveCaseId(data.caseId);
                setIsBriefingOpen(false);
                setTimeout(() => setIsOrchestrating(false), 5000);
            } else {
                const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
                setStartError(errData.error || 'Failed to start simulation');
                setIsSimulating(false); setIsOrchestrating(false);
            }
        } catch {
            setStartError('Network error — backend unreachable');
            setIsSimulating(false); setIsOrchestrating(false);
        }
    }, [isSimulating, API_URL, session, caseContext, briefingFacts, briefingAccused, briefingProsecution, briefingDefense, briefingCaseType]);

    return (
        <SimulationContext.Provider value={{
            session, BASE_URL, API_URL,
            liveCase, setLiveCase, liveCaseId, setLiveCaseId,
            isSimulating, setIsSimulating, isPaused, setIsPaused,
            isOrchestrating, setIsOrchestrating, orchestrationStartTime, setOrchestrationStartTime,
            isResolving, setIsResolving, startError, setStartError, tPlus,
            isBriefingOpen, setIsBriefingOpen, caseContext, setCaseContext,
            briefingFacts, setBriefingFacts, briefingAccused, setBriefingAccused,
            briefingProsecution, setBriefingProsecution, briefingDefense, setBriefingDefense,
            briefingCaseType, setBriefingCaseType,
            hoveredNode, setHoveredNode, activeNode, setActiveNode,
            search, setSearch, filter, setFilter, isPodiumOpen, setIsPodiumOpen,
            chatBubbles, setChatBubbles, interventionText, setInterventionText,
            thinkingTicker, manualExpandedLevels, setManualExpandedLevels,
            ENHANCED_NATIONS, activePipeline, runningLvl, expandedLevels, toggleExpand,
            handlePauseResume, handleStop, handleReset, handleStartSimulation,
            fetchFullPipelineForNode,
        }}>
            {children}
        </SimulationContext.Provider>
    );
}
