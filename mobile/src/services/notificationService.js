import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initNotifications() {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Gelen aramalar',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 300, 500],
      });
      await Notifications.setNotificationChannelAsync('sms', {
        name: 'SMS',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    return status === 'granted';
  } catch {
    return false;
  }
}

const trigger = (channelId) => (Platform.OS === 'android' ? { channelId } : null);

export function notifyCall(name, number) {
  if (Platform.OS === 'web') return Promise.resolve();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: name || number || 'Gelen arama',
      body: 'Android cihazınızdan yönlendirilen arama',
      sound: true,
      data: { type: 'call' },
    },
    trigger: trigger('calls'),
  }).catch(() => {});
}

export function notifySms(sender) {
  if (Platform.OS === 'web') return Promise.resolve();
  return Notifications.scheduleNotificationAsync({
    content: { title: sender || 'Yeni SMS', body: 'Yeni mesaj. Okumak için uygulamayı açın.', data: { type: 'sms' } },
    trigger: trigger('sms'),
  }).catch(() => {});
}

// Uygulama kapalıyken çağrı bildirimi için Expo push jetonu (EAS projectId gerekir)
export async function getPushToken() {
  if (Platform.OS === 'web') return null;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;
    const t = await Notifications.getExpoPushTokenAsync({ projectId });
    return t.data;
  } catch {
    return null;
  }
}
