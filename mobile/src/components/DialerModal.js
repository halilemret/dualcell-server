import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Txt from './Txt';
import audio from '../services/audioService';
import { colors } from '../theme';
import { safe } from '../utils/misc';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

export default function DialerModal({ visible, initialNumber = '', onClose, onDial }) {
  const insets = useSafeAreaInsets();
  const [num, setNum] = useState(initialNumber);

  useEffect(() => {
    if (visible) setNum(initialNumber);
  }, [visible, initialNumber]);

  const press = (k) => {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    audio.playDtmf(k);
    setNum((n) => (n.length < 24 ? n + k : n));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
        <View style={s.top}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" style={s.close}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </Pressable>
          <Txt style={s.caption}>Android SIM hattı üzerinden aranır</Txt>
          <View style={s.close} />
        </View>

        <View style={s.display}>
          <Txt weight="bold" style={s.number} numberOfLines={1} adjustsFontSizeToFit>{num || ' '}</Txt>
        </View>

        <View style={s.grid}>
          {KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => press(k)}
              onLongPress={k === '0' ? () => setNum((n) => `${n}+`) : undefined}
              accessibilityRole="button"
              accessibilityLabel={k === '*' ? 'Yıldız' : k === '#' ? 'Diyez' : k}
              style={({ pressed }) => [s.key, pressed && { backgroundColor: colors.border }]}
            >
              <Txt weight="semi" style={s.keyText}>{k}</Txt>
            </Pressable>
          ))}
        </View>

        <View style={s.bottom}>
          <View style={s.side} />
          <Pressable
            onPress={() => num && onDial(num)}
            disabled={!num}
            accessibilityRole="button"
            accessibilityLabel="Ara"
            style={[s.call, !num && { opacity: 0.4 }]}
          >
            <Ionicons name="call" size={32} color={colors.onGreen} />
          </Pressable>
          <Pressable
            onPress={() => setNum((n) => n.slice(0, -1))}
            onLongPress={() => setNum('')}
            accessibilityRole="button"
            accessibilityLabel="Sil"
            style={s.side}
          >
            {num ? <Ionicons name="backspace-outline" size={30} color={colors.soft} /> : null}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  top: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  caption: { fontSize: 14, color: colors.muted },
  display: { height: 80, marginTop: 16, width: '100%', paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' },
  number: { fontSize: 34, letterSpacing: 1 },
  grid: { width: 284, flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  key: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 30 },
  bottom: { marginTop: 'auto', width: 284, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  call: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  side: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
});
