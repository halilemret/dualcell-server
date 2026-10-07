import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Txt from './Txt';
import { colors, font } from '../theme';
import { groupCode, normalizeServerUrl } from '../utils/misc';

const ERR = {
  invalid_code: 'Kod geçersiz ya da eşleşme zaten tamamlanmış.',
  rate_limited: 'Çok fazla hatalı deneme. Birkaç dakika sonra tekrar deneyin.',
  not_connected: 'Sunucuya bağlanılamadı. Adresi ve ağ bağlantısını kontrol edin.',
  timeout: 'Sunucu yanıt vermedi. Tekrar deneyin.',
  invalid_device: 'Cihaz bilgisi geçersiz.',
};

function CodeBoxes({ code }) {
  const digits = (code || '').padEnd(6, ' ').slice(0, 6).split('');
  return (
    <View style={s.boxes} accessible accessibilityLabel={`Eşleşme kodu ${digits.join(' ')}`}>
      {digits.map((d, i) => (
        <React.Fragment key={i}>
          {i === 3 ? <View style={{ width: 10 }} /> : null}
          <View style={s.box}><Txt weight="bold" style={s.boxText}>{d.trim()}</Txt></View>
        </React.Fragment>
      ))}
    </View>
  );
}

export default function PairingModal({
  visible, session, connected, peers, defaultUrl, canBroadcast, onCreate, onJoin, onLeave, onBattery, onClose,
}) {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState(canBroadcast ? 'broadcaster' : 'receiver');
  const [url, setUrl] = useState(defaultUrl);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => setUrl(defaultUrl), [defaultUrl]);

  const run = async (kind, fn) => {
    setBusy(kind);
    setError('');
    const res = await fn();
    setBusy(null);
    if (res?.ok) setCode('');
    else setError(ERR[res?.error] || 'İşlem tamamlanamadı. Tekrar deneyin.');
  };

  const digits = code.replace(/\D/g, '').slice(0, 6);
  const me = session?.device?.id;
  const others = (peers || []).filter((p) => p.id !== me);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={session ? onClose : undefined}>
      <View style={[s.root, { paddingTop: insets.top + 12 }]}>
        <View style={s.head}>
          <Txt weight="bold" style={s.h1}>Eşleşme</Txt>
          {session ? (
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" style={s.close}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          {session ? (
            <>
              <View style={s.card}>
                <Txt weight="semi" style={s.label}>Eşleşme kodu</Txt>
                <CodeBoxes code={session.code} />
                <Txt style={s.muted}>Eşleşme tamamlanınca kod kilitlenir; başka cihaz katılamaz.</Txt>
              </View>

              <Txt weight="bold" style={s.section}>Cihazlar</Txt>
              <View style={s.peer}>
                <Txt weight="bold" style={s.peerName}>Bu cihaz · {session.device.role === 'broadcaster' ? 'Verici' : 'Alıcı'}</Txt>
                <Txt style={s.peerMeta}>{connected ? 'Sunucuya bağlı' : 'Sunucuya bağlanıyor…'}</Txt>
              </View>
              {others.length ? others.map((p) => (
                <View key={p.id} style={s.peer}>
                  <Txt weight="bold" style={s.peerName}>{p.name} · {p.role === 'broadcaster' ? 'Verici' : 'Alıcı'}</Txt>
                  <Txt style={[s.peerMeta, { color: p.online ? colors.green : colors.muted }]}>{p.online ? 'Çevrimiçi' : 'Çevrimdışı'}</Txt>
                </View>
              )) : (
                <View style={s.peer}><Txt style={s.peerMeta}>Diğer cihaz henüz katılmadı. Kodu orada girin.</Txt></View>
              )}

              {Platform.OS === 'android' && session.device.role === 'broadcaster' ? (
                <Pressable onPress={onBattery} style={s.secondary} accessibilityRole="button">
                  <Txt weight="semi" style={s.secondaryText}>Pil optimizasyonunu kapat (arka plan için)</Txt>
                </Pressable>
              ) : null}
              <Pressable onPress={() => run('leave', async () => { await onLeave(); return { ok: true }; })} style={s.danger} accessibilityRole="button">
                {busy === 'leave' ? <ActivityIndicator color="#fff" /> : <Txt weight="bold" style={s.dangerText}>Bağlantıyı Kes</Txt>}
              </Pressable>
            </>
          ) : (
            <>
              <Txt style={s.muted}>Hesap gerekmez. Bir cihazda kod üretin, diğerinde kodu girin.</Txt>

              <View style={s.roles}>
                {[
                  { key: 'broadcaster', title: 'Verici', sub: 'Android · SIM kartlı', disabled: !canBroadcast },
                  { key: 'receiver', title: 'Alıcı', sub: 'iOS / Web', disabled: false },
                ].map((r) => (
                  <Pressable
                    key={r.key}
                    disabled={r.disabled}
                    onPress={() => setRole(r.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: role === r.key, disabled: r.disabled }}
                    style={[s.role, role === r.key && s.roleOn, r.disabled && { opacity: 0.45 }]}
                  >
                    <Txt weight="bold" style={s.roleTitle}>{r.title}</Txt>
                    <Txt style={s.roleSub}>{r.sub}</Txt>
                  </Pressable>
                ))}
              </View>

              <Txt weight="semi" style={s.label}>Sunucu adresi</Txt>
              <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.20:4242" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Sunucu adresi" />

              <Pressable onPress={() => run('create', () => onCreate({ role, url: normalizeServerUrl(url) }))} style={s.primary} accessibilityRole="button">
                {busy === 'create' ? <ActivityIndicator color={colors.onBlue} /> : <Txt weight="bold" style={s.primaryText}>Yeni Kod Üret</Txt>}
              </Pressable>

              <Txt weight="semi" style={[s.label, { marginTop: 12 }]}>Ya da mevcut koda bağlan</Txt>
              <TextInput value={groupCode(digits)} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={7} placeholder="000 000" placeholderTextColor={colors.muted} style={[s.input, s.codeInput]} accessibilityLabel="6 haneli eşleşme kodu" />
              <Pressable onPress={() => run('join', () => onJoin({ code: digits, role, url: normalizeServerUrl(url) }))} disabled={digits.length !== 6} style={[s.secondary, digits.length !== 6 && { opacity: 0.45 }]} accessibilityRole="button">
                {busy === 'join' ? <ActivityIndicator color={colors.text} /> : <Txt weight="semi" style={s.secondaryText}>Koda Bağlan</Txt>}
              </Pressable>
            </>
          )}
          {error ? <Txt style={s.error} accessibilityRole="alert">{error}</Txt> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, minHeight: 48 },
  h1: { fontSize: 28 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 24, gap: 14 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 20, alignItems: 'center', gap: 14 },
  label: { fontSize: 13, color: colors.muted },
  muted: { fontSize: 14, lineHeight: 20, color: colors.muted },
  boxes: { flexDirection: 'row', gap: 6 },
  box: { width: 44, height: 58, borderRadius: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  boxText: { fontSize: 26, color: colors.blue },
  section: { fontSize: 18, marginTop: 8 },
  peer: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, gap: 2 },
  peerName: { fontSize: 15 },
  peerMeta: { fontSize: 13, color: colors.muted },
  roles: { flexDirection: 'row', gap: 12 },
  role: { flex: 1, minHeight: 72, padding: 14, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  roleOn: { backgroundColor: colors.cardSel, borderColor: colors.blue },
  roleTitle: { fontSize: 16 },
  roleSub: { fontSize: 13, color: colors.muted },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, minHeight: 50, color: colors.text, fontFamily: font.regular, fontSize: 16 },
  codeInput: { textAlign: 'center', fontSize: 28, letterSpacing: 4, minHeight: 64, fontFamily: font.bold },
  primary: { height: 54, borderRadius: 14, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 17, color: colors.onBlue },
  secondary: { minHeight: 54, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secondaryText: { fontSize: 16 },
  danger: { height: 54, borderRadius: 14, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  dangerText: { fontSize: 16, color: '#fff' },
  error: { fontSize: 14, color: '#FCA5A5', lineHeight: 20 },
});
