package in.techmedia.mobile;

import android.content.Context;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;

class CallHistoryManager {
    interface Listener { void onCallCompleted(); }

    private final PhoneStateListener phoneStateListener = new PhoneStateListener() {
        @Override
        public void onCallStateChanged(int state, String phoneNumber) {
            if (state == TelephonyManager.CALL_STATE_OFFHOOK || state == TelephonyManager.CALL_STATE_RINGING) activeCallSeen = true;
            else if (state == TelephonyManager.CALL_STATE_IDLE && activeCallSeen) { activeCallSeen = false; listener.onCallCompleted(); }
        }
    };
    private final Listener listener;
    private final TelephonyManager telephonyManager;
    private boolean activeCallSeen;
    private boolean started;

    CallHistoryManager(Context context, Listener listener) {
        this.listener = listener;
        this.telephonyManager = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
    }

    void start() {
        if (started) return;
        telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
        started = true;
    }

    void stop() {
        if (!started) return;
        telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);
        started = false;
    }
}
