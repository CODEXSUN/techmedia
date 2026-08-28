import 'dart:convert';

import 'package:http/http.dart' as http;

class TechMediaApi {
  TechMediaApi(String baseUrl) : _baseUri = Uri.parse(baseUrl);

  final Uri _baseUri;

  Future<ApiHealth> health() async {
    return ApiHealth.fromJson(await _request('/health'));
  }

  Future<UserSession> signIn({
    required String email,
    required String password,
  }) async {
    final data = await _request(
      '/auth/login',
      body: {'email': email, 'password': password},
      method: 'POST',
    );
    return UserSession.fromJson(data);
  }

  Future<UserSession> developmentSignIn() async {
    return UserSession.fromJson(
      await _request('/auth/development/login', method: 'POST'),
    );
  }

  Future<UserProfile> session(String accessToken) async {
    return UserProfile.fromJson(
      await _request('/auth/session', accessToken: accessToken),
    );
  }

  Future<List<CrmJob>> assignedJobs(String accessToken) async {
    final data = await _request(
      '/mobile/crm/jobs',
      accessToken: accessToken,
      query: const {'status': 'active'},
    );
    if (data is! List) {
      throw const TechMediaApiException('Unexpected jobs response.');
    }
    return data.whereType<Map<String, dynamic>>().map(CrmJob.fromJson).toList();
  }

  Future<List<MessagingConversation>> conversations(String accessToken) async {
    final data = await _request(
      '/messaging/conversations',
      accessToken: accessToken,
    );
    if (data is! List) {
      throw const TechMediaApiException('Unexpected conversations response.');
    }
    return data
        .whereType<Map<String, dynamic>>()
        .map(MessagingConversation.fromJson)
        .toList();
  }

  Future<List<MessagingMessage>> messages(
    String accessToken,
    int conversationId,
  ) async {
    final data = await _request(
      '/messaging/conversations/$conversationId/messages',
      accessToken: accessToken,
      query: const {'limit': '100'},
    );
    if (data is! List) {
      throw const TechMediaApiException('Unexpected messages response.');
    }
    return data
        .whereType<Map<String, dynamic>>()
        .map(MessagingMessage.fromJson)
        .toList();
  }

  Future<MessagingMessage> sendMessage({
    required String accessToken,
    required int conversationId,
    required String content,
  }) async {
    return MessagingMessage.fromJson(
      await _request(
        '/messaging/conversations/$conversationId/messages',
        accessToken: accessToken,
        method: 'POST',
        body: {
          'clientMessageId':
              '${DateTime.now().microsecondsSinceEpoch}-$conversationId',
          'content': content,
          'type': 'TEXT',
        },
      ) as Map<String, dynamic>,
    );
  }

  Future<dynamic> _request(
    String path, {
    String? accessToken,
    Map<String, dynamic>? body,
    String method = 'GET',
    Map<String, String>? query,
  }) async {
    final request = http.Request(
      method,
      _baseUri.replace(path: '${_baseUri.path}$path', queryParameters: query),
    );
    request.headers['Accept'] = 'application/json';
    if (accessToken != null) {
      request.headers['Authorization'] = 'Bearer $accessToken';
    }
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    final response = await request.send();
    final payload = jsonDecode(
      utf8.decode(await response.stream.toBytes()),
    ) as Map<String, dynamic>;
    if (payload['success'] != true || response.statusCode >= 400) {
      final error = payload['error'] as Map<String, dynamic>?;
      throw TechMediaApiException(
        error?['message'] as String? ?? 'Request failed.',
      );
    }
    return payload['data'];
  }
}

class ApiHealth {
  const ApiHealth({required this.isHealthy});

  final bool isHealthy;

  factory ApiHealth.fromJson(Map<String, dynamic> json) {
    return ApiHealth(isHealthy: json['status'] == 'ok');
  }
}

class UserSession {
  const UserSession({required this.accessToken, required this.profile});

  final String accessToken;
  final UserProfile profile;

  factory UserSession.fromJson(Map<String, dynamic> json) {
    return UserSession(
      accessToken: json['accessToken'] as String,
      profile: UserProfile.fromJson(json),
    );
  }
}

class UserProfile {
  const UserProfile({
    required this.email,
    required this.name,
    required this.role,
  });

  final String email;
  final String name;
  final String role;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      email: json['email'] as String,
      name: json['name'] as String? ?? json['email'] as String,
      role: json['role'] as String? ?? 'user',
    );
  }
}

class TechMediaApiException implements Exception {
  const TechMediaApiException(this.message);

  final String message;
}

class CrmJob {
  const CrmJob({
    required this.id,
    required this.number,
    required this.title,
    required this.customer,
    required this.list,
    required this.dueDate,
    required this.createdBy,
    required this.createdAt,
    required this.lastAction,
    required this.status,
    required this.priority,
  });

  final int id;
  final String number;
  final String title;
  final String customer;
  final String list;
  final String dueDate;
  final String createdBy;
  final DateTime createdAt;
  final String lastAction;
  final String status;
  final String priority;

  factory CrmJob.fromJson(Map<String, dynamic> json) {
    final comments = (json['messages'] as List? ?? [])
        .whereType<Map<String, dynamic>>()
        .toList();
    final schedule = (json['schedules'] as List? ?? [])
        .whereType<Map<String, dynamic>>()
        .toList();
    final customerName = json['customerName'] as String? ?? '';
    final sourceId = json['frappeName'] as String? ?? json['id'].toString();
    return CrmJob(
      id: json['id'] as int,
      number: sourceId.replaceAll(RegExp(r'[^0-9]'), ''),
      title: json['title'] as String? ?? 'Untitled enquiry',
      customer: customerName.isNotEmpty
          ? customerName
          : json['customer'] as String? ?? 'Customer',
      list: json['enquiryGroup'] as String? ?? 'General',
      dueDate: _dateLabel(
        schedule.isEmpty ? null : schedule.first['scheduledOn'] as String?,
      ),
      createdBy:
          (json['createdBy'] as Map<String, dynamic>?)?['name'] as String? ??
          'Tech Media',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      lastAction: comments.isEmpty
          ? 'No recent activity'
          : comments.last['comment'] as String? ?? 'No recent activity',
      status: json['status'] as String? ?? 'open',
      priority: json['priority'] as String? ?? 'normal',
    );
  }
}

class MessagingConversation {
  const MessagingConversation({
    required this.id,
    required this.title,
    required this.preview,
    required this.updatedAt,
    required this.unreadCount,
  });

  final int id;
  final String title;
  final String preview;
  final DateTime updatedAt;
  final int unreadCount;

  factory MessagingConversation.fromJson(Map<String, dynamic> json) {
    final last = json['lastMessage'] as Map<String, dynamic>?;
    final members = (json['members'] as List? ?? [])
        .whereType<Map<String, dynamic>>()
        .toList();
    return MessagingConversation(
      id: json['id'] as int,
      title:
          json['title'] as String? ??
          (members.isEmpty
              ? 'Conversation'
              : members.first['userName'] as String? ?? 'Conversation'),
      preview: last?['content'] as String? ?? 'No messages yet',
      updatedAt:
          DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.now(),
      unreadCount: json['unreadCount'] as int? ?? 0,
    );
  }
}

class MessagingMessage {
  const MessagingMessage({
    required this.id,
    required this.senderName,
    required this.senderEmail,
    required this.content,
    required this.createdAt,
    required this.status,
  });

  final int id;
  final String senderName;
  final String senderEmail;
  final String content;
  final DateTime createdAt;
  final String status;

  factory MessagingMessage.fromJson(Map<String, dynamic> json) =>
      MessagingMessage(
        id: json['id'] as int,
        senderName: json['senderName'] as String? ?? 'User',
        senderEmail: json['senderEmail'] as String? ?? '',
        content: json['content'] as String? ?? '',
        createdAt:
            DateTime.tryParse(json['createdAt'] as String? ?? '') ??
            DateTime.now(),
        status: json['status'] as String? ?? 'SENT',
      );
}

String _dateLabel(String? value) {
  if (value == null || value.isEmpty) return 'Not scheduled';
  final date = DateTime.tryParse(value);
  if (date == null) return value;
  return '${date.day.toString().padLeft(2, '0')} ${_months[date.month - 1]}';
}

const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
