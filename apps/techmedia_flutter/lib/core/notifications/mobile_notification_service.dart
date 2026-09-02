import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../api/techmedia_api.dart';

class MobileNotificationService extends ChangeNotifier {
  MobileNotificationService({required this.api, required this.session});

  final TechMediaApi api;
  final UserSession session;
  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  final Set<int> _knownNotificationIds = {};
  Timer? _poller;
  StreamSubscription<RemoteMessage>? _foregroundMessages;
  StreamSubscription<String>? _tokenRefresh;
  var _assignmentCount = 0;

  int get assignmentCount => _assignmentCount;

  Future<void> start() async {
    await _initialize();
    _foregroundMessages = FirebaseMessaging.onMessage.listen(
      _showRemoteMessage,
    );
    await _refresh(isInitial: true);
    _poller = Timer.periodic(
      const Duration(seconds: 20),
      (_) => unawaited(_refresh()),
    );
  }

  Future<void> showChatAlert(int unreadCount) => _show(
    id: 90001,
    title: 'New chat message',
    body: unreadCount == 1
        ? 'You have one unread message.'
        : 'You have $unreadCount unread messages.',
  );

  Future<void> _initialize() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _notifications.initialize(
      const InitializationSettings(android: android),
    );
    final androidPlugin = _notifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await androidPlugin?.requestNotificationsPermission();
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission();
    await _registerDeviceToken(await messaging.getToken());
    _tokenRefresh = messaging.onTokenRefresh.listen(
      (token) => unawaited(_registerDeviceToken(token)),
    );
  }

  Future<void> _registerDeviceToken(String? token) async {
    if (token == null || token.trim().isEmpty) return;
    try {
      await api.registerNotificationDevice(
        accessToken: session.accessToken,
        token: token,
      );
    } on Exception {
      // The next sign-in refreshes the device token if the API was unavailable.
    }
  }

  void _showRemoteMessage(RemoteMessage message) {
    final notification = message.notification;
    final title =
        notification?.title ??
        message.data['title']?.toString() ??
        'Tech Media';
    final body = notification?.body ?? message.data['body']?.toString() ?? '';
    unawaited(_show(id: message.hashCode, title: title, body: body));
  }

  Future<void> _refresh({bool isInitial = false}) async {
    try {
      final items = await api.notifications(session.accessToken);
      final assignments = items
          .where((item) => item.type == 'assignment')
          .toList();
      if (_assignmentCount != assignments.length) {
        _assignmentCount = assignments.length;
        notifyListeners();
      }
      for (final item in items) {
        if (!_knownNotificationIds.add(item.id) || isInitial) continue;
        await _show(id: item.id, title: item.title, body: item.body);
      }
    } on Exception {
      // Preserve the last confirmed state until the API reconnects.
    }
  }

  Future<void> _show({
    required int id,
    required String title,
    required String body,
  }) {
    return _notifications.show(
      id,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'techmedia_activity',
          'TechMedia activity',
          channelDescription: 'Job assignments and chat messages.',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _poller?.cancel();
    _foregroundMessages?.cancel();
    _tokenRefresh?.cancel();
    super.dispose();
  }
}
