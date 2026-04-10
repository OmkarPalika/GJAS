'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import LegalNetworkGraph from '@/components/visualizations/LegalNetworkGraph';
import LegalSystemBarChart from '@/components/visualizations/LegalSystemBarChart';
import { NetworkData, BarChartData } from '@/types/visualization';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ArrowLeft, Network, BarChart3, Clock, Database, Map } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

// Use a local LocalBadge if not imported from elsewhere to avoid conflicts
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

export default function VisualizePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('network');
  const [loading, setLoading] = useState(true);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [barChartData, setBarChartData] = useState<BarChartData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { socket, connected } = useSocket();

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchData = async () => {
      const token = session?.accessToken;
      if (!token) {
        if (!session) {
           setError('Authentication required for telemetry access.');
           setLoading(false);
           return;
        }
        return; // Wait for session/token
      }

      try {
        const endpoint = activeTab === 'network' ? 'nodes' : 'stats';
        const response = await fetch(`${API_URL}/api/simulate/telemetry/${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch telemetry');
        
        const data = await response.json();
        if (activeTab === 'network') {
          setNetworkData(data);
        } else {
          setBarChartData(data);
        }
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, session, API_URL]);

  // WebSocket Telemetry Listener
  useEffect(() => {
    if (!socket || !connected) return;

    // Join the global telemetry feed
    socket.emit('join-case', 'global-telemetry');

    const handleUpdate = (data: Record<string, unknown> & { event?: string, country?: string, status?: string }) => {
      console.log('[WS Telemetry] Received update:', data);
      
      if (data.event === 'NODE_COMPLETE' || data.event === 'PHASE_TRANSITION') {
        setNetworkData(prev => {
          if (!prev) return prev;
          
          const newNodes = prev.nodes.map(node => {
            // Check if this node matches the country/phase being updated
            // Node IDs in the graph look like: country-level-caseId (from simulation.ts)
            // or country-caseId
            const isMatch = (data.country && node.id.includes(data.country)) || (data.status && node.id.includes(data.status));
            
            if (isMatch) {
              return { ...node, status: data.status || 'complete' };
            }
            return node;
          });

          return { ...prev, nodes: newNodes };
        });
      }
    };

    socket.on('telemetry-update', handleUpdate);

    return () => {
      socket.off('telemetry-update', handleUpdate);
    };
  }, [socket, connected]);

  return (
    <div className="min-h-screen bg-secondary/10 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-primary/10 py-4 shadow-sm">
        <div className="container mx-auto px-6 max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" asChild className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-accent p-0">
              <Link href="/"><ArrowLeft className="h-3.5 w-3.5 mr-2" /> Return to Assembly</Link>
            </Button>
            <div className="h-4 w-px bg-border hidden md:block" />
            <h1 className="text-xl font-bold font-serif flex items-center gap-2">
               <Activity className="h-5 w-5 text-accent" /> Analytics Laboratory
            </h1>
          </div>
          <div className="flex gap-3">
             <LocalBadge variant="outline" className="text-[10px] uppercase font-black bg-background border-primary/20 flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-accent" /> Live Telemetry
             </LocalBadge>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-6 py-12 max-w-7xl">
         
         <div className="mb-12 max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-serif">Data Topography</h2>
            <p className="text-muted-foreground text-lg italic font-serif">
               Explore the interconnectivity of global legal systems. The Analytics Laboratory provides macroscopic insights into the jurisprudential structure of the simulator&apos;s knowledge base.
            </p>
         </div>

         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-end mb-8 border-b border-primary/10 pb-4">
               <TabsList className="bg-transparent border border-primary/10 p-1 h-auto rounded-xl">
                  <TabsTrigger value="network" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs uppercase tracking-widest font-bold py-2 px-6 rounded-lg">
                     <Network className="h-3.5 w-3.5 mr-2" /> Entity Graph
                  </TabsTrigger>
                  <TabsTrigger value="distribution" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs uppercase tracking-widest font-bold py-2 px-6 rounded-lg">
                     <BarChart3 className="h-3.5 w-3.5 mr-2" /> Distribution
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs uppercase tracking-widest font-bold py-2 px-6 rounded-lg">
                     <Clock className="h-3.5 w-3.5 mr-2" /> Chronology
                  </TabsTrigger>
               </TabsList>
            </div>

            <Card className="bg-background shadow-premium border-primary/5 min-h-[600px] flex flex-col overflow-hidden">
               {error ? (
                  <div className="flex flex-col items-center justify-center h-[600px] text-center p-12">
                     <LocalBadge variant="destructive" className="mb-4">Telemetry Fault</LocalBadge>
                     <p className="text-muted-foreground font-serif italic mb-4">{error}</p>
                     <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Re-establish Connection</Button>
                  </div>
               ) : (
                  <>
                     <TabsContent value="network" className="m-0 flex-1 flex flex-col p-8">
                        <div className="mb-6 flex justify-between items-start">
                           <div>
                              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-1">
                                 <Network className="h-4 w-4 text-accent" /> Live Relationship Network
                              </h3>
                              <p className="font-serif italic text-muted-foreground/80">Active DAG connections across running simulations.</p>
                           </div>
                        </div>
                        
                        <div className="flex-1 bg-secondary/5 rounded-xl border border-primary/10 flex items-center justify-center p-4 min-h-[450px]">
                           {loading ? (
                              <Skeleton className="w-[80%] h-[80%] rounded-full opacity-20" />
                           ) : networkData ? (
                              <LegalNetworkGraph data={networkData} width={1000} height={450} />
                           ) : (
                              <p className="text-muted-foreground italic">Initializing network...</p>
                           )}
                        </div>
                     </TabsContent>

                     <TabsContent value="distribution" className="m-0 flex-1 flex flex-col p-8">
                        <div className="mb-6">
                           <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-1">
                              <BarChart3 className="h-4 w-4 text-accent" /> Legal System Taxonomy
                           </h3>
                           <p className="font-serif italic text-muted-foreground/80">Jurisdictional distribution of active case entities.</p>
                        </div>
                        
                        <div className="flex-1 bg-secondary/5 rounded-xl border border-primary/10 flex items-center justify-center p-4 min-h-[450px]">
                           {loading ? (
                              <Skeleton className="w-[80%] h-[40%] opacity-20" />
                           ) : barChartData.length > 0 ? (
                              <LegalSystemBarChart data={barChartData} width={800} height={400} />
                           ) : (
                              <p className="text-muted-foreground italic">Calculating distribution...</p>
                           )}
                        </div>
                     </TabsContent>

                     <TabsContent value="timeline" className="m-0 flex-1 flex items-center justify-center p-8 bg-secondary/5">
                        <div className="text-center max-w-md">
                           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-background border-2 border-primary/10 mb-6 shadow-sm">
                              <Clock className="h-6 w-6 text-muted-foreground/50" />
                           </div>
                           <h3 className="font-serif text-2xl font-bold mb-2">Chronological Matrix</h3>
                           <p className="text-muted-foreground mb-6">Historical timeline mapping of constitutional ratification and seminal treaties.</p>
                           <LocalBadge className="bg-accent/20 text-accent-foreground border-accent/20 px-3 py-1 font-black uppercase tracking-widest text-[10px]">
                              Module in Active Development
                           </LocalBadge>
                        </div>
                     </TabsContent>
                  </>
               )}
            </Card>
         </Tabs>

         {/* Meta Section */}
         <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-primary/10 rounded-xl p-6 bg-background flex gap-4">
               <div className="flex-shrink-0 mt-1"><Activity className="h-5 w-5 text-accent" /></div>
               <div>
                  <h4 className="font-bold text-sm uppercase tracking-widest mb-1">Cross-Analysis</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Map structural similarities between distinct jurisdictions instantly.</p>
               </div>
            </div>
            <div className="border border-primary/10 rounded-xl p-6 bg-background flex gap-4">
               <div className="flex-shrink-0 mt-1"><Database className="h-5 w-5 text-accent" /></div>
               <div>
                  <h4 className="font-bold text-sm uppercase tracking-widest mb-1">Data Provenance</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Sourced directly from the Constitute Project and verified UN treatises.</p>
               </div>
            </div>
            <div className="border border-primary/10 rounded-xl p-6 bg-background flex gap-4">
               <div className="flex-shrink-0 mt-1"><Map className="h-5 w-5 text-accent" /></div>
               <div>
                  <h4 className="font-bold text-sm uppercase tracking-widest mb-1">Taxonomy Hub</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Categorize laws by system type: Common, Civil, Mixed, or Customary.</p>
               </div>
            </div>
         </div>

      </main>
    </div>
  );
};