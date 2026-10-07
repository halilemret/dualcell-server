import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Txt from './Txt';
import { colors } from '../theme';
import { formatTime, safe } from '../utils/misc';

export default function SmsInbox({ messages }) {
  const [copied, setCopied] = useState(null);

  const copy = async (m) => {
    await Clipboard.setStringAsync(m.otp);
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setCopied(m.id);
    setTimeout(() => setCopied((c) => (c === m.id ? null : c)), 2500);
  };

  return (
    <FlatList
      data={messages}
      keyExtractor={(m) => m.id}
      contentContainerStyle={s.list}
      ListEmptyComponent={
        <Txt style={s.empty}>Henüz SMS yok. Verici cihaza gelen mesajlar burada görünür; doğrulama kodları tek dokunuşla kopyalanır.</Txt>
      }
      renderItem={({ item: m }) => {
        const done = copied === m.id;
        return (
          <View style={s.card}>
            <View style={s.row}>
              <Txt weight="bold" style={s.sender} numberOfLines={1}>{m.sender}</Txt>
              <Txt style={s.time}>{formatTime(m.receivedAt)}</Txt>
            </View>
            <Txt style={s.body}>{m.body}</Txt>
            {m.otp ? (
              <Pressable
                onPress={() => copy(m)}
                accessibilityRole="button"
                accessibilityLabel={done ? 'Kod kopyalandı' : `Kodu kopyala ${m.otp}`}
                style={({ pressed }) => [s.btn, done && s.btnDone, pressed && { opacity: 0.85 }]}
              >
                <Txt weight="bold" style={[s.btnText, done && s.btnTextDone]}>
                  {done ? 'Kopyalandı' : `Kodu Kopyala · ${m.otp}`}
                </Txt>
              </Pressable>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 24, paddingTop: 8, gap: 12 },
  empty: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 48 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  sender: { fontSize: 16, flexShrink: 1 },
  time: { fontSize: 13, color: colors.muted },
  body: { fontSize: 15, lineHeight: 22, color: colors.soft },
  btn: { height: 48, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  btnDone: { backgroundColor: colors.green },
  btnText: { fontSize: 16, color: colors.onGold },
  btnTextDone: { color: colors.onGreen },
});
