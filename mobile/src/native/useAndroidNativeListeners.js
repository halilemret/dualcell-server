import { useEffect, useRef } from 'react';
import { DeviceEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

const Native = Platform.OS === 'android' ? NativeModules.DualCall : null;
export const nativeAvailable = !!Native;

const call = (method, ...args) => {
  if (!Native?.[method]) return Promise.resolve(null);
  return Promise.resolve(Native[method](...args)).catch((e) => {
    console.warn(`[DualCall.${method}]`, e?.message ?? e);
    return null;
  });
};

export const dualCall = {
  startService: () => call('startForegroundService'),
  stopService: () => call('stopForegroundService'),
  isRunning: () => call('isServiceRunning'),
  answer: () => call('answerCall'),
  end: () => call('endCall'),
  dial: (number) => call('dial', number),
  speaker: (on) => call('setSpeakerphone', !!on),
  ignoreBattery: () => call('requestIgnoreBatteryOptimizations'),
};

export async function requestAndroidPermissions() {
  if (Platform.OS !== 'android') return true;
  const P = PermissionsAndroid.PERMISSIONS;
  const wanted = [
    P.RECEIVE_SMS, P.READ_SMS, P.READ_PHONE_STATE, P.READ_CALL_LOG, P.READ_CONTACTS,
    P.CALL_PHONE, P.ANSWER_PHONE_CALLS, P.RECORD_AUDIO, P.POST_NOTIFICATIONS,
  ].filter(Boolean);
  const res = await PermissionsAndroid.requestMultiple(wanted);
  return [P.RECEIVE_SMS, P.READ_PHONE_STATE].every((p) => res[p] === PermissionsAndroid.RESULTS.GRANTED);
}

// Kotlin tarafındaki SmsReceiver / CallReceiver olaylarını React'e taşır.
export function useAndroidNativeListeners({ enabled, onCall, onSms }) {
  const cb = useRef({});
  cb.current = { onCall, onSms };
  useEffect(() => {
    if (!nativeAvailable || !enabled) return undefined;
    const a = DeviceEventEmitter.addListener('DualCallCall', (e) => cb.current.onCall?.(e));
    const b = DeviceEventEmitter.addListener('DualCallSms', (e) => cb.current.onSms?.(e));
    return () => {
      a.remove();
      b.remove();
    };
  }, [enabled]);
}
