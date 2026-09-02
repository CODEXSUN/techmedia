import 'package:flutter/material.dart';

import '../../core/api/techmedia_api.dart';

class HomeEnquiryFormPage extends StatefulWidget {
  const HomeEnquiryFormPage({
    required this.api,
    required this.session,
    this.initialCustomer = '',
    this.initialMobile = '',
    this.initialMessage = '',
    super.key,
  });

  final TechMediaApi api;
  final UserSession session;
  final String initialCustomer;
  final String initialMobile;
  final String initialMessage;

  @override
  State<HomeEnquiryFormPage> createState() => _HomeEnquiryFormPageState();
}

class _HomeEnquiryFormPageState extends State<HomeEnquiryFormPage> {
  final _customer = TextEditingController();
  final _mobile = TextEditingController();
  final _message = TextEditingController();
  final _messageFocus = FocusNode();
  late Future<CrmCallEnquiryFormData> _formData;
  String? _group;
  String? _assignee;
  String? _customerId;
  var _isSaving = false;
  var _focusRequested = false;
  var _showPreview = true;

  @override
  void initState() {
    super.initState();
    _customer.text = widget.initialCustomer;
    _mobile.text = widget.initialMobile;
    _message.text = widget.initialMessage;
    _formData = _loadFormData();
  }

  @override
  void dispose() {
    _customer.dispose();
    _mobile.dispose();
    _message.dispose();
    _messageFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('New enquiry'),
      actions: [
        IconButton(
          tooltip: _showPreview
              ? 'Hide preview for this session'
              : 'Show preview',
          onPressed: () => setState(() => _showPreview = !_showPreview),
          icon: Icon(
            _showPreview
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined,
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: FilledButton(
            onPressed: _isSaving ? null : _save,
            style: FilledButton.styleFrom(
              visualDensity: VisualDensity.compact,
              backgroundColor: const Color(0xFF4D1F68),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: _isSaving
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save'),
          ),
        ),
      ],
    ),
    body: FutureBuilder<CrmCallEnquiryFormData>(
      future: _formData,
      builder: (context, snapshot) {
        if (snapshot.hasError) return _FormError(onRetry: _reload);
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final formData = snapshot.data!;
        _group ??= formData.groups.firstOrNull?.value;
        _focusMessage();
        final selectedGroup = formData.groups
            .where((group) => group.value == _group)
            .firstOrNull;
        final selectedAssignee = formData.assignees
            .where((user) => user.id == _assignee)
            .firstOrNull;
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          children: [
            if (_showPreview) ...[
              _EnquiryPreview(
                title: _titleFromMessage(_message.text),
                list: selectedGroup?.label ?? 'Choose a list',
                allocated: selectedAssignee?.name ?? 'Not allocated',
              ),
              const SizedBox(height: 16),
            ],
            TextField(
              controller: _mobile,
              keyboardType: TextInputType.phone,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                labelText: 'Phone number',
                suffixIcon: IconButton(
                  tooltip: 'Find contact for this phone number',
                  onPressed: _lookupContact,
                  icon: const Icon(Icons.person_search_outlined),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _customer,
              textCapitalization: TextCapitalization.words,
              onChanged: (_) => setState(() => _customerId = null),
              decoration: const InputDecoration(labelText: 'Customer'),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _group,
              decoration: const InputDecoration(labelText: 'List'),
              items: formData.groups
                  .map(
                    (group) => DropdownMenuItem(
                      value: group.value,
                      child: Text(group.label),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => _group = value),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String?>(
              initialValue: _assignee,
              decoration: const InputDecoration(labelText: 'Allocated'),
              items: [
                const DropdownMenuItem<String?>(
                  value: null,
                  child: Text('Not allocated'),
                ),
                ...formData.assignees.map(
                  (user) => DropdownMenuItem<String?>(
                    value: user.id,
                    child: Text(user.name),
                  ),
                ),
              ],
              onChanged: (value) => setState(() => _assignee = value),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _message,
              focusNode: _messageFocus,
              minLines: 5,
              maxLines: 8,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                alignLabelWithHint: true,
                border: OutlineInputBorder(),
                labelText: 'Message',
              ),
            ),
          ],
        );
      },
    ),
  );

  Future<CrmCallEnquiryFormData> _loadFormData() =>
      widget.api.callEnquiryFormData(widget.session.accessToken);

  void _reload() => setState(() {
    _focusRequested = false;
    _formData = _loadFormData();
  });

  void _focusMessage() {
    if (_focusRequested) return;
    _focusRequested = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _messageFocus.requestFocus();
    });
  }

  Future<void> _save() async {
    final message = _message.text.trim();
    final customer = _customer.text.trim();
    final mobile = _mobile.text.replaceAll(RegExp(r'\D'), '');
    if (message.isEmpty ||
        customer.isEmpty ||
        mobile.length != 10 ||
        _group == null) {
      _showMessage(
        'Add a message, customer, 10-digit mobile number, and list.',
      );
      return;
    }
    setState(() => _isSaving = true);
    try {
      final job = await widget.api.createEnquiry(
        accessToken: widget.session.accessToken,
        customer: _customerId ?? customer,
        mobile: mobile,
        title: _titleFromMessage(message),
        enquiryGroup: _group!,
        assignedToUserId: _assignee,
        message: message,
      );
      if (mounted) Navigator.pop(context, job);
    } on TechMediaApiException catch (error) {
      _showMessage(error.message);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _lookupContact() async {
    final mobile = _mobile.text.replaceAll(RegExp(r'\D'), '');
    if (mobile.length != 10) {
      _showMessage('Enter the 10-digit phone number to search.');
      return;
    }
    final lookup = _findContact(mobile);
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: FutureBuilder<_ContactLookup?>(
          future: lookup,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const SizedBox(
                height: 152,
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.hasError) {
              final error = snapshot.error;
              return SizedBox(
                height: 152,
                child: Center(
                  child: Text(
                    error is TechMediaApiException
                        ? error.message
                        : 'Could not check this contact.',
                  ),
                ),
              );
            }
            final contact = snapshot.data;
            if (contact == null) {
              return SizedBox(
                height: 152,
                child: Center(child: Text('No contact found for $mobile.')),
              );
            }
            return ListTile(
              contentPadding: const EdgeInsets.fromLTRB(24, 12, 16, 20),
              leading: const Icon(Icons.person_outline_rounded),
              title: Text(contact.customer),
              subtitle: Text('Contact found for $mobile'),
              trailing: TextButton(
                onPressed: () {
                  setState(() {
                    _customer.text = contact.customer;
                    _customerId = contact.customerId;
                  });
                  Navigator.pop(context);
                },
                child: const Text('Use customer'),
              ),
            );
          },
        ),
      ),
    );
  }

  Future<_ContactLookup?> _findContact(String mobile) async {
    final customer = await widget.api.customerByMobile(
      accessToken: widget.session.accessToken,
      mobile: mobile,
    );
    if (customer == null) return null;
    return _ContactLookup(customer: customer.name, customerId: customer.id);
  }

  void _showMessage(String message) =>
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
}

class _ContactLookup {
  const _ContactLookup({required this.customer, required this.customerId});

  final String customer;
  final String customerId;
}

class _EnquiryPreview extends StatelessWidget {
  const _EnquiryPreview({
    required this.title,
    required this.list,
    required this.allocated,
  });

  final String title;
  final String list;
  final String allocated;

  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: ListTile(
      leading: const Icon(Icons.preview_outlined),
      title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text('$list · $allocated'),
    ),
  );
}

class _FormError extends StatelessWidget {
  const _FormError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: FilledButton.tonal(
      onPressed: onRetry,
      child: const Text('Could not load enquiry options. Retry'),
    ),
  );
}

String _titleFromMessage(String message) {
  final normalized = message.replaceAll(RegExp(r'\s+'), ' ').trim();
  const limit = 44;
  if (normalized.length <= limit) return normalized;
  return '${normalized.substring(0, limit - 1).trimRight()}…';
}
