import 'package:flutter/material.dart';

import '../core/api/techmedia_api.dart';
import '../core/config/app_config.dart';
import '../core/update/app_update_service.dart';
import '../features/auth/login_page.dart';
import '../features/dashboard/dashboard_page.dart';

class TechMediaFlutterApp extends StatefulWidget {
  const TechMediaFlutterApp({super.key});

  @override
  State<TechMediaFlutterApp> createState() => _TechMediaFlutterAppState();
}

class _TechMediaFlutterAppState extends State<TechMediaFlutterApp> {
  final _api = TechMediaApi(AppConfig.apiUrl);
  final _updates = AppUpdateService();
  UserSession? _session;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkForUpdate());
  }

  Future<void> _checkForUpdate() async {
    try {
      final release = await _updates.checkForUpdate();
      if (!mounted || release == null) return;
      await showDialog<void>(
        context: context,
        barrierDismissible: !release.mandatory,
        builder: (context) => _AppUpdateDialog(
          release: release,
          onInstall: () => _installUpdate(release),
        ),
      );
    } on AppUpdateException {
      // A release lookup must never block sign-in or normal app use.
    }
  }

  Future<void> _installUpdate(AppRelease release) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await _updates.downloadAndInstall(release);
    } on AppUpdatePermissionRequired {
      if (!mounted) return;
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
            'Allow TechMedia to install updates, then choose Update again.',
          ),
        ),
      );
    } on AppUpdateException catch (error) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'TechMedia',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF662C90)),
        scaffoldBackgroundColor: const Color(0xFFF9F7FC),
        useMaterial3: true,
      ),
      home: _session == null
          ? LoginPage(
              api: _api,
              onSignedIn: (session) => setState(() => _session = session),
            )
          : DashboardPage(
              api: _api,
              session: _session!,
              onSignOut: () => setState(() => _session = null),
            ),
    );
  }
}

class _AppUpdateDialog extends StatelessWidget {
  const _AppUpdateDialog({required this.release, required this.onInstall});

  final AppRelease release;
  final Future<void> Function() onInstall;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      icon: const Icon(Icons.system_update_alt_rounded),
      title: Text('TechMedia ${release.versionName} is ready'),
      content: Text(
        release.notes.isEmpty
            ? 'Download the latest version now?'
            : release.notes,
      ),
      actions: [
        if (!release.mandatory)
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Later'),
          ),
        FilledButton(
          onPressed: () async {
            await onInstall();
          },
          child: const Text('Update'),
        ),
      ],
    );
  }
}
