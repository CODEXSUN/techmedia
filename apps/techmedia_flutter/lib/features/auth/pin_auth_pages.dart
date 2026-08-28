import 'package:flutter/material.dart';

class PinSetupPage extends StatefulWidget {
  const PinSetupPage({
    super.key,
    required this.biometricAvailable,
    required this.onComplete,
    this.isReset = false,
  });

  final bool biometricAvailable;
  final Future<void> Function(String pin, bool useBiometric) onComplete;
  final bool isReset;

  @override
  State<PinSetupPage> createState() => _PinSetupPageState();
}

class _PinSetupPageState extends State<PinSetupPage> {
  final _pin = TextEditingController();
  final _confirmation = TextEditingController();
  bool _useBiometric = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _pin.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!RegExp(r'^\d{4,6}$').hasMatch(_pin.text)) {
      setState(() => _error = 'Use a 4 to 6 digit PIN.');
      return;
    }
    if (_pin.text != _confirmation.text) {
      setState(() => _error = 'The PIN values do not match.');
      return;
    }
    setState(() {
      _error = null;
      _saving = true;
    });
    await widget.onComplete(_pin.text, _useBiometric);
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.isReset ? AppBar(title: const Text('Reset PIN')) : null,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.lock_outline_rounded, size: 52),
                  const SizedBox(height: 18),
                  Text(
                    widget.isReset ? 'Create a new PIN' : 'Secure this device',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Your PIN stays active until you reset it. The app requires your password after 10 inactive days.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  _PinField(controller: _pin, label: 'New PIN'),
                  const SizedBox(height: 14),
                  _PinField(
                    controller: _confirmation,
                    label: 'Confirm PIN',
                    onSubmitted: (_) => _saving ? null : _save(),
                  ),
                  if (widget.biometricAvailable) ...[
                    const SizedBox(height: 10),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _useBiometric,
                      title: const Text('Use biometric unlock'),
                      subtitle: const Text(
                        'Use your fingerprint or device biometric.',
                      ),
                      onChanged: (value) =>
                          setState(() => _useBiometric = value),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: Text(_saving ? 'Saving...' : 'Save PIN'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class PinUnlockPage extends StatefulWidget {
  const PinUnlockPage({
    super.key,
    required this.email,
    required this.biometricEnabled,
    required this.onPin,
    required this.onBiometric,
    required this.onUsePassword,
  });

  final String email;
  final bool biometricEnabled;
  final Future<bool> Function(String pin) onPin;
  final Future<bool> Function() onBiometric;
  final VoidCallback onUsePassword;

  @override
  State<PinUnlockPage> createState() => _PinUnlockPageState();
}

class _PinUnlockPageState extends State<PinUnlockPage> {
  final _pin = TextEditingController();
  bool _checking = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.biometricEnabled) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _useBiometric());
    }
  }

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  Future<void> _unlock() async {
    setState(() {
      _checking = true;
      _error = null;
    });
    final valid = await widget.onPin(_pin.text);
    if (!mounted) return;
    setState(() {
      _checking = false;
      _error = valid ? null : 'Incorrect PIN or expired session.';
    });
  }

  Future<void> _useBiometric() async {
    setState(() => _checking = true);
    final valid = await widget.onBiometric();
    if (!mounted) return;
    setState(() {
      _checking = false;
      if (!valid) _error = 'Biometric unlock was not completed.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.lock_rounded, size: 54),
                  const SizedBox(height: 18),
                  Text(
                    'Unlock TechMedia',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 6),
                  Text(widget.email, textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  _PinField(
                    controller: _pin,
                    label: 'PIN',
                    onSubmitted: (_) => _checking ? null : _unlock(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: _checking ? null : _unlock,
                    child: const Text('Unlock'),
                  ),
                  if (widget.biometricEnabled)
                    TextButton.icon(
                      onPressed: _checking ? null : _useBiometric,
                      icon: const Icon(Icons.fingerprint),
                      label: const Text('Use biometric'),
                    ),
                  TextButton(
                    onPressed: widget.onUsePassword,
                    child: const Text('Use email and password'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class PasswordConfirmationDialog extends StatefulWidget {
  const PasswordConfirmationDialog({super.key, required this.onConfirm});

  final Future<String?> Function(String password) onConfirm;

  @override
  State<PasswordConfirmationDialog> createState() =>
      _PasswordConfirmationDialogState();
}

class _PasswordConfirmationDialogState
    extends State<PasswordConfirmationDialog> {
  final _password = TextEditingController();
  bool _checking = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    setState(() => _checking = true);
    final error = await widget.onConfirm(_password.text);
    if (!mounted) return;
    if (error == null) {
      Navigator.pop(context, true);
      return;
    }
    setState(() {
      _checking = false;
      _error = error;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Confirm your password'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _password,
            obscureText: true,
            autofocus: true,
            onSubmitted: (_) => _checking ? null : _confirm(),
            decoration: const InputDecoration(labelText: 'Password'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _checking ? null : () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _checking ? null : _confirm,
          child: const Text('Continue'),
        ),
      ],
    );
  }
}

class _PinField extends StatelessWidget {
  const _PinField({
    required this.controller,
    required this.label,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String label;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: true,
      keyboardType: TextInputType.number,
      maxLength: 6,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        border: const OutlineInputBorder(),
        labelText: label,
        counterText: '',
      ),
    );
  }
}
