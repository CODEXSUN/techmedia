package `in`.techmedia.techme.messaging

import android.Manifest
import android.os.Build
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.techmedia.techme.auth.MobileSession

private val Background = Color(0xFFF7F8FB)
private val Purple = Color(0xFF662C90)
private val Muted = Color(0xFF6A707C)

@Composable
fun MessengerScreen(session: MobileSession, controller: MessengerController, onBack: () -> Unit) {
    val state = controller.state
    LaunchedEffect(Unit) { controller.open(session.token) }
    if (state.selected == null) ChatList(state, controller, session.token, onBack)
    else ChatThread(state, controller, session)
}

@Composable
private fun ChatList(state: MessengerState, controller: MessengerController, token: String, onBack: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var unreadOnly by remember { mutableStateOf(false) }
    var railOpen by remember { mutableStateOf(false) }
    var contactSheet by remember { mutableStateOf(false) }
    val chats = state.conversations.filter {
        (!unreadOnly || it.unreadCount > 0) &&
            (query.isBlank() || it.title.contains(query, true) || it.lastMessage.contains(query, true))
    }
    if (contactSheet) LaunchedEffect(query) { controller.loadContacts(token, query) }
    Box(Modifier.fillMaxSize().background(Background)) {
        Row(Modifier.fillMaxSize()) {
            if (railOpen) ChatRail { railOpen = false }
            Column(Modifier.weight(1f)) {
                ChatListHeader(onBack, { railOpen = !railOpen }, { contactSheet = true })
                OutlinedTextField(
                    query, { query = it }, Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    label = { Text("Search or start a new chat") }, singleLine = true,
                    leadingIcon = { Glyph(GlyphType.Search, Muted) }
                )
                Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(!unreadOnly, { unreadOnly = false }, label = { Text("All") })
                    FilterChip(unreadOnly, { unreadOnly = true }, label = { Text("Unread") })
                }
                state.message?.let { ErrorText(it) }
                if (chats.isEmpty() && !state.loading) {
                    Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text(if (query.isBlank()) "No conversations yet" else "No chats found", color = Muted)
                    }
                } else LazyColumn(Modifier.weight(1f).padding(horizontal = 16.dp)) {
                    items(chats, key = { it.id }) { ChatRow(it) { controller.select(it, token) } }
                }
            }
        }
        if (contactSheet) ContactSheet(state.contacts, query, { query = it }, { contactSheet = false }) {
            contactSheet = false
            controller.startDirectConversation(it, token)
        }
    }
}

@Composable
private fun ChatListHeader(onBack: () -> Unit, onRail: () -> Unit, onNew: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().background(Color.White).statusBarsPadding().height(62.dp).padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        GlyphButton(GlyphType.Back, "Back", onBack)
        Text("Chats", Modifier.weight(1f), fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
        GlyphButton(GlyphType.NewChat, "New chat", onNew)
        GlyphButton(GlyphType.Menu, "Toggle side menu", onRail)
    }
}

@Composable
private fun ChatRow(chat: ConversationSummary, onClick: () -> Unit) {
    var menuOpen by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Avatar(chat.title)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(chat.title, Modifier.weight(1f), fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(time(chat.updatedAt), color = Muted, fontSize = 12.sp)
            }
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(chat.lastMessage.ifBlank { "Start a conversation" }, Modifier.weight(1f), color = Muted, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (chat.unreadCount > 0) Badge(chat.unreadCount)
            }
        }
        Box {
            GlyphButton(GlyphType.Chevron, "Chat options") { menuOpen = true }
            ChatMenu(menuOpen) { menuOpen = false }
        }
    }
}

@Composable
private fun ChatThread(state: MessengerState, controller: MessengerController, session: MobileSession) {
    val chat = requireNotNull(state.selected)
    var draft by remember(chat.id) { mutableStateOf("") }
    var actionMessage by remember { mutableStateOf<ChatMessage?>(null) }
    Column(Modifier.fillMaxSize().background(Background)) {
        ThreadHeader(chat, controller::closeConversation)
        state.message?.let { ErrorText(it) }
        Box(Modifier.weight(1f)) {
            LazyColumn(Modifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 6.dp), reverseLayout = true) {
                items(state.messages.asReversed(), key = { it.id }) { Bubble(it, it.senderEmail.equals(session.email, true)) { actionMessage = it } }
            }
            actionMessage?.let { MessageActionSheet(it, it.senderEmail.equals(session.email, true)) { actionMessage = null } }
        }
        Composer(draft, { draft = it }, { controller.send(draft, session.token); draft = "" }, state.loading)
    }
}

@Composable
private fun ThreadHeader(chat: ConversationSummary, onBack: () -> Unit) {
    var menuOpen by remember { mutableStateOf(false) }
    Row(
        Modifier.fillMaxWidth().background(Color.White).statusBarsPadding().height(62.dp).padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        GlyphButton(GlyphType.Back, "Back to chats", onBack)
        Avatar(chat.title, 38.dp)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(chat.title, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("Active recently", color = Muted, fontSize = 12.sp)
        }
        GlyphButton(GlyphType.Search, "Search messages") {}
        Box {
            GlyphButton(GlyphType.More, "Chat menu") { menuOpen = true }
            ChatMenu(menuOpen) { menuOpen = false }
        }
    }
}

@Composable
private fun Composer(draft: String, onChange: (String) -> Unit, onSend: () -> Unit, sending: Boolean) {
    var attachmentsOpen by remember { mutableStateOf(false) }
    var emojiOpen by remember { mutableStateOf(false) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {}
    Column(
        Modifier
            .fillMaxWidth()
            .background(Color.White)
            .navigationBarsPadding()
            .padding(start = 12.dp, top = 10.dp, end = 12.dp, bottom = 16.dp)
    ) {
        if (emojiOpen) Row(Modifier.padding(start = 42.dp, bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf("🙂", "👍", "❤️", "🎉", "🙏").forEach { Text(it, fontSize = 22.sp, modifier = Modifier.clickable { onChange(draft + it); emojiOpen = false }) }
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 54.dp, max = 138.dp)
                    .background(Color.White, RoundedCornerShape(27.dp)),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box {
                    GlyphButton(GlyphType.Add, "More actions", onClick = { attachmentsOpen = true }, size = 36.dp)
                    DropdownMenu(attachmentsOpen, { attachmentsOpen = false }) {
                        DropdownMenuItem({ Text("Photo or video") }, { attachmentsOpen = false; launcher.launch(mediaPermissions()) })
                        DropdownMenuItem({ Text("Camera") }, { attachmentsOpen = false; launcher.launch(mediaPermissions()) })
                        DropdownMenuItem({ Text("Document") }, { attachmentsOpen = false })
                    }
                }
                GlyphButton(GlyphType.Emoji, "Emoji", onClick = { emojiOpen = !emojiOpen }, size = 32.dp)
                TextField(
                    value = draft,
                    onValueChange = onChange,
                    modifier = Modifier.weight(1f),
                    enabled = !sending,
                    placeholder = { Text("Type a message", color = Muted) },
                    singleLine = false,
                    minLines = 1,
                    maxLines = 4,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        disabledContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        disabledIndicatorColor = Color.Transparent
                    )
                )
                if (draft.isBlank()) {
                    GlyphButton(GlyphType.Mic, "Voice message") { launcher.launch(arrayOf(Manifest.permission.RECORD_AUDIO)) }
                }
            }
            if (draft.isNotBlank()) {
                Spacer(Modifier.width(8.dp))
                CircleGlyphButton(GlyphType.Send, "Send", Purple, Color.White, onSend)
            }
        }
    }
}

@Composable
private fun ContactSheet(contacts: List<MessagingContact>, query: String, onQuery: (String) -> Unit, onClose: () -> Unit, onContact: (MessagingContact) -> Unit) {
    Box(Modifier.fillMaxSize().background(Color(0x66000000)), contentAlignment = Alignment.BottomCenter) {
        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp), colors = CardDefaults.cardColors(Color.White)) {
            Column(Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("New chat", Modifier.weight(1f), fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                    GlyphButton(GlyphType.Close, "Close", onClose)
                }
                OutlinedTextField(query, onQuery, Modifier.fillMaxWidth(), label = { Text("Search contacts") }, singleLine = true)
                LazyColumn(Modifier.height(260.dp)) {
                    items(contacts, key = { it.id }) { contact ->
                        Row(Modifier.fillMaxWidth().clickable { onContact(contact) }.padding(vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Avatar(contact.name, 40.dp); Spacer(Modifier.width(12.dp))
                            Column { Text(contact.name, fontWeight = FontWeight.SemiBold); Text(contact.email, color = Muted, fontSize = 13.sp) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatRail(onClose: () -> Unit) {
    Column(
        Modifier.width(64.dp).fillMaxSize().background(Color.White).statusBarsPadding().padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        GlyphButton(GlyphType.Close, "Collapse menu", onClose)
        RailLabel(GlyphType.NewChat, "Chats"); RailLabel(GlyphType.Agent, "Agent"); RailLabel(GlyphType.Menu, "Settings")
    }
}

@Composable private fun RailLabel(glyph: GlyphType, label: String) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Glyph(glyph, Purple); Text(label, fontSize = 10.sp, color = Muted) } }
@Composable private fun Avatar(title: String, size: Dp = 48.dp) { Box(Modifier.width(size).height(size).background(Purple, RoundedCornerShape(size / 2)), contentAlignment = Alignment.Center) { Text(title.firstOrNull()?.uppercase() ?: "T", color = Color.White, fontSize = if (size < 44.dp) 15.sp else 18.sp) } }
@Composable private fun Badge(count: Int) { Box(Modifier.background(Color(0xFF16A34A), RoundedCornerShape(12.dp)).padding(horizontal = 7.dp, vertical = 3.dp)) { Text(count.coerceAtMost(99).toString(), color = Color.White, fontSize = 12.sp) } }

@Composable
private fun Bubble(message: ChatMessage, mine: Boolean, onLongPress: (ChatMessage) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(vertical = 7.dp), horizontalAlignment = if (mine) Alignment.End else Alignment.Start) {
        if (!mine) Text(message.senderName, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 6.dp))
        Column(
            Modifier
                .combinedClickable(onClick = {}, onLongClick = { onLongPress(message) })
                .shadow(2.dp, RoundedCornerShape(16.dp))
                .background(if (mine) Color(0xFFF1E7F8) else Color.White, RoundedCornerShape(16.dp))
                .padding(horizontal = 13.dp, vertical = 9.dp)
        ) {
            Text(message.content, fontSize = 15.sp)
            Text(
                time(message.createdAt),
                color = Muted,
                fontSize = 10.sp,
                modifier = Modifier.align(Alignment.End).padding(top = 3.dp)
            )
        }
    }
}

@Composable
private fun MessageActionSheet(message: ChatMessage, mine: Boolean, dismiss: () -> Unit) {
    val clipboard = LocalClipboardManager.current
    Box(Modifier.fillMaxSize().background(Color(0x33000000)).clickable { dismiss() }, contentAlignment = Alignment.Center) {
        Card(Modifier.width(282.dp).clickable { }, shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(Color.White)) {
            Column(Modifier.padding(vertical = 10.dp)) {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 5.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    listOf("👍", "❤️", "😂", "😮", "🙏", "+").forEach { Text(it, fontSize = 20.sp) }
                }
                MessageAction(GlyphType.Back, "Reply", dismiss)
                MessageAction(GlyphType.Copy, "Copy") { clipboard.setText(AnnotatedString(message.content)); dismiss() }
                MessageAction(GlyphType.Forward, "Forward", dismiss)
                MessageAction(GlyphType.Star, "Star", dismiss)
                MessageAction(GlyphType.Select, "Select", dismiss)
                Spacer(Modifier.height(1.dp).fillMaxWidth().background(Color(0xFFE9E7EB)))
                MessageAction(GlyphType.Report, "Report", dismiss)
                if (mine) MessageAction(GlyphType.Delete, "Delete", dismiss)
            }
        }
    }
}

@Composable
private fun MessageAction(glyph: GlyphType, label: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 18.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Glyph(glyph, Color(0xFF27212D)); Spacer(Modifier.width(16.dp)); Text(label, fontSize = 15.sp)
    }
}

@Composable
private fun ChatMenu(expanded: Boolean, dismiss: () -> Unit) {
    DropdownMenu(expanded, dismiss) {
        DropdownMenuItem({ Text("Mark as read") }, dismiss)
        DropdownMenuItem({ Text("Pin chat") }, dismiss)
        DropdownMenuItem({ Text("Mute notifications") }, dismiss)
    }
}

@Composable private fun GlyphButton(glyph: GlyphType, description: String, onClick: () -> Unit) = GlyphButton(glyph, description, 40.dp, onClick)
@Composable private fun GlyphButton(glyph: GlyphType, description: String, size: Dp, onClick: () -> Unit) {
    Box(
        Modifier
            .width(size)
            .height(size)
            .clip(CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) { Glyph(glyph, Muted) }
}
@Composable
private fun CircleGlyphButton(glyph: GlyphType, description: String, background: Color, iconColor: Color, onClick: () -> Unit) {
    Box(
        Modifier
            .width(48.dp)
            .height(48.dp)
            .clip(CircleShape)
            .background(background)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) { Glyph(glyph, iconColor) }
}
@Composable private fun Glyph(glyph: GlyphType, color: Color) { Canvas(Modifier.width(22.dp).height(22.dp)) { drawGlyph(glyph, color) } }
private enum class GlyphType { Back, Menu, NewChat, Search, Chevron, More, Add, Emoji, Mic, Agent, Send, Close, Copy, Forward, Star, Select, Report, Delete }
private fun DrawScope.drawGlyph(type: GlyphType, color: Color) {
    val s = Stroke(size.width * .1f); val m = size.width / 2
    when (type) {
        GlyphType.Back -> { drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.72f,size.height*.15f), androidx.compose.ui.geometry.Offset(size.width*.25f,m),s.width); drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.25f,m), androidx.compose.ui.geometry.Offset(size.width*.72f,size.height*.85f),s.width) }
        GlyphType.Menu -> repeat(3) { i -> drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.15f,size.height*(.22f+i*.28f)), androidx.compose.ui.geometry.Offset(size.width*.85f,size.height*(.22f+i*.28f)),s.width) }
        GlyphType.More -> repeat(3) { i -> drawCircle(color,size.width*.08f,androidx.compose.ui.geometry.Offset(m,size.height*(.2f+i*.3f))) }
        GlyphType.NewChat -> { drawRect(color, androidx.compose.ui.geometry.Offset(size.width*.16f,size.height*.16f), androidx.compose.ui.geometry.Size(size.width*.55f,size.height*.55f), style=s); drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.72f,size.height*.72f),androidx.compose.ui.geometry.Offset(size.width*.94f,size.height*.94f),s.width) }
        GlyphType.Search -> { drawCircle(color,size.width*.28f,androidx.compose.ui.geometry.Offset(size.width*.42f,size.height*.42f),style=s); drawLine(color,androidx.compose.ui.geometry.Offset(size.width*.63f,size.height*.63f),androidx.compose.ui.geometry.Offset(size.width*.9f,size.height*.9f),s.width) }
        GlyphType.Chevron -> { drawLine(color,androidx.compose.ui.geometry.Offset(size.width*.34f,size.height*.25f),androidx.compose.ui.geometry.Offset(size.width*.66f,m),s.width); drawLine(color,androidx.compose.ui.geometry.Offset(size.width*.66f,m),androidx.compose.ui.geometry.Offset(size.width*.34f,size.height*.75f),s.width) }
        GlyphType.Add -> { drawLine(color,androidx.compose.ui.geometry.Offset(m,size.height*.18f),androidx.compose.ui.geometry.Offset(m,size.height*.82f),s.width); drawLine(color,androidx.compose.ui.geometry.Offset(size.width*.18f,m),androidx.compose.ui.geometry.Offset(size.width*.82f,m),s.width) }
        GlyphType.Emoji -> { drawCircle(color,size.width*.38f,style=s); drawCircle(color,size.width*.05f,androidx.compose.ui.geometry.Offset(size.width*.37f,size.height*.4f)); drawCircle(color,size.width*.05f,androidx.compose.ui.geometry.Offset(size.width*.63f,size.height*.4f)); drawArc(color,20f,140f,false,androidx.compose.ui.geometry.Offset(size.width*.3f,size.height*.38f),androidx.compose.ui.geometry.Size(size.width*.4f,size.height*.38f),style=s) }
        GlyphType.Mic -> { drawRoundRect(color,androidx.compose.ui.geometry.Offset(size.width*.35f,size.height*.1f),androidx.compose.ui.geometry.Size(size.width*.3f,size.height*.48f),androidx.compose.ui.geometry.CornerRadius(8f,8f),style=s); drawArc(color,0f,180f,false,androidx.compose.ui.geometry.Offset(size.width*.23f,size.height*.34f),androidx.compose.ui.geometry.Size(size.width*.54f,size.height*.42f),style=s); drawLine(color,androidx.compose.ui.geometry.Offset(m,size.height*.76f),androidx.compose.ui.geometry.Offset(m,size.height*.94f),s.width); drawLine(color,androidx.compose.ui.geometry.Offset(size.width*.35f,size.height*.94f),androidx.compose.ui.geometry.Offset(size.width*.65f,size.height*.94f),s.width) }
        GlyphType.Agent -> { drawRoundRect(color,cornerRadius=androidx.compose.ui.geometry.CornerRadius(5f,5f),style=s); drawCircle(color,size.width*.08f,androidx.compose.ui.geometry.Offset(size.width*.35f,size.height*.48f)); drawCircle(color,size.width*.08f,androidx.compose.ui.geometry.Offset(size.width*.65f,size.height*.48f)) }
        GlyphType.Send -> drawPath(Path().apply {
            moveTo(size.width * .1f, size.height * .15f)
            lineTo(size.width * .9f, size.height * .48f)
            lineTo(size.width * .1f, size.height * .82f)
            lineTo(size.width * .29f, size.height * .55f)
            lineTo(size.width * .57f, size.height * .48f)
            lineTo(size.width * .29f, size.height * .41f)
            close()
        }, color)
        GlyphType.Close -> { drawLine(color,androidx.compose.ui.geometry.Offset(size.width*.2f,size.height*.2f),androidx.compose.ui.geometry.Offset(size.width*.8f,size.height*.8f),s.width); drawLine(color,androidx.compose.ui.geometry.Offset(size.width*.8f,size.height*.2f),androidx.compose.ui.geometry.Offset(size.width*.2f,size.height*.8f),s.width) }
        GlyphType.Copy -> { drawRect(color, androidx.compose.ui.geometry.Offset(size.width*.3f,size.height*.15f), androidx.compose.ui.geometry.Size(size.width*.5f,size.height*.58f),style=s); drawRect(color, androidx.compose.ui.geometry.Offset(size.width*.15f,size.height*.3f), androidx.compose.ui.geometry.Size(size.width*.5f,size.height*.58f),style=s) }
        GlyphType.Forward -> { drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.12f,m), androidx.compose.ui.geometry.Offset(size.width*.82f,m), s.width); drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.57f,size.height*.22f), androidx.compose.ui.geometry.Offset(size.width*.85f,m), s.width); drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.85f,m), androidx.compose.ui.geometry.Offset(size.width*.57f,size.height*.78f), s.width) }
        GlyphType.Star -> drawPath(Path().apply { moveTo(m,size.height*.1f); lineTo(size.width*.61f,size.height*.38f); lineTo(size.width*.92f,size.height*.4f); lineTo(size.width*.68f,size.height*.6f); lineTo(size.width*.76f,size.height*.9f); lineTo(m,size.height*.72f); lineTo(size.width*.24f,size.height*.9f); lineTo(size.width*.32f,size.height*.6f); lineTo(size.width*.08f,size.height*.4f); lineTo(size.width*.39f,size.height*.38f); close() }, color, style=s)
        GlyphType.Select -> { drawRect(color, androidx.compose.ui.geometry.Offset(size.width*.16f,size.height*.16f), androidx.compose.ui.geometry.Size(size.width*.68f,size.height*.68f), style=s); drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.3f,m), androidx.compose.ui.geometry.Offset(size.width*.45f,size.height*.68f),s.width); drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.45f,size.height*.68f), androidx.compose.ui.geometry.Offset(size.width*.73f,size.height*.32f),s.width) }
        GlyphType.Report -> { drawRoundRect(color, androidx.compose.ui.geometry.Offset(size.width*.16f,size.height*.16f), androidx.compose.ui.geometry.Size(size.width*.68f,size.height*.56f), androidx.compose.ui.geometry.CornerRadius(4f,4f),style=s); drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.4f,size.height*.74f), androidx.compose.ui.geometry.Offset(size.width*.55f,size.height*.6f),s.width); drawLine(color, androidx.compose.ui.geometry.Offset(m,size.height*.28f), androidx.compose.ui.geometry.Offset(m,size.height*.47f),s.width); drawCircle(color,size.width*.045f,androidx.compose.ui.geometry.Offset(m,size.height*.57f)) }
        GlyphType.Delete -> { drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.18f,size.height*.25f), androidx.compose.ui.geometry.Offset(size.width*.82f,size.height*.25f),s.width); drawRect(color, androidx.compose.ui.geometry.Offset(size.width*.28f,size.height*.25f), androidx.compose.ui.geometry.Size(size.width*.44f,size.height*.62f),style=s); drawLine(color, androidx.compose.ui.geometry.Offset(size.width*.4f,size.height*.13f), androidx.compose.ui.geometry.Offset(size.width*.6f,size.height*.13f),s.width) }
    }
}
private fun time(value: String): String {
    val normalized = value.replace(Regex("Z$"), "+0000").replace(Regex("([+-]\\d{2}):(\\d{2})$"), "\$1\$2")
    val date = listOf("yyyy-MM-dd'T'HH:mm:ss.SSSZ", "yyyy-MM-dd'T'HH:mm:ssZ").firstNotNullOfOrNull { pattern ->
        runCatching { SimpleDateFormat(pattern, Locale.US).parse(normalized) }.getOrNull()
    } ?: return value.substringAfter('T').take(5).ifBlank { value.takeLast(5) }
    return SimpleDateFormat("hh:mm a", Locale.US).apply { timeZone = TimeZone.getTimeZone("Asia/Kolkata") }.format(date)
}
private fun mediaPermissions(): Array<String> = buildList { add(Manifest.permission.CAMERA); if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { add(Manifest.permission.READ_MEDIA_IMAGES); add(Manifest.permission.READ_MEDIA_VIDEO) } else add(Manifest.permission.READ_EXTERNAL_STORAGE) }.toTypedArray()
@Composable private fun ErrorText(text: String) { Text(text, color = Color(0xFFB42318), fontSize = 13.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }
