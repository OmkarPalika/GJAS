'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import { CollaborativeMessage, CollaborativeCase } from '@/types/api';

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please login to access collaboration features</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-semibold">{user.name || 'User'}</div>
                <div className="text-sm text-gray-500">{user.role} • Collaborative Mode</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={logout}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                Logout
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {!joinedCase ? (
          /* Case Join Section */
          <div className="flex items-center justify-center h-full">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-center">Join Collaboration Case</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter Case ID"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleJoinCase}
                  disabled={loading}
                  className={`w-full py-3 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Joining...' : 'Join Case'}
                </button>
              </div>

              <div className="mt-6 text-center text-sm text-gray-600">
                <p>Enter a case ID to join an existing collaboration or create a new one</p>
              </div>
            </div>
          </div>
        ) : (
          /* Collaboration Interface */
          <div className="flex h-full">
            {/* Sidebar - Participants */}
            <div className="w-64 bg-white border-r overflow-y-auto">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Participants</h3>
                <span className="text-sm text-gray-500">({participants.length})</span>
              </div>
              <div className="p-2">
                {participants.map((participantId) => (
                  <div key={participantId} className="flex items-center p-2 hover:bg-gray-50 rounded">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                      {participantId.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{participantId}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Case Header */}
              <div className="bg-white border-b p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">{joinedCase.title}</h2>
                    <p className="text-sm text-gray-500">Case ID: {joinedCase._id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${joinedCase.status === 'open' ? 'bg-green-100 text-green-800' : 
                                      joinedCase.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                      'bg-gray-100 text-gray-800'}`}>
                      {joinedCase.status.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      {joinedCase.currentStep?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.senderId === user.id ? 'bg-blue-500 text-white' : 
                                      message.messageType === 'system' ? 'bg-gray-200 text-gray-800' : 
                                      'bg-white border border-gray-200'}`}>
                      {message.senderId !== 'system' && (
                        <div className={`text-xs ${message.senderId === user.id ? 'text-blue-100' : 'text-gray-500'} mb-1`}>
                          {message.senderId} • {formatTimestamp(message.createdAt)}
                        </div>
                      )}
                      <div className={message.senderId === user.id ? 'text-white' : 'text-gray-900'}>
                        {message.content}
                      </div>
                      {message.metadata?.confidence && (
                        <div className={`text-xs mt-1 ${message.senderId === user.id ? 'text-blue-100' : 'text-gray-500'}`}>
                          Confidence: {(message.metadata.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t p-4 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Case Details Sidebar */}
            <div className="w-80 bg-gray-50 border-l overflow-y-auto">
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-4">Case Details</h3>
                <div className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">Title</dt>
                    <dd className="font-medium">{joinedCase.title}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd className="font-medium">{joinedCase.status.replace('_', ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Legal System</dt>
                    <dd className="font-medium">{joinedCase.legalSystem || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Jurisdiction</dt>
                    <dd className="font-medium">{joinedCase.jurisdiction || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Created</dt>
                    <dd className="font-medium">{new Date(joinedCase.createdAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Current Step</dt>
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