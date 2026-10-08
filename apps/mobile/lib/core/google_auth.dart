import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'api_client.dart';

class RiveraGoogleAuth {
  static const apiKey = String.fromEnvironment('FIREBASE_API_KEY_ANDROID');
  static const appId = String.fromEnvironment('FIREBASE_APP_ID_ANDROID');
  static const senderId =
      String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const webClientId = String.fromEnvironment('GOOGLE_CLIENT_ID_WEB');
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;
    if (Firebase.apps.isEmpty) {
      final hasDartDefines = apiKey.isNotEmpty &&
          appId.isNotEmpty &&
          senderId.isNotEmpty &&
          projectId.isNotEmpty;
      if (hasDartDefines) {
        await Firebase.initializeApp(
          options: const FirebaseOptions(
            apiKey: apiKey,
            appId: appId,
            messagingSenderId: senderId,
            projectId: projectId,
          ),
        );
      } else {
        // Android reads the generated resources from google-services.json.
        await Firebase.initializeApp();
      }
    }
    await GoogleSignIn.instance.initialize(
      serverClientId: webClientId.isEmpty ? null : webClientId,
    );
    _initialized = true;
  }

  static Future<String> signIn() async {
    try {
      await initialize();
    } catch (_) {
      throw const ApiException(
        'Google sign-in is not configured for this Rivera app build.',
        code: 'GOOGLE_AUTH_UNAVAILABLE',
      );
    }
    try {
      final account = await _authenticateWithRecovery();
      final google = account.authentication;
      final credential = GoogleAuthProvider.credential(idToken: google.idToken);
      final firebase =
          await FirebaseAuth.instance.signInWithCredential(credential);
      final token = await firebase.user?.getIdToken(true);
      if (token == null) {
        throw const ApiException(
          'Google could not complete sign-in. Please try again.',
          code: 'GOOGLE_AUTH_FAILED',
        );
      }
      return token;
    } on GoogleSignInException catch (error) {
      if (kDebugMode) {
        debugPrint(
          'Rivera Google sign-in failed: ${error.code} ${error.description}',
        );
      }
      if (error.code == GoogleSignInExceptionCode.canceled &&
          !(error.description ?? '').toLowerCase().contains('reauth')) {
        throw const ApiException(
          'Google sign-in was cancelled.',
          code: 'GOOGLE_AUTH_CANCELLED',
        );
      }
      throw const ApiException(
        'Google could not verify this device account. Check Google Play Services and try again.',
        code: 'GOOGLE_AUTH_FAILED',
      );
    } on FirebaseAuthException catch (error) {
      if (kDebugMode) {
        debugPrint('Rivera Firebase sign-in failed: ${error.code}');
      }
      throw const ApiException(
        'Google authentication could not be completed. Please try again.',
        code: 'GOOGLE_AUTH_FAILED',
      );
    }
  }

  static Future<GoogleSignInAccount> _authenticateWithRecovery() async {
    try {
      return await GoogleSignIn.instance.authenticate();
    } on GoogleSignInException catch (error) {
      final staleCredential =
          error.code == GoogleSignInExceptionCode.canceled &&
              (error.description ?? '').toLowerCase().contains('reauth');
      if (!staleCredential) rethrow;

      // Android Credential Manager can retain a stale account grant after an
      // app-signing certificate changes. Clear it once and reopen the chooser.
      await GoogleSignIn.instance.signOut();
      return GoogleSignIn.instance.authenticate();
    }
  }
}
