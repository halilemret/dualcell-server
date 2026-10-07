# DualCall 2.0 📱🔄📱

DualCall, iki akıllı telefonu birbirine bağlayarak çağrıları, SMS'leri ve bildirimleri güvenli bir şekilde yönlendirmenizi sağlayan yeni nesil bir P2P köprü uygulamasıdır. 

Artık internet bağlantısı olan dünyanın her yerinden; sim kartınızın bulunduğu cihazı bir "Sunucu/Verici" gibi evde bırakıp, diğer cihazınız üzerinden gelen tüm çağrıları sanki doğrudan o telefona geliyormuş gibi cevaplayabilir ve yönetebilirsiniz.

## 🌟 Yeni Nesil Özellikler (2.0)

- **🌍 Küresel P2P Bağlantı:** Eski lokal ağ kısıtlaması kaldırıldı. Render üzerindeki röle (relay) sunucusu sayesinde iki cihaz farklı internet ağlarında (hatta farklı ülkelerde) olsa bile WebRTC üzerinden bağlanabilir.
- **🎙️ Native CallKit Entegrasyonu (iOS):** İnternet üzerinden gelen aramalar, iPhone'unuzda WhatsApp veya normal bir telefon araması gibi Apple'ın kilit ekranındaki "Arama (CallKit)" arayüzü üzerinden çalar. Ses doğrudan ahizeye veya Bluetooth cihazınıza aktarılır.
- **🤖 Kusursuz Arka Plan (Android):** Android cihazlar için optimize edilmiş `Foreground Service` yapısı sayesinde, Android telefon ekranı kapalı olsa veya uyku modunda olsa dahi arka planda gelen aramaları ve SMS'leri yakalayıp diğer cihaza iletir.
- **📷 QR Kod ile Hızlı Eşleşme:** Artık uzun eşleşme kodlarını manuel girmek yerine, cihaz kamerasıyla ekrandaki QR kodu okutarak saniyeler içinde iki cihazı bağlayabilirsiniz.
- **🔒 Şifreli ve Kayıtsız (Privacy-First):** İletişim tamamen P2P (cihazdan cihaza) WebRTC şifrelemesiyle aktarılır. Bulut sunucuda ses kayıtları, SMS'ler veya arama geçmişleri **asla tutulmaz**. (Detaylar için [Gizlilik Politikamıza](https://dualcell-relay.onrender.com/privacy) göz atın.)

## 🛠 Teknik Mimari

Proje iki ana klasörden oluşur:

### 1. `server/` (Röle Sunucusu)
Sadece cihazların birbirini internet üzerinden bulması ve eşleşmesi için (Signaling) kullanılan Node.js & Socket.io sunucusudur.
- Buluta (Render.com) otomatik olarak `deploy` edilecek şekilde optimize edilmiştir.
- P2P eşleşme sağlandıktan sonra medya trafiği sunucu üzerinden geçmez (WebRTC).
- Uyku modunu engellemek için `setInterval` ping mekanizması içerir.

### 2. `mobile/` (Expo & React Native)
- **Expo Application Services (EAS):** iOS ve Android için native modülleri bulutta derleyecek şekilde `app.json` ve `eas.json` ayarlanmıştır.
- **Custom Config Plugins:** 
  - `withDualCallAndroid.js`: Android tarafındaki izinleri ve arka plan servislerini (Foreground) native olarak `AndroidManifest.xml` içine yazar.
  - `withDualCallIos.js`: iOS tarafında CallKit (`RNCallKeep`) ve VoIP Push (`PushKit`) özelliklerini `AppDelegate.mm` içine inject eder.
- **WebRTC:** `react-native-webrtc` üzerinden RTC Peer Connection kurulur. STUN/TURN sunucuları sayesinde NAT arkasında bile ses köprüsü kurulabilir.

## 🚀 Kurulum & Geliştirme

### Röle Sunucusunu Başlatmak:
```bash
cd server
npm install
npm run dev
```

### Mobil Uygulamayı Geliştirmek:
```bash
cd mobile
npm install
# Sadece UI değişiklikleri için:
npx expo start

# Native CallKit ve Android Servislerini test etmek için (Prebuild & Run):
eas build --profile development --platform all
```

## 📦 Market Yayınlama Durumu

Uygulama App Store ve Google Play gereksinimlerine göre donatılmıştır:
* Gerekli tüm `Info.plist` açıklamaları (Mikrofon, Kamera, Kişiler) mevcuttur.
* `android.permission.FOREGROUND_SERVICE_SPECIAL_USE` vb. hassas izinler, sadece "Verici" modundayken batarya optimizasyonu hariç tutularak kullanılır.
* **Uygulama Kimliği:** `com.dualcall.app` (App Store Connect API üzerinden otomatik deploy sağlanabilir).

---
*Geliştiren: Halil Emre*
