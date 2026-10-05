# Rivera mobile development

Google sign-in uses Firebase Authentication on the device and Rivera's API for account creation, activation and sessions.

Enable **Google** in Firebase Authentication, register Android package `com.paulmbugua.rivera`, and add the debug and release SHA-1/SHA-256 certificate fingerprints. Download its `google-services.json` into `apps/mobile/android/app/google-services.json`. The package in that file must exactly match `com.paulmbugua.rivera`.

For an Android build configured with that JSON file, run:

```powershell
adb reverse tcp:4000 tcp:4000
flutter run --dart-define=API_URL=http://127.0.0.1:4000/api/v1
```

The explicit Firebase values remain available as a CI fallback when a build environment supplies configuration without a JSON file:

```powershell
flutter run --dart-define=API_URL=http://127.0.0.1:4000/api/v1 `
  --dart-define=FIREBASE_API_KEY_ANDROID=YOUR_API_KEY `
  --dart-define=FIREBASE_APP_ID_ANDROID=YOUR_APP_ID `
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID `
  --dart-define=FIREBASE_PROJECT_ID=YOUR_PROJECT_ID `
  --dart-define=GOOGLE_CLIENT_ID_WEB=YOUR_WEB_CLIENT_ID
```

Never commit Firebase service-account credentials or the Google client secret to this mobile project. `google-services.json` is ignored so each developer can use the intended Firebase environment.
