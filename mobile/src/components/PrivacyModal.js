import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import Txt from './Txt';

export default function PrivacyModal({ visible, connected, onClose }) {
  const insets = useSafeAreaInsets();

  const openPrivacyPolicy = () => {
    Linking.openURL('https://dualcell-relay.onrender.com/privacy');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        
        <View style={[s.content, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={s.handle} />
          
          <View style={s.header}>
            <View style={s.iconBg}>
              <Ionicons name="shield-checkmark" size={32} color={colors.green} />
            </View>
            <Txt weight="bold" style={s.title}>Gizlilik ve Güvenlik</Txt>
          </View>

          <View style={s.statusCard}>
            <View style={[s.dot, { backgroundColor: connected ? colors.green : colors.gold }]} />
            <Txt weight="semi" style={s.statusText}>
              {connected ? 'Bağlantı Uçtan Uca Şifreli' : 'Bağlantı Bekleniyor...'}
            </Txt>
          </View>

          <View style={s.infoBlock}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <Txt weight="bold" style={s.infoTitle}>Doğrudan İletişim (P2P)</Txt>
              <Txt style={s.infoDesc}>
                Aramalarınız ve mesajlarınız cihazlarınız arasında WebRTC teknolojisi ile şifrelenerek doğrudan aktarılır. Araya 3. şahıslar giremez.
              </Txt>
            </View>
          </View>

          <View style={s.infoBlock}>
            <Ionicons name="server-outline" size={24} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <Txt weight="bold" style={s.infoTitle}>Sıfır Kayıt Politikası</Txt>
              <Txt style={s.infoDesc}>
                Sunucularımız yalnızca cihazlarınızın internette birbirini bulabilmesi için bir köprü görevi görür. Ses veya metin verileriniz asla kaydedilmez.
              </Txt>
            </View>
          </View>

          <Pressable style={s.linkBtn} onPress={openPrivacyPolicy}>
            <Txt weight="bold" style={s.linkTxt}>Tam Gizlilik Politikasını Oku</Txt>
            <Ionicons name="open-outline" size={18} color={colors.blue} />
          </Pressable>

          <Pressable style={s.closeBtn} onPress={onClose}>
            <Txt weight="bold" style={s.closeTxt}>Kapat</Txt>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  content: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    color: colors.text,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 16,
    color: colors.text,
  },
  infoBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 12,
  },
  linkTxt: {
    fontSize: 16,
    color: colors.blue,
  },
  closeBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  closeTxt: {
    fontSize: 16,
    color: colors.text,
  },
});
