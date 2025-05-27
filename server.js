const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  let socketServer;
  try {
    const { initializeSocketServer } = require('./src/lib/socket/server.js');
    socketServer = initializeSocketServer(server);
    console.log('[Server] Socket.io server initialized successfully');
  } catch (error) {
    console.error('[Server] Failed to initialize Socket.io:', error);
  }

  // Start the server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`[Server] Next.js ready on http://${hostname}:${port}`);
    console.log(`[Server] Socket.io ready for connections`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down gracefully');
    if (socketServer) {
      socketServer.close();
    }
    server.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT received, shutting down gracefully');
    if (socketServer) {
      socketServer.close();
    }
    server.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
  });
}); 