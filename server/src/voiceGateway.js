// WebRTC sinyalleşmesi: SDP ve ICE mesajlarını kümedeki diğer cihaza aktarır. Ses akışı eşler arası (P2P) gider.
const EVENTS = ['webrtc:offer', 'webrtc:answer', 'webrtc:ice_candidate'];

export function registerVoiceGateway(socket) {
  for (const event of EVENTS) {
    socket.on(event, (payload) => {
      const code = socket.data?.code;
      if (!code || !payload || typeof payload !== 'object') return;
      if (JSON.stringify(payload).length > 64_000) return;
      socket.to(code).emit(event, payload);
    });
  }
}
