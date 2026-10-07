import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Txt from './Txt';
import { colors } from '../theme';
import { formatDuration, formatTime } from '../utils/misc';

const STATUS = {
  answered: { label: 'Yanıtlandı', color: colors.green },
  missed: { label: 'Cevapsız', color: colors.red },
  rejected: { label: 'Reddedildi', color: colors.gold },
  cancelled: { label: 'İptal', color: colors.muted },
  elsewhere: { label: "Android'de yanıtlandı", color: colors.blue },
};

export default function CallHistoryList({ history, onCallBack }) {
  return (
    <FlatList
      data={history}
      keyExtractor={(h) => h.id}
      contentContainerStyle={s.list}
      ListEmptyComponent={<Txt style={s.empty}>Arama geçmişi boş. Gelen ve giden aramalar burada listelenir.</Txt>}
      renderItem={({ item: h }) => {
        const st = STATUS[h.status] || STATUS.cancelled;
        const title = h.name || h.number || 'Bilinmeyen numara';
        return (
          <Pressable
            onPress={() => h.number && onCallBack(h.number)}
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${st.label}. Geri ara`}
            style={({ pressed }) => [s.item, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={h.direction === 'out' ? 'arrow-up-outline' : 'arrow-down-outline'} size={20} color={st.color} />
            <View style={s.mid}>
              <Txt weight="bold" style={s.title} numberOfLines={1}>{title}</Txt>
              <Txt style={[s.meta, { color: st.color }]}>
                {st.label}{h.duration ? ` · ${formatDuration(h.duration)}` : ''}
              </Txt>
            </View>
            <Txt style={s.time}>{formatTime(h.at)}</Txt>
          </Pressable>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 24, paddingTop: 8, gap: 10 },
  empty: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 48 },
  item: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  mid: { flex: 1 },
  title: { fontSize: 16 },
  meta: { fontSize: 13, marginTop: 2 },
  time: { fontSize: 13, color: colors.muted },
});
