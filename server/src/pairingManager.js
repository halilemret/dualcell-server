import { randomInt, randomUUID } from 'node:crypto';

const MAX_DEVICES = 2; // eşleşme tamamlanınca kod kilitlenir, yeni cihaz katılamaz
const OPEN_TTL_MS = 10 * 60 * 1000; // eşleşmesi tamamlanmayan kodun ömrü
const EMPTY_TTL_MS = 30 * 60 * 1000; // tüm cihazlar çevrimdışıysa küme ömrü
const ROLES = new Set(['broadcaster', 'receiver']);
const PLATFORMS = new Set(['android', 'ios', 'web']);

export function sanitizeDevice(d) {
  if (!d || typeof d !== 'object') return null;
  if (typeof d.id !== 'string' || !/^[\w-]{6,64}$/.test(d.id)) return null;
  return {
    id: d.id,
    name: String(d.name || 'Cihaz').slice(0, 40),
    platform: PLATFORMS.has(d.platform) ? d.platform : 'web',
    role: ROLES.has(d.role) ? d.role : 'receiver',
  };
}

export class PairingManager {
  constructor() {
    this.clusters = new Map();
    setInterval(() => this.sweep(), 60_000).unref();
  }

  get size() {
    return this.clusters.size;
  }

  create(device, socketId) {
    let code;
    do {
      code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    } while (this.clusters.has(code));
    this.clusters.set(code, { code, createdAt: Date.now(), paired: false, devices: new Map() });
    return { code, rec: this.#attach(code, device, socketId) };
  }

  join(code, device, socketId) {
    const cl = this.clusters.get(code);
    if (!cl) return { error: 'invalid_code' };
    if (!cl.devices.has(device.id) && cl.devices.size >= MAX_DEVICES) return { error: 'invalid_code' };
    const rec = this.#attach(code, device, socketId);
    if (cl.devices.size >= MAX_DEVICES) cl.paired = true;
    return { code, rec };
  }

  #attach(code, device, socketId) {
    const rec = {
      ...device,
      socketId,
      secret: randomUUID(), // yeniden bağlanma anahtarı: yalnızca bu cihazda saklanır
      online: true,
      lastSeen: Date.now(),
      pushToken: null,
    };
    this.clusters.get(code).devices.set(device.id, rec);
    return rec;
  }

  resume(code, deviceId, secret, socketId) {
    const rec = this.clusters.get(code)?.devices.get(deviceId);
    if (!rec || rec.secret !== secret) return null;
    Object.assign(rec, { socketId, online: true, lastSeen: Date.now() });
    return rec;
  }

  detach(socketId) {
    for (const cl of this.clusters.values()) {
      for (const rec of cl.devices.values()) {
        if (rec.socketId === socketId) {
          Object.assign(rec, { online: false, socketId: null, lastSeen: Date.now() });
          return { code: cl.code, rec };
        }
      }
    }
    return null;
  }

  remove(code, deviceId) {
    const cl = this.clusters.get(code);
    if (!cl) return null;
    const rec = cl.devices.get(deviceId);
    cl.devices.delete(deviceId);
    if (!cl.devices.size) this.clusters.delete(code);
    return rec ?? null;
  }

  view(rec) {
    const { id, name, platform, role, online, lastSeen } = rec;
    return { id, name, platform, role, online, lastSeen };
  }

  peers(code) {
    return [...(this.clusters.get(code)?.devices.values() ?? [])].map((r) => this.view(r));
  }

  offlineReceivers(code) {
    return [...(this.clusters.get(code)?.devices.values() ?? [])].filter(
      (r) => r.role === 'receiver' && !r.online && (r.pushToken || r.voipToken),
    );
  }

  setPushTokens(code, deviceId, tokens = {}) {
    const rec = this.clusters.get(code)?.devices.get(deviceId);
    if (rec) {
      if (tokens.pushToken) rec.pushToken = tokens.pushToken;
      if (tokens.voipToken) rec.voipToken = tokens.voipToken;
    }
  }

  sweep() {
    const now = Date.now();
    for (const [code, cl] of this.clusters) {
      const devs = [...cl.devices.values()];
      const lastSeen = Math.max(0, ...devs.map((d) => d.lastSeen));
      const anyOnline = devs.some((d) => d.online);
      if (!cl.paired && now - cl.createdAt > OPEN_TTL_MS) this.clusters.delete(code);
      else if (!anyOnline && now - lastSeen > EMPTY_TTL_MS) this.clusters.delete(code);
    }
  }
}
