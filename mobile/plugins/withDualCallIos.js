const { withAppDelegate } = require('expo/config-plugins');

function withIosCallKit(config) {
  return withAppDelegate(config, (cfg) => {
    let src = cfg.modResults.contents;
    
    // Add imports if not present
    if (!src.includes('#import <RNVoipPushNotificationManager.h>')) {
      src = src.replace(
        '#import "AppDelegate.h"',
        `#import "AppDelegate.h"\n#import <RNVoipPushNotificationManager.h>\n#import "RNCallKeep.h"`
      );
    }

    // Add setup to didFinishLaunchingWithOptions
    if (!src.includes('[RNCallKeep setup:')) {
      const initString = '  return [super application:application didFinishLaunchingWithOptions:launchOptions];';
      const callKeepSetup = `
  [RNCallKeep setup:@{
    @"appName": @"DualCall",
    @"maximumCallGroups": @3,
    @"maximumCallsPerCallGroup": @1,
    @"supportsVideo": @NO,
  }];
  [RNVoipPushNotificationManager application:application didFinishLaunchingWithOptions:launchOptions];
`;
      src = src.replace(initString, callKeepSetup + '\n' + initString);
    }

    // Add remote notification delegate methods if not present
    if (!src.includes('didRegisterForRemoteNotificationsWithDeviceToken:deviceToken')) {
      const endObjc = '@end';
      const delegateMethods = `
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RNVoipPushNotificationManager application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [RNVoipPushNotificationManager application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}
`;
      src = src.replace(endObjc, delegateMethods + '\n' + endObjc);
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withDualCallIos(config) {
  return withIosCallKit(config);
};
