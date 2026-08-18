# TechMedia Mobile

TechMedia Mobile is the Capacitor host for the shared TechMedia React application. Mobile-only
code stays in this workspace:

- `src/auth`: encrypted native session persistence.
- `src/runtime`: Capacitor lifecycle, keyboard, status bar, splash, and Android back handling.
- `src/ui`: phone-only controls and safe-area presentation.
- `android` and `ios`: generated native projects owned by this application.

The feature modules, permissions, routes, and API contracts remain owned by `src/platform/web` and
`src/platform/api`. Do not duplicate CRM, HR, Estimate, Quotation, Identity, or Honey modules here.

## Configuration

Set `VITE_MOBILE_API_URL` to the deployed TechMedia API origin and path. Production values must use
HTTPS. The API must allow the native origins through `PLATFORM_WEB_ORIGINS`:

```env
VITE_MOBILE_API_URL=https://app.techmedia.in/api/platform
PLATFORM_WEB_ORIGINS=capacitor://localhost,https://localhost,http://localhost
```

Mobile builds use Capacitor's native HTTP transport. This keeps API requests independent of
WebView CORS restrictions. Keep the native origins configured on the API as a fallback for browser
requests and development tools.

## Commands

Run commands from the repository root:

```powershell
npm.cmd run dev:mobile
npm.cmd run assets:generate --workspace @techmedia/mobile
npm.cmd run mobile:sync
npm.cmd run mobile:android
npm.cmd run mobile:apk:debug
npm.cmd run mobile:apk:release
npm.cmd run mobile:run:android
npm.cmd run mobile:ios
```

`mobile:sync` builds `dist/mobile/web` and copies it into both native projects. Open the Android
project with Android Studio. `mobile:apk:debug` creates
`src/mobile/android/app/build/outputs/apk/debug/app-debug.apk`. `mobile:apk:release` creates the
signed production APK at `src/mobile/android/app/build/outputs/apk/release/app-release.apk`.
Keep the ignored Android keystore and signing properties backed up; later releases must use the
same key. `mobile:run:android` selects a connected Android device or emulator. The iOS project
requires Xcode on macOS for signing and device builds.
