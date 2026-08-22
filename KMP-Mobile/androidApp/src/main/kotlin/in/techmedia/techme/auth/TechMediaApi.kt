package `in`.techmedia.techme.auth

import `in`.techmedia.techme.AppApiEnvironment
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

object TechMediaApi {
    fun login(email: String, password: String): MobileSession {
        val connection = openConnection("/auth/login").apply {
            connectTimeout = 15_000
            readTimeout = 15_000
            doOutput = true
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }
        try {
            connection.outputStream.bufferedWriter().use {
                it.write(JSONObject().put("email", email).put("password", password).toString())
            }
            val envelope = responseEnvelope(connection)
            val data = envelope.getJSONObject("data")
            return MobileSession(
                data.getString("accessToken"),
                data.optString("email"),
                data.optString("name")
            )
        } finally {
            connection.disconnect()
        }
    }

    fun verifySession(token: String): MobileSession {
        val connection = openConnection("/auth/session").apply {
            requestMethod = "GET"
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
        }
        try {
            val data = responseEnvelope(connection).getJSONObject("data")
            return MobileSession(token, data.optString("email"), data.optString("name"))
        } finally {
            connection.disconnect()
        }
    }

    private fun openConnection(path: String): HttpURLConnection {
        val url = URL("${AppApiEnvironment.apiBaseUrl}$path")
        require(isAllowedEndpoint(url)) { "Invalid API endpoint." }
        return (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 15_000
            instanceFollowRedirects = false
            useCaches = false
        }
    }

    private fun isAllowedEndpoint(url: URL): Boolean =
        (url.protocol == "https" && url.host == "app.techmedia.in") ||
            (url.protocol == "http" && url.host == "10.0.2.2" && url.port == 7050)

    private fun responseEnvelope(connection: HttpURLConnection): JSONObject {
        val responseCode = connection.responseCode
        val response = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader()?.use { it.readText() }.orEmpty()
        val envelope = runCatching { JSONObject(response) }.getOrNull()
        if (responseCode !in 200..299 || envelope?.optBoolean("success") != true) {
            throw IllegalStateException("The request could not be completed. Please try again.")
        }
        return envelope
    }
}
