import { WebSocket, WebSocketServer } from "ws";

function sendJson(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(msg);
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("error", (err) => {
    console.error("WebSocket server error:", err);
  });

  // ─────────────────────────────────────────────
  // Heartbeat (ping/pong) to kill dead connections
  // ─────────────────────────────────────────────
  const HEARTBEAT_INTERVAL_MS = Number(process.env.WS_HEARTBEAT_MS || 30_000);

  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      // @ts-ignore - we add isAlive dynamically in JS
      if (ws.isAlive === false) {
        // terminate() is important: it immediately destroys dead sockets
        ws.terminate();
        continue;
      }

      // @ts-ignore
      ws.isAlive = false;
      ws.ping(); // client should automatically respond with pong
    }
  }, HEARTBEAT_INTERVAL_MS);

  // If the server shuts down, clear timer
  wss.on("close", () => {
    clearInterval(interval);
  });

  wss.on("connection", (ws) => {
    // mark alive on connect
    // @ts-ignore
    ws.isAlive = true;

    // every pong from client => alive
    ws.on("pong", () => {
      // @ts-ignore
      ws.isAlive = true;
    });

    sendJson(ws, { type: "welcome" });
    ws.on("error", console.error);

    // optional: log closes (useful in prod)
    ws.on("close", (code, reason) => {
      // reason is a Buffer in ws
      const r = reason?.toString?.() ?? "";
      console.log(`WS client closed: code=${code} reason=${r}`);
    });
  });

  function broadCastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  function close() {
    clearInterval(interval);
    wss.close();
  }

  return { broadCastMatchCreated, close };
}