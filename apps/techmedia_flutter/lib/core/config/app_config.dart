class AppConfig {
  const AppConfig._();

  static const appVersion = String.fromEnvironment(
    'TECHMEDIA_APP_VERSION',
    defaultValue: '1.0.85',
  );

  static const apiUrl = 'https://app.techmedia.in/api/platform';

  static const releaseManifestUrl = String.fromEnvironment(
    'TECHMEDIA_RELEASE_MANIFEST_URL',
    defaultValue:
        'https://app.techmedia.in/api/platform/mobile/release/latest.json',
  );
}
