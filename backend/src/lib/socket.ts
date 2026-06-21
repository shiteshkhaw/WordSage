import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { decode } from 'next-auth/jwt';
import prisma from './prisma.js';

/**
 * Socket.io real-time presence layer for WordSage.
 *
 * Namespace: /presence
 *
 * Authentication: Every socket connection must supply the NextAuth JWT
 * in the `auth.token` handshake field. The JWT is decoded using the same
 * NEXTAUTH_SECRET used by requireAuth middleware — zero duplication.
 *
 * Events (client → server):
 *   join_document   { documentId, teamId }
 *   leave_document  { documentId }
 *   cursor_update   { documentId, cursorPos }
 *   typing          { documentId, isTyping }
 *
 * Events (server → client, broadcast to room):
 *   presence_updated  { documentId, users: PresenceUser[] }
 *   cursor_moved      { userId, userName, cursorPos }
 *   user_typing       { userId, userName, isTyping }
 *   error             { message }
 */

export interface PresenceUser {
  userId: string;
  userName: string;
  userEmail: string;
  cursorPos: number | null;
  lastSeen: string;
  color: string; // deterministic colour per user
}

// Map socket.id → { userId, documentId }
const socketMeta = new Map<string, { userId: string; userName: string; userEmail: string; documentId: string | null }>();

// Deterministic colour from userId (for cursor colouring in the UI)
function userColor(userId: string): string {
  const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#82E0AA', '#F0B27A',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

// Fetch all current presence for a document from the DB
async function getDocumentPresence(documentId: string): Promise<PresenceUser[]> {
  const staleThreshold = new Date(Date.now() - 60_000); // 60 second stale threshold
  const rows = await prisma.document_presence.findMany({
    where: {
      document_id: documentId,
      last_seen: { gte: staleThreshold },
    },
  });

  return rows.map((r) => ({
    userId: r.user_id,
    userName: r.user_name || r.user_email.split('@')[0],
    userEmail: r.user_email,
    cursorPos: r.cursor_pos,
    lastSeen: r.last_seen.toISOString(),
    color: userColor(r.user_id),
  }));
}

// Helper function to authenticate socket connection via handshake token or cookie fallback
async function authenticateSocket(socket: Socket): Promise<{ userId: string; userEmail: string; userName: string }> {
  let token = socket.handshake.auth?.token as string | undefined;
  let salt = 'authjs.session-token'; // default salt

  if (!token && socket.handshake.headers.cookie) {
    const cookies: Record<string, string> = {};
    socket.handshake.headers.cookie.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const name = parts.shift()?.trim();
      const value = parts.join('=')?.trim();
      if (name && value) {
        // Strip quotes if present (some clients send quoted values)
        cookies[name] = value.replace(/^"|"$/g, '');
      }
    });

    if (cookies['__Secure-authjs.session-token']) {
      token = cookies['__Secure-authjs.session-token'];
      salt = '__Secure-authjs.session-token';
    } else if (cookies['authjs.session-token']) {
      token = cookies['authjs.session-token'];
      salt = 'authjs.session-token';
    } else if (cookies['__Secure-next-auth.session-token']) {
      token = cookies['__Secure-next-auth.session-token'];
      salt = '__Secure-next-auth.session-token';
    } else if (cookies['next-auth.session-token']) {
      token = cookies['next-auth.session-token'];
      salt = 'next-auth.session-token';
    }
  }

  if (!token) {
    throw new Error('Authentication token or cookie required');
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Server misconfiguration: NEXTAUTH_SECRET missing');
  }

  const decoded = await decode({ token, secret, salt }) as unknown as { sub?: string; email?: string; name?: string } | null;
  if (!decoded?.sub) {
    throw new Error('Invalid or expired token');
  }

  return {
    userId: decoded.sub,
    userEmail: decoded.email || '',
    userName: decoded.name || decoded.email?.split('@')[0] || 'Unknown',
  };
}

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.CORS_ORIGIN || 'http://localhost:3000',
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware — runs before any event handler
  io.use(async (socket: Socket, next) => {
    try {
      const authData = await authenticateSocket(socket);
      (socket as any).userId = authData.userId;
      (socket as any).userEmail = authData.userEmail;
      (socket as any).userName = authData.userName;
      next();
    } catch (err: any) {
      next(new Error(`Auth failed: ${err.message}`));
    }
  });

  // Presence namespace
  const presence = io.of('/presence');

  presence.use(async (socket: Socket, next) => {
    try {
      const authData = await authenticateSocket(socket);
      (socket as any).userId = authData.userId;
      (socket as any).userEmail = authData.userEmail;
      (socket as any).userName = authData.userName;
      next();
    } catch (err: any) {
      next(new Error(`Auth failed: ${err.message}`));
    }
  });

  presence.on('connection', async (socket: Socket) => {
    const userId: string = (socket as any).userId;
    const userEmail: string = (socket as any).userEmail;
    const userName: string = (socket as any).userName;

    console.log(`🔌 Presence socket connected: ${userName} (${userId})`);

    socketMeta.set(socket.id, { userId, userName, userEmail, documentId: null });

    // ── join_document ──────────────────────────────────────────────────────
    socket.on('join_document', async ({ documentId, teamId }: { documentId: string; teamId?: string }) => {
      if (!documentId) return socket.emit('error', { message: 'documentId required' });

      try {
        // Leave previous document room if any
        const meta = socketMeta.get(socket.id);
        if (meta?.documentId && meta.documentId !== documentId) {
          socket.leave(`doc:${meta.documentId}`);
          await prisma.document_presence.deleteMany({
            where: { document_id: meta.documentId, user_id: userId },
          });
          const prevPresence = await getDocumentPresence(meta.documentId);
          presence.to(`doc:${meta.documentId}`).emit('presence_updated', {
            documentId: meta.documentId,
            users: prevPresence,
          });
        }

        // Join new room
        socket.join(`doc:${documentId}`);
        socketMeta.set(socket.id, { userId, userName, userEmail, documentId });

        // Upsert presence in DB
        await prisma.document_presence.upsert({
          where: { document_id_user_id: { document_id: documentId, user_id: userId } },
          update: {
            user_name: userName,
            user_email: userEmail,
            team_id: teamId || '',
            last_seen: new Date(),
          },
          create: {
            document_id: documentId,
            user_id: userId,
            user_email: userEmail,
            user_name: userName,
            team_id: teamId || '',
            last_seen: new Date(),
          },
        });

        // Broadcast updated presence list to all in the room
        const users = await getDocumentPresence(documentId);
        presence.to(`doc:${documentId}`).emit('presence_updated', { documentId, users });

        console.log(`📄 ${userName} joined document ${documentId} (${users.length} users online)`);
      } catch (err: any) {
        console.error('join_document error:', err);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // ── leave_document ─────────────────────────────────────────────────────
    socket.on('leave_document', async ({ documentId }: { documentId: string }) => {
      if (!documentId) return;
      try {
        socket.leave(`doc:${documentId}`);
        const meta = socketMeta.get(socket.id);
        if (meta) socketMeta.set(socket.id, { ...meta, documentId: null });

        await prisma.document_presence.deleteMany({
          where: { document_id: documentId, user_id: userId },
        });

        const users = await getDocumentPresence(documentId);
        presence.to(`doc:${documentId}`).emit('presence_updated', { documentId, users });
      } catch (err) {
        console.error('leave_document error:', err);
      }
    });

    // ── cursor_update ──────────────────────────────────────────────────────
    socket.on('cursor_update', async ({ documentId, cursorPos }: { documentId: string; cursorPos: number }) => {
      if (!documentId) return;
      try {
        await prisma.document_presence.update({
          where: { document_id_user_id: { document_id: documentId, user_id: userId } },
          data: { cursor_pos: cursorPos, last_seen: new Date() },
        });

        // Broadcast cursor position to other users in the room (not back to sender)
        socket.to(`doc:${documentId}`).emit('cursor_moved', {
          userId,
          userName,
          cursorPos,
          color: userColor(userId),
        });
      } catch {
        // Silently ignore — cursor position is ephemeral
      }
    });

    // ── typing ─────────────────────────────────────────────────────────────
    socket.on('typing', ({ documentId, isTyping }: { documentId: string; isTyping: boolean }) => {
      if (!documentId) return;
      // Ephemeral — no DB write, broadcast only
      socket.to(`doc:${documentId}`).emit('user_typing', {
        userId,
        userName,
        isTyping,
        color: userColor(userId),
      });
    });

    // ── content_update ──────────────────────────────────────────────────────
    socket.on('content_update', ({ documentId, content }: { documentId: string; content: string }) => {
      if (!documentId) return;
      socket.to(`doc:${documentId}`).emit('content_updated', {
        content,
        userId,
        userName,
      });
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const meta = socketMeta.get(socket.id);
      socketMeta.delete(socket.id);

      if (meta?.documentId) {
        try {
          await prisma.document_presence.deleteMany({
            where: { document_id: meta.documentId, user_id: userId },
          });

          const users = await getDocumentPresence(meta.documentId);
          presence.to(`doc:${meta.documentId}`).emit('presence_updated', {
            documentId: meta.documentId,
            users,
          });

          console.log(`🔌 ${userName} disconnected — removed from document ${meta.documentId}`);
        } catch (err) {
          console.error('disconnect cleanup error:', err);
        }
      }
    });
  });

  console.log('✅ Socket.io presence namespace initialised at /presence');
  return io;
}
