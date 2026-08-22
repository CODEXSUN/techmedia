package `in`.techmedia.techme.messaging

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class MessengerState(
    val conversations: List<ConversationSummary> = emptyList(),
    val contacts: List<MessagingContact> = emptyList(),
    val selected: ConversationSummary? = null,
    val messages: List<ChatMessage> = emptyList(),
    val loading: Boolean = false,
    val message: String? = null
)

class MessengerController {
    private val scope = CoroutineScope(Dispatchers.Main)
    private val socket = LiveMessagingSocket()

    var state by mutableStateOf(MessengerState())
        private set

    fun open(token: String) {
        state = state.copy(loading = true, message = null)
        loadConversations(token)
    }

    fun select(conversation: ConversationSummary, token: String) {
        state = state.copy(selected = conversation, loading = true, message = null)
        socket.connect(token, conversation.id, 0) { received -> scope.launch { receive(received) } }
        loadMessages(conversation.id, token)
    }

    fun refresh(token: String) {
        val selected = state.selected ?: return
        loadMessages(selected.id, token, showLoading = false)
    }

    fun loadContacts(token: String, search: String) {
        scope.launch {
            runCatching { withContext(Dispatchers.IO) { MessagingApi.contacts(token, search) } }
                .onSuccess { contacts -> state = state.copy(contacts = contacts) }
                .onFailure { state = state.copy(message = "Contacts could not be loaded.") }
        }
    }

    fun startDirectConversation(contact: MessagingContact, token: String) {
        state = state.copy(loading = true, message = null)
        scope.launch {
            runCatching { withContext(Dispatchers.IO) { MessagingApi.createDirectConversation(contact, token) } }
                .onSuccess { conversation ->
                    state = state.copy(
                        conversations = (listOf(conversation) + state.conversations.filter { it.id != conversation.id }),
                        loading = false
                    )
                    select(conversation, token)
                }
                .onFailure { state = state.copy(loading = false, message = "Conversation could not be created.") }
        }
    }

    fun send(content: String, token: String) {
        val conversation = state.selected ?: return
        val trimmed = content.trim()
        if (trimmed.isBlank()) return
        state = state.copy(loading = true, message = null)
        scope.launch {
            runCatching { withContext(Dispatchers.IO) { MessagingApi.sendMessage(conversation.id, token, trimmed) } }
                .onSuccess { sent ->
                    receive(sent)
                    state = state.copy(loading = false)
                }
                .onFailure { state = state.copy(loading = false, message = "Message was not sent. Try again.") }
        }
    }

    fun closeConversation() {
        socket.close()
        state = state.copy(selected = null, messages = emptyList(), message = null)
    }

    private fun receive(message: ChatMessage) {
        if (message.conversationId != state.selected?.id) return
        state = state.copy(messages = (state.messages + message).distinctBy { it.id }.sortedBy { it.sequenceNumber })
    }

    private fun loadConversations(token: String) {
        scope.launch {
            runCatching { withContext(Dispatchers.IO) { MessagingApi.conversations(token) } }
                .onSuccess { conversations -> state = state.copy(conversations = conversations, loading = false) }
                .onFailure { state = state.copy(loading = false, message = "Messages could not be synchronized.") }
        }
    }

    private fun loadMessages(conversationId: Int, token: String, showLoading: Boolean = true) {
        if (showLoading) state = state.copy(loading = true, message = null)
        scope.launch {
            runCatching { withContext(Dispatchers.IO) { MessagingApi.messages(conversationId, token) } }
                .onSuccess { messages ->
                    state = state.copy(
                        messages = (state.messages + messages).distinctBy { it.id }.sortedBy { it.sequenceNumber },
                        loading = false
                    )
                }
                .onFailure { state = state.copy(loading = false, message = "Messages could not be synchronized.") }
        }
    }
}
