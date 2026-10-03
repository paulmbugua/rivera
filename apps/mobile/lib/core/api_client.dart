import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.status = 0,
    this.code = 'UNKNOWN_ERROR',
  });
  final String message;
  final int status;
  final String code;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({
    this.baseUrl = const String.fromEnvironment(
      'API_URL',
      defaultValue: 'http://10.0.2.2:4000/api/v1',
    ),
  });

  final String baseUrl;
  final _client = http.Client();
  static const _storage = MethodChannel('rivera/secure-session');
  final Map<String, String> _cookies = {};

  Future<void> restoreSession() async {
    String? encoded;
    try {
      encoded = await _storage.invokeMethod<String>('read');
    } on MissingPluginException {
      return;
    }
    if (encoded == null) return;
    final saved = jsonDecode(encoded);
    if (saved is Map) {
      for (final entry in saved.entries) {
        _cookies[entry.key.toString()] = entry.value.toString();
      }
    }
  }

  Future<dynamic> get(String path) => _send('GET', path);
  Future<dynamic> post(String path, [Map<String, dynamic>? body]) =>
      _send('POST', path, body: body);
  Future<dynamic> patch(String path, [Map<String, dynamic>? body]) =>
      _send('PATCH', path, body: body);
  Future<dynamic> delete(String path, [Map<String, dynamic>? body]) =>
      _send('DELETE', path, body: body);

  Future<dynamic> upload(
    String path,
    File file, {
    String field = 'file',
  }) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'));
    request.headers.addAll(_headers(json: false));
    request.files.add(await http.MultipartFile.fromPath(field, file.path));
    try {
      final streamed = await _client.send(request);
      final response = await http.Response.fromStream(streamed);
      await _captureCookies(response.headers['set-cookie']);
      return _decode(response);
    } on SocketException {
      throw const ApiException('Cannot reach Rivera. Check your connection.');
    }
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool retry = true,
  }) async {
    try {
      final request = http.Request(method, Uri.parse('$baseUrl$path'))
        ..headers.addAll(_headers())
        ..body = body == null ? '' : jsonEncode(body);
      final response = await http.Response.fromStream(
        await _client.send(request),
      );
      await _captureCookies(response.headers['set-cookie']);
      if (response.statusCode == 401 &&
          retry &&
          path != '/auth/login' &&
          path != '/auth/refresh') {
        try {
          await _send('POST', '/auth/refresh', retry: false);
          return await _send(method, path, body: body, retry: false);
        } catch (_) {
          await clearSession();
        }
      }
      return _decode(response);
    } on SocketException {
      throw const ApiException('Cannot reach Rivera. Check your connection.');
    } on FormatException {
      throw const ApiException('Rivera returned an unreadable response.');
    }
  }

  Map<String, String> _headers({bool json = true}) => {
        'Accept': 'application/json',
        if (json) 'Content-Type': 'application/json',
        if (_cookies.isNotEmpty)
          'Cookie':
              _cookies.entries.map((e) => '${e.key}=${e.value}').join('; '),
      };

  dynamic _decode(http.Response response) {
    final dynamic data = response.body.trim().isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) return data;
    final map = data is Map ? data : const <String, dynamic>{};
    final rawMessage = map['message'];
    final message = rawMessage is List
        ? rawMessage.join('. ')
        : rawMessage?.toString() ?? 'Something went wrong. Please try again.';
    throw ApiException(
      message,
      status: response.statusCode,
      code: map['code']?.toString() ?? 'UNKNOWN_ERROR',
    );
  }

  Future<void> _captureCookies(String? header) async {
    if (header == null) return;
    for (final name in ['rivera_access', 'rivera_refresh']) {
      final match = RegExp('$name=([^;,]*)').firstMatch(header);
      if (match == null) continue;
      final value = match.group(1) ?? '';
      if (value.isEmpty) {
        _cookies.remove(name);
      } else {
        _cookies[name] = value;
      }
    }
    try {
      await _storage
          .invokeMethod<void>('write', {'value': jsonEncode(_cookies)});
    } on MissingPluginException {
      // Unit tests and unsupported desktop hosts keep the session in memory.
    }
  }

  Future<void> clearSession() async {
    _cookies.clear();
    try {
      await _storage.invokeMethod<void>('delete');
    } on MissingPluginException {
      // Nothing was persisted on this host.
    }
  }

  void dispose() => _client.close();
}
