'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import Link from "next/link";
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import { applySimulationEvent, SimulationEvent, SimulationState } from '@/lib/simulation_sync';
import { CollaborativeMessage, CollaborativeCase } from '@/types/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Users, MessageSquare, Send, Globe, Gavel, FileText, ChevronRight, Scale, AlertTriangle, Hammer, Loader2 } from 'lucide-react';

function CollaboratePageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [caseId, setCaseId] = useState<string>(searchParams.get('id') || '');
  const [joinedCase, setJoinedCase] = useState<CollaborativeCase | null>(null);
  const [messages, setMessages] = useState<CollaborativeMessage[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [edgeCaseResolution, setEdgeCaseResolution] = useState('');
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [resolvingEdgeCase, setResolvingEdgeCase] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const initializeSocket = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const newSocket: Socket = io(backendUrl, {
        withCredentials: true,
        extraHeaders: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });

      setSocket(newSocket);

      // Authentication: Send token, not userId
      newSocket.emit('authenticate', user.accessToken);

      // Event handlers
      newSocket.on('auth-success', (data) => {
        console.log('Authenticated with WebSocket:', data);
      });

      newSocket.on('auth-error', (error) => {
        setError(error);
      });

      newSocket.on('case-joined', (data) => {
        setJoinedCase(data.case);
        setMessages(data.messages);
        setParticipants(data.participants);
        if (data.userMap) setUserMap(data.userMap);
        setError('');
      });

      newSocket.on('new-message', (message: CollaborativeMessage) => {
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('user-joined', (data) => {
        setParticipants(prev => {
          if (prev.includes(data.userId)) return prev;
          
          if (data.username) {
            setUserMap(prevMap => ({ ...prevMap, [data.userId]: data.username }));
          }
          const displayName = data.username || `Delegate ${data.userId.slice(-6)}`;
          
          const systemMessage = {
            caseId: data.caseId,
            senderId: 'system',
            content: `${displayName} entered the chamber.`,
            messageType: 'system' as const,
            createdAt: new Date().toISOString()
          };
          setMessages(prevMsgs => [...prevMsgs, systemMessage]);
          
          return [...prev, data.userId];
        });
      });

      newSocket.on('user-left', (data) => {
        setParticipants(prev => prev.filter(id => id !== data.userId));
        const displayName = data.username || `Delegate ${data.userId.slice(-6)}`;
        const systemMessage = {
          caseId: data.caseId,
          senderId: 'system',
          content: `${displayName} left the chamber.`,
          messageType: 'system' as const,
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, systemMessage]);
      });

      newSocket.on('case-updated', (data) => {
        // If it's a full case object (has _id and pipelines), replace it
        if (data._id && data.pipelines) {
          setJoinedCase(data);
        } else if (data.event) {
          // If it's a granular event, merge it into the state using the sync utility
          setJoinedCase(prev => applySimulationEvent(prev as unknown as SimulationState, data as unknown as SimulationEvent) as unknown as CollaborativeCase);
        }
      });

      newSocket.on('error', (error) => {
        setError(error);
      });

      return () => {
        newSocket.disconnect();
      };
    };

    initializeSocket();
  }, [user]);

  const handleJoinCase = useCallback(() => {
    if (!caseId.trim() || !socket) return;
    setLoading(true);
    setError('');
    socket.emit('join-case', caseId);
  }, [caseId, socket]);

  useEffect(() => {
    if (socket && caseId && !joinedCase) {
       handleJoinCase();
    }
  }, [socket, caseId, handleJoinCase, joinedCase]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !joinedCase || !socket) return;

    socket.emit('send-message', {
      caseId: joinedCase._id,
      content: messageInput,
      messageType: 'text'
    });

    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeEdgeCase = joinedCase?.edgeCaseLog?.find(e => !e.resolved);

  const handleResolveEdgeCase = async () => {
    if (!activeEdgeCase || !edgeCaseResolution.trim() || !user || !joinedCase) return;
    setResolvingEdgeCase(true);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/simulate/resolve-edge-case/${joinedCase._id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
            nodeId: activeEdgeCase.nodeId,
            userInterventionText: edgeCaseResolution
        })
      });
      if (response.ok) {
         setEdgeCaseResolution('');
         // Simulation resumes, WebSocket will eventually broadcast 'case-updated'
      } else {
         setError('Failed to resolve edge case condition.');
      }
    } catch {
       setError('Failed to reach simulation control server.');
    } finally {
       setResolvingEdgeCase(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary/10 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-premium border-primary/10">
          <CardContent className="p-12 text-center">
             <Scale className="h-12 w-12 mx-auto text-accent mb-6" />
             <h2 className="text-2xl font-bold font-serif mb-2">Chamber Access Restricted</h2>
             <p className="text-muted-foreground mb-8">Please authenticate to join the collaborative assembly sessions.</p>
             <Button onClick={() => router.push('/auth/login')} className="w-full text-[10px] uppercase font-bold tracking-widest shadow-sm h-10">
               Proceed to Login
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-secondary/5">
      {/* Header */}
      <div className="bg-background/90 backdrop-blur-md border-b border-primary/10 py-3 shadow-sm z-20 flex-shrink-0">
        <div className="container mx-auto px-6 max-w-screen-2xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" asChild className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-accent p-0">
              <Link href="/"><ArrowLeft className="h-3.5 w-3.5 mr-2" /> Assembly Room</Link>
            </Button>
            <div className="h-4 w-px bg-border hidden md:block" />
            <h1 className="text-xl font-bold font-serif flex items-center gap-2">
               <Users className="h-5 w-5 text-accent" /> Legislative Chamber
            </h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden container mx-auto px-6 py-6 max-w-screen-2xl h-full pb-12">
        {!joinedCase ? (
          /* Chamber Join Section */
          <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-lg shadow-premium border-primary/10 bg-background overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Gavel className="h-48 w-48" />
              </div>
              <CardContent className="p-12 relative">
                <div className="text-center mb-10">
                   <Badge className="bg-accent/20 text-accent-foreground border-accent/20 px-2.5 py-0.5 text-[9px] uppercase font-black tracking-widest mb-4">Secure Sync</Badge>
                   <h2 className="text-3xl font-bold font-serif mb-2">Enter Chamber</h2>
                   <p className="text-muted-foreground italic font-serif">Input your designated Chamber ID to begin real-time legislative collaboration.</p>
                </div>

                <div className="space-y-6">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm text-destructive text-center">
                      {error}
                    </div>
                  )}
                  <div className="relative">
                     <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                     <Input
                       type="text"
                       placeholder="e.g. CHAMBER-8492"
                       value={caseId}
                       onChange={(e) => setCaseId(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleJoinCase()}
                       disabled={loading}
                       className="pl-10 h-12 bg-secondary/10 border-primary/10 font-serif text-lg placeholder:font-sans placeholder:text-sm shadow-inner"
                     />
                  </div>
                  <Button
                    onClick={handleJoinCase}
                    disabled={loading || !caseId.trim()}
                    className="w-full h-12 text-[10px] uppercase font-bold tracking-widest shadow-premium"
                  >
                    {loading ? 'Authenticating...' : 'Access Chamber Workspace'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Collaboration Interface */
          <div className="flex h-full gap-6">
            
            {/* Sidebar - Participants */}
            <div className="w-64 flex flex-col gap-6 hidden md:block">
               <Card className="flex-1 shadow-sm border-primary/5 bg-background overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-primary/5 bg-secondary/10 flex justify-between items-center">
                   <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Delegation Panel</h3>
                   <Badge variant="outline" className="text-[9px] bg-background">
                     {participants.length} Active
                   </Badge>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3 space-y-1">
                   {participants.map((participantId) => {
                     const displayName = participantId === user?.id ? 'You' : (userMap[participantId] || `Delegate ${participantId.slice(-6)}`);
                     const displayChar = participantId === user?.id ? 'Y' : (userMap[participantId] ? userMap[participantId].charAt(0).toUpperCase() : participantId.slice(-6).charAt(0).toUpperCase());
                     return (
                     <div key={participantId} className="flex items-center p-2 hover:bg-secondary/20 rounded-lg transition-colors border border-transparent hover:border-primary/5 group">
                       <Avatar className="w-7 h-7 mr-3 border border-primary/10">
                         <AvatarFallback className="bg-background text-xs font-serif font-bold text-primary group-hover:text-accent transition-colors">{displayChar}</AvatarFallback>
                       </Avatar>
                       <span className="text-sm font-medium">{displayName}</span>
                     </div>
                     );
                   })}
                 </div>
               </Card>
            </div>

            {/* Main Chat Area */}
            <Card className="flex-1 flex flex-col shadow-premium border-primary/10 overflow-hidden bg-background">
                {/* Chamber Header */}
                <div className="border-b border-primary/5 p-5 bg-gradient-to-r from-secondary/5 to-transparent">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10 flex-shrink-0">
                         <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold font-serif">{joinedCase.title}</h2>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-xs text-muted-foreground">ID: {joinedCase._id}</span>
                           <span className="text-muted-foreground/30">•</span>
                           <span className="text-[9px] uppercase font-bold tracking-widest text-accent">{joinedCase.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-card border-x border-b rounded-b-xl border-border">
                  {messages.map((message, index) => {
                     const isSystem = message.messageType === 'system';
                     const isMe = message.senderId === user.id;

                     if (isSystem) {
                        return (
                           <div key={index} className="flex justify-center">
                              <div className="bg-secondary text-secondary-foreground/70 text-[10px] uppercase font-bold tracking-widest px-4 py-1.5 rounded-full border border-primary/5">
                                 {message.content.replace(/User ([a-f0-9]{24})/i, (match, id) => userMap[id] || `Delegate ${id.slice(-6)}`)}
                              </div>
                           </div>
                        );
                     }

                     return (
                        <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                           <div className={`flex gap-3 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              <Avatar className="w-8 h-8 border border-primary/10 flex-shrink-0 mt-1">
                                 <AvatarFallback className={`text-xs font-serif font-bold ${isMe ? 'bg-primary text-primary-foreground' : 'bg-background text-primary'}`}>
                                    {isMe ? 'Y' : (userMap[message.senderId] ? userMap[message.senderId].charAt(0).toUpperCase() : message.senderId.slice(-6).charAt(0).toUpperCase())}
                                 </AvatarFallback>
                              </Avatar>
                              <div>
                                 <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{isMe ? 'You' : (userMap[message.senderId] || `Delegate ${message.senderId.slice(-6)}`)}</span>
                                    <span className="text-[9px] text-muted-foreground/40">{formatTimestamp(message.createdAt)}</span>
                                 </div>
                                 <div className={`px-5 py-3 rounded-2xl shadow-sm border ${
                                    isMe 
                                    ? 'bg-primary text-primary-foreground border-transparent rounded-tr-sm' 
                                    : 'bg-secondary/50 text-secondary-foreground border-primary/10 rounded-tl-sm shadow-sm'
                                 }`}>
                                    <p className="text-[15px] leading-relaxed font-serif">{message.content}</p>
                                    
                                    {message.metadata?.confidence && (
                                       <div className={`mt-3 pt-3 border-t text-[10px] uppercase tracking-widest font-bold flex items-center justify-between ${
                                          isMe ? 'border-primary-foreground/20 text-primary-foreground/70' : 'border-primary/5 text-muted-foreground/60'
                                       }`}>
                                          <span>AI SYNTHESIS CONFIDENCE</span>
                                          <span>{(message.metadata.confidence * 100).toFixed(1)}%</span>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </div>
                     )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Edge Case Intervention / regular Message Input */}
                {activeEdgeCase ? (
                  <div className="border-t-2 border-destructive/80 bg-destructive/10 p-5 shadow-inner">
                     <Alert variant="destructive" className="mb-4 bg-background border-destructive text-destructive shadow-sm">
                       <AlertTriangle className="h-5 w-5" />
                       <AlertTitle className="uppercase tracking-widest font-black text-xs font-sans">Pipeline Stalled: {activeEdgeCase.type.replace(/_/g, ' ')}</AlertTitle>
                       <AlertDescription className="font-serif mt-2">
                         {activeEdgeCase.description} Focus on resolving this anomaly to unfreeze the DAG process.
                       </AlertDescription>
                     </Alert>
                     <div className="flex gap-3">
                       <Input
                         value={edgeCaseResolution}
                         onChange={(e) => setEdgeCaseResolution(e.target.value)}
                         placeholder="Enter Advocate Judicial Resolution Input..."
                         className="flex-1 bg-background border-destructive/20 font-serif placeholder:font-sans focus-visible:ring-destructive"
                         onKeyDown={(e) => e.key === 'Enter' && handleResolveEdgeCase()}
                       />
                       <Button variant="destructive" onClick={handleResolveEdgeCase} disabled={resolvingEdgeCase || !edgeCaseResolution.trim()} className="font-bold uppercase tracking-widest text-[10px]">
                         <Hammer className="h-3.5 w-3.5 mr-2" /> Strike Gavel
                       </Button>
                     </div>
                  </div>
                ) : (
                  <div className="border-t border-primary/10 p-4 bg-background">
                    <div className="flex gap-3 relative">
                      <Input
                        type="text"
                        placeholder="Draft a memorandum to the chamber..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={!joinedCase}
                        className="flex-1 h-12 bg-secondary/10 border-primary/10 rounded-xl pr-14 focus-visible:ring-accent"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || !joinedCase}
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg shadow-sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
            </Card>

            {/* Case Details Sidebar */}
            <div className="w-80 flex-col gap-6 hidden lg:flex">
               <Card className="shadow-sm border-primary/5 bg-background">
                 <div className="p-5 border-b border-primary/5 bg-secondary/10">
                   <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Procedural Details
                   </h3>
                 </div>
                 <div className="p-6 space-y-6">
                   <div className="space-y-4">
                     <div>
                       <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-1">Legal Framework</div>
                       <div className="font-serif font-medium capitalize">{joinedCase.caseType || 'Unspecified'}</div>
                     </div>
                     <div>
                       <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-1">Sovereign Jurisdiction</div>
                       <div className="font-serif font-medium">{joinedCase.jurisdiction || 'Global Application'}</div>
                     </div>
                     <div className="pt-4 border-t border-primary/5">
                       <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-2">Procedural Step (DAG Lifecycle)</div>
                       <Badge variant="outline" className="w-full justify-between py-2 text-[10px] uppercase tracking-widest font-bold">
                          {joinedCase.status?.replace('_', ' ') || 'Investigation'} 
                          <ChevronRight className="h-3 w-3" />
                       </Badge>
                     </div>
                     <div className="pt-2">
                       <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-2">Hierarchy Weight System</div>
                       <div className="space-y-1">
                          <div className="flex justify-between text-xs"><span>Supreme Court</span> <span className="font-bold">x3</span></div>
                          <div className="flex justify-between text-xs"><span>High Court</span> <span className="font-bold">x2</span></div>
                          <div className="flex justify-between text-xs"><span>District Court</span> <span className="font-bold">x1</span></div>
                       </div>
                     </div>
                   </div>
                 </div>
               </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CollaboratePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-secondary/10 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground font-serif italic">Accessing legislative chamber...</p>
        </div>
      </div>
    }>
      <CollaboratePageContent />
    </Suspense>
  );
}
