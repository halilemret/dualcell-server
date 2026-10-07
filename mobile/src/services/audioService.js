import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { safe } from '../utils/misc';

const DTMF_FREQ = {
  1: [697, 1209], 2: [697, 1336], 3: [697, 1477],
  4: [770, 1209], 5: [770, 1336], 6: [770, 1477],
  7: [852, 1209], 8: [852, 1336], 9: [852, 1477],
  '*': [941, 1209], 0: [941, 1336], '#': [941, 1477],
};

// Metro statik require ister; küçük, sentezlenmiş WAV dosyaları (ring 56 KB, tuşlar ~3 KB)
const RING = Platform.OS === 'web' ? null : require('../../assets/ring.wav');
const DTMF = Platform.OS === 'web' ? {} : {
  1: require('../../assets/dtmf/1.wav'), 2: require('../../assets/dtmf/2.wav'), 3: require('../../assets/dtmf/3.wav'),
  4: require('../../assets/dtmf/4.wav'), 5: require('../../assets/dtmf/5.wav'), 6: require('../../assets/dtmf/6.wav'),
  7: require('../../assets/dtmf/7.wav'), 8: require('../../assets/dtmf/8.wav'), 9: require('../../assets/dtmf/9.wav'),
  '*': require('../../assets/dtmf/star.wav'), 0: require('../../assets/dtmf/0.wav'), '#': require('../../assets/dtmf/hash.wav'),
};

// Web: 440 Hz + 480 Hz çift frekanslı zil, Web Audio osilatörleriyle
let webCtx = null;
function webTone(freqs, ms, vol = 0.12) {
  try {
    webCtx = webCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (webCtx.state === 'suspended') webCtx.resume();
    const gain = webCtx.createGain();
    gain.gain.value = vol;
    gain.connect(webCtx.destination);
    const oscs = freqs.map((f) => {
      const o = webCtx.createOscillator();
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    setTimeout(() => {
      oscs.forEach((o) => o.stop());
      gain.disconnect();
    }, ms);
  } catch {
    /* tarayıcı ses başlatmaya izin vermedi */
  }
}

class AudioService {
  constructor() {
    this.ringing = false;
    this.hapticTimer = null;
    this.webTimer = null;
    this.ringPlayer = null;
    this.keyPlayers = {};
    this.modeSet = false;
  }

  async _mode() {
    if (this.modeSet || Platform.OS === 'web') return;
    this.modeSet = true;
    try {
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
    } catch {
      /* ses modu ayarlanamadı; varsayılanla devam */
    }
  }

  async startRinging() {
    if (this.ringing) return;
    this.ringing = true;
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    this.hapticTimer = setInterval(
      () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
      1500,
    );
    if (Platform.OS === 'web') {
      webTone([440, 480], 2000);
      this.webTimer = setInterval(() => webTone([440, 480], 2000), 4000);
      return;
    }
    await this._mode();
    try {
      if (!this.ringPlayer) this.ringPlayer = createAudioPlayer(RING);
      this.ringPlayer.loop = true;
      this.ringPlayer.play();
    } catch {
      /* ses çalınamadı; titreşim devam eder */
    }
  }

  stopRinging() {
    this.ringing = false;
    clearInterval(this.hapticTimer);
    clearInterval(this.webTimer);
    this.hapticTimer = null;
    this.webTimer = null;
    try {
      this.ringPlayer?.pause();
      safe(() => this.ringPlayer?.seekTo(0));
    } catch {
      /* yoksay */
    }
  }

  async playDtmf(key) {
    if (Platform.OS === 'web') {
      webTone(DTMF_FREQ[key] || [697, 1209], 160, 0.1);
      return;
    }
    await this._mode();
    try {
      const p = this.keyPlayers[key] || (this.keyPlayers[key] = createAudioPlayer(DTMF[key]));
      safe(() => p.seekTo(0));
      p.play();
    } catch {
      /* yoksay */
    }
  }
}

export default new AudioService();
