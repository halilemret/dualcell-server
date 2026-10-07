const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
  AndroidConfig,
} = require('expo/config-plugins');

const PERMISSIONS = [
  'android.permission.RECEIVE_SMS',
  'android.permission.READ_SMS',
  'android.permission.READ_PHONE_STATE',
  'android.permission.READ_CALL_LOG',
  'android.permission.READ_CONTACTS',
  'android.permission.CALL_PHONE',
  'android.permission.ANSWER_PHONE_CALLS',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.WAKE_LOCK',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
];

const KOTLIN_FILES = [
  'DualCallForegroundService.kt',
  'SmsReceiver.kt',
  'CallReceiver.kt',
  'DualCallModule.kt',
  'DualCallPackage.kt',
];

function packageName(config) {
  const pkg = config.android && config.android.package;
  if (!pkg) throw new Error('withDualCallAndroid: app.json içinde android.package tanımlı olmalı.');
  return pkg;
}

function withManifestEntries(config) {
  return withAndroidManifest(config, (cfg) => {
    const pkg = packageName(cfg);
    const manifest = cfg.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const name of PERMISSIONS) {
      if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    const has = (list, name) => (list || []).some((x) => x.$['android:name'] === name);

    app.receiver = app.receiver || [];
    if (!has(app.receiver, `${pkg}.SmsReceiver`)) {
      app.receiver.push({
        $: {
          'android:name': `${pkg}.SmsReceiver`,
          'android:exported': 'true',
          'android:permission': 'android.permission.BROADCAST_SMS',
        },
        'intent-filter': [
          {
            $: { 'android:priority': '999' },
            action: [{ $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } }],
          },
        ],
      });
    }
    if (!has(app.receiver, `${pkg}.CallReceiver`)) {
      app.receiver.push({
        $: { 'android:name': `${pkg}.CallReceiver`, 'android:exported': 'true' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.PHONE_STATE' } }] }],
      });
    }

    app.service = app.service || [];
    if (!has(app.service, `${pkg}.DualCallForegroundService`)) {
      app.service.push({
        $: {
          'android:name': `${pkg}.DualCallForegroundService`,
          'android:exported': 'false',
          'android:foregroundServiceType': 'specialUse',
        },
        property: [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'sms_call_relay',
            },
          },
        ],
      });
    }
    return cfg;
  });
}

function withKotlinSources(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const pkg = packageName(cfg);
      const srcDir = path.join(cfg.modRequest.projectRoot, 'src', 'native');
      const destDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...pkg.split('.'));
      fs.mkdirSync(destDir, { recursive: true });
      for (const file of KOTLIN_FILES) {
        const code = fs.readFileSync(path.join(srcDir, file), 'utf8').replace(/__PACKAGE__/g, pkg);
        fs.writeFileSync(path.join(destDir, file), code);
      }
      return cfg;
    },
  ]);
}

function withPackageRegistration(config) {
  return withMainApplication(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error('withDualCallAndroid: MainApplication.kt bekleniyor (Java şablonu desteklenmiyor).');
    }
    let src = cfg.modResults.contents;
    if (!src.includes('DualCallPackage()')) {
      if (src.includes('// add(MyReactNativePackage())')) {
        src = src.replace('// add(MyReactNativePackage())', '// add(MyReactNativePackage())\n              add(DualCallPackage())');
      } else if (/PackageList\(this\)\.packages\.apply\s*\{/.test(src)) {
        src = src.replace(/(PackageList\(this\)\.packages\.apply\s*\{)/, '$1\n              add(DualCallPackage())');
      } else {
        throw new Error('withDualCallAndroid: MainApplication.kt içinde paket listesi bulunamadı; DualCallPackage()\'ı elle ekleyin.');
      }
      cfg.modResults.contents = src;
    }
    return cfg;
  });
}

module.exports = function withDualCallAndroid(config) {
  config = withManifestEntries(config);
  config = withKotlinSources(config);
  config = withPackageRegistration(config);
  return config;
};
