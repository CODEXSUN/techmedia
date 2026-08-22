package `in`.techmedia.techme.messaging

import `in`.techmedia.techme.AppApiEnvironment
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URL
import java.util.UUID

class LiveMessagingSocket {
    private val client = HttpClient(OkHttp) { install(WebSockets) }
    private val scope = CoroutineScope(Dispatchers.IO)
    private var connection: Job? = null

    fun connect(token: String, conversationId: Int, afterSequence: Int, onMessage: (ChatMessage) -> Unit) {
        close()
        connection = scope.launch {
            while (isActive) {
                runCatching {
                    client.webSocket(urlString = websocketUrl()) {
                        send(Frame.Text(frame("auth", JSONObject().put("token", token))))
                        for (incomingFrame in incoming) {
                            if (incomingFrame !is Frame.Text) continue
                            handleFrame(incomingFrame.readText(), conversationId, afterSequence, onMessage) { event, payload ->
                                send(Frame.Text(frame(event, payload)))
                            }
                        }
                    }
                }
                if (isActive) delay(RECONNECT_DELAY_MS)
            }
        }
    }

    fun close() {
        connection?.cancel()
        connection = null
    }

    private suspend fun handleFrame(
        raw: String,
        conversationId: Int,
        afterSequence: Int,
        onMessage: (ChatMessage) -> Unit,
        send: suspend (String, JSONObject) -> Unit
    ) {
        val envelope = runCatching { JSONObject(raw) }.getOrNull() ?: return
        val payload = envelope.optJSONObject("payload") ?: return
        when (envelope.optString("eventType")) {
            "auth.success" -> {
                send("conversation.subscribe", JSONObject().put("conversationId", conversationId))
                send("sync.request", JSONObject().put("conversationId", conversationId).put("afterSequence", afterSequence).put("limit", 200))
            }
            "message.created" -> if (payload.optInt("conversationId") == conversationId) {
                payload.optJSONObject("message")?.let { onMessage(MessagingApi.parseMessage(it)) }
            }
            "sync.completed" -> if (payload.optInt("conversationId") == conversationId) {
                payload.optJSONArray("messages")?.let { messages ->
                    for (index in 0 until messages.length()) onMessage(MessagingApi.parseMessage(messages.getJSONObject(index)))
                }
            }
        }
    }

    private fun websocketUrl(): String {
        val base = URL(AppApiEnvironment.apiBaseUrl)
        val scheme = if (base.protocol == "https") "wss" else "ws"
        return "$scheme://${base.authority}${base.path.trimEnd('/')}/ws/messaging"
    }

    private fun frame(eventType: String, payload: JSONObject): String = JSONObject()
        .put("eventId", UUID.randomUUID().toString())
        .put("eventType", eventType)
        .put("payload", payload)
        .toString()

    private companion object {
        const val RECONNECT_DELAY_MS = 2_000L
    }
}
