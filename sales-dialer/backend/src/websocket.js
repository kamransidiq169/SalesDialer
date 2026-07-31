/**
 * WebSocket Handler
 * Real-time communication for Sales Dialer
 */

const WebSocket = require('ws');
const { logger } = require('./config/logger');

let wss = null;
const clients = new Map();

/**
 * Setup WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
const setupWebSocket = (server) => {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    logger.info(`WebSocket client connected: ${clientId}`, { ip });

    // Store client with metadata
    clients.set(clientId, {
      ws,
      ip,
      connectedAt: new Date(),
      userId: null,
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString(),
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(clientId, data);
      } catch (error) {
        logger.error('Invalid WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      const client = clients.get(clientId);
      logger.info(`WebSocket client disconnected: ${clientId}`, {
        duration: client ? Date.now() - client.connectedAt.getTime() : 0,
      });
      clients.delete(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
    });
  });

  logger.info('WebSocket server initialized');
};

/**
 * Handle incoming WebSocket messages
 * @param {string} clientId - Client identifier
 * @param {Object} data - Message data
 */
const handleMessage = (clientId, data) => {
  const client = clients.get(clientId);
  if (!client) return;

  switch (data.type) {
    case 'auth':
      // Authenticate the WebSocket connection with a user
      client.userId = data.userId;
      client.ws.send(JSON.stringify({
        type: 'authenticated',
        userId: data.userId,
      }));
      break;

    case 'ping':
      client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'subscribe':
      // Handle subscription to specific channels (calls, contacts, etc.)
      client.ws.send(JSON.stringify({
        type: 'subscribed',
        channel: data.channel,
      }));
      break;

    default:
      logger.warn(`Unknown message type: ${data.type}`);
  }
};

/**
 * Generate a unique client ID
 * @returns {string} Client identifier
 */
const generateClientId = () => {
  return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Broadcast to all connected clients
 * @param {Object} data - Data to broadcast
 * @param {string} [type] - Message type
 */
const broadcast = (data, type = 'broadcast') => {
  const message = JSON.stringify({ type, ...data, timestamp: new Date().toISOString() });

  wss?.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

/**
 * Send to a specific user
 * @param {string} userId - User ID
 * @param {Object} data - Data to send
 * @param {string} [type] - Message type
 */
const sendToUser = (userId, data, type = 'message') => {
  const message = JSON.stringify({ type, ...data, timestamp: new Date().toISOString() });

  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
};

/**
 * Send to a specific client
 * @param {string} clientId - Client ID
 * @param {Object} data - Data to send
 * @param {string} [type] - Message type
 */
const sendToClient = (clientId, data, type = 'message') => {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify({ type, ...data, timestamp: new Date().toISOString() }));
  }
};

/**
 * Notify about a new call
 * @param {Object} call - Call data
 */
const notifyNewCall = (call) => {
  broadcast({
    event: 'new_call',
    call,
  }, 'call_update');
};

/**
 * Notify about call status change
 * @param {string} callId - Call ID
 * @param {string} status - New status
 */
const notifyCallStatusChange = (callId, status) => {
  broadcast({
    event: 'call_status_changed',
    callId,
    status,
  }, 'call_update');
};

/**
 * Notify about new contact
 * @param {Object} contact - Contact data
 */
const notifyNewContact = (contact) => {
  broadcast({
    event: 'new_contact',
    contact,
  }, 'contact_update');
};

/**
 * Get connected clients count
 * @returns {number} Number of connected clients
 */
const getClientCount = () => clients.size;

/**
 * Get all connected clients info
 * @returns {Array} Array of client info
 */
const getClients = () => {
  const info = [];
  clients.forEach((client, id) => {
    info.push({
      id,
      ip: client.ip,
      connectedAt: client.connectedAt,
      userId: client.userId,
    });
  });
  return info;
};

/**
 * Close all connections
 */
const closeAll = () => {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.close(1000, 'Server shutting down');
    }
  });
  clients.clear();
};

module.exports = {
  setupWebSocket,
  broadcast,
  sendToUser,
  sendToClient,
  notifyNewCall,
  notifyCallStatusChange,
  notifyNewContact,
  getClientCount,
  getClients,
  closeAll,
};
