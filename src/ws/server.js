import { WebSocket, WebSocketServer } from "ws";

/**
 * Send a JSON-serializable payload to a WebSocket if the socket is open.
 *
 * Does nothing when the socket is not in the OPEN state.
 * @param {WebSocket} ws - The WebSocket to send the message on.
 * @param {*} payload - The value to JSON-serialize and send; must be JSON-serializable.
 */
function sendJson(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

/**
 * Broadcasts a JSON-serialized payload to all open clients of a WebSocketServer.
 *
 * @param {import('ws').WebSocketServer} wss - WebSocket server whose connected clients will receive the message.
 * @param {*} payload - Value that will be serialized with JSON.stringify and sent to each open client.
 */
function broadcast(wss, payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue; // ✅ continue, not return
    client.send(msg);
  }
}

/**
 * Attach a WebSocket server to an existing HTTP/S server and expose a helper to broadcast match creation events.
 * @param {import('http').Server|import('https').Server} server - The HTTP or HTTPS server instance to bind the WebSocket server to.
 * @returns {{ broadCastMatchCreated: (match: any) => void }} An object containing `broadCastMatchCreated(match)`, which broadcasts a `match_created` message with the provided `match` data to all connected WebSocket clients.
 */
export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", (ws) => {
    sendJson(ws, { type: "welcome" });     // ✅ ws not socket
    ws.on("error", console.error);         // ✅ ws not socket
  });

  function broadCastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match }); // ✅ wss not was
  }

  return { broadCastMatchCreated };
}