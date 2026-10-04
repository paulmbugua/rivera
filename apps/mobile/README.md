# Rivera mobile

Flutter client for Rivera’s creator marketplace. It shares the existing NestJS API and PostgreSQL data with the web app and supports Creator, Business, and Admin roles.

## Run locally

Start Rivera’s Docker stack from the repository root. For a USB-connected Android phone, enable **Developer options** and **USB debugging**, accept the authorization prompt on the phone, then use the project helper:

```powershell
docker compose up -d
.\scripts\run-mobile-dev.ps1
```

The helper detects the authorized phone, forwards device ports `4000` and `3000` to the PC with `adb reverse`, installs a debug build, and keeps Flutter and application logs visible in the terminal. While it is running, press `r` for hot reload, `R` for hot restart, and `q` to stop. Most Dart UI changes only need hot reload; native Android configuration and dependency changes require stopping and running the command again.

To select one phone when several devices are attached:

```powershell
adb devices
.\scripts\run-mobile-dev.ps1 -Device YOUR_DEVICE_ID
```

To watch logs without launching a second app instance, use another terminal:

```powershell
flutter logs -d YOUR_DEVICE_ID
```

For the Android emulator, skip USB forwarding and use its Windows-host alias:

```powershell
.\scripts\run-mobile-dev.ps1 -Device emulator-5554 -NoUsbReverse -ApiUrl http://10.0.2.2:4000/api/v1
```

Rivera stores its access and refresh cookies in platform secure storage and automatically rotates an expired session through `/auth/refresh`.

## Quality checks

```powershell
C:\dev\flutter\bin\dart.bat format --set-exit-if-changed lib test
C:\dev\flutter\bin\flutter.bat analyze
C:\dev\flutter\bin\flutter.bat test
```
