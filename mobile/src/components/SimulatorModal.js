import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Txt from './Txt';
import { colors, font } from '../theme';

const SCENARIOS = [
  { id: 'bank', icon: 'card-outline', title: 'Banka giriş doğrulama SMS\'i', kind: 'sms', sender: 'Garanti BBVA', body: 'Garanti BBVA: 582914 nolu şifreniz ile internet bankacılığına giriş yapabilirsiniz.' },
  { id: 'cargo', icon: 'cube-outline', title: 'Kargo teslimat kodu', kind: 'sms', sender: 'Trendyol Express', body: 'Trendyol Express teslimat kodunuz: 8392. Kuryeye iletiniz.' },
  { id: 'urgent', icon: 'warning-outline', title: 'Acil çağrı', kind: 'call', name: 'Ahmet Yılmaz', number: '+90 532 111 22 33' },
  { id: 'support', icon: 'headset-outline', title: 'Müşteri hizmetleri', kind: 'call', name: 'Vodafone Destek', number: '0850 542 00 00' },
];

export default function SimulatorModal({ visible, viaBridge, onClose, onCall, onSms }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [sender, setSender] = useState('');
  const [body, setBody] = useState('');

  const run = (sc) => (sc.kind === 'call' ? onCall({ name: sc.name, number: sc.number }) : onSms({ sender: sc.sender, body: sc.body }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top + 12 }]}>
        <View style={s.head}>
          <Txt weight="bold" style={s.h1}>Simülatör</Txt>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" style={s.close}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          <Txt style={s.hint}>
            {viaBridge
              ? 'Bu cihaz verici: senaryolar sunucu üzerinden eşleşen alıcıya gönderilir.'
              : 'Bu cihaz alıcı: senaryolar bu cihazda yerel olarak çalışır.'}
          </Txt>

          {SCENARIOS.map((sc) => (
            <Pressable key={sc.id} onPress={() => run(sc)} accessibilityRole="button" style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
              <Ionicons name={sc.icon} size={24} color={colors.blue} />
              <View style={{ flex: 1 }}>
                <Txt weight="bold" style={s.cardTitle}>{sc.title}</Txt>
                <Txt style={s.cardSub} numberOfLines={2}>{sc.kind === 'call' ? `${sc.name} (${sc.number})` : sc.body}</Txt>
              </View>
            </Pressable>
          ))}

          <Txt weight="bold" style={s.section}>Özel arama</Txt>
          <TextInput value={name} onChangeText={setName} placeholder="İsim" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Arayan adı" />
          <TextInput value={number} onChangeText={setNumber} placeholder="Numara" placeholderTextColor={colors.muted} keyboardType="phone-pad" style={s.input} accessibilityLabel="Arayan numarası" />
          <Pressable onPress={() => number.trim() && onCall({ name: name.trim(), number: number.trim() })} style={s.primary} accessibilityRole="button">
            <Txt weight="bold" style={s.primaryText}>Aramayı Simüle Et</Txt>
          </Pressable>

          <Txt weight="bold" style={s.section}>Özel SMS</Txt>
          <TextInput value={sender} onChangeText={setSender} placeholder="Gönderen" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="SMS gönderen" />
          <TextInput value={body} onChangeText={setBody} placeholder="Mesaj metni (ör. Kodunuz: 123456)" placeholderTextColor={colors.muted} multiline style={[s.input, { minHeight: 96, textAlignVertical: 'top' }]} accessibilityLabel="SMS metni" />
          <Pressable onPress={() => body.trim() && onSms({ sender: sender.trim() || 'Test', body: body.trim() })} style={s.primary} accessibilityRole="button">
            <Txt weight="bold" style={s.primaryText}>SMS'i Simüle Et</Txt>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  h1: { fontSize: 28 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 24, gap: 12 },
  hint: { fontSize: 14, lineHeight: 20, color: colors.muted },
  card: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, minHeight: 64 },
  cardTitle: { fontSize: 16 },
  cardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  section: { fontSize: 18, marginTop: 16 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, color: colors.text, fontFamily: font.regular, fontSize: 16 },
  primary: { height: 52, borderRadius: 14, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, color: colors.onBlue },
});
