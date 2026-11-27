import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://bmbookingapi.possibletechplc.com/api',
);

class Session {
  static String? token;
  static Map<String, dynamic>? user;

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString('auth_token');
    final raw = prefs.getString('user_data');
    if (raw != null) {
      try {
        user = jsonDecode(raw) as Map<String, dynamic>;
      } catch (_) {
        user = null;
      }
    }
  }

  static Future<void> save(String newToken, Map<String, dynamic> newUser) async {
    token = newToken;
    user = newUser;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', newToken);
    await prefs.setString('user_data', jsonEncode(newUser));
  }

  static Future<void> clear() async {
    token = null;
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_data');
  }

  static String get displayName {
    final u = user;
    if (u == null) return 'there';
    return (u['fullName'] ?? u['name'] ?? u['firstName'] ?? 'there').toString();
  }

  static String get role => (user?['role'] ?? 'patient').toString();
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiClient {
  final http.Client _http = http.Client();

  Map<String, String> _headers({bool auth = false}) => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (auth && Session.token != null) 'Authorization': 'Bearer ${Session.token}',
      };

  Future<dynamic> get(String path, {bool auth = true}) async {
    return _request(() => _http.get(Uri.parse('$apiBaseUrl$path'), headers: _headers(auth: auth)));
  }

  Future<dynamic> post(String path, Map<String, dynamic> body, {bool auth = false}) async {
    return _request(() => _http.post(
          Uri.parse('$apiBaseUrl$path'),
          headers: _headers(auth: auth),
          body: jsonEncode(body),
        ));
  }

  Future<dynamic> _request(Future<http.Response> Function() call) async {
    try {
      final response = await call();
      final data = response.body.isEmpty ? null : jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) return data;
      final message = _messageFrom(data) ?? 'Request failed (${response.statusCode})';
      throw ApiException(message, response.statusCode);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Cannot reach the server. Check your connection and try again.');
    }
  }

  String? _messageFrom(dynamic data) {
    if (data is Map) {
      final m = data['message'] ?? data['error'];
      if (m is String && m.isNotEmpty) return m;
      final inner = data['data'];
      if (inner is Map && inner['message'] is String) return inner['message'] as String;
    }
    return null;
  }

  /// The API wraps successful payloads in `{ success: true, data: ... }`.
  static dynamic payload(dynamic response) {
    if (response is Map && response.containsKey('data')) return response['data'];
    return response;
  }

  static Map<String, dynamic>? userFromLogin(dynamic response) {
    final data = payload(response);
    if (data is Map && data['user'] is Map) {
      return Map<String, dynamic>.from(data['user'] as Map);
    }
    return null;
  }

  static String? tokenFromLogin(dynamic response) {
    final data = payload(response);
    if (data is Map && data['token'] != null) return data['token'].toString();
    return null;
  }
}

List<Map<String, dynamic>> asMapList(dynamic value) {
  if (value is List) {
    return value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }
  if (value is Map && value['data'] is List) return asMapList(value['data']);
  return <Map<String, dynamic>>[];
}
