import React, { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View, Pressable, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import Txt from './Txt';

const { width, height } = Dimensions.get('window');

export default function Onboarding({ onComplete }) {
  const scrollRef = useRef(null);
  const [page, setPage] = useState(0);

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    setPage(Math.round(x / width));
  };

  const goNext = () => {
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  const handleRoleSelect = (role) => {
    onComplete(role);
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {/* Page 1 */}
        <View style={s.page}>
          <View style={s.iconContainer}>
            <Ionicons name="phone-portrait-outline" size={80} color={colors.text} />
            <Ionicons name="swap-horizontal-outline" size={40} color={colors.blue} style={{ marginHorizontal: -10 }} />
            <Ionicons name="phone-portrait-outline" size={80} color={colors.text} />
          </View>
          <Txt weight="bold" style={s.title}>İki Telefon{'\n'}Tek İletişim</Txt>
          <Txt style={s.desc}>
            SIM kartınızın olduğu telefonu evde bırakın. DualCall ile aramalarınızı ve SMS'lerinizi dilediğiniz her yerden diğer telefonunuzdan yönetin.
          </Txt>
          <Pressable style={s.nextBtn} onPress={goNext}>
            <Txt weight="bold" style={s.nextTxt}>Devam Et</Txt>
          </Pressable>
        </View>

        {/* Page 2 */}
        <View style={s.page}>
          <View style={s.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={100} color={colors.green} />
          </View>
          <Txt weight="bold" style={s.title}>Sıfır Kayıt{'\n'}Tam Gizlilik</Txt>
          <Txt style={s.desc}>
            Uygulamamız uçtan uca şifreleme (WebRTC) teknolojisi kullanır. Aramalarınız ve mesajlarınız cihazlar arasında doğrudan iletilir, hiçbir sunucuda saklanmaz.
          </Txt>
          <Pressable style={s.nextBtn} onPress={goNext}>
            <Txt weight="bold" style={s.nextTxt}>Gizlilik İlkelerini Onaylıyorum</Txt>
          </Pressable>
        </View>

        {/* Page 3 */}
        <View style={s.page}>
          <View style={[s.iconContainer, { marginBottom: 30 }]}>
            <Ionicons name="git-network-outline" size={80} color={colors.blue} />
          </View>
          <Txt weight="bold" style={s.title}>Bu Cihazın{'\n'}Görevi Nedir?</Txt>
          <Txt style={s.desc}>Lütfen şu an elinizde tuttuğunuz bu telefonun kullanım amacını seçin:</Txt>
          
          <View style={s.roleContainer}>
            <Pressable style={[s.roleBtn, { borderColor: colors.blue }]} onPress={() => handleRoleSelect('broadcaster')}>
              <Ionicons name="hardware-chip-outline" size={28} color={colors.blue} />
              <View style={{ flex: 1 }}>
                <Txt weight="bold" style={s.roleTitle}>Verici (Ana Cihaz)</Txt>
                <Txt style={s.roleDesc}>SIM kartım bu telefonda takılı. Aramaları ve SMS'leri buradan diğer cihazıma ileteceğim.</Txt>
              </View>
            </Pressable>
            
            <Pressable style={[s.roleBtn, { borderColor: colors.green, marginTop: 16 }]} onPress={() => handleRoleSelect('receiver')}>
              <Ionicons name="headset-outline" size={28} color={colors.green} />
              <View style={{ flex: 1 }}>
                <Txt weight="bold" style={s.roleTitle}>Alıcı (Yan Cihaz)</Txt>
                <Txt style={s.roleDesc}>Bu telefonu yanımda taşıyacağım. Evde bıraktığım telefona gelen aramaları buradan cevaplayacağım.</Txt>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={s.pagination}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.dot, page === i && s.dotActive]} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  page: {
    width,
    height: '100%',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    height: 120,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
    color: colors.text,
    marginBottom: 16,
  },
  desc: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: colors.muted,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  nextBtn: {
    backgroundColor: colors.text,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 99,
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  nextTxt: {
    color: colors.bg,
    fontSize: 16,
  },
  roleContainer: {
    width: '100%',
    marginTop: 10,
  },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  roleTitle: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 40,
    width: '100%',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.text,
    width: 24,
  },
});
