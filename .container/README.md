# TechMedia Container Deployment

This folder contains the Docker Compose deployment for TechMedia.

## Production endpoints

Use one public origin for the web application, API, mobile client, and WebSocket.

| Consumer | Public endpoint | Container target |
| --- | --- | --- |
| Web application | `https://app.techmedia.in/` | Web port `7060` |
| HTTP API | `https://app.techmedia.in/api/platform` | API port `7050` through the web proxy |
| Messenger WebSocket | `wss://app.techmedia.in/api/platform/ws/messaging` | API port `7050` through the web proxy |
| Flutter release files | `https://app.techmedia.in/api/platform/mobile/release/` | API release storage |

Do not publish the API port directly to the internet. Keep `TECHMEDIA_BIND_ADDRESS=127.0.0.1`.
Route public HTTPS traffic to `TECHMEDIA_WEB_HOST_PORT`.

The Flutter client does not use a separate mobile port. It uses HTTPS port `443` and the public API path.

## WebSocket production setup

The Messenger WebSocket uses the same host and authentication token as the HTTP API.

1. Open the Cloudflare dashboard for `app.techmedia.in`.
2. Open **Network**.
3. Turn on **WebSockets**.
4. Keep the DNS record proxied through Cloudflare.
5. Allow WebSocket upgrades on `/api/platform/ws/messaging` in every upstream proxy.
6. Set the proxy HTTP version to `1.1`.
7. Forward the `Upgrade` and `Connection` headers.
8. Use a proxy read timeout longer than the expected idle period.

Cloudflare returns `404` when it does not forward the upgrade to the origin. A working handshake returns `101 Switching Protocols`.

The current web container sends `/api/platform/*` requests to the API container. Do not add a separate public WebSocket port.

## Required production parameters

Set these deployment values in `.container/deploy.env`:

```dotenv
TECHMEDIA_BIND_ADDRESS=127.0.0.1
TECHMEDIA_API_INTERNAL_PORT=7050
TECHMEDIA_API_HOST_PORT=7050
TECHMEDIA_WEB_HOST_PORT=7060
TECHMEDIA_API_CONTAINER_NAME=techmedia-api
TECHMEDIA_WEB_CONTAINER_NAME=techmedia-web
TECHMEDIA_NETWORK=techmedia-network
```

Set these runtime values in the file named by `TECHMEDIA_RUNTIME_ENV_FILE`:

```dotenv
NODE_ENV=production
DEV_AUTO_LOGIN=0
PLATFORM_API_PORT=7050
PLATFORM_API_URL=https://app.techmedia.in/api/platform
PLATFORM_WEB_PORT=7060
PLATFORM_WEB_ORIGIN=https://app.techmedia.in
PLATFORM_WEB_ORIGINS=https://app.techmedia.in,capacitor://localhost,https://localhost
VITE_PLATFORM_API_URL=/api/platform
VITE_MOBILE_API_URL=https://app.techmedia.in/api/platform
```

Add only the mobile origins that the released clients use. Do not use `*` for authenticated requests.

Also configure the database, Frappe, token, email, and storage values from `.container/.env.example`. Keep all secrets out of Git.

## Production verification

Run these checks after each deployment:

1. Check `https://app.techmedia.in/health` for the web container.
2. Check `https://app.techmedia.in/api/platform/health` for the API container.
3. Check the WebSocket path and require `101 Switching Protocols`.
4. Sign in from the web application and the Flutter application.
5. Send a message from one user and confirm immediate delivery to another user.
6. Add an enquiry comment from mobile and confirm it appears in Frappe and the web CRM.
7. Check the mobile release manifest and APK URLs.

Use an authenticated WebSocket client after the handshake. Send an `auth` event with the access token before subscriptions or messages.

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
   C:\Users\sunda\development\flutter\bin\flutter.bat build apk --release --dart-define=TECHMEDIA_APP_VERSION=<version>
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
