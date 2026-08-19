package in.techmedia.mobile;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "MobileReleaseUpdater")
public class MobileReleaseUpdaterPlugin extends Plugin {
    private final AtomicBoolean installing = new AtomicBoolean(false);

    @PluginMethod
    public void getInstalledVersion(PluginCall call) {
        try {
            PackageInfo packageInfo = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionCode", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? packageInfo.getLongVersionCode()
                : packageInfo.versionCode);
            result.put("versionName", packageInfo.versionName);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException error) {
            call.reject("Could not read the installed app version.", error);
        }
    }

    @PluginMethod
    public void installRelease(PluginCall call) {
        String apkUrl = call.getString("apkUrl");
        String expectedSha256 = call.getString("sha256");
        if (!validRelease(apkUrl, expectedSha256)) {
            call.reject("The update manifest is invalid.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(settings);
            JSObject result = new JSObject();
            result.put("permissionRequired", true);
            call.resolve(result);
            return;
        }
        if (!installing.compareAndSet(false, true)) {
            call.reject("An update download is already in progress.");
            return;
        }

        new Thread(() -> downloadAndInstall(call, apkUrl, expectedSha256)).start();
    }

    private void downloadAndInstall(PluginCall call, String apkUrl, String expectedSha256) {
        try {
            File apkFile = downloadRelease(apkUrl, expectedSha256);
            getActivity().runOnUiThread(() -> openInstaller(apkFile));
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not download the verified update.", error);
        } finally {
            installing.set(false);
        }
    }

    private File downloadRelease(String apkUrl, String expectedSha256) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(apkUrl).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(60000);
        connection.setRequestMethod("GET");
        connection.setInstanceFollowRedirects(true);
        if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
            throw new IllegalStateException("The update download returned HTTP " + connection.getResponseCode() + ".");
        }

        File target = new File(getContext().getCacheDir(), "techmedia-update.apk");
        try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(target)) {
            byte[] buffer = new byte[8192];
            for (int count; (count = input.read(buffer)) != -1;) output.write(buffer, 0, count);
        } finally {
            connection.disconnect();
        }

        if (!sha256(target).equalsIgnoreCase(expectedSha256)) {
            target.delete();
            throw new IllegalStateException("The update checksum does not match the release manifest.");
        }
        return target;
    }

    private void openInstaller(File apkFile) {
        Uri apkUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkFile);
        Intent installer = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(apkUri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(installer);
    }

    private boolean validRelease(String apkUrl, String sha256) {
        return apkUrl != null
            && apkUrl.startsWith("https://github.com/CODEXSUN/techmedia/releases/download/")
            && sha256 != null
            && sha256.matches("(?i)^[a-f0-9]{64}$");
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[8192];
            for (int count; (count = input.read(buffer)) != -1;) digest.update(buffer, 0, count);
        }
        StringBuilder result = new StringBuilder();
        for (byte value : digest.digest()) result.append(String.format(Locale.ROOT, "%02x", value));
        return result.toString();
    }
}
