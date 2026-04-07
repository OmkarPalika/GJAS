'use client';

import { useState, useEffect, useRef } from 'react';
import Link from "next/link";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import { CollaborativeMessage, CollaborativeCase } from '@/types/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function CollaboratePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [caseId, setCaseId] = useState<string>('');
  const [joinedCase, setJoinedCase] = useState<CollaborativeCase | null>(null);
  const [messages, setMessages] = useState<CollaborativeMessage[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const initializeSocket = async () => {
      const newSocket: Socket = io('http://localhost:5000', {
        withCredentials: true,
        extraHeaders: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });

      setSocket(newSocket);

      // Authentication
      newSocket.emit('authenticate', user.id);

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
      setError('');
    });

    newSocket.on('new-message', (message: CollaborativeMessage) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('user-joined', (data) => {
      setParticipants(prev => [...prev, data.userId]);
      // Add system message
      const systemMessage = {
        caseId: data.caseId,
        senderId: 'system',
        content: `User ${data.userId} joined the case`,
        messageType: 'system' as const,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    newSocket.on('user-left', (data) => {
      setParticipants(prev => prev.filter(id => id !== data.userId));
      // Add system message
      const systemMessage = {
        caseId: data.caseId,
        senderId: 'system',
        content: `User ${data.userId} left the case`,
        messageType: 'system' as const,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    newSocket.on('case-updated', (updatedCase) => {
      setJoinedCase(updatedCase);
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

  const handleJoinCase = () => {
    if (!caseId.trim()) {
      setError('Case ID is required');
      return;
    }

    if (!socket) {
      setError('WebSocket not connected');
      return;
    }

    setLoading(true);
    setError('');
    socket.emit('join-case', caseId);
  };

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please login to access collaboration features
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/auth/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{user.name || 'User'}</div>
                <div className="text-sm text-muted-foreground">{user.role} • Collaborative Mode</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                Home
              </Button>
              <Button variant="destructive" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {!joinedCase ? (
          /* Case Join Section */
          <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle>Join Collaboration Case</CardTitle>
                <CardDescription>
                  Enter a case ID to join an existing collaboration or create a new one
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-destructive/15 border border-destructive rounded-md p-3 text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter Case ID"
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinCase()}
                    disabled={loading}
                  />
                  <Button
                    onClick={handleJoinCase}
                    disabled={loading || !caseId.trim()}
                    className="w-full"
                  >
                    {loading ? 'Joining...' : 'Join Case'}
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground pt-4">
                  <p>Need help? Contact support for case access</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Collaboration Interface */
          <div className="flex h-full">
            {/* Sidebar - Participants */}
            <div className="w-64 border-r overflow-y-auto hidden md:block">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Participants</h3>
                <Badge variant="secondary" className="mt-1">
                  {participants.length} active
                </Badge>
              </div>
              <div className="p-2">
                {participants.map((participantId) => (
                  <div key={participantId} className="flex items-center p-2 hover:bg-accent rounded">
                    <Avatar className="w-6 h-6 mr-2">
                      <AvatarFallback>{participantId.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{participantId}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Chat Area */}
            <Card className="flex-1 flex flex-col">
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Case Header */}
                <div className="border-b p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold">{joinedCase.title}</h2>
                      <p className="text-sm text-muted-foreground">Case ID: {joinedCase._id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={joinedCase.status === 'open' ? 'default' : joinedCase.status === 'in_progress' ? 'secondary' : 'outline'}>
                        {joinedCase.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {joinedCase.currentStep?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.senderId === user.id ? 'bg-primary text-primary-foreground' : 
                                        message.messageType === 'system' ? 'bg-muted text-muted-foreground' : 
                                        'bg-card border'}`}>
                        {message.senderId !== 'system' && (
                          <div className={`text-xs ${message.senderId === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'} mb-1`}>
                            {message.senderId} • {formatTimestamp(message.createdAt)}
                          </div>
                        )}
                        <div className={message.senderId === user.id ? 'text-primary-foreground' : 'text-foreground'}>
                          {message.content}
                        </div>
                        {message.metadata?.confidence && (
                          <div className={`text-xs mt-1 ${message.senderId === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            Confidence: {(message.metadata.confidence * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-4 bg-background">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={!joinedCase}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || !joinedCase}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Case Details Sidebar */}
            <div className="w-80 border-l overflow-y-auto hidden lg:block">
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-4">Case Details</h3>
                <div className="space-y-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Title</dt>
                    <dd className="font-medium">{joinedCase.title}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Status</dt>
                    <dd className="font-medium">{joinedCase.status.replace('_', ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Legal System</dt>
                    <dd className="font-medium">{joinedCase.legalSystem || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Jurisdiction</dt>
                    <dd className="font-medium">{joinedCase.jurisdiction || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Created</dt>
                    <dd className="font-medium">{new Date(joinedCase.createdAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Current Step</dt>
                    <dd className="font-medium">{joinedCase.currentStep?.replace('_', ' ') || 'Unknown'}</dd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}