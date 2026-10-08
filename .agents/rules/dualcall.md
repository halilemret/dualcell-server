---
name: DualCall Development Rules
description: Core rules, architecture, and compliance guidelines for the DualCall 2.0 app.
---

# DualCall Projesi Geliştirme Kuralları (Antigravity Agent)

Bu kurallar, DualCall projesinde çalışırken Antigravity ajanı tarafından kesinlikle uygulanmalıdır.

## 1. Sürüm Yönetimi (Sıfır Hata Politikası)
- **Her yeni bulut derlemesi (`eas build`) öncesinde**, mutlaka `mobile/app.json` dosyasındaki `version` (örneğin 1.0.1 -> 1.0.2) ve `buildNumber` (örneğin "2" -> "3") alanlarını kontrol et ve otomatik olarak artır.
- Apple App Store Connect (TestFlight) **asla** aynı `version` ve `buildNumber` kombinasyonuna sahip ikinci bir `.ipa` dosyasını kabul etmez. Derleme (build) komutunu çalıştırmadan önce `app.json` kontrolü yapmak zorunludur.

## 2. Market (Apple/Google) Uygunluğu ve Yasal Şartlar
- **Özel İzinler (Permissions):** Mikrofon, Kamera ve Kişiler gibi izinler için her zaman açıklayıcı `UsageDescription` metinleri (`app.json` içinde iOS için, ve Android manifest config plugin'leri içinde) zorunludur. Silinemez veya atlanamaz.
- **Arka Plan Servisleri (Background Modes):**
  - iOS için CallKit (`RNCallKeep`) ve PushKit (VoIP Push) gereklidir (`UIBackgroundModes: ["voip", "audio", "remote-notification"]`).
  - Android için `Foreground Service (specialUse)` kullanımı zorunludur. `withDualCallAndroid.js` plugin'ine dokunurken bu izinlerin bozulmamasına çok dikkat et.
- **Gizlilik Politikası (Privacy Policy):** Veri toplanmadığını, saklanmadığını ve uçtan uca şifreleme (WebRTC) kullanıldığını belirten Gizlilik Politikası, her zaman `server/src/index.js` içindeki `/privacy` endpoint'i üzerinden yayınlanmalıdır. Uygulama market başvuru aşamalarında bu linkin (https://dualcell-relay.onrender.com/privacy) güncel olduğuna emin ol.

## 3. WebRTC ve Native CallKit Köprüsü
- DualCall'un ses iletimi **Bluetooth üzerinden değil**, WebRTC üzerinden internet aracılığıyla yapılır. 
- Gelen çağrılar iOS'te her zaman Native CallKit arayüzünü tetiklemelidir (`callKeepService.js`). Çağrı ancak native arayüzden cevaplandıktan sonra WebRTC (STUN) bağlantısı başlatılmalıdır. Aksi takdirde Apple'ın ses yönlendirme kilitleri sorun yaratır.
- Android tarafında ise gelen SMS ve çağrılar Kotlin Native Background Receiver'ları tarafından yakalanır (`SmsReceiver`, `CallReceiver`), React Native'e `Headless JS` ile aktarılır.

## 4. Kod Standartları
- Config Plugin'ler (ör. `withDualCallIos.js`) üzerinden Native dosyalara (`AppDelegate.mm`, `AndroidManifest.xml`) müdahale ederken Regex veya basit replace yöntemlerini son derece dikkatli kullan.
- Sadece değiştirilmesi gereken yere müdahale et, `app.json` içindeki `"ascAppId": "6820295487"` kaydını koru.
