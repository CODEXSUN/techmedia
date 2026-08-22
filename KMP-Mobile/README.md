# TechMe Native Mobile

TechMe is the mobile-first Kotlin Multiplatform application for TechMedia. It does not render the
web desk in a WebView. Android uses Jetpack Compose. The `shared` module is the future home for
API, authentication, messaging, offline sync, and iOS-shared business logic.

## Run Android

```powershell
npm.cmd run techme:android:run
```

Use `npm.cmd run techme:emulator` to start only the Android emulator. Use
`npm.cmd run techme:android:build` or `npm.cmd run techme:android:install` when needed.

Use Android Studio to open `mobile-native` as a Gradle project. iOS builds require macOS and Xcode.
