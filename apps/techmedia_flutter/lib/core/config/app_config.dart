class AppConfig {
  const AppConfig._();

  static const brandName = String.fromEnvironment(
    'TECHMEDIA_APP_BRAND',
    defaultValue: 'Tech Media',
  );

  static const appVersion = String.fromEnvironment(
    'TECHMEDIA_APP_VERSION',
    defaultValue: '1.0.99',
  );

  static const apiUrl = String.fromEnvironment(
    'TECHMEDIA_API_URL',
    defaultValue: 'https://app.techmedia.in/api/platform',
  );

  static const releaseManifestUrl = String.fromEnvironment(
    'TECHMEDIA_RELEASE_MANIFEST_URL',
    defaultValue: 'https://app.techmedia.in/mobile/update/latest.json',
  );
}
