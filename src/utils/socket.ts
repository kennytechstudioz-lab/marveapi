import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    });

    io.on('connection', (socket: Socket) => {
        console.log(`⚡ Socket connected: ${socket.id}`);

        // Join room for logged-in user
        socket.on('join_user_room', (userId: string) => {
            if (userId) {
                socket.join(`user_${userId}`);
                console.log(`👤 Socket ${socket.id} joined user_${userId}`);
            }
        });

        // Join admin room
        socket.on('join_admin_room', () => {
            socket.join('admin_room');
            console.log(`🛡️ Socket ${socket.id} joined admin_room`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error('Socket.io is not initialized!');
    }
    return io;
};

// Emit business verification submitted event to admin room
export const emitBusinessVerificationSubmitted = (data: {
    userId: string;
    username: string;
    businessName?: string;
    accountType?: string;
    unapprovedCount: number;
}) => {
    if (io) {
        io.to('admin_room').emit('business_verification_submitted', data);
        io.to('admin_room').emit('unapproved_business_count_updated', { count: data.unapprovedCount });
    }
};

// Emit unapproved business count update
export const emitUnapprovedCountUpdate = (count: number) => {
    if (io) {
        io.to('admin_room').emit('unapproved_business_count_updated', { count });
    }
};

// Emit notification to user
export const emitNotificationToUser = (userId: string, notification: any) => {
    if (io) {
        io.to(`user_${userId}`).emit('notification', notification);
    }
};

// Emit notification to admins
export const emitNotificationToAdmins = (notification: any) => {
    if (io) {
        io.to('admin_room').emit('notification', notification);
    }
};
