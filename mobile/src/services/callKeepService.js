import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

let RNCallKeep = null;
if (Platform.OS === 'ios') {
  try {
    RNCallKeep = require('react-native-callkeep').default || require('react-native-callkeep');
  } catch (e) {}
}

class CallKeepService {
  constructor() {
    this.currentCallId = null;
    this.isAnswered = false;
    this.onAnswer = null;
    this.onEnd = null;
  }

  setup(onAnswer, onEnd) {
    if (Platform.OS !== 'ios' || !RNCallKeep) return;
    
    this.onAnswer = onAnswer;
    this.onEnd = onEnd;

    if (this.isAnswered && this.onAnswer) {
      this.onAnswer();
    }

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

    RNCallKeep.removeEventListener('answerCall');
    RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
      this.isAnswered = true;
      RNCallKeep.setCurrentCallActive(callUUID);
      if (this.onAnswer) this.onAnswer();
    });

    RNCallKeep.removeEventListener('endCall');
    RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
      this.currentCallId = null;
      this.isAnswered = false;
      if (this.onEnd) this.onEnd();
    });
  }

  displayIncomingCall(callerName = 'Gelen Arama', uuid = null) {
    if (Platform.OS !== 'ios' || !RNCallKeep) return;
    if (this.currentCallId) return;
    this.currentCallId = uuid || uuidv4();
    RNCallKeep.displayIncomingCall(this.currentCallId, 'DualCall', callerName, 'generic', false);
  }

  endCall() {
    if (Platform.OS !== 'ios' || !this.currentCallId || !RNCallKeep) return;
    RNCallKeep.endAllCalls();
    this.currentCallId = null;
    this.isAnswered = false;
  }
}

export default new CallKeepService();
