# TechMedia Flutter

Flutter is the only TechMedia mobile client. It communicates through the existing
TechMedia HTTP and WebSocket API contracts.

## Run on Android

Run the Flutter app on an Android emulator or connected device:

```powershell
npm.cmd run dev:mobile -- -d emulator-5554
```

The Flutter client uses `https://app.techmedia.in/api/platform`. The API origin
has no build-time local fallback.

## Build and release

```powershell
npm.cmd run mobile:apk:debug
npm.cmd run mobile:apk:release
npm.cmd run mobile:release
```

Set `FLUTTER_BIN` when `flutter` is not available on `PATH`.

## Current slice

- Native Flutter sign-in UI using `POST /auth/login`.
- Encrypted Android session storage backed by the Android Keystore.
- A 4 to 6 digit local PIN and optional biometric unlock.
- A 10-day inactivity limit before the app requires the full password again.
- A PIN that remains saved until the user resets it or signs out.
- Server session validation after each PIN or biometric unlock.
- Password confirmation before a user can reset the PIN.
- Live CRM, job, notification, and messaging API flows.
- Separate Android application identity: `in.techmedia.techmedia_flutter`.

The app never stores the account password. It stores only the access token, PIN verifier,
account email, biometric preference, and last activity time in encrypted device storage.

See [Mobile Call Log Permission](../../assist/documentation/mobile-call-log-permission.md) before distributing an administrator build that reads device call history.
