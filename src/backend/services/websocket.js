import { Server } from 'socket.io';
import { createServer } from 'http';
import Case from '../models/Case.js';
import Message from '../models/Message.js';

class WebSocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });
    
    this.activeCases = new Map(); // caseId -> {users: Set, caseData}
    this.userSockets = new Map(); // userId -> socketId
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);
      
      // User authentication
      socket.on('authenticate', (userId) => {
        this.handleAuthentication(socket, userId);
      });
      
      // Join a case room
      socket.on('join-case', (caseId) => {
        this.handleJoinCase(socket, caseId);
      });
      
      // Leave a case room
      socket.on('leave-case', (caseId) => {
        this.handleLeaveCase(socket, caseId);
      });
      
      // Send message
      socket.on('send-message', (data) => {
        this.handleSendMessage(socket, data);
      });
      
      // Update case status
      socket.on('update-case-status', (data) => {
        this.handleUpdateCaseStatus(socket, data);
      });
      
      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }
  
  handleAuthentication(socket, userId) {
    if (!userId) {
      socket.emit('auth-error', 'User ID is required');
      return;
    }
    
    this.userSockets.set(userId, socket.id);
    socket.userId = userId;
    socket.emit('auth-success', { userId });
    console.log(`User authenticated: ${userId}`);
  }
  
  async handleJoinCase(socket, caseId) {
    if (!socket.userId) {
      socket.emit('error', 'Authentication required');
      return;
    }
    
    try {
      // Get or create case
      let caseData = await Case.findById(caseId);
      if (!caseData) {
        caseData = new Case({
          _id: caseId,
          title: `Case ${caseId}`,
          status: 'open',
          participants: [socket.userId],
          createdAt: new Date()
        });
        await caseData.save();
      } else {
        // Add user if not already participant
        if (!caseData.participants.includes(socket.userId)) {
          caseData.participants.push(socket.userId);
          await caseData.save();
        }
      }
      
      // Join socket room
      socket.join(caseId);
      
      // Initialize case in memory
      if (!this.activeCases.has(caseId)) {
        this.activeCases.set(caseId, {
          users: new Set(),
          caseData: caseData.toObject()
        });
      }
      
      // Add user to active case
      this.activeCases.get(caseId).users.add(socket.userId);
      
      // Get recent messages
      const messages = await Message.find({ caseId }).sort({ createdAt: 1 }).limit(50);
      
      // Notify room
      socket.to(caseId).emit('user-joined', {
        userId: socket.userId,
        caseId
      });
      
      // Send case data and messages to user
      socket.emit('case-joined', {
        case: caseData,
        messages,
        participants: Array.from(this.activeCases.get(caseId).users)
      });
      
      console.log(`User ${socket.userId} joined case ${caseId}`);
    } catch (error) {
      console.error('Join case error:', error);
      socket.emit('error', 'Failed to join case');
    }
  }
  
  handleLeaveCase(socket, caseId) {
    if (!socket.userId) {
      socket.emit('error', 'Authentication required');
      return;
    }
    
    socket.leave(caseId);
    
    // Remove from active case
    if (this.activeCases.has(caseId)) {
      this.activeCases.get(caseId).users.delete(socket.userId);
      
      // Notify room
      socket.to(caseId).emit('user-left', {
        userId: socket.userId,
        caseId
      });
    }
    
    console.log(`User ${socket.userId} left case ${caseId}`);
  }
  
  async handleSendMessage(socket, data) {
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
  
  async handleUpdateCaseStatus(socket, data) {
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
  
  handleDisconnect(socket) {
    console.log('Client disconnected:', socket.id);
    
    // Clean up user mapping
    if (socket.userId) {
      this.userSockets.delete(socket.userId);
    }
    
    // Remove from all active cases
    this.activeCases.forEach((caseData, caseId) => {
      caseData.users.delete(socket.userId);
    });
  }
  
  getActiveUsers(caseId) {
    return this.activeCases.get(caseId)?.users || new Set();
  }
  
  getUserSocket(userId) {
    return this.userSockets.get(userId);
  }
}

export default WebSocketServer;