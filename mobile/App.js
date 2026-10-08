import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';

import { colors } from './src/theme';
import { load, save } from './src/storage';
import { safe, uid } from './src/utils/misc';
import { extractOtp } from './src/utils/otp';
import socketService from './src/services/socketService';
import audio from './src/services/audioService';
import webrtc from './src/services/webrtcService';
import { getPushToken, initNotifications, notifyCall, notifySms } from './src/services/notificationService';
import { dualCall, nativeAvailable, requestAndroidPermissions, useAndroidNativeListeners } from './src/native/useAndroidNativeListeners';
import Txt from './src/components/Txt';
import IncomingCallModal from './src/components/IncomingCallModal';
import SmsInbox from './src/components/SmsInbox';
import CallHistoryList from './src/components/CallHistoryList';
import DialerModal from './src/components/DialerModal';
import PairingModal from './src/components/PairingModal';
import SimulatorModal from './src/components/SimulatorModal';
import Onboarding from './src/components/Onboarding';
import PrivacyModal from './src/components/PrivacyModal';

const warn = (e) => console.warn('[DualCall]', e?.message ?? e);

const defaultServerUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:4242`;
  return Constants.expoConfig?.extra?.serverUrl || 'http://localhost:4242';
};

const makeDevice = (id, role) => ({
  id,
  role,
  platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
  name: Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android telefon' : 'Web tarayıcı',
});

const TABS = [
  { key: 'calls', label: 'Aramalar', icon: 'call-outline' },
  { key: 'sms', label: 'SMS', icon: 'chatbubble-outline' },
  { key: 'dialer', label: 'Tuş Takımı', icon: 'keypad-outline' },
  { key: 'sim', label: 'Test', icon: 'flask-outline' },
];

function Root() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [session, setSession] = useState(null); // { url, code, secret, device }
  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState([]);
  const [sms, setSms] = useState([]);
  const [history, setHistory] = useState([]);
  const [call, setCall] = useState(null);
  const [tab, setTab] = useState('calls');
  const [modal, setModal] = useState(null); // 'onboarding' | 'pairing' | 'dialer' | 'sim'
  const [privacyModal, setPrivacyModal] = useState(false);
  const [dialPrefill, setDialPrefill] = useState('');
  const [rolePref, setRolePref] = useState(null);
  const [permWarn, setPermWarn] = useState(false);

  const callRef = useRef(null);
  const bcast = useRef(null); // Android'de aktif çağrı: { callId, number, bridge, bridged }
  const pendingDial = useRef(null);

  const role = session?.device?.role ?? (Platform.OS === 'android' ? 'broadcaster' : 'receiver');

  // ---------- Ortak yardımcılar ----------
  const updateCall = useCallback((c) => {
    callRef.current = c;
    setCall(c);
  }, []);
  const addSms = useCallback((m) => setSms((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev].slice(0, 200))), []);
  const addHistory = useCallback((h) => setHistory((prev) => [h, ...prev].slice(0, 200)), []);

  const finishCall = useCallback((outcome) => {
    const c = callRef.current;
    if (!c) return;
    audio.stopRinging();
    webrtc.stop();
    const answered = !!c.answeredAt;
    addHistory({
      id: c.callId,
      number: c.number,
      name: c.name,
      direction: c.direction,
      status: outcome || (answered ? 'answered' : c.direction === 'in' ? 'missed' : 'cancelled'),
      at: c.startedAt,
      duration: answered ? Math.round((Date.now() - c.answeredAt) / 1000) : 0,
    });
    updateCall(null);
  }, [addHistory, updateCall]);

  // ---------- Alıcı: gelen çağrı / SMS ----------
  const onIncomingCall = useCallback((p) => {
    if (callRef.current) return;
    updateCall({ callId: p.callId, number: p.callerNumber, name: p.callerName, direction: 'in', state: 'ringing', startedAt: Date.now(), muted: false, speaker: false });
    audio.startRinging();
    if (AppState.currentState !== 'active') notifyCall(p.callerName, p.callerNumber);
  }, [updateCall]);

  const onIncomingSms = useCallback((p) => {
    addSms({ id: p.id || uid(), sender: p.sender, body: p.body, otp: p.otp || extractOtp(p.body), receivedAt: p.receivedAt || Date.now() });
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    if (AppState.currentState !== 'active') notifySms(p.sender);
  }, [addSms]);

  // ---------- Verici (Android): yerel olaylar ----------
  const startBridge = useCallback(async () => {
    try {
      await dualCall.speaker(true); // SIM görüşmesinin sesi hoparlörden çıkar, mikrofon bunu yakalar
      await webrtc.startCall();
    } catch (e) {
      warn(e);
    }
  }, []);

  const onNativeCall = useCallback((e) => {
    const { state, number, name, callId } = e || {};
    if (state === 'ringing') {
      bcast.current = { callId, number, bridge: false, bridged: false };
      socketService.relayIncomingCall(number, name, 'ringing', callId);
    } else if (state === 'offhook') {
      const pd = pendingDial.current;
      if (!bcast.current) bcast.current = { callId: pd?.callId || callId, number: pd?.number || number, bridge: !!pd, bridged: false };
      socketService.relayCallStatus(bcast.current.callId, 'offhook');
      if (bcast.current.bridge && !bcast.current.bridged) {
        bcast.current.bridged = true;
        startBridge();
      }
    } else if (state === 'idle') {
      if (bcast.current) socketService.relayCallStatus(bcast.current.callId, 'ended');
      bcast.current = null;
      pendingDial.current = null;
      webrtc.stop();
      dualCall.speaker(false);
    }
  }, [startBridge]);

  const onNativeSms = useCallback((e) => {
    if (!e?.body) return;
    socketService.relayIncomingSms(e.sender, e.body);
    addSms({ id: uid(), sender: e.sender, body: e.body, otp: extractOtp(e.body), receivedAt: e.timestamp || Date.now() });
  }, [addSms]);

  useAndroidNativeListeners({ enabled: !!session && role === 'broadcaster', onCall: onNativeCall, onSms: onNativeSms });

  // ---------- Açılış: kalıcı veriyi yükle ----------
  useEffect(() => {
    (async () => {
      let id = await load('dc.deviceId', null);
      if (!id) {
        id = `dev_${uid()}`;
        await save('dc.deviceId', id);
      }
      const [s, m, h, o, r] = await Promise.all([
        load('dc.session', null), 
        load('dc.sms', []), 
        load('dc.history', []),
        load('dc.onboarded', false),
        load('dc.rolePref', null)
      ]);
      setDeviceId(id);
      setSession(s);
      setSms(m);
      setHistory(h);
      setRolePref(r);
      setReady(true);
      if (!o) setModal('onboarding');
      else if (!s) setModal('pairing');
      initNotifications();
    })();
  }, []);

  useEffect(() => { if (ready) save('dc.session', session); }, [ready, session]);
  useEffect(() => { if (ready) save('dc.sms', sms); }, [ready, sms]);
  useEffect(() => { if (ready) save('dc.history', history); }, [ready, history]);

  // ---------- Soket bağlantısı ----------
  useEffect(() => socketService.on('connection', (c) => setConnected(c.connected)), []);
  useEffect(() => {
    if (ready && session) socketService.connect(session.url, session);
  }, [ready, session]);
  useEffect(() => socketService.on('session:invalid', () => {
    setSession(null);
    setPeers([]);
    setModal('pairing');
  }), []);

  // ---------- Soket olayları (role göre) ----------
  useEffect(() => {
    if (!session) return undefined;
    const offs = [];
    const on = (ev, fn) => offs.push(socketService.on(ev, fn));

    on('ready', ({ peers: p }) => {
      if (p) setPeers(p);
      if (role === 'receiver') {
        import('./src/services/notificationService').then(({ getPushToken, getVoipToken }) => {
          Promise.all([getPushToken(), getVoipToken()]).then(([pushToken, voipToken]) => {
            if (pushToken || voipToken) socketService.registerPush({ pushToken, voipToken });
          });
        });
      }
    });
    on('cluster:joined', ({ peers: p }) => p && setPeers(p));
    on('peer:status', (p) => setPeers((prev) => {
      const id = p.deviceId || p.id;
      const rest = prev.filter((x) => x.id !== id);
      return p.left ? rest : [...rest, { id, name: p.name, platform: p.platform, role: p.role, online: p.online, lastSeen: p.lastSeen }];
    }));
    on('webrtc:offer', (p) => role === 'receiver' && webrtc.handleOffer(p).catch(warn));
    on('webrtc:answer', (p) => role === 'broadcaster' && webrtc.handleAnswer(p).catch(warn));
    on('webrtc:ice_candidate', (p) => webrtc.handleCandidate(p).catch(warn));

    if (role === 'receiver') {
      on('call:incoming', onIncomingCall);
      on('sms:incoming', onIncomingSms);
      on('call:status', ({ callId, status }) => {
        const c = callRef.current;
        if (!c || c.callId !== callId) return;
        if (status === 'ended') finishCall();
        else if (status === 'offhook') {
          if (c.state === 'dialing') updateCall({ ...c, state: 'active', answeredAt: Date.now() });
          else if (c.state === 'ringing') { audio.stopRinging(); finishCall('elsewhere'); } // Android'de yanıtlandı
        }
      });
    } else {
      on('call:action', ({ action, callId }) => {
        const b = bcast.current;
        if (!b || b.callId !== callId) return;
        if (action === 'accept') { b.bridge = true; dualCall.answer(); }
        else if (action === 'reject') dualCall.end();
        // 'silence' yalnızca alıcıdaki zili susturur; Android tarafında işlem gerekmez
      });
      on('call:dial', ({ number, callId }) => {
        pendingDial.current = { number, callId };
        dualCall.dial(number);
      });
    }
    return () => offs.forEach((off) => off());
  }, [session?.code, role, onIncomingCall, onIncomingSms, finishCall, updateCall]);

  // ---------- Android: ön plan servisi + izinler ----------
  useEffect(() => {
    if (!session || role !== 'broadcaster' || !nativeAvailable) return;
    requestAndroidPermissions().then((ok) => {
      setPermWarn(!ok);
      dualCall.startService();
    });
  }, [session?.code, role]);

  // ---------- Eşleşme eylemleri ----------
  const pair = async (kind, { role: r, code, url }) => {
    const device = makeDevice(deviceId, r);
    if (!(await socketService.ensureConnected(url))) return { ok: false, error: 'not_connected' };
    const res = kind === 'create' ? await socketService.create(device) : await socketService.join(code, device);
    if (res.ok) {
      setSession({ url, code: res.code, secret: res.secret, device });
      setPeers(res.peers || []);
    }
    return res;
  };

  const leave = async () => {
    await socketService.leave();
    socketService.disconnect();
    setSession(null);
    setPeers([]);
    dualCall.stopService();
    finishCall('cancelled');
    setModal('pairing');
  };

  // ---------- Çağrı eylemleri (alıcı) ----------
  const accept = () => {
    const c = callRef.current;
    if (!c) return;
    audio.stopRinging();
    socketService.sendCallAction('accept', c.callId);
    updateCall({ ...c, state: 'active', answeredAt: Date.now() });
  };
  const decline = () => {
    const c = callRef.current;
    if (!c) return;
    socketService.sendCallAction('reject', c.callId);
    finishCall('rejected');
  };
  const silence = () => {
    const c = callRef.current;
    audio.stopRinging();
    if (c) socketService.sendCallAction('silence', c.callId);
  };
  const hangUp = () => {
    const c = callRef.current;
    if (!c) return;
    socketService.sendCallAction('reject', c.callId);
    finishCall();
  };
  const toggleMute = () => {
    const c = callRef.current;
    webrtc.setMuted(!c.muted);
    updateCall({ ...c, muted: !c.muted });
  };
  const toggleSpeaker = () => {
    const c = callRef.current;
    webrtc.setSpeaker(!c.speaker);
    updateCall({ ...c, speaker: !c.speaker });
  };

  const dialNumber = (number) => {
    setModal(null);
    if (role === 'broadcaster') {
      dualCall.dial(number);
      return;
    }
    if (!session || !connected) {
      Alert.alert('Bağlı değil', 'Arama başlatmak için verici cihazla eşleşmiş ve sunucuya bağlı olmalısınız.');
      return;
    }
    const callId = uid();
    socketService.dial(number, callId);
    updateCall({ callId, number, name: '', direction: 'out', state: 'dialing', startedAt: Date.now(), muted: false, speaker: false });
  };

  // ---------- Simülatör ----------
  const simCall = ({ name, number }) => {
    setModal(null);
    const callId = uid();
    if (role === 'broadcaster') {
      socketService.relayIncomingCall(number, name, 'ringing', callId);
      setTimeout(() => socketService.relayCallStatus(callId, 'ended'), 20000);
    } else {
      onIncomingCall({ callId, callerNumber: number, callerName: name });
      setTimeout(() => {
        const c = callRef.current;
        if (c && c.callId === callId && c.state === 'ringing') finishCall();
      }, 30000);
    }
  };
  const simSms = ({ sender, body }) => {
    setModal(null);
    setTab('sms');
    if (role === 'broadcaster') onNativeSms({ sender, body, timestamp: Date.now() });
    else onIncomingSms({ sender, body });
  };

  // ---------- Arayüz ----------
  const peerOnline = !!session && peers.some((p) => p.id !== session.device.id && p.online);
  const status = !session
    ? { text: 'Eşleşme yok', color: colors.muted }
    : !connected
      ? { text: 'Bağlanıyor…', color: colors.gold }
      : peerOnline
        ? { text: 'Eşleşti', color: colors.green }
        : { text: 'Eş çevrimdışı', color: colors.gold };

  const onTab = (key) => {
    if (key === 'dialer') { setDialPrefill(''); setModal('dialer'); }
    else if (key === 'sim') setModal('sim');
    else setTab(key);
  };

  if (!ready) return <View style={s.root} />;

  if (modal === 'onboarding') {
    return <Onboarding onComplete={async (r) => {
      await save('dc.onboarded', true);
      await save('dc.rolePref', r);
      setRolePref(r);
      setModal('pairing');
    }} />;
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Txt weight="bold" style={s.title}>DualCall</Txt>
          <Txt style={s.sub}>{!session ? 'Cihazları eşleştirin' : role === 'broadcaster' ? 'Verici: çağrı ve SMS iletiliyor' : 'Alıcı: çağrı ve SMS alınıyor'}</Txt>
        </View>
        <View style={s.headerActions}>
          <Pressable onPress={() => setPrivacyModal(true)} accessibilityRole="button" style={s.shieldBtn}>
            <Ionicons name="shield-checkmark" size={24} color={colors.green} />
          </Pressable>
          <Pressable onPress={() => setModal('pairing')} accessibilityRole="button" style={s.pill}>
            <View style={[s.dot, { backgroundColor: status.color }]} />
            <Txt weight="semi" style={s.pillText}>{status.text}</Txt>
          </Pressable>
        </View>
      </View>

      {permWarn ? (
        <Pressable onPress={() => Linking.openSettings()} style={s.warn} accessibilityRole="button">
          <Txt style={s.warnText}>SMS ve arama izinleri verilmedi; köprü çalışmaz. Ayarları açmak için dokunun.</Txt>
        </Pressable>
      ) : null}

      <View style={{ flex: 1 }}>
        {tab === 'calls'
          ? <CallHistoryList history={history} onCallBack={(n) => { setDialPrefill(n); setModal('dialer'); }} />
          : <SmsInbox messages={sms} />}
      </View>

      <View style={[s.tabs, { paddingBottom: insets.bottom }]}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => onTab(t.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.tab, on && s.tabOn]}>
              <Ionicons name={t.icon} size={22} color={on ? colors.blue : colors.muted} />
              <Txt weight={on ? 'bold' : 'semi'} style={[s.tabText, on && { color: colors.blue }]}>{t.label}</Txt>
            </Pressable>
          );
        })}
      </View>

      <PairingModal
        visible={modal === 'pairing'}
        session={session}
        initialRole={rolePref}
        connected={connected}
        peers={peers}
        defaultUrl={session?.url || defaultServerUrl()}
        canBroadcast={Platform.OS === 'android'}
        onCreate={(p) => pair('create', p)}
        onJoin={(p) => pair('join', p)}
        onLeave={leave}
        onBattery={() => dualCall.ignoreBattery()}
        onClose={() => setModal(null)}
      />
      <DialerModal visible={modal === 'dialer'} initialNumber={dialPrefill} onClose={() => setModal(null)} onDial={dialNumber} />
      <SimulatorModal visible={modal === 'sim'} viaBridge={role === 'broadcaster'} onClose={() => setModal(null)} onCall={simCall} onSms={simSms} />
      <PrivacyModal visible={privacyModal} connected={connected} onClose={() => setPrivacyModal(false)} />
      <IncomingCallModal
        call={call}
        bridgeAvailable={webrtc.supported}
        onAccept={accept}
        onDecline={decline}
        onSilence={silence}
        onHangup={hangUp}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
      />
    </View>
  );
}

export default function App() {
  const [loaded, error] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_800ExtraBold });
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Root />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28 },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shieldBtn: { padding: 8 },
  pill: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 13, color: colors.soft },
  warn: { marginHorizontal: 24, marginBottom: 8, padding: 12, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.gold },
  warnText: { fontSize: 13, lineHeight: 18, color: colors.soft },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  tab: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 2, borderTopWidth: 2, borderTopColor: 'transparent', marginTop: -1 },
  tabOn: { borderTopColor: colors.blue },
  tabText: { fontSize: 12, color: colors.muted },
});
