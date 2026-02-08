import { WebSocket, WebSocketServer } from "ws";

function sendJson(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue; // ✅ continue, not return
    client.send(msg);
  }
}

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