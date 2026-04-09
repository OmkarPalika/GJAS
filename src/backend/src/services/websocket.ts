import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import Case from '@/models/Case.js';
import Message from '@/models/Message.js';
import mongoose from 'mongoose';
import User from '@/models/User.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface CaseJoinData {
  caseId: string;
}

interface MessageData {
  caseId: string;
  content: string;
  messageType?: string;
}

interface CaseUpdateData {
  caseId: string;
  status: string;
  updates: any;
}

interface ActiveCase {
  users: Set<string>;
  caseData: any;
}

class WebSocketServer {
  private io: Server;
  private activeCases: Map<string, ActiveCase>;
  private userSockets: Map<string, string>;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.activeCases = new Map();
    this.userSockets = new Map();
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      // User authentication
      socket.on('authenticate', (userId: string) => {
        this.handleAuthentication(socket, userId);
      });
      
      // Join a case room
      socket.on('join-case', (caseId: string) => {
        this.handleJoinCase(socket, caseId);
      });
      
      // Leave a case room
      socket.on('leave-case', (caseId: string) => {
        this.handleLeaveCase(socket, caseId);
      });
      
      // Send message
      socket.on('send-message', (data: MessageData) => {
        this.handleSendMessage(socket, data);
      });
      
      // Update case status
      socket.on('update-case-status', (data: CaseUpdateData) => {
        this.handleUpdateCaseStatus(socket, data);
      });
      
      // Debate events
      socket.on('start-debate', (data: any) => {
        this.io.to(data.caseId).emit('debate-started', data);
      });
      
      socket.on('next-turn', (data: any) => {
        this.io.to(data.caseId).emit('debate-turn-completed', data);
      });
      
      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }
  
  private handleAuthentication(socket: AuthenticatedSocket, userId: string): void {
    if (!userId) {
      socket.emit('auth-error', 'User ID is required');
      return;
    }
    
    this.userSockets.set(userId, socket.id);
    socket.userId = userId;
    socket.emit('auth-success', { userId });
    console.log(`User authenticated: ${userId}`);
  }
  
  private async handleJoinCase(socket: AuthenticatedSocket, caseId: string): Promise<void> {
    if (!socket.userId) {
      socket.emit('error', 'Authentication required');
      return;
    }
    
    try {
      // Get or create case
      let caseData = await Case.findById(caseId);
      const userObjectId = new mongoose.Types.ObjectId(socket.userId!) as any;
      
      if (!caseData) {
        caseData = new Case({
          _id: caseId,
          title: `Case ${caseId}`,
          facts: 'Pending formulation',
          status: 'investigation',
          parties: {
            prosecution: 'TBD',
            defense: 'TBD',
            accused: 'TBD'
          },
          participants: [userObjectId],
          createdBy: userObjectId,
          createdAt: new Date()
        });
        await caseData.save();
      } else {
        // Add user if not already participant
        if (!caseData.participants.some((p: any) => p.toString() === socket.userId)) {
          caseData.participants.push(userObjectId);
          await caseData.save();
        }
      }
      
      // Join socket room
      socket.join(caseId);
      
      // Initialize case in memory
      if (!this.activeCases.has(caseId)) {
        this.activeCases.set(caseId, {
          users: new Set<string>(),
          caseData: caseData.toObject()
        });
      }
      
      // Add user to active case
      this.activeCases.get(caseId)!.users.add(socket.userId);
      
      // Get recent messages
      const messages = await Message.find({ caseId }).sort({ createdAt: 1 }).limit(50);
      
      const allUserIds = new Set<string>();
      messages.forEach(m => allUserIds.add(m.senderId.toString()));
      this.activeCases.get(caseId)!.users.forEach(id => allUserIds.add(id));
      
      const userDocs = await User.find({ _id: { $in: Array.from(allUserIds) } }, 'username profile');
      const userMap: Record<string, string> = {};
      userDocs.forEach(u => {
        userMap[u._id.toString()] = u.profile?.firstName ? `${u.profile.firstName} ${u.profile.lastName || ''}`.trim() : u.username;
      });

      const currentUser = userDocs.find(u => u._id.toString() === socket.userId);
      const currentUserName = currentUser ? (currentUser.profile?.firstName ? `${currentUser.profile.firstName} ${currentUser.profile.lastName || ''}`.trim() : currentUser.username) : 'Unknown';
      (socket as any).username = currentUserName;
      
      // Notify room
      socket.to(caseId).emit('user-joined', {
        userId: socket.userId,
        username: currentUserName,
        caseId
      });
      
      // Send case data and messages to user
      socket.emit('case-joined', {
        case: caseData,
        messages,
        participants: Array.from(this.activeCases.get(caseId)!.users),
        userMap
      });
      
      console.log(`User ${socket.userId} joined case ${caseId}`);
    } catch (error) {
      console.error('Join case error:', error);
      socket.emit('error', 'Failed to join case');
    }
  }
  
  private handleLeaveCase(socket: AuthenticatedSocket, caseId: string): void {
    if (!socket.userId) {
      socket.emit('error', 'Authentication required');
      return;
    }
    
    socket.leave(caseId);
    
    // Remove from active case
    const caseItem = this.activeCases.get(caseId);
    if (caseItem) {
      caseItem.users.delete(socket.userId);
      
      // Notify room
      socket.to(caseId).emit('user-left', {
        userId: socket.userId,
        username: (socket as any).username || 'Unknown',
        caseId
      });
    }
    
    console.log(`User ${socket.userId} left case ${caseId}`);
  }
  
  private async handleSendMessage(socket: AuthenticatedSocket, data: MessageData): Promise<void> {
    if (!socket.userId) {
      socket.emit('error', 'Authentication required');
      return;
    }
    
    try {
      const { caseId, content, messageType = 'text' } = data;
      
      // Create message
      const message = new Message({
        caseId,
        senderId: socket.userId,
        content,
        messageType,
        createdAt: new Date()
      });
      
      await message.save();
      
      // Broadcast to room
      this.io.to(caseId).emit('new-message', message.toObject());
      
      console.log(`Message sent in case ${caseId} by ${socket.userId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', 'Failed to send message');
    }
  }
  
  private async handleUpdateCaseStatus(socket: AuthenticatedSocket, data: CaseUpdateData): Promise<void> {
    if (!socket.userId) {
      socket.emit('error', 'Authentication required');
      return;
    }
    
    try {
      const { caseId, status, updates } = data;
      
      // Update case
      const caseData = await Case.findByIdAndUpdate(
        caseId,
        { status, ...updates },
        { new: true }
      );
      
      if (!caseData) {
        socket.emit('error', 'Case not found');
        return;
      }
      
      // Broadcast update
      this.io.to(caseId).emit('case-updated', caseData.toObject());
      
      console.log(`Case ${caseId} status updated to ${status}`);
    } catch (error) {
      console.error('Update case error:', error);
      socket.emit('error', 'Failed to update case');
    }
  }
  
  private handleDisconnect(socket: AuthenticatedSocket): void {    
    // Clean up user mapping
    if (socket.userId) {
      this.userSockets.delete(socket.userId);
      
      // Remove from all active cases
      this.activeCases.forEach((activeCase) => {
        activeCase.users.delete(socket.userId!);
      });
    }
  }
  
  public getActiveUsers(caseId: string): Set<string> {
    return this.activeCases.get(caseId)?.users || new Set<string>();
  }
  
  public getUserSocket(userId: string): string | undefined {
    return this.userSockets.get(userId);
  }
}

export default WebSocketServer;