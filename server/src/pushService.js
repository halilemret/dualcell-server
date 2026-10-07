// Çevrimdışı alıcıyı uyandırmak için bildirim kancası.
// Varsayılan: Expo Push servisi (APNs/FCM'e iletir). Doğrudan APNs VoIP / FCM istersen notify() içini değiştir.
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export class PushService {
  async notify(devices, message) {
    const tokens = devices.map((d) => d.pushToken).filter(Boolean);
    if (!tokens.length) return;
    try {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(tokens.map((to) => ({ to, sound: 'default', priority: 'high', ...message }))),
      });
    } catch (err) {
      console.warn('push gönderilemedi:', err.message);
    }
  }
}
