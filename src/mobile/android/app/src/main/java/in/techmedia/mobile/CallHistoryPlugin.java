package in.techmedia.mobile;

import android.Manifest;
import android.database.Cursor;
import android.provider.CallLog;

import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "CallHistory",
    permissions = {
        @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG }),
        @Permission(alias = "phoneState", strings = { Manifest.permission.READ_PHONE_STATE })
    }
)
public class CallHistoryPlugin extends Plugin {
    private CallHistoryManager manager;

    @Override
    public void load() { manager = new CallHistoryManager(getContext(), this::emitCompletedCall); }

    @Override
    protected void handleOnDestroy() { manager.stop(); }

    @PluginMethod
    public void getLatestAttendedCall(PluginCall call) {
        if (!hasCallLogPermission()) { requestPermissionForAlias("callLog", call, "onReadPermissionResult"); return; }
        resolveLatestCall(call);
    }

    @PluginMethod
    public void getAttendedCallHistory(PluginCall call) {
        if (!hasCallLogPermission()) { requestPermissionForAlias("callLog", call, "onHistoryPermissionResult"); return; }
        JSArray calls = new JSArray();
        try (Cursor cursor = getContext().getContentResolver().query(
            CallLog.Calls.CONTENT_URI,
            new String[] { CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE, CallLog.Calls.DURATION },
            null, null, CallLog.Calls.DATE + " DESC"
        )) {
            if (cursor != null) while (cursor.moveToNext() && calls.length() < 40) {
                JSObject mapped = mapAttendedCall(cursor);
                if (mapped != null) calls.put(mapped);
            }
        } catch (SecurityException error) { call.reject("Call history permission was not granted.", error); return; }
        JSObject result = new JSObject();
        result.put("calls", calls);
        call.resolve(result);
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        if (!hasCallLogPermission()) { requestPermissionForAlias("callLog", call, "onMonitoringPermissionResult"); return; }
        if (!hasPhoneStatePermission()) { requestPermissionForAlias("phoneState", call, "onMonitoringPermissionResult"); return; }
        manager.start();
        call.resolve();
    }

    @PermissionCallback
    private void onReadPermissionResult(PluginCall call) { getLatestAttendedCall(call); }

    @PermissionCallback
    private void onHistoryPermissionResult(PluginCall call) { getAttendedCallHistory(call); }

    @PermissionCallback
    private void onMonitoringPermissionResult(PluginCall call) { startMonitoring(call); }

    private boolean hasCallLogPermission() { return getPermissionState("callLog") == PermissionState.GRANTED; }

    private boolean hasPhoneStatePermission() { return getPermissionState("phoneState") == PermissionState.GRANTED; }

    private void emitCompletedCall() {
        JSObject call = latestAttendedCall();
        if (call != null) notifyListeners("callCompleted", call);
    }

    private void resolveLatestCall(PluginCall call) {
        JSObject result = latestAttendedCall();
        if (result == null) call.reject("No attended incoming or outgoing call was found.");
        else call.resolve(result);
    }

    private JSObject latestAttendedCall() {
        try (Cursor cursor = getContext().getContentResolver().query(
            CallLog.Calls.CONTENT_URI,
            new String[] { CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE, CallLog.Calls.DURATION },
            null, null, CallLog.Calls.DATE + " DESC"
        )) {
            if (cursor == null) return null;
            while (cursor.moveToNext()) {
                JSObject result = mapAttendedCall(cursor);
                if (result != null) return result;
            }
        } catch (SecurityException ignored) { }
        return null;
    }

    private JSObject mapAttendedCall(Cursor cursor) {
        int type = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE));
        if (type != CallLog.Calls.INCOMING_TYPE && type != CallLog.Calls.OUTGOING_TYPE) return null;
        JSObject result = new JSObject();
        result.put("id", cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls._ID)));
        result.put("number", cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER)));
        result.put("direction", type == CallLog.Calls.INCOMING_TYPE ? "incoming" : "outgoing");
        result.put("occurredAt", cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DATE)));
        result.put("durationSeconds", cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION)));
        return result;
    }
}
