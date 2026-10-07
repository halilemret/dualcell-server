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

app.get('/privacy', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DualCall Gizlilik Politikası</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1, h2 { color: #000; }
        p { margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <h1>DualCall Gizlilik Politikası</h1>
      <p>Son güncellenme: 8 Ekim 2026</p>
      
      <h2>1. Veri Toplama ve Kullanımı</h2>
      <p>DualCall, P2P (Peer-to-Peer) temelli bir iletişim uygulamasıdır. Cihazlarınız arasındaki arama kayıtları, SMS mesajları, rehber kişileri veya sesli görüşme verileri <strong>hiçbir şekilde sunucularımızda saklanmaz veya kaydedilmez.</strong></p>
      
      <h2>2. Veri İletimi ve Şifreleme</h2>
      <p>Uygulama arka planda sadece cihazların birbirini bulması için geçici bir "eşleşme kodu" sunucusuna (Relay) bağlanır. Aktarılan tüm veriler doğrudan iki cihaz arasında WebRTC ve şifrelenmiş soket kanalları üzerinden uçtan uca güvenli bir şekilde iletilir.</p>

      <h2>3. İzinler</h2>
      <p>Arama ve SMS yönlendirme özelliklerinin çalışabilmesi için cihazınızın SMS okuma, Arama kaydı okuma, Mikrofon ve Kamera izinlerine ihtiyaç duyulur. Bu izinler sadece yerel cihazda işlenir ve dışarıya aktarılmaz.</p>

      <h2>4. İletişim</h2>
      <p>Gizlilik politikamızla ilgili sorularınız için bizimle iletişime geçebilirsiniz.</p>
    </body>
    </html>
  `);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGIN },
  maxHttpBufferSize: 1e6,
  pingInterval: 25_000,
  pingTimeout: 20_000,
});

registerSocketHandlers(io, pairing, push);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DualCall relay dinliyor: http://0.0.0.0:${PORT}`);

  // Render.com free tier: 15 dk inaktifse uyuyor. Self-ping ile uyanık tut.
  if (process.env.RENDER_EXTERNAL_URL) {
    const url = `${process.env.RENDER_EXTERNAL_URL}/health`;
    setInterval(() => fetch(url).catch(() => {}), 10 * 60_000);
    console.log(`Keep-alive aktif: ${url}`);
  }
});
