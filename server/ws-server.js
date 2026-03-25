// WebSocket Server for TogetherWatch
// Run with: node server/ws-server.js

const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');

const PORT = process.env.WS_PORT || 3002;

// Room storage
const rooms = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'TogetherWatch Sync Server Running' }));
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  let clientRoom = null;
  let clientId = generateId();
  let isHost = false;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message, clientId);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected:', clientId);
    if (clientRoom) {
      removeFromRoom(clientRoom, clientId);
    }
  });

  function handleMessage(ws, message, clientId) {
    switch (message.type) {
      case 'join':
        handleJoin(ws, message, clientId);
        break;
      case 'sync':
        handleSync(message);
        break;
      case 'play':
      case 'pause':
      case 'seek':
        broadcastToRoom(message.roomId, message, clientId);
        break;
      case 'chat':
        handleChat(message, clientId);
        break;
      case 'reaction':
        handleReaction(message, clientId);
        break;
      case 'leave':
        removeFromRoom(message.roomId, clientId);
        break;
    }
  }

  function handleJoin(ws, message, clientId) {
    const { roomId, isHost: clientIsHost, userName } = message;
    clientRoom = roomId;
    isHost = clientIsHost;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        clients: new Map(),
        hostId: clientIsHost ? clientId : null,
        playbackState: {
          isPlaying: false,
          currentTime: 0,
          serverTime: Date.now(),
        },
      });
      console.log('Created room:', roomId);
    }

    const room = rooms.get(roomId);
    room.clients.set(clientId, {
      ws,
      id: clientId,
      name: userName || `User ${clientId.slice(0, 4)}`,
      isHost,
    });

    if (clientIsHost && !room.hostId) {
      room.hostId = clientId;
    }

    // Send current room state to new client
    ws.send(JSON.stringify({
      type: 'joined',
      roomId,
      clientId,
      isHost,
      participants: Array.from(room.clients.values()).map(c => ({
        id: c.id,
        name: c.name,
        isHost: c.isHost,
      })),
      playbackState: room.playbackState,
    }));

    // Notify others
    broadcastToRoom(roomId, {
      type: 'participant_joined',
      participant: {
        id: clientId,
        name: userName || `User ${clientId.slice(0, 4)}`,
        isHost,
      },
    }, clientId);

    console.log(`Client ${clientId} joined room ${roomId} (host: ${isHost})`);
  }

  function handleSync(message) {
    const { roomId, state } = message;
    const room = rooms.get(roomId);
    
    if (room) {
      room.playbackState = {
        ...state,
        serverTime: Date.now(),
      };
      
      // Broadcast to all non-host clients
      broadcastToRoom(roomId, {
        type: 'sync',
        state: room.playbackState,
      }, room.hostId);
    }
  }

  function handleChat(message, senderId) {
    const { roomId, content, userName } = message;
    
    broadcastToRoom(roomId, {
      type: 'chat',
      message: {
        id: generateId(),
        userId: senderId,
        userName: userName || 'Anonymous',
        content,
        timestamp: Date.now(),
        type: 'message',
      },
    });
  }

  function handleReaction(message, senderId) {
    const { roomId, emoji, userName } = message;
    
    broadcastToRoom(roomId, {
      type: 'reaction',
      reaction: {
        id: generateId(),
        userId: senderId,
        userName: userName || 'Anonymous',
        emoji,
        timestamp: Date.now(),
      },
    });
  }
});

function broadcastToRoom(roomId, message, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  room.clients.forEach((client, clientId) => {
    if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

function removeFromRoom(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const client = room.clients.get(clientId);
  room.clients.delete(clientId);

  // Notify others
  broadcastToRoom(roomId, {
    type: 'participant_left',
    participantId: clientId,
  });

  // If host left, assign new host or delete room
  if (room.hostId === clientId) {
    if (room.clients.size > 0) {
      const newHost = room.clients.keys().next().value;
      room.hostId = newHost;
      const hostClient = room.clients.get(newHost);
      if (hostClient) {
        hostClient.isHost = true;
        hostClient.ws.send(JSON.stringify({
          type: 'promoted_to_host',
        }));
      }
      broadcastToRoom(roomId, {
        type: 'host_changed',
        newHostId: newHost,
      });
    } else {
      rooms.delete(roomId);
      console.log('Deleted empty room:', roomId);
    }
  }

  console.log(`Client ${clientId} left room ${roomId}`);
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// Start server
server.listen(PORT, () => {
  console.log(`TogetherWatch Sync Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
