import { io, Socket } from 'socket.io-client';

/**
 * Socket.io client singleton for WordSage real-time presence.
 *
 * Usage:
 *   import { getPresenceSocket, disconnectPresenceSocket } from '@/lib/socket';
 *
 *   const socket = getPresenceSocket(session.token);
 *   socket.emit('join_document', { documentId, teamId });
 *   socket.on('presence_updated', ({ users }) => { ... });
 */

let socket: Socket | null = null;
let currentToken: string | null = null;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface PresenceUser {
  userId: string;
  userName: string;
  userEmail: string;
  cursorPos: number | null;
  lastSeen: string;
  color: string;
}

export interface CursorMovedPayload {
  userId: string;
  userName: string;
  cursorPos: number;
  color: string;
}

export interface TypingPayload {
  userId: string;
  userName: string;
  isTyping: boolean;
  color: string;
}

export interface PresenceUpdatedPayload {
  documentId: string;
  users: PresenceUser[];
}

/**
 * Returns (or creates) the authenticated Socket.io connection.
 * Token must be the raw NextAuth session token (JWT string).
 */
export function getPresenceSocket(token: string): Socket {
  // If token changed (re-login), disconnect old socket
  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (!socket || !socket.connected) {
    currentToken = token;

    socket = io(`${BACKEND_URL}/presence`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10_000,
    });

    socket.on('connect', () => {
      console.log('✅ Presence socket connected:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Presence socket connect error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Presence socket disconnected:', reason);
    });

    socket.on('error', ({ message }: { message: string }) => {
      console.error('❌ Presence socket error:', message);
    });
  }

  return socket;
}

/**
 * Gracefully disconnect and clear the singleton.
 * Call on logout or when the editor unmounts permanently.
 */
export function disconnectPresenceSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
    console.log('🔌 Presence socket disconnected (manual)');
  }
}

/**
 * Emit a join_document event and return the socket for chaining.
 */
export function joinDocument(socket: Socket, documentId: string, teamId?: string): void {
  socket.emit('join_document', { documentId, teamId });
}

/**
 * Emit a leave_document event.
 */
export function leaveDocument(socket: Socket, documentId: string): void {
  socket.emit('leave_document', { documentId });
}

/**
 * Broadcast cursor position update.
 */
export function emitCursorUpdate(socket: Socket, documentId: string, cursorPos: number): void {
  socket.emit('cursor_update', { documentId, cursorPos });
}

/**
 * Broadcast typing status.
 */
export function emitTyping(socket: Socket, documentId: string, isTyping: boolean): void {
  socket.emit('typing', { documentId, isTyping });
}
