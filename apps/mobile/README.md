# Rivera mobile development

Google sign-in uses Firebase Authentication on the device and Rivera's API for account creation, activation and sessions. The Android application ID must match the Android client in `google-services.json`.

Enable **Google** in Firebase Authentication, register Android package `com.paulmbugua1.rivera`, and add the debug and release SHA-1/SHA-256 certificate fingerprints. Download its `google-services.json` into `apps/mobile/android/app/google-services.json`. The package in that file must exactly match the Gradle `applicationId`.

### Release AAB signing

The release build uses the private upload keystore referenced by `android/key.properties`. Keep both that file and `android/app/rivera-upload-keystore.jks` backed up securely; neither belongs in source control. Release builds fail when signing is not configured instead of silently using the debug key.

Build the Google Play bundle from PowerShell:

```powershell
Set-Location apps/mobile
flutter build appbundle --release --target-platform android-arm64 --no-tree-shake-icons --dart-define=API_URL=https://api.riveracreators.com/api/v1
```

The AAB is written to `apps/mobile/build/app/outputs/bundle/release/app-release.aab`.

On the Flutter 3.47.2 SDK used for this build, Flutter's post-build check reports a missing `libflutter.so.sym` even though the signed AAB is produced and contains the required Flutter engine and app libraries. The resulting AAB was independently validated with bundletool and its JAR signature was verified. If that warning appears, check that the output file exists before rebuilding.

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
