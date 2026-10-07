export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const formatDuration = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const groupCode = (c = '') => (c.length === 6 ? `${c.slice(0, 3)} ${c.slice(3)}` : c);

export function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
  const y = new Date(now.getTime() - 864e5);
  if (d.toDateString() === y.toDateString()) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

// Haptik gibi "olmasa da olur" çağrıları güvenle çalıştırır.
export function safe(fn) {
  try {
    const r = fn();
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch {
    /* yoksay */
  }
}

export function normalizeServerUrl(raw) {
  if (!raw) return 'http://localhost:4242';
  let clean = raw.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  try {
    const u = new URL(clean);
    if (!u.port) {
      u.port = '4242';
      clean = u.origin;
    }
  } catch {
    // regex fallback
    if (!clean.includes(':', 7)) {
      clean = `${clean}:4242`;
    }
  }
  return clean.replace(/\/+$/, '');
}

