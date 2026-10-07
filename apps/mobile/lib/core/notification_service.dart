import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'api_client.dart';

const _channel = AndroidNotificationChannel(
  'rivera_activity',
  'Rivera activity',
  description:
      'Campaigns, applications, messages, deliverables, payments and account updates.',
  importance: Importance.max,
  playSound: true,
  enableVibration: true,
  showBadge: true,
);

@pragma('vm:entry-point')
Future<void> riveraFirebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  if (Firebase.apps.isEmpty) await Firebase.initializeApp();
}

class RiveraNotifications {
  RiveraNotifications._();
  static final instance = RiveraNotifications._();

  final local = FlutterLocalNotificationsPlugin();
  StreamSubscription<String>? _tokenSubscription;
  ApiClient? _api;
  void Function(Map<String, dynamic> data)? _onTap;
  bool _initialized = false;

  Future<void> initialize({
    required void Function(Map<String, dynamic> data) onTap,
  }) async {
    _onTap = onTap;
    if (_initialized) return;
    FirebaseMessaging.onBackgroundMessage(
      riveraFirebaseMessagingBackgroundHandler,
    );

    await local.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('ic_stat_rivera'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload == null || payload.isEmpty) return;
        try {
          _onTap?.call(Map<String, dynamic>.from(jsonDecode(payload)));
        } catch (_) {
          _onTap?.call(const {'route': '/notifications'});
        }
      },
    );

    if (Platform.isAndroid) {
      await local
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);
    }

    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen(_showForeground);
    FirebaseMessaging.onMessageOpenedApp.listen(
      (message) => _onTap?.call(message.data),
    );
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      Future<void>.delayed(
        const Duration(milliseconds: 750),
        () => _onTap?.call(initial.data),
      );
    }
    _initialized = true;
  }

  Future<void> register(ApiClient api) async {
    try {
      _api = api;
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _registerToken(token);
      await _tokenSubscription?.cancel();
      _tokenSubscription = FirebaseMessaging.instance.onTokenRefresh.listen(
        _registerToken,
      );
    } catch (error) {
      if (kDebugMode) debugPrint('Rivera push setup failed: $error');
    }
  }

  Future<void> unregister() async {
    final api = _api;
    final token = await FirebaseMessaging.instance.getToken();
    if (api != null && token != null) {
      try {
        await api.delete('/notifications/devices', {'token': token});
      } catch (_) {
        // Logout should still complete if the device is temporarily offline.
      }
    }
    await _tokenSubscription?.cancel();
    _tokenSubscription = null;
    _api = null;
  }

  Future<void> _registerToken(String token) async {
    final api = _api;
    if (api == null) return;
    try {
      await api.post('/notifications/devices', {
        'token': token,
        'platform': Platform.isIOS ? 'IOS' : 'ANDROID',
        'deviceName': '${Platform.operatingSystem} ${Platform.operatingSystemVersion}'
            .replaceAll(RegExp(r'\s+'), ' ')
            .trim(),
      });
    } catch (error) {
      if (kDebugMode) debugPrint('Rivera push registration failed: $error');
    }
  }

  Future<void> _showForeground(RemoteMessage message) async {
    final title = message.notification?.title ?? message.data['title']?.toString();
    final body = message.notification?.body ?? message.data['body']?.toString();
    if (title == null && body == null) return;
    await local.show(
      id: message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch,
      title: title ?? 'Rivera',
      body: body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'rivera_activity',
          'Rivera activity',
          channelDescription:
              'Campaigns, applications, messages, deliverables, payments and account updates.',
          importance: Importance.max,
          priority: Priority.high,
          icon: 'ic_stat_rivera',
          color: Color(0xFFCDEA74),
          playSound: true,
          enableVibration: true,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: jsonEncode(message.data),
    );
  }
}
