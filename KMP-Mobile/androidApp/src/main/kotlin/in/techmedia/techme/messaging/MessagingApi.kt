package `in`.techmedia.techme.messaging

import `in`.techmedia.techme.AppApiEnvironment
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

data class ConversationSummary(
    val id: Int,
    val title: String,
    val lastMessage: String,
    val unreadCount: Int,
    val updatedAt: String
)

data class MessagingContact(val id: Int, val name: String, val email: String)

data class ChatMessage(
    val conversationId: Int,
    val id: Int,
    val content: String,
    val senderEmail: String,
    val senderName: String,
    val sequenceNumber: Int,
    val createdAt: String
)

object MessagingApi {
    fun conversations(token: String): List<ConversationSummary> =
        getArray("/messaging/conversations", token).map(::parseConversation)

    fun contacts(token: String, search: String): List<MessagingContact> =
        getArray("/messaging/contacts?search=${java.net.URLEncoder.encode(search, Charsets.UTF_8)}", token)
            .map { MessagingContact(it.getInt("id"), it.getString("name"), it.getString("email")) }

    fun createDirectConversation(contact: MessagingContact, token: String): ConversationSummary =
        parseConversation(post("/messaging/conversations", token, JSONObject()
            .put("memberIds", JSONArray().put(contact.id))
            .put("type", "DIRECT")))

    fun messages(conversationId: Int, token: String): List<ChatMessage> =
        getArray("/messaging/conversations/$conversationId/messages?limit=200", token)
            .map(::parseMessage)

    fun sendMessage(conversationId: Int, token: String, content: String): ChatMessage {
        val body = JSONObject()
            .put("clientMessageId", "android-${System.currentTimeMillis()}-$conversationId")
            .put("content", content)
            .put("type", "TEXT")
        val record = post("/messaging/conversations/$conversationId/messages", token, body)
        return parseMessage(record)
    }

    fun parseMessage(record: JSONObject): ChatMessage = ChatMessage(
            conversationId = record.getInt("conversationId"),
            id = record.getInt("id"),
            content = record.getString("content"),
            senderEmail = record.optString("senderEmail"),
            senderName = record.optString("senderName"),
            sequenceNumber = record.optInt("sequenceNumber"),
            createdAt = record.optString("createdAt")
        )

    private fun parseConversation(record: JSONObject): ConversationSummary {
        val members = record.optJSONArray("members") ?: JSONArray()
        return ConversationSummary(
            id = record.getInt("id"),
            title = displayTitle(record, members),
            lastMessage = record.optJSONObject("lastMessage")?.optString("content").orEmpty(),
            unreadCount = record.optInt("unreadCount"),
            updatedAt = record.optString("updatedAt")
        )
    }

    private fun displayTitle(record: JSONObject, members: JSONArray): String {
        record.optString("title").takeIf { it.isNotBlank() }?.let { return it }
        return (0 until members.length())
            .map { members.getJSONObject(it).optString("userName") }
            .filter(String::isNotBlank)
            .take(2)
            .joinToString(", ")
            .ifBlank { "Conversation" }
    }

    private fun getArray(path: String, token: String): List<JSONObject> = request(path, token, "GET", null)
        .getJSONArray("data")
        .objects()

    private fun post(path: String, token: String, body: JSONObject): JSONObject =
        request(path, token, "POST", body).getJSONObject("data")

    private fun request(path: String, token: String, method: String, body: JSONObject?): JSONObject {
        val url = URL("${AppApiEnvironment.apiBaseUrl}$path")
        require(isAllowedEndpoint(url)) { "Invalid API endpoint." }
        val connection = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 15_000
            instanceFollowRedirects = false
            requestMethod = method
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }
        try {
            if (body != null) connection.outputStream.bufferedWriter().use { it.write(body.toString()) }
            val code = connection.responseCode
            val response = (if (code in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            val envelope = runCatching { JSONObject(response) }.getOrNull()
            if (code !in 200..299 || envelope?.optBoolean("success") != true) {
                throw IllegalStateException("Messaging could not be synchronized. Please try again.")
            }
            return envelope
        } finally {
            connection.disconnect()
        }
    }

    private fun isAllowedEndpoint(url: URL): Boolean =
        (url.protocol == "https" && url.host == "app.techmedia.in") ||
            (url.protocol == "http" && url.host == "10.0.2.2" && url.port == 7050)

    private fun JSONArray.objects(): List<JSONObject> = buildList {
        for (index in 0 until length()) add(getJSONObject(index))
    }
}
