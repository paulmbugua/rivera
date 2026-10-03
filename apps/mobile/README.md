# Rivera mobile

Flutter client for Rivera’s creator marketplace. It shares the existing NestJS API and PostgreSQL data with the web app and supports Creator, Business, and Admin roles.

## Run locally

Start Rivera’s Docker stack from the repository root, then run the mobile app:

```powershell
docker compose up -d
cd apps\mobile
C:\dev\flutter\bin\flutter.bat pub get
C:\dev\flutter\bin\flutter.bat run --dart-define=API_URL=http://10.0.2.2:4000/api/v1
```

`10.0.2.2` is the Android emulator alias for the Windows host. For a physical phone, use the computer’s LAN address instead:

```powershell
C:\dev\flutter\bin\flutter.bat run --dart-define=API_URL=http://YOUR-PC-IP:4000/api/v1
```

The API must be reachable from the device. Rivera stores its access and refresh cookies in platform secure storage and automatically rotates an expired session through `/auth/refresh`.

## Quality checks

```powershell
C:\dev\flutter\bin\dart.bat format --set-exit-if-changed lib test
C:\dev\flutter\bin\flutter.bat analyze
C:\dev\flutter\bin\flutter.bat test
```
