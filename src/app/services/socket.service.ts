// src/app/services/socket.service.ts

import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private connected = false;

  constructor() { }

  /**
   * Connect to Socket.IO server
   * ✅ Fixed: Validate token before connecting
   */
  connect(token: string): void {
    // ✅ Validate token exists
    if (!token || token === 'null' || token === 'undefined') {
      console.error('❌ Cannot connect socket: Invalid token');
      return;
    }

    if (this.connected) {
      console.log('⚠️ Socket already connected');
      return;
    }

    console.log('🔌 Connecting to socket...');

    // Remove /api/v1 from the URL for socket connection
    const socketUrl = environment.apiUrl.replace('/api/v1', '');

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true, // ✅ Auto connect
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.connected = false;

      // If authentication error, don't retry
      if (error.message === 'Authentication error') {
        console.error('❌ Authentication failed - stopping reconnection');
        this.disconnect();
      }
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('Socket disconnected manually');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.connected && this.socket?.connected || false;
  }

  /**
   * Listen to an event
   */
  on(eventName: string): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not connected');
        return;
      }

      this.socket.on(eventName, (data: any) => {
        observer.next(data);
      });

      // Cleanup
      return () => {
        if (this.socket) {
          this.socket.off(eventName);
        }
      };
    });
  }

  /**
   * Emit an event
   */
  emit(eventName: string, data?: any): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit(eventName, data);
  }

  /**
   * Join a room
   */
  joinRoom(room: string): void {
    this.emit('join', { room });
  }

  /**
   * Leave a room
   */
  leaveRoom(room: string): void {
    this.emit('leave', { room });
  }

  // ========================================
  // CONSULTATION EVENTS
  // ========================================

  /**
   * Join consultation room
   */
  joinConsultation(consultationId: string): void {
    this.emit('join:consultation', consultationId);
  }

  /**
   * Leave consultation room
   */
  leaveConsultation(consultationId: string): void {
    this.emit('leave:consultation', consultationId);
  }

  /**
   * Send consultation message
   */
  sendConsultationMessage(consultationId: string, message: string, attachments?: any[]): void {
    this.emit('consultation:message', {
      consultationId,
      message,
      attachments
    });
  }

  /**
   * Listen to consultation messages
   */
  onConsultationMessage(): Observable<any> {
    return this.on('consultation:new-message');
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(consultationId: string, isTyping: boolean): void {
    this.emit('consultation:typing', {
      consultationId,
      isTyping
    });
  }

  /**
   * Listen to typing indicator
   */
  onTypingIndicator(): Observable<any> {
    return this.on('consultation:typing');
  }

  // ========================================
  // ORDER TRACKING EVENTS
  // ========================================

  /**
   * Join order tracking
   */
  joinOrderTracking(orderId: string): void {
    this.emit('join:order', orderId);
  }

  /**
   * Listen to delivery location updates
   */
  onDeliveryLocationUpdate(): Observable<any> {
    return this.on('delivery:location-updated');
  }

  /**
   * Update delivery location (for delivery personnel)
   */
  updateDeliveryLocation(deliveryId: string, latitude: number, longitude: number, speed?: number): void {
    this.emit('delivery:location-update', {
      deliveryId,
      latitude,
      longitude,
      speed
    });
  }

  // ========================================
  // NOTIFICATION EVENTS
  // ========================================

  /**
   * Listen to notifications
   */
  onNotification(): Observable<any> {
    return this.on('notification');
  }

  /**
   * Send notification to user
   */
  sendNotificationToUser(userId: string, notification: any): void {
    this.emit('send:notification', {
      userId,
      notification
    });
  }

  /**
   * Send notification to role
   */
  sendNotificationToRole(role: string, notification: any): void {
    this.emit('send:role-notification', {
      role,
      notification
    });
  }

  /**
   * Send broadcast notification
   */
  sendBroadcastNotification(notification: any): void {
    this.emit('send:broadcast', notification);
  }

  // ========================================
  // ADMIN EVENTS
  // ========================================

  /**
   * Subscribe to admin stats
   */
  subscribeToAdminStats(): void {
    this.emit('admin:subscribe-stats');
  }

  /**
   * Listen to admin stats updates
   */
  onAdminStatsUpdate(): Observable<any> {
    return this.on('admin:stats-update');
  }

  // ========================================
  // ERROR HANDLING
  // ========================================

  /**
   * Listen to socket errors
   */
  onError(): Observable<any> {
    return this.on('error');
  }
}
