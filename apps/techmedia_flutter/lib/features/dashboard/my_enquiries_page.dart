import 'package:flutter/material.dart';

import '../../core/api/techmedia_api.dart';
import 'dashboard_list_page.dart';
import 'job_enquiry_card.dart';

class MyEnquiriesPage extends StatefulWidget {
  const MyEnquiriesPage({required this.api, required this.session, super.key});

  final TechMediaApi api;
  final UserSession session;

  @override
  State<MyEnquiriesPage> createState() => _MyEnquiriesPageState();
}

class _MyEnquiriesPageState extends State<MyEnquiriesPage> {
  late Future<List<CrmJob>> _enquiries;

  @override
  void initState() {
    super.initState();
    _enquiries = _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('My Enquiries')),
    body: FutureBuilder<List<CrmJob>>(
      future: _enquiries,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) return _LoadError(onRetry: _refresh);
        final enquiries = snapshot.data ?? const <CrmJob>[];
        if (enquiries.isEmpty) {
          return const Center(
            child: Text('You have not created any enquiries.'),
          );
        }
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
            itemCount: enquiries.length,
            separatorBuilder: (_, _) => const SizedBox(height: 14),
            itemBuilder: (context, index) => JobEnquiryCard(
              api: widget.api,
              session: widget.session,
              enquiry: DashboardListItem.fromCrmJob(enquiries[index]),
              job: enquiries[index],
              onJobChanged: _refresh,
            ),
          ),
        );
      },
    ),
  );

  Future<List<CrmJob>> _load() =>
      widget.api.createdEnquiries(widget.session.accessToken);

  Future<void> _refresh() async {
    setState(() => _enquiries = _load());
    await _enquiries;
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: FilledButton.tonal(
      onPressed: onRetry,
      child: const Text('Could not load your enquiries. Retry'),
    ),
  );
}
