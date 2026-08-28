import 'package:flutter/material.dart';

import '../../core/api/techmedia_api.dart';

const _brandPurple = Color(0xFF662C90);
const _palePurple = Color(0xFFF2E5FA);

class MessageNotificationButton extends StatelessWidget {
  const MessageNotificationButton({
    required this.unreadCount,
    required this.onPressed,
    super.key,
  });

  final int unreadCount;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: 'Messages',
    onPressed: onPressed,
    icon: Badge(
      isLabelVisible: unreadCount > 0,
      label: Text('$unreadCount'),
      child: const CircleAvatar(
        radius: 24,
        backgroundColor: _palePurple,
        foregroundColor: _brandPurple,
        child: Icon(Icons.forum_outlined, size: 25),
      ),
    ),
  );
}

class MessagesPage extends StatefulWidget {
  const MessagesPage({required this.api, required this.session, super.key});
  final TechMediaApi api;
  final UserSession session;

  @override
  State<MessagesPage> createState() => _MessagesPageState();
}

class _MessagesPageState extends State<MessagesPage> {
  late Future<List<MessagingConversation>> _conversations;

  @override
  void initState() {
    super.initState();
    _conversations = widget.api.conversations(widget.session.accessToken);
  }

  Future<void> _reload() async {
    setState(
      () =>
          _conversations = widget.api.conversations(widget.session.accessToken),
    );
    await _conversations;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Messages')),
    body: FutureBuilder<List<MessagingConversation>>(
      future: _conversations,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_off_outlined, size: 30),
                  const SizedBox(height: 12),
                  const Text(
                    'Messages are not available yet.',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Check your connection and try again.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 14),
                  FilledButton.tonal(
                    onPressed: _reload,
                    child: const Text('Retry messages'),
                  ),
                ],
              ),
            ),
          );
        }
        if (!snapshot.hasData)
          return const Center(child: CircularProgressIndicator());
        final conversations = snapshot.data!;
        if (conversations.isEmpty)
          return const Center(child: Text('No conversations yet.'));
        return RefreshIndicator(
          onRefresh: _reload,
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
            itemCount: conversations.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) => _ConversationTile(
              conversation: conversations[index],
              onTap: () => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (context) => _ConversationThread(
                    api: widget.api,
                    session: widget.session,
                    conversation: conversations[index],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    ),
  );
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conversation, required this.onTap});
  final MessagingConversation conversation;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    onTap: onTap,
    contentPadding: const EdgeInsets.symmetric(vertical: 7),
    leading: CircleAvatar(
      backgroundColor: _palePurple,
      foregroundColor: _brandPurple,
      child: Text(
        _initials(conversation.title),
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
    ),
    title: Text(
      conversation.title,
      style: const TextStyle(fontWeight: FontWeight.w800),
    ),
    subtitle: Text(
      conversation.preview,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    ),
    trailing: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          _messageTime(conversation.updatedAt),
          style: Theme.of(context).textTheme.labelSmall,
        ),
        if (conversation.unreadCount > 0) ...[
          const SizedBox(height: 5),
          Badge(label: Text('${conversation.unreadCount}')),
        ],
      ],
    ),
  );
}

class _ConversationThread extends StatefulWidget {
  const _ConversationThread({
    required this.api,
    required this.session,
    required this.conversation,
  });
  final TechMediaApi api;
  final UserSession session;
  final MessagingConversation conversation;

  @override
  State<_ConversationThread> createState() => _ConversationThreadState();
}

class _ConversationThreadState extends State<_ConversationThread> {
  final _composer = TextEditingController();
  late Future<List<MessagingMessage>> _messages;
  var _isSending = false;

  @override
  void initState() {
    super.initState();
    _messages = widget.api.messages(
      widget.session.accessToken,
      widget.conversation.id,
    );
  }

  @override
  void dispose() {
    _composer.dispose();
    super.dispose();
  }

  void _refresh() => setState(() {
    _messages = widget.api.messages(
      widget.session.accessToken,
      widget.conversation.id,
    );
  });

  Future<void> _send() async {
    final content = _composer.text.trim();
    if (content.isEmpty || _isSending) return;
    setState(() => _isSending = true);
    try {
      await widget.api.sendMessage(
        accessToken: widget.session.accessToken,
        conversationId: widget.conversation.id,
        content: content,
      );
      _composer.clear();
      _refresh();
    } on TechMediaApiException catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.conversation.title)),
    body: FutureBuilder<List<MessagingMessage>>(
      future: _messages,
      builder: (context, snapshot) {
        if (snapshot.hasError)
          return Center(
            child: FilledButton.tonal(
              onPressed: _refresh,
              child: const Text('Retry messages'),
            ),
          );
        if (!snapshot.hasData)
          return const Center(child: CircularProgressIndicator());
        final messages = snapshot.data!;
        return ListView.separated(
          reverse: true,
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
          itemCount: messages.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) => _MessageBubble(
            message: messages[messages.length - index - 1],
            mine:
                messages[messages.length - index - 1].senderEmail
                    .toLowerCase() ==
                widget.session.profile.email.toLowerCase(),
          ),
        );
      },
    ),
    bottomNavigationBar: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _composer,
                minLines: 1,
                maxLines: 4,
                decoration: const InputDecoration(
                  hintText: 'Write a message',
                  border: OutlineInputBorder(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _isSending ? null : _send,
              icon: const Icon(Icons.send),
            ),
          ],
        ),
      ),
    ),
  );
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.mine});
  final MessagingMessage message;
  final bool mine;
  @override
  Widget build(BuildContext context) => Align(
    alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
    child: DecoratedBox(
      decoration: BoxDecoration(
        color: mine ? _palePurple : Colors.white,
        borderRadius: BorderRadius.circular(15),
      ),
      child: Padding(
        padding: const EdgeInsets.all(11),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!mine)
              Text(
                message.senderName,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            Text(message.content),
            const SizedBox(height: 3),
            Text(
              _messageTime(message.createdAt),
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
      ),
    ),
  );
}

String _initials(String name) => name
    .split(RegExp(r'\s+'))
    .where((word) => word.isNotEmpty)
    .take(2)
    .map((word) => word[0])
    .join()
    .toUpperCase();
String _messageTime(DateTime value) =>
    '${value.toLocal().hour.toString().padLeft(2, '0')}:${value.toLocal().minute.toString().padLeft(2, '0')}';
