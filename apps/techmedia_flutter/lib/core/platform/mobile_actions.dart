import 'package:flutter/services.dart';

class MobileActions {
  const MobileActions._();

  static const _channel = MethodChannel(
    'in.techmedia.techmedia_flutter/mobile-actions',
  );

  static Future<bool> call(String mobile) =>
      _invoke('call', {'mobile': mobile});

  static Future<bool> sms(String mobile) => _invoke('sms', {'mobile': mobile});

  static Future<bool> whatsApp(String mobile, {required String message}) =>
      _invoke('whatsApp', {'mobile': mobile, 'message': message});

  static Future<bool> location(String query) =>
      _invoke('location', {'query': query});

  static Future<bool> scanDocument() => _invoke('scanDocument');

  static Future<bool> photo() => _invoke('photo');

  static Future<bool> openAppSettings() => _invoke('openAppSettings');

  static Future<List<Map<String, dynamic>>> callLogs() async {
    final rows = await _channel.invokeListMethod<dynamic>('callLogs') ?? [];
    return rows
        .whereType<Map<dynamic, dynamic>>()
        .map((row) => row.map((key, value) => MapEntry('$key', value)))
        .toList();
  }

  static Future<bool> _invoke(
    String method, [
    Map<String, String>? arguments,
  ]) async {
    return await _channel.invokeMethod<bool>(method, arguments) ?? false;
  }
}
