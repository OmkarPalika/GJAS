"use client";

import { Scale, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSimulation } from './SimulationContext';
import { Label } from '@/components/ui/label';

export function CaseBriefingModal() {
    const {
        isBriefingOpen, setIsBriefingOpen,
        caseContext, setCaseContext,
        briefingFacts, setBriefingFacts,
        briefingAccused, setBriefingAccused,
        briefingProsecution, setBriefingProsecution,
        briefingDefense, setBriefingDefense,
        briefingCaseType, setBriefingCaseType,
        handleStartSimulation,
    } = useSimulation();

    if (!isBriefingOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-border/50 bg-muted/10">
                    <div className="flex items-center gap-3">
                        <Scale className="w-5 h-5 text-accent" stroke="currentColor" />
                        <h2 className="text-[15px] font-black uppercase tracking-[0.2em] text-foreground">Case Briefing</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsBriefingOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5" stroke="currentColor" />
                    </Button>
                </div>

                {/* Body */}
                <div className="flex-1 px-7 py-6 flex flex-col gap-5 overflow-y-auto">

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Scenario Title</Label>
                        <Input
                            value={caseContext}
                            onChange={e => setCaseContext(e.target.value)}
                            placeholder="e.g. Copyright Infringement via Generative AI"
                            className="bg-muted/20 border-border text-sm font-medium"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">
                            Detailed Case Facts <span className="text-accent">*</span>
                        </Label>
                        <Textarea
                            value={briefingFacts}
                            onChange={e => setBriefingFacts(e.target.value)}
                            placeholder="Describe the full case scenario, evidence, context, and legal questions to be resolved. The more detail provided, the more precise each national judiciary's reasoning will be."
                            rows={5}
                            className="bg-muted/20 border-border text-sm leading-relaxed resize-none"
                        />
                        <p className="text-[9px] text-muted-foreground/60">
                            This is sent directly to each nation&apos;s LLM as case facts — be specific.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Case Type</Label>
                        <div className="flex gap-2">
                            {(['criminal', 'civil', 'constitutional'] as const).map(t => (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    key={t}
                                    onClick={() => setBriefingCaseType(t)}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${briefingCaseType === t
                                            ? 'bg-accent text-accent-foreground border-accent'
                                            : 'bg-muted/20 text-muted-foreground border-border hover:border-accent/50'
                                        }`}
                                >{t}</Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Accused</Label>
                            <Input value={briefingAccused} onChange={e => setBriefingAccused(e.target.value)} placeholder="Defendant name" className="bg-muted/20 border-border text-xs" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Prosecution</Label>
                            <Input value={briefingProsecution} onChange={e => setBriefingProsecution(e.target.value)} placeholder="Prosecution" className="bg-muted/20 border-border text-xs" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Defense</Label>
                            <Input value={briefingDefense} onChange={e => setBriefingDefense(e.target.value)} placeholder="Defense counsel" className="bg-muted/20 border-border text-xs" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-border/50 bg-muted/5">
                    <Button variant="ghost" onClick={() => setIsBriefingOpen(false)} className="text-muted-foreground text-xs">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleStartSimulation}
                        disabled={!briefingFacts.trim() && !caseContext.trim()}
                        className="px-6 bg-accent hover:bg-accent/80 text-accent-foreground font-black text-[10px] uppercase tracking-widest"
                    >
                        <Play className="w-3 h-3 mr-2 fill-current" /> Launch Simulation
                    </Button>
                </div>
            </div>
        </div>
    );
}
