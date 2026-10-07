import { Platform } from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import { v4 as uuidv4 } from 'uuid';

class CallKeepService {
  constructor() {
    this.currentCallId = null;
    this.onAnswer = null;
    this.onEnd = null;
  }

  setup(onAnswer, onEnd) {
    if (Platform.OS !== 'ios') return;
    
    this.onAnswer = onAnswer;
    this.onEnd = onEnd;

    const options = {
      ios: {
        appName: 'DualCall',
        supportsVideo: false,
        maximumCallGroups: 1,
        maximumCallsPerCallGroup: 1,
      },
    };

    try {
      RNCallKeep.setup(options);
      RNCallKeep.setAvailable(true);
    } catch (err) {
      console.warn('CallKeep setup error:', err);
    }

    RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
      RNCallKeep.setCurrentCallActive(callUUID);
      if (this.onAnswer) this.onAnswer();
    });

    RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
      this.currentCallId = null;
      if (this.onEnd) this.onEnd();
    });
  }

  displayIncomingCall(callerName = 'Gelen Arama') {
    if (Platform.OS !== 'ios') return;
    this.currentCallId = uuidv4();
    RNCallKeep.displayIncomingCall(this.currentCallId, 'DualCall', callerName, 'generic', false);
  }

  endCall() {
    if (Platform.OS !== 'ios' || !this.currentCallId) return;
    RNCallKeep.endAllCalls();
    this.currentCallId = null;
  }
}

export default new CallKeepService();
