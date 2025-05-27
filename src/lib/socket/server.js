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

let io;

function initializeSocketIO(server) {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXTAUTH_URL 
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] [INFO] Client connected: ${socket.id}`);

    // Handle real-time notifications
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`[${new Date().toISOString()}] [INFO] User ${userId} joined their room`);
    });

    // Handle itinerary collaboration
    socket.on('join-itinerary-room', (itineraryId) => {
      socket.join(`itinerary-${itineraryId}`);
      console.log(`[${new Date().toISOString()}] [INFO] Client joined itinerary room: ${itineraryId}`);
    });

    // Handle itinerary updates
    socket.on('itinerary-update', (data) => {
      socket.to(`itinerary-${data.itineraryId}`).emit('itinerary-updated', data);
    });

    // Handle optimization updates
    socket.on('optimization-progress', (data) => {
      socket.to(`itinerary-${data.itineraryId}`).emit('optimization-progress-update', data);
    });

    socket.on('disconnect', () => {
      console.log(`[${new Date().toISOString()}] [INFO] Client disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket.io] Connection error:`, error);
    });
  });

  return io;
}

function getSocketIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocketIO first.');
  }
  return io;
}

function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user-${userId}`).emit(event, data);
  }
}

function emitToItinerary(itineraryId, event, data) {
  if (io) {
    io.to(`itinerary-${itineraryId}`).emit(event, data);
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
  initializeSocketIO,
  getSocketIO,
  emitToUser,
  emitToItinerary,
  emitToTrip,
  getTripClientCount
}; 