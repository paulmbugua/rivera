import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'api_client.dart';

class RiveraGoogleAuth {
  static const apiKey = String.fromEnvironment('FIREBASE_API_KEY_ANDROID');
  static const appId = String.fromEnvironment('FIREBASE_APP_ID_ANDROID');
  static const senderId =
      String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const webClientId = String.fromEnvironment('GOOGLE_CLIENT_ID_WEB');

  static bool get configured =>
      apiKey.isNotEmpty &&
      appId.isNotEmpty &&
      senderId.isNotEmpty &&
      projectId.isNotEmpty &&
      webClientId.isNotEmpty;

  static Future<void> initialize() async {
    if (!configured || Firebase.apps.isNotEmpty) return;
    await Firebase.initializeApp(
      options: const FirebaseOptions(
        apiKey: apiKey,
        appId: appId,
        messagingSenderId: senderId,
        projectId: projectId,
      ),
    );
    await GoogleSignIn.instance.initialize(serverClientId: webClientId);
  }

  static Future<String> signIn() async {
    if (!configured) {
      throw const ApiException(
        'Google sign-in needs the Firebase development values. See apps/mobile/README.md.',
        code: 'GOOGLE_AUTH_UNAVAILABLE',
      );
    }
    await initialize();
    final account = await GoogleSignIn.instance.authenticate();
    final google = account.authentication;
    final credential = GoogleAuthProvider.credential(idToken: google.idToken);
    final firebase =
        await FirebaseAuth.instance.signInWithCredential(credential);
    final token = await firebase.user?.getIdToken(true);
    if (token == null) {
      throw const ApiException('Google could not complete sign-in.',
          code: 'GOOGLE_AUTH_FAILED');
    }
    return token;
  }
}
