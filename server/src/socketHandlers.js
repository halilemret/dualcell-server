import { randomUUID } from 'node:crypto';
import { sanitizeDevice } from './pairingManager.js';
import { registerVoiceGateway } from './voiceGateway.js';

// 1) "kod: 123456" biçimi  2) "123456 nolu şifreniz" biçimi
const OTP_PATTERNS = [
  /(?:kod(?:unuz)?|şifre(?:niz)?|code|otp|doğrulama|onay|password|pin)[\s:]*([0-9]{4,8})\b/i,
  /\b([0-9]{4,8})\b[^\n]{0,30}?(?:şifre|kod|code|otp|pin)/i,
];

export function extractOtp(text = '') {
  for (const re of OTP_PATTERNS) {
    const m = re.exec(text);
    if (m) return m[1];
  }
  return null;
}

const clean = (v, max = 200) => String(v ?? '').slice(0, max);
const reply = (cb, payload) => typeof cb === 'function' && cb(payload);
const ACTIONS = new Set(['accept', 'reject', 'silence']);

export function registerSocketHandlers(io, pairing, push) {
  // Kaba kuvvet koruması: IP başına 10 dakikada en fazla 10 hatalı deneme
  const failures = new Map();
  const blocked = (ip) => {
    const f = failures.get(ip);
    return !!f && f.reset > Date.now() && f.n >= 10;
  };
  const fail = (ip) => {
    const now = Date.now();
    const f = failures.get(ip);
    if (!f || f.reset < now) failures.set(ip, { n: 1, reset: now + 10 * 60_000 });
    else f.n += 1;
  };
  setInterval(() => {
    const now = Date.now();
    for (const [ip, f] of failures) if (f.reset < now) failures.delete(ip);
  }, 60_000).unref();

  io.on('connection', (socket) => {
    const ip = (socket.handshake.headers['x-forwarded-for'] || '').split(',')[0].trim() || socket.handshake.address;
    const ctx = () => (socket.data?.code ? socket.data : null);
    const bind = (code, rec) => {
      socket.data = { code, deviceId: rec.id, role: rec.role };
      socket.join([code, `${code}:${rec.role}`]);
    };
    const announce = (code, rec, extra = {}) =>
      socket.to(code).emit('peer:status', { ...pairing.view(rec), deviceId: rec.id, ...extra });

    socket.on('pair:create', (raw, cb) => {
      const device = sanitizeDevice(raw);
      if (!device) return reply(cb, { ok: false, error: 'invalid_device' });
      const { code, rec } = pairing.create(device, socket.id);
      bind(code, rec);
      const peers = pairing.peers(code);
      socket.emit('cluster:joined', { code, peers });
      return reply(cb, { ok: true, code, secret: rec.secret, peers });
    });

    socket.on('pair:join', (raw, cb) => {
      if (blocked(ip)) return reply(cb, { ok: false, error: 'rate_limited' });
      const code = String(raw?.code ?? '').replace(/\D/g, '');
      const device = sanitizeDevice(raw?.device);
      if (!device) return reply(cb, { ok: false, error: 'invalid_device' });
      const res = code.length === 6 ? pairing.join(code, device, socket.id) : { error: 'invalid_code' };
      if (res.error) {
        fail(ip);
        return reply(cb, { ok: false, error: res.error });
      }
      bind(res.code, res.rec);
      const peers = pairing.peers(res.code);
      io.to(res.code).emit('cluster:joined', { code: res.code, peers });
      announce(res.code, res.rec, { online: true });
      return reply(cb, { ok: true, code: res.code, secret: res.rec.secret, peers });
    });

    socket.on('device:resume', (raw, cb) => {
      if (blocked(ip)) return reply(cb, { ok: false, error: 'rate_limited' });
      const rec = pairing.resume(clean(raw?.code, 6), clean(raw?.deviceId, 64), clean(raw?.secret, 64), socket.id);
      if (!rec) {
        fail(ip);
        return reply(cb, { ok: false, error: 'unknown_session' });
      }
      const code = clean(raw.code, 6);
      bind(code, rec);
      announce(code, rec, { online: true });
      return reply(cb, { ok: true, peers: pairing.peers(code) });
    });

    socket.on('pair:leave', (_p, cb) => {
      const s = ctx();
      if (!s) return reply(cb, { ok: true });
      const rec = pairing.remove(s.code, s.deviceId);
      if (rec) announce(s.code, rec, { online: false, left: true });
      socket.leave(s.code);
      socket.leave(`${s.code}:${s.role}`);
      socket.data = {};
      return reply(cb, { ok: true });
    });

    socket.on('push:register', (p) => {
      const s = ctx();
      if (s && p) {
        pairing.setPushTokens(s.code, s.deviceId, {
          pushToken: clean(p.pushToken, 200),
          voipToken: clean(p.voipToken, 200),
        });
      }
    });

    socket.on('debug:status', (cb) => {
      if (typeof cb === 'function') {
        cb({
          apnsConfigured: !!pushService.apnProvider,
          apnsBundleId: pushService.bundleId,
          tokens: ctx() ? pairing.receivers(ctx().code).map(r => ({ push: !!r.pushToken, voip: !!r.voipToken })) : [],
        });
      }
    });

    // --- Çağrılar: Verici -> Alıcı ---
    socket.on('call:incoming', (p = {}) => {
      const s = ctx();
      if (!s || s.role !== 'broadcaster') return;
      const call = {
        callId: clean(p.callId, 64) || randomUUID(),
        callerNumber: clean(p.callerNumber, 40),
        callerName: clean(p.callerName, 80),
        status: 'ringing',
        at: Date.now(),
      };
      io.to(`${s.code}:receiver`).emit('call:incoming', call);
      push.notify(pairing.offlineReceivers(s.code), {
        title: call.callerName || call.callerNumber || 'Gelen arama',
        body: 'Android cihazınızdan yönlendirilen arama',
        channelId: 'calls',
        data: { type: 'call', callId: call.callId },
      });
    });

    socket.on('call:status', (p = {}) => {
      const s = ctx();
      if (!s || s.role !== 'broadcaster') return;
      io.to(`${s.code}:receiver`).emit('call:status', { callId: clean(p.callId, 64), status: clean(p.status, 16) });
    });

    // --- Çağrılar: Alıcı -> Verici ---
    socket.on('call:action', (p = {}) => {
      const s = ctx();
      if (!s || s.role !== 'receiver' || !ACTIONS.has(p.action)) return;
      io.to(`${s.code}:broadcaster`).emit('call:action', { action: p.action, callId: clean(p.callId, 64) });
    });

    socket.on('call:dial', (p = {}) => {
      const s = ctx();
      const number = clean(p.number, 32);
      if (!s || s.role !== 'receiver' || !/^[+\d*#\s()-]{1,32}$/.test(number)) return;
      io.to(`${s.code}:broadcaster`).emit('call:dial', { number, callId: clean(p.callId, 64) || randomUUID() });
    });

    // --- SMS ---
    socket.on('sms:incoming', (p = {}) => {
      const s = ctx();
      if (!s || s.role !== 'broadcaster') return;
      const body = clean(p.body, 2000);
      const sms = {
        id: randomUUID(),
        sender: clean(p.sender, 80) || 'Bilinmeyen',
        body,
        otp: extractOtp(body),
        receivedAt: Date.now(),
      };
      io.to(`${s.code}:receiver`).emit('sms:incoming', sms);
      // Gizlilik: mesaj içeriği (OTP dahil) üçüncü taraf push servisine gönderilmez.
      push.notify(pairing.offlineReceivers(s.code), {
        title: sms.sender,
        body: 'Yeni mesaj. Okumak için uygulamayı açın.',
        channelId: 'sms',
        data: { type: 'sms' },
      });
    });

    registerVoiceGateway(socket);

    socket.on('disconnect', () => {
      const d = pairing.detach(socket.id);
      if (d) announce(d.code, d.rec, { online: false });
    });
  });
}
