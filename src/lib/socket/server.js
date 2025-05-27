const { Server } = require('socket.io');

// Simple logger for CommonJS
const logger = {
  info: (message, data) => {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    console.log(`[${timestamp}] [INFO] ${message}${dataStr}`);
  },
  error: (message, data) => {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    console.error(`[${timestamp}] [ERROR] ${message}${dataStr}`);
  }
};

// Simple error handler for CommonJS
function handleError(error, context = 'Unknown', additionalData = null) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    ...(additionalData && { additionalData })
  };

  logger.error(`Error in ${context}:`, errorInfo);
  return errorInfo;
}

/**
 * Initialize Socket.io server
 * @param {import('http').Server} httpServer - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
function initializeSocketServer(httpServer) {
  try {
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.FRONTEND_URL 
          : ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Connection handling
    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle join room for trip collaboration
      socket.on('join-trip', (tripId) => {
        socket.join(`trip-${tripId}`);
        logger.info(`Socket ${socket.id} joined trip room: ${tripId}`);
      });

      // Handle leave room
      socket.on('leave-trip', (tripId) => {
        socket.leave(`trip-${tripId}`);
        logger.info(`Socket ${socket.id} left trip room: ${tripId}`);
      });

      // Handle itinerary updates
      socket.on('itinerary-update', (data) => {
        const { tripId, update } = data;
        socket.to(`trip-${tripId}`).emit('itinerary-updated', update);
        logger.info(`Itinerary update broadcast for trip: ${tripId}`);
      });

      // Handle operational transformation events
      socket.on('ot-operation', (data) => {
        try {
          const { tripId, operation } = data;
          
          // Validate trip membership
          if (!socket.rooms.has(`trip-${tripId}`)) {
            socket.emit('error', { message: 'Not joined to trip', code: 'NOT_IN_TRIP' });
            return;
          }

          // Add server timestamp and broadcast to other users
          const serverOperation = {
            ...operation,
            serverTimestamp: Date.now()
          };

          socket.to(`trip-${tripId}`).emit('ot-operation', {
            operation: serverOperation,
            tripId
          });

          // Acknowledge the operation
          socket.emit('ot-acknowledged', { operationId: operation.id });

          logger.info(`OT operation applied in trip ${tripId}`, { 
            operationType: operation.type, 
            userId: operation.userId,
            operationId: operation.id 
          });
        } catch (error) {
          handleError(error, `OT operation error for socket ${socket.id}`, data);
          socket.emit('ot-rejected', { 
            operationId: data.operation?.id, 
            reason: error.message 
          });
        }
      });

      // Handle undo/redo operations
      socket.on('ot-undo', (data) => {
        try {
          const { tripId, operationId } = data;
          
          if (!socket.rooms.has(`trip-${tripId}`)) {
            socket.emit('error', { message: 'Not joined to trip', code: 'NOT_IN_TRIP' });
            return;
          }

          socket.to(`trip-${tripId}`).emit('ot-undo', {
            operationId,
            timestamp: Date.now(),
            tripId
          });

          logger.info(`Undo operation in trip ${tripId}`, { operationId });
        } catch (error) {
          handleError(error, `OT undo error for socket ${socket.id}`, data);
        }
      });

      socket.on('ot-redo', (data) => {
        try {
          const { tripId, operationId } = data;
          
          if (!socket.rooms.has(`trip-${tripId}`)) {
            socket.emit('error', { message: 'Not joined to trip', code: 'NOT_IN_TRIP' });
            return;
          }

          socket.to(`trip-${tripId}`).emit('ot-redo', {
            operationId,
            timestamp: Date.now(),
            tripId
          });

          logger.info(`Redo operation in trip ${tripId}`, { operationId });
        } catch (error) {
          handleError(error, `OT redo error for socket ${socket.id}`, data);
        }
      });

      // Handle collaborative editing
      socket.on('edit-start', (data) => {
        const { tripId, itemId, userId } = data;
        socket.to(`trip-${tripId}`).emit('edit-locked', { itemId, userId });
      });

      socket.on('edit-end', (data) => {
        const { tripId, itemId } = data;
        socket.to(`trip-${tripId}`).emit('edit-unlocked', { itemId });
      });

      // Handle real-time comments
      socket.on('comment-added', (data) => {
        const { tripId, comment } = data;
        socket.to(`trip-${tripId}`).emit('new-comment', comment);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });

      // Error handling
      socket.on('error', (error) => {
        handleError(error, `Socket error for ${socket.id}`);
      });
    });

    logger.info('Socket.io server initialized successfully');
    return io;

  } catch (error) {
    handleError(error, 'Failed to initialize Socket.io server');
    throw error;
  }
}

/**
 * Emit event to specific trip room
 * @param {Server} io - Socket.io server instance
 * @param {string} tripId - Trip ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
function emitToTrip(io, tripId, event, data) {
  try {
    io.to(`trip-${tripId}`).emit(event, data);
    logger.info(`Event '${event}' emitted to trip room: ${tripId}`);
  } catch (error) {
    handleError(error, `Failed to emit event '${event}' to trip: ${tripId}`);
  }
}

/**
 * Get connected clients count for a trip
 * @param {Server} io - Socket.io server instance
 * @param {string} tripId - Trip ID
 * @returns {Promise<number>} Number of connected clients
 */
async function getTripClientCount(io, tripId) {
  try {
    const room = io.sockets.adapter.rooms.get(`trip-${tripId}`);
    return room ? room.size : 0;
  } catch (error) {
    handleError(error, `Failed to get client count for trip: ${tripId}`);
    return 0;
  }
}

module.exports = {
  initializeSocketServer,
  emitToTrip,
  getTripClientCount
}; 