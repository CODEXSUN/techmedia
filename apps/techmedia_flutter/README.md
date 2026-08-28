# TechMedia Flutter

This is a separate Flutter client for TechMedia. It does not import, render, or
share UI code with the Ionic application. It communicates only through the
existing TechMedia HTTP and WebSocket API contracts.

## Run with the local API on Android

Start the TechMedia Node API, then run the Flutter app on the Android emulator:

```powershell
C:\Users\sunda\development\flutter\bin\flutter.bat run -d emulator-5554 --dart-define=TECHMEDIA_API_URL=http://10.0.2.2:7050 --dart-define=TECHMEDIA_DEVELOPMENT_AUTO_LOGIN=true
```

`10.0.2.2` is the Android emulator route to the computer's localhost. The
release default is `https://app.techmedia.in/api/platform`.
Development auto-login is available only for local API addresses and is off by
default, so it cannot activate against the production API.

## Current slice

- Native Flutter sign-in UI using `POST /auth/login`.
- Platform health check using `GET /health`.
- Authenticated dashboard shell, ready for CRM and messaging features.
- Separate Android application identity: `in.techmedia.techmedia_flutter`.
