import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
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
  private static instance: WebSocketServer;
  private io: Server;
  private activeCases: Map<string, ActiveCase>;
  private userSockets: Map<string, string>;

  public static init(httpServer: HttpServer): WebSocketServer {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer(httpServer);
    }
    return WebSocketServer.instance;
  }

  public static getInstance(): WebSocketServer {
    if (!WebSocketServer.instance) {
      throw new Error('WebSocketServer not initialized. Call init(httpServer) first.');
    }
    return WebSocketServer.instance;
  }

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
      // ── RC-14 FIX: Verify JWT instead of trusting client-provided userId ──
      socket.on('authenticate', (token: string) => {
        this.handleAuthentication(socket, token);
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

  /**
   * RC-14 FIX: Verify JWT token — never trust a bare userId string from the client.
   * The client now sends user.accessToken instead of user.id.
   */
  private handleAuthentication(socket: AuthenticatedSocket, token: string): void {
    if (!token) {
      socket.emit('auth-error', 'Authentication token is required');
      return;
    }

    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
      }

      const decoded = jwt.verify(
        token,
        JWT_SECRET
      ) as { _id: string; role: string };

      const userId = decoded._id;
      this.userSockets.set(userId, socket.id);
      socket.userId = userId;
      socket.emit('auth-success', { userId });
      console.log(`User authenticated via JWT: ${userId}`);
    } catch (err) {
      socket.emit('auth-error', 'Invalid or expired authentication token.');
      console.warn('[WebSocket] JWT verification failed:', err instanceof Error ? err.message : err);
    }
  }

  private async handleJoinCase(socket: AuthenticatedSocket, caseId: string): Promise<void> {
    if (!socket.userId) {
      socket.emit('error', 'Authentication required — send authenticate event first');
      return;
    }

    try {
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
        if (!caseData.participants.some((p: any) => p.toString() === socket.userId)) {
          caseData.participants.push(userObjectId);
          await caseData.save();
        }
      }

      socket.join(caseId);

      if (!this.activeCases.has(caseId)) {
        this.activeCases.set(caseId, {
          users: new Set<string>(),
          caseData: caseData.toObject()
        });
      }

      this.activeCases.get(caseId)!.users.add(socket.userId);

      const messages = await Message.find({ caseId }).sort({ createdAt: 1 }).limit(50);

      const allUserIds = new Set<string>();
      messages.forEach(m => allUserIds.add(m.senderId.toString()));
      this.activeCases.get(caseId)!.users.forEach(id => allUserIds.add(id));

      const userDocs = await User.find({ _id: { $in: Array.from(allUserIds) } }, 'username profile');
      const userMap: Record<string, string> = {};
      userDocs.forEach(u => {
        userMap[u._id.toString()] = u.profile?.firstName
          ? `${u.profile.firstName} ${u.profile.lastName || ''}`.trim()
          : u.username;
      });

      const currentUser = userDocs.find(u => u._id.toString() === socket.userId);
      const currentUserName = currentUser
        ? (currentUser.profile?.firstName
          ? `${currentUser.profile.firstName} ${currentUser.profile.lastName || ''}`.trim()
          : currentUser.username)
        : 'Unknown';
      (socket as any).username = currentUserName;

      socket.to(caseId).emit('user-joined', {
        userId: socket.userId,
        username: currentUserName,
        caseId
      });

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

    const caseItem = this.activeCases.get(caseId);
    if (caseItem) {
      caseItem.users.delete(socket.userId);

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

      const message = new Message({
        caseId,
        senderId: socket.userId,
        content,
        messageType,
        createdAt: new Date()
      });

      await message.save();

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

      const caseData = await Case.findByIdAndUpdate(
        caseId,
        { status, ...updates },
        { returnDocument: 'after' }
      );

      if (!caseData) {
        socket.emit('error', 'Case not found');
        return;
      }

      this.io.to(caseId).emit('case-updated', caseData.toObject());

      console.log(`Case ${caseId} status updated to ${status}`);
    } catch (error) {
      console.error('Update case error:', error);
      socket.emit('error', 'Failed to update case');
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    if (socket.userId) {
      this.userSockets.delete(socket.userId);

      // ── ROOM CLEANUP ──
      // Iterate through all active cases and remove this user
      this.activeCases.forEach((activeCase, caseId) => {
        if (activeCase.users.has(socket.userId!)) {
          activeCase.users.delete(socket.userId!);
          
          // Notify others in that room that the user disconnected abruptly
          this.io.to(caseId).emit('user-left', {
            userId: socket.userId,
            username: (socket as any).username || 'Disconnected User',
            caseId
          });

          // If the case room is now empty of active users, we could optionally 
          // perform further cleanup here, but Map.delete(caseId) might be too aggressive
          // if we want to preserve some case state in memory.
        }
      });
      
      console.log(`User ${socket.userId} disconnected and was cleared from all rooms.`);
    }
  }

  public getActiveUsers(caseId: string): Set<string> {
    return this.activeCases.get(caseId)?.users || new Set<string>();
  }

  public getUserSocket(userId: string): string | undefined {
    return this.userSockets.get(userId);
  }

  /**
   * Broadcast a simulation node update to all clients watching a case.
   * Call this from the simulation pipeline to push live status via WebSocket.
   */
  public broadcastCaseUpdate(caseId: string, data: any): void {
    // 1. Broadcast to the specific case room (for the Chamber view)
    this.io.to(caseId).emit('case-updated', data);
    
    // 2. Broadcast to the global room (for the Laboratory/Manager view)
    this.io.to('global-telemetry').emit('telemetry-update', { caseId, ...data });
  }
}

export const getWsServer = () => WebSocketServer.getInstance();

export default WebSocketServer;