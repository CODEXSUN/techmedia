import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../api/techmedia_api.dart';
import '../config/app_config.dart';

class LiveMessageNotifications extends ChangeNotifier {
  LiveMessageNotifications({required this.api, required this.session});

  final TechMediaApi api;
  final UserSession session;

  WebSocketChannel? _channel;
  Timer? _reconnectTimer;
  var _closed = false;
  var _authenticated = false;
  var _eventId = 0;
  var _conversationIds = <int>[];
  int _unreadCount = 0;

  int get unreadCount => _unreadCount;

  Future<void> start() async {
    await refresh();
    await _connect();
  }

  Future<void> refresh() async {
    try {
      final conversations = await api.conversations(
        accessToken: session.accessToken,
        currentEmail: session.profile.email,
      );
      _conversationIds = conversations.map((item) => item.id).toList();
      final count = conversations.fold<int>(
        0,
        (total, item) => total + item.unreadCount,
      );
      if (_unreadCount != count) {
        _unreadCount = count;
        notifyListeners();
      }
      if (_authenticated) _subscribeToConversations();
    } on Exception {
      // Keep the last confirmed count until the API becomes available again.
    }
  }

  Future<void> _connect() async {
    if (_closed) return;
    try {
      final channel = WebSocketChannel.connect(_webSocketUri());
      _channel = channel;
      await channel.ready;
      channel.stream.listen(
        _receive,
        onDone: _reconnect,
        onError: (_) => _reconnect(),
        cancelOnError: true,
      );
      _send('auth', {'token': session.accessToken});
    } catch (_) {
      _reconnect();
    }
  }

  void _receive(Object? raw) {
    final envelope = _decode(raw);
    if (envelope == null) return;
    final eventType = envelope['eventType'];
    if (eventType == 'auth.success') {
      _authenticated = true;
      _subscribeToConversations();
      return;
    }
    if (eventType == 'message.created' || eventType == 'message.updated') {
      unawaited(refresh());
    }
  }

  void _subscribeToConversations() {
    for (final conversationId in _conversationIds) {
      _send('conversation.subscribe', {'conversationId': conversationId});
    }
  }

  void _send(String eventType, Map<String, Object> payload) {
    _eventId += 1;
    _channel?.sink.add(
      jsonEncode({
        'eventId': 'mobile-$_eventId',
        'eventType': eventType,
        'payload': payload,
      }),
    );
  }

  void _reconnect() {
    if (_closed || _reconnectTimer?.isActive == true) return;
    _authenticated = false;
    _channel = null;
    _reconnectTimer = Timer(const Duration(seconds: 2), _connect);
  }

  @override
  void dispose() {
    _closed = true;
    _reconnectTimer?.cancel();
    unawaited(_channel?.sink.close());
    super.dispose();
  }
}

Uri _webSocketUri() {
  final api = Uri.parse(AppConfig.apiUrl);
  return api.replace(
    scheme: api.scheme == 'https' ? 'wss' : 'ws',
    path: '${api.path.replaceFirst(RegExp(r'/$'), '')}/ws/messaging',
  );
}

Map<String, dynamic>? _decode(Object? raw) {
  if (raw is! String) return null;
  try {
    return jsonDecode(raw) as Map<String, dynamic>;
  } on FormatException {
    return null;
  }
}
