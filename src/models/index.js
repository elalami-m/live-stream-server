const http = require('http');
const { Server, WebSocket } = require('ws');

// Store active sessions: sessionId -> { ws: WebSocket, message: string }
const sessions = new Map();

function initWebSocket(server) {
    const wss = new Server({ server });

    wss.on('connection', (ws, req) => {
        console.log('Client connected:', req.socket.remoteAddress);
        let clientSessionId = null;

        ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to WebSocket server' }));

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                console.log('Received:', data);

                if (data.type === 'register') {
                    // Device A (QR Generator) registering a session
                    const { sessionId, message } = data;
                    if (sessionId) {
                        clientSessionId = sessionId;
                        sessions.set(sessionId, { ws, message: message || '' });
                        console.log(`Session registered: ${sessionId} with message: ${message || '(empty)'}`);
                        ws.send(JSON.stringify({ 
                            type: 'registered', 
                            sessionId: sessionId 
                        }));
                    } else {
                        ws.send(JSON.stringify({ 
                            type: 'error', 
                            message: 'Session ID is required' 
                        }));
                    }
                } else if (data.type === 'update_message') {
                    // Update the message for an existing session
                    const { sessionId, message } = data;
                    if (sessionId && sessions.has(sessionId)) {
                        const session = sessions.get(sessionId);
                        if (session && session.ws === ws) {
                            session.message = message || '';
                            sessions.set(sessionId, session);
                            console.log(`Message updated for session: ${sessionId}`);
                            ws.send(JSON.stringify({ 
                                type: 'message_updated', 
                                sessionId: sessionId 
                            }));
                        }
                    }
                } else if (data.type === 'scanned') {
                    // Device B (QR Scanner) sending scan info
                    const { sessionId, scannerInfo } = data;
                    
                    if (!sessionId) {
                        ws.send(JSON.stringify({ 
                            type: 'error', 
                            message: 'Session ID is required' 
                        }));
                        return;
                    }

                    const session = sessions.get(sessionId);
                    if (session && session.ws && session.ws.readyState === WebSocket.OPEN) {
                        // Forward scan info to Device A
                        session.ws.send(JSON.stringify({
                            type: 'scanned',
                            sessionId: sessionId,
                            scannerInfo: scannerInfo
                        }));
                        
                        // Confirm to Device B with the message
                        ws.send(JSON.stringify({
                            type: 'scan_confirmed',
                            sessionId: sessionId,
                            message: session.message || ''
                        }));
                        
                        console.log(`Scan info forwarded for session: ${sessionId}`);
                    } else {
                        ws.send(JSON.stringify({ 
                            type: 'error', 
                            message: 'Session not found or device not connected' 
                        }));
                        console.log(`Session not found: ${sessionId}`);
                    }
                } else if (data.type === 'stream_url') {
                    // Device B sends a stream URL (e.g., m3u/m3u8) to Device A
                    const { sessionId, streamUrl } = data;

                    if (!sessionId || !streamUrl) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Session ID and streamUrl are required'
                        }));
                        return;
                    }

                    const session = sessions.get(sessionId);
                    if (session && session.ws && session.ws.readyState === WebSocket.OPEN) {
                        // Forward stream URL to Device A (the one that registered)
                        session.ws.send(JSON.stringify({
                            type: 'play_stream',
                            sessionId,
                            streamUrl
                        }));

                        ws.send(JSON.stringify({
                            type: 'stream_forwarded',
                            sessionId
                        }));

                        console.log(`Stream URL forwarded for session: ${sessionId}`);
                    } else {
                        ws.send(JSON.stringify({ 
                            type: 'error', 
                            message: 'Session not found or device not connected' 
                        }));
                        console.log(`Session not found for stream_url: ${sessionId}`);
                    }
                } else {
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: 'Unknown message type' 
                    }));
                }
            } catch (err) {
                console.error('Message parse error:', err);
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: 'Invalid message format' 
                }));
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            // Clean up session if this was a registered client
            if (clientSessionId) {
                const session = sessions.get(clientSessionId);
                if (session && session.ws === ws) {
                    sessions.delete(clientSessionId);
                    console.log(`Session removed: ${clientSessionId}`);
                }
            }
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err);
            // Clean up session on error
            if (clientSessionId) {
                const session = sessions.get(clientSessionId);
                if (session && session.ws === ws) {
                    sessions.delete(clientSessionId);
                }
            }
        });
    });

    return wss;
}

module.exports = { initWebSocket };