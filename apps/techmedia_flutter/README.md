# TechMedia Flutter

This is a separate Flutter client for TechMedia. It does not import, render, or
share UI code with the Ionic application. It communicates only through the
existing TechMedia HTTP and WebSocket API contracts.

## Run on Android

Run the Flutter app on the Android emulator:

```powershell
C:\Users\sunda\development\flutter\bin\flutter.bat run -d emulator-5554
```

The Flutter client always uses `https://app.techmedia.in/api/platform`. The API
origin cannot be replaced by a build-time local fallback.

## Current slice

- Native Flutter sign-in UI using `POST /auth/login`.
- Platform health check using `GET /health`.
- Authenticated dashboard shell, ready for CRM and messaging features.
- Separate Android application identity: `in.techmedia.techmedia_flutter`.
