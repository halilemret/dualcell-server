import { io } from 'socket.io-client';

const ACK_MS = 8000;

class SocketService {
  constructor() {
    this.socket = null;
    this.url = null;
    this.session = null; // { code, secret, device | deviceId }
    this.ready = false; // kümeye bağlı ve oturum doğrulandı
    this.outbox = []; // bağlantı yokken biriken SMS'ler
    this.listeners = new Map();
  }

  on(event, fn) {
    const set = this.listeners.get(event) || new Set();
    set.add(fn);
    this.listeners.set(event, set);
    return () => set.delete(fn);
  }

  _local(event, payload) {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.warn('[socket]', event, e);
      }
    });
  }

  connect(url, session = null) {
    this.session = session;
    if (this.socket && this.url === url) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }
    this.disconnect();
    this.url = url;
    const s = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      timeout: 12_000,
    });
    s.on('connect', () => {
      this._local('connection', { connected: true });
      this._resume();
    });
    s.on('disconnect', () => {
      this.ready = false;
      this._local('connection', { connected: false });
    });
    s.on('connect_error', (e) => {
      this.ready = false;
      this._local('connection', { connected: false, error: e.message });
    });
    s.onAny((event, payload) => this._local(event, payload));
    this.socket = s;
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = null;
    this.url = null;
    this.ready = false;
  }

  async ensureConnected(url, ms = 8000) {
    this.connect(url, this.session);
    if (this.socket.connected) return true;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        off();
        resolve(false);
      }, ms);
      const off = this.on('connection', ({ connected }) => {
        if (connected) {
          clearTimeout(timer);
          off();
          resolve(true);
        }
      });
    });
  }

  _request(event, payload) {
    return new Promise((resolve) => {
      if (!this.socket?.connected) return resolve({ ok: false, error: 'not_connected' });
      this.socket.timeout(ACK_MS).emit(event, payload, (err, res) => resolve(err ? { ok: false, error: 'timeout' } : res));
      return undefined;
    });
  }

  _bound(peers) {
    this.ready = true;
    this._local('ready', { peers });
    this._flush();
  }

  async _resume() {
    const s = this.session;
    const deviceId = s?.device?.id ?? s?.deviceId;
    if (!s?.code || !s?.secret || !deviceId) return;
    const res = await this._request('device:resume', { deviceId, code: s.code, secret: s.secret });
    if (res.ok) this._bound(res.peers);
    else if (res.error === 'unknown_session') this._local('session:invalid', {});
  }

  async create(device) {
    const res = await this._request('pair:create', device);
    if (res.ok) {
      this.session = { code: res.code, secret: res.secret, deviceId: device.id };
      this._bound(res.peers);
    }
    return res;
  }

  async join(code, device) {
    const res = await this._request('pair:join', { code, device });
    if (res.ok) {
      this.session = { code: res.code, secret: res.secret, deviceId: device.id };
      this._bound(res.peers);
    }
    return res;
  }

  async leave() {
    await this._request('pair:leave', {});
    this.session = null;
    this.ready = false;
  }

  _send(event, payload) {
    if (this.ready && this.socket?.connected) this.socket.emit(event, payload);
  }

  _flush() {
    while (this.outbox.length) this._send('sms:incoming', this.outbox.shift());
  }

  relayIncomingCall(number, name, status = 'ringing', callId) {
    this._send('call:incoming', { callId, callerNumber: number, callerName: name, status });
  }

  relayCallStatus(callId, status) {
    this._send('call:status', { callId, status });
  }

  relayIncomingSms(sender, body) {
    if (this.ready) return this._send('sms:incoming', { sender, body });
    this.outbox.push({ sender, body });
    if (this.outbox.length > 20) this.outbox.shift();
    return undefined;
  }

  sendCallAction(action, callId) {
    this._send('call:action', { action, callId });
  }

  dial(number, callId) {
    this._send('call:dial', { number, callId });
  }

  webrtc(event, payload) {
    this._send(event, payload);
  }

  registerPush(token) {
    this._send('push:register', { token });
  }
}

export default new SocketService();
