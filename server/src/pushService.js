import apn from 'apn';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export class PushService {
  constructor() {
    this.apnProvider = null;
    const { APN_KEY, APN_KEY_ID, APN_TEAM_ID, BUNDLE_ID } = process.env;

    if (APN_KEY && APN_KEY_ID && APN_TEAM_ID) {
      try {
        this.apnProvider = new apn.Provider({
          token: {
            key: APN_KEY.replace(/\\n/g, '\n'),
            keyId: APN_KEY_ID,
            teamId: APN_TEAM_ID,
          },
          production: true, // TestFlight ve App Store için true olmalı
        });
        this.bundleId = BUNDLE_ID || 'com.dualcall.app';
        console.log('APNs VoIP Push entegrasyonu aktif!');
      } catch (err) {
        console.error('APNs Provider hatası:', err);
      }
    } else {
      console.log('APNs bilgileri eksik. Sadece Expo Push kullanılacak.');
    }
  }

  async notify(devices, message) {
    for (const d of devices) {
      if (d.voipToken && this.apnProvider) {
        // VoIP Push Gönderimi (iOS'u uyandırmak için)
        const note = new apn.Notification();
        note.topic = `${this.bundleId}.voip`;
        note.pushType = 'voip';
        note.payload = message; // Çağrı bilgileri
        try {
          const res = await this.apnProvider.send(note, d.voipToken);
          if (res.failed.length > 0) console.error('VoIP Push hatası:', res.failed[0].response);
        } catch (err) {
          console.error('APNs send hatası:', err);
        }
      } 
      
      if (d.pushToken) {
        // Normal Push (Expo/FCM)
        try {
          await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify([{ to: d.pushToken, sound: 'default', priority: 'high', ...message }]),
          });
        } catch (err) {
          console.warn('push gönderilemedi:', err.message);
        }
      }
    }
  }
}
