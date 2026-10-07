import { Platform } from 'react-native';
import socketService from './socketService';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// react-native-webrtc yerel modül gerektirir (Expo Go'da yok): yoksa köprü devre dışı kalır, uygulama çalışmaya devam eder.
let RTC = null;
let InCall = null;
if (Platform.OS === 'web') {
  if (typeof window !== 'undefined' && window.RTCPeerConnection) {
    RTC = {
      RTCPeerConnection: window.RTCPeerConnection,
      RTCSessionDescription: window.RTCSessionDescription,
      RTCIceCandidate: window.RTCIceCandidate,
      mediaDevices: navigator.mediaDevices,
    };
  }
} else {
  try {
    RTC = require('react-native-webrtc');
  } catch {
    RTC = null;
  }
  if (Platform.OS === 'ios') {
    try {
      InCall = require('react-native-incall-manager').default;
    } catch {
      InCall = null;
    }
  }
}

const plain = (d) => ({ type: d.type, sdp: d.sdp });

class WebRTCService {
  constructor() {
    this.pc = null;
    this.stream = null;
    this.pending = [];
    this.audioEl = null;
  }

  get supported() {
    return !!RTC;
  }

  async _setup() {
    if (!RTC) throw new Error('webrtc_unavailable');
    this._teardown();
    const pc = new RTC.RTCPeerConnection(ICE);
    this.pc = pc;
    pc.addEventListener('icecandidate', (e) => {
      if (e.candidate) {
        socketService.webrtc('webrtc:ice_candidate', {
          candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate,
        });
      }
    });
    pc.addEventListener('track', (e) => {
      if (Platform.OS === 'web' && e.streams?.[0]) this._playWeb(e.streams[0]);
    });
    this.stream = await RTC.mediaDevices.getUserMedia({ audio: true, video: false });
    this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream));
    InCall?.start({ media: 'audio' });
    return pc;
  }

  _playWeb(stream) {
    if (!this.audioEl) {
      this.audioEl = document.createElement('audio');
      this.audioEl.autoplay = true;
    }
    this.audioEl.srcObject = stream;
  }

  // Çağıran taraf (Android / verici): teklif üretir
  async startCall() {
    const pc = await this._setup();
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    socketService.webrtc('webrtc:offer', { offer: plain(offer) });
  }

  // Yanıtlayan taraf (iOS / web / alıcı)
  async handleOffer({ offer }) {
    if (!offer) return;
    const pc = await this._setup();
    await pc.setRemoteDescription(new RTC.RTCSessionDescription(offer));
    await this._drain();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketService.webrtc('webrtc:answer', { answer: plain(answer) });
  }

  async handleAnswer({ answer }) {
    if (!this.pc || !answer) return;
    await this.pc.setRemoteDescription(new RTC.RTCSessionDescription(answer));
    await this._drain();
  }

  async handleCandidate({ candidate }) {
    if (!RTC || !candidate) return;
    if (!this.pc || !this.pc.remoteDescription) {
      this.pending.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTC.RTCIceCandidate(candidate));
    } catch {
      /* geç gelen aday yoksayılır */
    }
  }

  async _drain() {
    for (const c of this.pending.splice(0)) {
      try {
        await this.pc.addIceCandidate(new RTC.RTCIceCandidate(c));
      } catch {
        /* yoksay */
      }
    }
  }

  setMuted(muted) {
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  setSpeaker(on) {
    InCall?.setForceSpeakerphone(on);
  }

  _teardown() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    try {
      this.pc?.close();
    } catch {
      /* yoksay */
    }
    this.pc = null;
  }

  stop() {
    this._teardown();
    this.pending = [];
    if (this.audioEl) this.audioEl.srcObject = null;
    InCall?.stop();
  }
}

export default new WebRTCService();
