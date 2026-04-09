"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, BrainCircuit, Scale, Cpu, Hammer, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const agents = [
  {
    id: "USA",
    name: "US Supreme Court Model",
    role: "Supreme Court",
    weight: 3,
    perspective: "Common Law (Precedent-Based)",
    description: "Fine-tuned Legal-BERT model grounded in the US Constitution. Emphasizes 1st Amendment rights, historical precedent, and stare decisis.",
    focusAreas: ["Constitutional History", "Appellate Review", "Free Speech"],
    metrics: { cases: 142, similarity: 98, winRate: 54 },
    theme: "primary"
  },
  {
    id: "Germany",
    name: "German Supreme Court Model",
    role: "Supreme Court",
    weight: 3,
    perspective: "Civil Law (Code-Based)",
    description: "Mistral 7B SLM grounded in the German Basic Law. Relies on strong textual interpretation and statutory intent, prioritizing human dignity.",
    focusAreas: ["Statutory Interpretation", "Human Dignity", "Civil Rights Codes"],
    metrics: { cases: 128, similarity: 94, winRate: 46 },
    theme: "accent"
  },
  {
    id: "India",
    name: "Indian High Court Model",
    role: "High Court",
    weight: 2,
    perspective: "Mixed System (Balanced)",
    description: "Specialized model applying a balanced approach typical of Indian jurisprudence, weighing statutory law against diverse socio-cultural precedents.",
    focusAreas: ["Pluralistic Interpretation", "Constitutional Bench", "Administrative Law"],
    metrics: { cases: 89, similarity: 91, winRate: 62 },
    theme: "destructive"
  },
  {
    id: "France",
    name: "Global Rights District Model",
    role: "District Court",
    weight: 1,
    perspective: "Global Human Rights",
    description: "Lower tier model interpreting issues strictly through international treaties without Supreme Court binding authority.",
    focusAreas: ["Treaty Adherence", "Trial Verification", "Cross-Border"],
    metrics: { cases: 45, similarity: 88, winRate: 31 },
    theme: "secondary"
  }
];

export default function AgentRegistryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set(["USA", "Germany", "India"]));
  const [caseTitle, setCaseTitle] = useState("");
  const [caseFacts, setCaseFacts] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const toggleAgent = (id: string) => {
    const next = new Set(selectedAgents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAgents(next);
  };

  const handleCreateCase = async () => {
    if (!caseTitle.trim() || selectedAgents.size === 0 || !user) return;
    setIsCreating(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/simulate/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
            title: caseTitle,
            facts: caseFacts || "Pending formulation",
            countries: Array.from(selectedAgents)
        })
      });
      
      const data = await response.json();
      if (data.caseId) {
        router.push(`/chamber?id=${data.caseId}`);
      } else {
        console.error("Failed to create simulation", data);
        setIsCreating(false);
      }
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/10 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-primary/10 py-4 shadow-sm">
        <div className="container mx-auto px-6 max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" asChild className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-accent p-0">
              <Link href="/archives"><ArrowLeft className="h-3.5 w-3.5 mr-2" /> Archives</Link>
            </Button>
            <div className="h-4 w-px bg-border hidden md:block" />
            <h1 className="text-xl font-bold font-serif flex items-center gap-2">
               <Users className="h-5 w-5 text-accent" /> AI Judicial Assembly
            </h1>
          </div>
          <div className="flex gap-3">
             <Badge variant="outline" className="text-[10px] uppercase font-black bg-background border-primary/20 flex items-center gap-2">
                <BrainCircuit className="h-3.5 w-3.5 text-accent" /> Mistral Engines Active
             </Badge>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-7xl">
         
         <div className="mb-12 text-center max-w-3xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-serif">Assemble The Chamber</h2>
            <p className="text-muted-foreground text-lg italic font-serif">
               Configure a multi-jurisdictional AI simulation using RAG and Court-Hierarchical Weighted Voting.
            </p>
            
            <Button size="lg" onClick={() => setIsModalOpen(true)} className="font-bold uppercase tracking-widest mt-6 shadow-xl border border-primary/20">
               <Hammer className="mr-2 h-5 w-5" /> Convene Assembly
            </Button>
            
            {isModalOpen && (
              <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                <Card className="w-full max-w-[425px] shadow-2xl border-primary/20 bg-background text-left p-2">
                  <div className="p-4 border-b border-border/40">
                    <h2 className="font-serif text-2xl font-bold">Initialize Simulation Session</h2>
                  </div>
                  <div className="grid gap-6 p-6">
                    <div className="grid gap-3">
                      <Label htmlFor="title" className="text-[10px] uppercase font-bold tracking-widest">Case Title (Chamber Name)</Label>
                      <Input id="title" placeholder="e.g. Global Tech Defamation 2026" value={caseTitle} onChange={e => setCaseTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="facts" className="text-[10px] uppercase font-bold tracking-widest">Case Facts Snippet</Label>
                      <Input id="facts" placeholder="e.g. Defendant generated an AI deepfake..." value={caseFacts} onChange={e => setCaseFacts(e.target.value)} />
                    </div>
                    <div className="grid gap-3">
                       <Label className="text-[10px] uppercase font-bold tracking-widest">Selected Bench ({selectedAgents.size} Agents)</Label>
                       <div className="flex flex-wrap gap-2">
                          {Array.from(selectedAgents).map(id => {
                              const ag = agents.find(a => a.id === id);
                              return <Badge key={id} variant="secondary">{ag?.name}</Badge>
                          })}
                       </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 p-4 border-t border-border/40">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateCase} disabled={isCreating || !caseTitle.trim() || selectedAgents.size === 0}>
                      {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Start Debate
                    </Button>
                  </div>
                </Card>
              </div>
            )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {agents.map((agent) => {
               const isSelected = selectedAgents.has(agent.id);
               return (
               <Card 
                 key={agent.id} 
                 className={`cursor-pointer transition-all duration-300 overflow-hidden group border-2 ${isSelected ? 'border-primary shadow-premium' : 'border-border/40 hover:border-border scale-95 opacity-80'}`}
                 onClick={() => toggleAgent(agent.id)}
               >
                  <div className={`h-1.5 w-full bg-${agent.theme} transition-all duration-500`} />
                  <CardContent className="p-8">
                     <header className="flex flex-col items-center text-center pb-6 border-b border-primary/5 relative">
                        <div className="absolute top-0 right-0">
                           <Cpu className={`h-5 w-5 ${isSelected ? 'text-accent' : 'text-muted-foreground/20'}`} />
                        </div>
                        <Avatar className={`h-20 w-20 mb-4 border-4 shadow-sm bg-${agent.theme}/5 border-${agent.theme}/20`}>
                           <AvatarFallback className="text-xl font-bold font-serif">{agent.name.split(' ')[0][0]}</AvatarFallback>
                        </Avatar>
                        <h3 className="text-2xl font-bold font-serif text-foreground">{agent.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                           <Badge variant={isSelected ? "default" : "outline"} className="text-[9px] font-black uppercase tracking-[0.2em]">
                              {agent.role}
                           </Badge>
                           <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] bg-accent/10 border-accent/20 text-accent">
                              Weight: {agent.weight}x
                           </Badge>
                        </div>
                     </header>

                     <div className="py-6 space-y-6">
                        <div>
                           <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-2">
                              <Scale className="h-3 w-3" /> Jurisdictional Perspective
                           </div>
                           <p className="font-medium text-sm font-serif">{agent.perspective}</p>
                        </div>
                        
                        <div>
                           <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-2">Computational Profile</div>
                           <p className="text-sm text-foreground/80 leading-relaxed italic line-clamp-2 title">{agent.description}</p>
                        </div>
                     </div>
                  </CardContent>
               </Card>
               );
            })}
         </div>
      </main>
    </div>
  );
}
