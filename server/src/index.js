import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { PairingManager } from './pairingManager.js';
import { PushService } from './pushService.js';
import { registerSocketHandlers } from './socketHandlers.js';

const PORT = Number(process.env.PORT || 4242);
const ORIGIN = process.env.CORS_ORIGIN || '*';

const pairing = new PairingManager();
const push = new PushService();

const app = express();
app.use(cors({ origin: ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true, clusters: pairing.size }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGIN },
  maxHttpBufferSize: 1e6,
  pingInterval: 10_000,
  pingTimeout: 15_000,
});

registerSocketHandlers(io, pairing, push);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DualCall relay dinliyor: http://0.0.0.0:${PORT}`);
});
