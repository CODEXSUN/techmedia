# TechMedia Container Deployment

This folder contains the Docker Compose deployment for TechMedia.

## Mobile release storage

The API serves Flutter Android updates from this mounted container path:

`/workspace/techmedia/storage/mobile/release`

Docker stores this path in the named volume `techmedia-mobile-releases` by default.

Set `TECHMEDIA_MOBILE_RELEASES_VOLUME` in `.container/deploy.env` to use another volume name.

The API reads `MOBILE_RELEASE_STORAGE_ROOT`. Docker Compose sets it to the mounted release path.

## Publish a Flutter Android update

1. Update `apps/techmedia_flutter/pubspec.yaml` with a higher version and build number.
2. Build the APK from the repository root.

   ```powershell
   C:\Users\sunda\development\flutter\bin\flutter.bat build apk --release --dart-define=TECHMEDIA_API_URL=https://app.techmedia.in/api/platform --dart-define=TECHMEDIA_APP_VERSION=<version>
   ```

3. Prepare the local portal release files.

   ```powershell
   npm.cmd run flutter:release:portal -- --base-url=https://app.techmedia.in/api/platform
   ```

4. Copy `storage/mobile/release` into the API container release path after the API deployment.
5. Check `https://app.techmedia.in/api/platform/mobile/release/latest.json`.
6. Start an older Android app version and confirm that it shows the update approval dialog.

## Update behavior

The app checks `latest.json` at startup. It downloads the APK only after the user selects Update.
It verifies the SHA-256 value before it starts Android's package installer.

Android always requires user approval to install an update. The app cannot silently install an APK.

## Deployment checks

Before you announce an update, verify these requests through Cloudflare:

```text
GET /api/platform/mobile/release/latest.json  -> 200
GET /api/platform/mobile/release/TechMedia-<version>.apk  -> 200
```

If either request returns 404, deploy the API image that contains the mobile release routes. Then
copy the prepared release files to the mounted release volume.
