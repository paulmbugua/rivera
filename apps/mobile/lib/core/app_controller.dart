import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api_client.dart';
import 'models.dart';

class AppController extends ChangeNotifier {
  AppController({ApiClient? api}) : api = api ?? ApiClient();
  final ApiClient api;
  static const _preferences = MethodChannel('rivera/preferences');

  RiveraUser? user;
  bool booting = true;
  bool busy = false;
  String? error;
  Map<String, dynamic> profile = {};
  Map<String, dynamic> dashboard = {};
  List<Map<String, dynamic>> campaigns = [];
  List<Map<String, dynamic>> creators = [];
  ThemeMode themeMode = ThemeMode.system;

  Future<void> bootstrap() async {
    await _restoreTheme();
    await api.restoreSession();
    try {
      user = RiveraUser.fromJson(mapOf(await api.get('/auth/me')));
      if (user!.onboardingCompleted || user!.isAdmin) {
        await refreshWorkspace();
      } else {
        await loadPublic();
      }
    } catch (_) {
      user = null;
      await loadPublic();
    } finally {
      booting = false;
      notifyListeners();
    }
  }

  Future<void> _restoreTheme() async {
    try {
      final saved = await _preferences.invokeMethod<String>('readTheme');
      themeMode = switch (saved) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };
    } catch (_) {
      themeMode = ThemeMode.system;
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    themeMode = mode;
    notifyListeners();
    try {
      await _preferences.invokeMethod('writeTheme', mode.name);
    } catch (_) {
      // The preference remains active for this session if native storage fails.
    }
  }

  Future<void> loadPublic() => _run(() async {
        final values = await Future.wait([
          api.get('/campaigns?limit=20'),
          api.get('/creators?limit=20'),
        ]);
        campaigns = itemsOf(values[0]);
        creators = itemsOf(values[1]);
      }, quiet: true);

  Future<void> login(String email, String password) => _run(() async {
        final result = mapOf(
          await api.post('/auth/login', {
            'email': email.trim(),
            'password': password,
          }),
        );
        user = RiveraUser.fromJson(mapOf(result['user']));
        if (user!.onboardingCompleted || user!.isAdmin) {
          await refreshWorkspace();
        } else {
          await loadPublic();
        }
      });

  Future<void> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    required String accountType,
  }) =>
      _run(() async {
        await api.post('/auth/register', {
          'firstName': firstName.trim(),
          'lastName': lastName.trim(),
          'email': email.trim(),
          'password': password,
          'accountType': accountType,
          'termsAccepted': true,
        });
      });

  Future<void> forgotPassword(String email) =>
      _run(() => api.post('/auth/forgot-password', {'email': email.trim()}));

  Future<void> resendVerification(String email) => _run(
        () => api.post('/auth/resend-verification', {'email': email.trim()}),
      );

  Future<void> verifyEmail(String token) =>
      _run(() => api.post('/auth/verify-email', {'token': token.trim()}));

  Future<void> resetPassword(String token, String password) => _run(
        () => api.post('/auth/reset-password', {
          'token': token.trim(),
          'password': password,
        }),
      );

  Future<void> logout() async {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    await api.clearSession();
    user = null;
    dashboard = {};
    profile = {};
    notifyListeners();
  }

  Future<void> refreshWorkspace() => _run(() async {
        if (user == null) return;
        if (user!.isAdmin) {
          dashboard = mapOf(await api.get('/admin/summary'));
        } else {
          final role = user!.isBusiness ? 'business' : 'creator';
          final owner = user!.isBusiness
              ? '/businesses/me/profile'
              : '/creators/me/profile';
          final summaries = await Future.wait([
            api.get(owner),
            api.get('/$role/campaigns/summary/dashboard'),
            api.get(
              user!.isBusiness
                  ? '/business/applications/summary'
                  : '/creators/me/applications/summary',
            ),
            api.get(
              user!.isBusiness
                  ? '/business/workspace-summary'
                  : '/creators/me/workspace-summary',
            ),
          ]);
          profile = mapOf(summaries[0]);
          dashboard = {
            ...mapOf(summaries[1]),
            ...mapOf(summaries[2]),
            ...mapOf(summaries[3]),
          };
        }
        await loadPublic();
      }, quiet: true);

  Future<dynamic> fetch(String path) => api.get(path);
  Future<dynamic> send(
    String method,
    String path, [
    Map<String, dynamic>? body,
  ]) async {
    dynamic result;
    await _run(() async {
      result = switch (method) {
        'PATCH' => await api.patch(path, body),
        'DELETE' => await api.delete(path, body),
        _ => await api.post(path, body),
      };
    });
    return result;
  }

  Future<void> completeOnboarding(Map<String, dynamic> payload) =>
      _run(() async {
        await api.post(
          user!.isBusiness ? '/onboarding/business' : '/onboarding/creator',
          payload,
        );
        user = RiveraUser.fromJson(mapOf(await api.get('/auth/me')));
        await refreshWorkspace();
      });

  Future<void> updateAccount(Map<String, dynamic> payload) => _run(() async {
        user = RiveraUser.fromJson(
          mapOf(await api.patch('/auth/profile', payload)),
        );
      });

  Future<void> changePassword(String currentPassword, String newPassword) =>
      _run(() async {
        await api.post('/auth/change-password', {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
          'confirmPassword': newPassword,
        });
        await api.clearSession();
        user = null;
      });

  Future<void> _run(Future<void> Function() task, {bool quiet = false}) async {
    if (!quiet) busy = true;
    error = null;
    notifyListeners();
    try {
      await task();
    } on ApiException catch (e) {
      error = e.message;
      rethrow;
    } catch (_) {
      error = 'Something went wrong. Please try again.';
      rethrow;
    } finally {
      if (!quiet) busy = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    api.dispose();
    super.dispose();
  }
}
