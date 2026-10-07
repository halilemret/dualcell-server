# DualCall

Android telefona gelen **arama ve SMS**'leri internet üzerinden **iOS / Web** cihaza aktarır; iOS tarafında tam ekran arama ekranı açar, doğrulama kodlarını (OTP) tek dokunuşla kopyalatır. Hesap yok: yalnızca 6 haneli eşleşme kodu.

```
dualcall/
├── server/   Node.js + Socket.IO relay (bellek içi kümeler)
└── mobile/   Expo (React Native) istemci: iOS, Android, Web
```

## Çalıştırma

**1) Sunucu** (Node 18+)
```bash
cd server && npm install && npm run dev      # http://localhost:4242  (sağlık: /health)
```

**2) Mobil** (Node 22.13+)
```bash
cd mobile
npm install
npx expo install --fix       # paket sürümlerini Expo SDK 57 ile hizalar
npx expo start --web         # hızlı deneme: iki tarayıcı sekmesi + 🧪 Test sekmesi
```
Gerçek cihazlarda **Expo Go yetmez** (WebRTC, incall-manager ve Android köprüsü yerel kod ister). Geliştirme derlemesi:
```bash
npx expo run:android         # Android (verici)
npx expo run:ios             # iOS (alıcı), macOS + Xcode gerekir
```
`prebuild` sırasında `plugins/withDualCallAndroid.js`; izinleri, receiver/servis tanımlarını ekler, `src/native/*.kt` dosyalarını Android projesine kopyalar ve `DualCallPackage`'ı kaydeder.

**Sunucu adresi:** telefonlar `localhost`'a ulaşamaz. Eşleşme ekranındaki "Sunucu adresi"ne bilgisayarın yerel IP'sini yazın (`http://192.168.1.20:4242`). Android emülatöründe `http://10.0.2.2:4242`. Üretimde `https://` kullanın ve `app.json` içindeki `usesCleartextTraffic` ayarını kapatın.

**Test:** 1. cihazda "Yeni Kod Üret", 2. cihazda koda bağlan. Android'de Test sekmesinden senaryo gönderirseniz olay sunucu üzerinden iOS'a gider; iOS/Web'de senaryolar yerel çalışır.

## Bilinmesi gerekenler

- **Çağrı sesi köprüsü sınırlıdır.** Android, üçüncü taraf uygulamaların hücresel görüşme sesini yakalamasına izin vermez. Köprü, Android'de hoparlörü açıp mikrofonla dinleme (akustik) yöntemini kullanır; ses kalitesi ve gizlilik sınırlıdır. Sinyalleşme (kabul / red / kapatma / arama başlatma) ise tam çalışır (`TelecomManager`).
- **Kilitli iPhone'da gerçek CallKit zili yok.** Uygulama açıkken tam ekran modal çalar; arka planda yalnızca bildirim (Expo Push; EAS `projectId` gerekir) gelir. Kilit ekranında CallKit/VoIP push için ayrı yerel modül (ör. `react-native-callkeep`) ve Apple VoIP yetkisi gerekir.
- **Ön plan servisi türü** `phoneCall` yerine `specialUse`: `phoneCall` türü Android 14+'ta yalnızca telefon uygulamaları için izinli. Pil optimizasyonunu eşleşme ekranındaki düğmeyle kapatın.
- **Google Play** `RECEIVE_SMS` / `READ_CALL_LOG` izinlerini kısıtlar; bu uygulama APK ile yan yükleme (sideload) için uygundur.
- **Güvenlik:** eşleşme tamamlanınca kod kilitlenir (2 cihaz), hatalı kod denemesi IP başına sınırlanır, yeniden bağlanma cihaza özel gizli anahtarla yapılır. Kodunuzu paylaşmayın. Sunucuyu `https/wss` arkasında çalıştırın. Kümeler bellekte tutulur; sunucu yeniden başlarsa yeniden eşleşin.
- OTP ayrıştırma iki kalıp kullanır: `kod: 1234` ve `582914 nolu şifreniz`.
