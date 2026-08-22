package `in`.techmedia.techme.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

data class MobileSession(val token: String, val email: String, val name: String)

class SecureSessionStore(context: Context) {
    private val preferences = context.getSharedPreferences("techme.session", Context.MODE_PRIVATE)

    fun save(session: MobileSession) {
        val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key()) }
        val payload = JSONObject()
            .put("token", session.token)
            .put("email", session.email)
            .put("name", session.name)
            .toString().toByteArray()
        check(
            preferences.edit()
            .putString(KEY_IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString(KEY_DATA, Base64.encodeToString(cipher.doFinal(payload), Base64.NO_WRAP))
            .commit()
        ) { "Unable to secure the session on this device." }
    }

    fun readCurrent(): MobileSession? = runCatching {
        val iv = preferences.getString(KEY_IV, null) ?: return null
        val encrypted = preferences.getString(KEY_DATA, null) ?: return null
        val cipher = Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)))
        }
        val data = JSONObject(String(cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP))))
        MobileSession(
            data.getString("token"),
            data.optString("email"),
            data.optString("name")
        )
            .takeIf { tokenIsCurrent(it.token) }
    }.getOrElse {
        clear()
        null
    }

    fun clear() {
        preferences.edit().clear().commit()
    }

    private fun key(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE).run {
            init(
                KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .build()
            )
            generateKey()
        }
    }

    private fun tokenIsCurrent(token: String): Boolean = runCatching {
        val payload = token.split('.')[1]
        val json = JSONObject(String(Base64.decode(payload, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)))
        json.optLong("exp", 0) * 1_000 > System.currentTimeMillis()
    }.getOrDefault(false)

    private companion object {
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val KEY_ALIAS = "techme.session.key"
        const val KEY_DATA = "encrypted_data"
        const val KEY_IV = "initialization_vector"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
