import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Txt from './Txt';
import { colors } from '../theme';
import { formatDuration } from '../utils/misc';

function Rings() {
  const vals = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = [];
    const timers = vals.map((v, i) =>
      setTimeout(() => {
        const a = Animated.loop(
          Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        );
        loops.push(a);
        a.start();
      }, i * 700),
    );
    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((a) => a.stop());
    };
  }, [vals]);
  return vals.map((v, i) => (
    <Animated.View
      key={i}
      pointerEvents="none"
      style={[
        s.ring,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] }) }],
        },
      ]}
    />
  ));
}

function Bars() {
  const vals = useRef([0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loops = vals.map((v, i) => {
      const d = 280 + i * 70;
      const a = Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: d, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.25, duration: d, useNativeDriver: true }),
        ]),
      );
      a.start();
      return a;
    });
    return () => loops.forEach((a) => a.stop());
  }, [vals]);
  return (
    <View style={s.bars} accessibilityElementsHidden>
      {vals.map((v, i) => (
        <Animated.View key={i} style={[s.bar, { transform: [{ scaleY: v }] }]} />
      ))}
    </View>
  );
}

function RoundButton({ icon, label, bg, fg = colors.text, rotate, active, onPress }) {
  return (
    <View style={s.btnWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={active === undefined ? undefined : { selected: active }}
        style={({ pressed }) => [s.round, { backgroundColor: bg, opacity: pressed ? 0.8 : 1 }, active && s.roundActive]}
      >
        <Ionicons name={icon} size={30} color={fg} style={rotate ? { transform: [{ rotate: '135deg' }] } : null} />
      </Pressable>
      <Txt style={s.btnLabel}>{label}</Txt>
    </View>
  );
}

export default function IncomingCallModal({
  call, bridgeAvailable, onAccept, onDecline, onSilence, onHangup, onToggleMute, onToggleSpeaker,
}) {
  const insets = useSafeAreaInsets();
  const [sec, setSec] = useState(0);
  const active = call?.state === 'active';

  useEffect(() => {
    if (!active) {
      setSec(0);
      return undefined;
    }
    const t = setInterval(() => setSec(Math.floor((Date.now() - call.answeredAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active, call?.answeredAt]);

  if (!call) return null;
  const ringing = call.state === 'ringing';
  const title = call.name || call.number || 'Bilinmeyen numara';
  const initials = (call.name || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '#';
  const status = ringing ? 'gelen arama…' : active ? formatDuration(sec) : 'aranıyor…';

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={ringing ? onDecline : onHangup}>
      <View style={[s.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
        {ringing ? (
          <View style={s.pill}>
            <Txt weight="semi" style={s.pillText}>Android Cihazınızdan Yönlendirildi</Txt>
          </View>
        ) : null}

        <View style={s.avatarArea}>
          {ringing ? <Rings /> : null}
          <View style={s.avatar}>
            <Txt weight="bold" style={s.initials}>{initials}</Txt>
          </View>
        </View>

        <Txt weight="bold" style={s.name} numberOfLines={1}>{title}</Txt>
        {call.name && call.number ? <Txt style={s.number}>{call.number}</Txt> : null}
        <Txt weight="semi" style={s.status}>{status}</Txt>
        {active ? <Bars /> : null}
        {active && !bridgeAvailable ? (
          <Txt style={s.note}>Ses köprüsü bu derlemede kullanılamıyor (geliştirme derlemesi gerekir).</Txt>
        ) : null}

        <View style={s.actions}>
          {ringing ? (
            <>
              <RoundButton icon="notifications-off" label="Sessize Al" bg={colors.border} onPress={onSilence} />
              <RoundButton icon="call" label="Reddet" bg={colors.red} fg="#fff" rotate onPress={onDecline} />
              <RoundButton icon="call" label="Yanıtla" bg={colors.green} fg={colors.onGreen} onPress={onAccept} />
            </>
          ) : (
            <>
              <RoundButton icon={call.muted ? 'mic-off' : 'mic'} label="Mikrofon" bg={colors.border} active={!!call.muted} onPress={onToggleMute} />
              <RoundButton icon="volume-high" label="Hoparlör" bg={colors.border} active={!!call.speaker} onPress={onToggleSpeaker} />
              <RoundButton icon="call" label="Kapat" bg={colors.red} fg="#fff" rotate onPress={onHangup} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep, alignItems: 'center', paddingHorizontal: 24 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  pillText: { fontSize: 13, color: colors.blue },
  avatarArea: { width: 300, height: 300, marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1.5, borderColor: colors.blue },
  avatar: { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 38 },
  name: { fontSize: 30, marginTop: 8, maxWidth: '100%' },
  number: { fontSize: 18, color: colors.muted, marginTop: 6 },
  status: { fontSize: 15, color: colors.blue, marginTop: 10 },
  note: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 12 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 40, marginTop: 20 },
  bar: { width: 5, height: 36, borderRadius: 3, backgroundColor: colors.blue },
  actions: { marginTop: 'auto', width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  btnWrap: { alignItems: 'center', gap: 10 },
  round: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  roundActive: { borderWidth: 2, borderColor: colors.blue },
  btnLabel: { fontSize: 14, color: colors.soft },
});
