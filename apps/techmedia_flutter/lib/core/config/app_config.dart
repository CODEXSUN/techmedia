class AppConfig {
  const AppConfig._();

  static const appVersion = String.fromEnvironment(
    'TECHMEDIA_APP_VERSION',
    defaultValue: '1.0.49',
  );

  static const apiUrl = String.fromEnvironment(
    'TECHMEDIA_API_URL',
    defaultValue: 'https://app.techmedia.in/api/platform',
  );

  static const releaseManifestUrl = String.fromEnvironment(
    'TECHMEDIA_RELEASE_MANIFEST_URL',
    defaultValue:
        'https://app.techmedia.in/api/platform/mobile/release/latest.json',
  );

  static const developmentAutoLogin = bool.fromEnvironment(
    'TECHMEDIA_DEVELOPMENT_AUTO_LOGIN',
    defaultValue: false,
  );

  static bool get canAutoLoginForDevelopment {
    final host = Uri.parse(apiUrl).host;
    return developmentAutoLogin &&
        (host == '10.0.2.2' || host == '127.0.0.1' || host == 'localhost');
  }
}
