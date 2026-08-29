import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/api/techmedia_api.dart';
import '../../core/platform/mobile_actions.dart';

class AdminCallLogPage extends StatefulWidget {
  const AdminCallLogPage({required this.api, required this.session, super.key});

  final TechMediaApi api;
  final UserSession session;

  @override
  State<AdminCallLogPage> createState() => _AdminCallLogPageState();
}

class _AdminCallLogPageState extends State<AdminCallLogPage> {
  late Future<List<_CallEntry>> _calls = _loadCalls();
  var _filter = _CallFilter.all;
  var _query = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Call Logs')),
      body: FutureBuilder<List<_CallEntry>>(
        future: _calls,
        builder: (context, snapshot) {
          if (snapshot.hasError) return _PermissionState(onRetry: _reload);
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final calls = snapshot.data!
              .where(_filter.includes)
              .where(_matchesSearch)
              .toList();
          return RefreshIndicator(
            onRefresh: _reload,
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: _CallLogControls(
                    filter: _filter,
                    onFilterChanged: (filter) =>
                        setState(() => _filter = filter),
                    onSearchChanged: (value) =>
                        setState(() => _query = value.trim().toLowerCase()),
                  ),
                ),
                if (calls.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: Text('No matching calls.')),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(14, 8, 14, 28),
                    sliver: SliverList.separated(
                      itemCount: calls.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 10),
                      itemBuilder: (context, index) => _CallLogCard(
                        entry: calls[index],
                        onCopy: () => _copy(calls[index].number),
                        onSms: () => MobileActions.sms(calls[index].number),
                        onWhatsApp: () => _openWhatsApp(calls[index]),
                        onAttach: () => _attachToEnquiry(calls[index]),
                        onCall: () => MobileActions.call(calls[index].number),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<List<_CallEntry>> _loadCalls() async {
    final rows = await MobileActions.callLogs();
    return rows.map(_CallEntry.fromPlatform).toList();
  }

  Future<void> _reload() async {
    setState(() => _calls = _loadCalls());
    await _calls;
  }

  bool _matchesSearch(_CallEntry entry) {
    if (_query.isEmpty) return true;
    return entry.name.toLowerCase().contains(_query) ||
        entry.number.toLowerCase().contains(_query);
  }

  Future<void> _copy(String number) async {
    await Clipboard.setData(ClipboardData(text: number));
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Number copied.')));
    }
  }

  Future<void> _openWhatsApp(_CallEntry entry) async {
    final opened = await MobileActions.whatsApp(
      entry.number,
      message:
          'Following up on our ${entry.directionLabel.toLowerCase()} call.',
    );
    if (!opened && mounted) _showMessage('WhatsApp is not available.');
  }

  Future<void> _attachToEnquiry(_CallEntry entry) async {
    List<CrmJob> jobs;
    try {
      jobs = await widget.api.assignedJobs(widget.session.accessToken);
    } on TechMediaApiException catch (error) {
      if (mounted) _showMessage(error.message);
      return;
    }
    if (!mounted || jobs.isEmpty) {
      if (mounted) _showMessage('No enquiries are available.');
      return;
    }
    final matching = jobs.where(
      (job) => _digits(job.mobile) == _digits(entry.number),
    );
    final selected = await _selectEnquiry(
      jobs,
      matching.isEmpty ? jobs.first : matching.first,
    );
    if (selected == null) return;
    try {
      await widget.api.addJobComment(
        accessToken: widget.session.accessToken,
        id: selected.sourceId,
        comment: entry.crmComment,
      );
      if (mounted)
        _showMessage('Call attached to enquiry #${selected.number}.');
    } on TechMediaApiException catch (error) {
      if (mounted) _showMessage(error.message);
    }
  }

  Future<CrmJob?> _selectEnquiry(List<CrmJob> jobs, CrmJob initial) {
    var selected = initial;
    return showDialog<CrmJob>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Attach call to enquiry'),
          content: DropdownButtonFormField<CrmJob>(
            initialValue: selected,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Enquiry'),
            items: jobs
                .map(
                  (job) => DropdownMenuItem(
                    value: job,
                    child: Text('#${job.number} · ${job.title}'),
                  ),
                )
                .toList(),
            onChanged: (job) {
              if (job != null) setDialogState(() => selected = job);
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, selected),
              child: const Text('Attach'),
            ),
          ],
        ),
      ),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }
}

class _CallLogControls extends StatelessWidget {
  const _CallLogControls({
    required this.filter,
    required this.onFilterChanged,
    required this.onSearchChanged,
  });

  final _CallFilter filter;
  final ValueChanged<_CallFilter> onFilterChanged;
  final ValueChanged<String> onSearchChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
      child: Column(
        children: [
          SearchBar(
            hintText: 'Search name or number',
            leading: const Icon(Icons.search),
            onChanged: onSearchChanged,
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SegmentedButton<_CallFilter>(
              segments: _CallFilter.values
                  .map(
                    (item) =>
                        ButtonSegment(value: item, label: Text(item.label)),
                  )
                  .toList(),
              selected: {filter},
              showSelectedIcon: false,
              onSelectionChanged: (value) => onFilterChanged(value.first),
            ),
          ),
        ],
      ),
    );
  }
}

class _CallLogCard extends StatelessWidget {
  const _CallLogCard({
    required this.entry,
    required this.onCopy,
    required this.onSms,
    required this.onWhatsApp,
    required this.onAttach,
    required this.onCall,
  });

  final _CallEntry entry;
  final VoidCallback onCopy;
  final VoidCallback onSms;
  final VoidCallback onWhatsApp;
  final VoidCallback onAttach;
  final VoidCallback onCall;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      elevation: 2,
      surfaceTintColor: Colors.transparent,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 8, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              backgroundColor: entry.color.withValues(alpha: 0.13),
              foregroundColor: entry.color,
              child: Icon(entry.icon),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.displayName,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 2),
                  Text(entry.number),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      Text(entry.displayTime),
                      const SizedBox(width: 8),
                      _DurationBadge(label: entry.durationLabel),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 4,
                    children: [
                      _MicroAction(
                        tooltip: 'Copy number',
                        icon: Icons.copy_outlined,
                        onPressed: onCopy,
                      ),
                      _MicroAction(
                        tooltip: 'Send SMS',
                        icon: Icons.sms_outlined,
                        onPressed: onSms,
                      ),
                      _MicroAction(
                        tooltip: 'Open WhatsApp',
                        icon: Icons.phone_in_talk_outlined,
                        onPressed: onWhatsApp,
                      ),
                      _MicroAction(
                        tooltip: 'Attach to enquiry',
                        icon: Icons.note_add_outlined,
                        onPressed: onAttach,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton.filledTonal(
              tooltip: 'Call ${entry.displayName}',
              onPressed: onCall,
              icon: const Icon(Icons.call_rounded),
            ),
          ],
        ),
      ),
    );
  }
}

class _MicroAction extends StatelessWidget {
  const _MicroAction({
    required this.tooltip,
    required this.icon,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => IconButton.filledTonal(
    tooltip: tooltip,
    visualDensity: VisualDensity.compact,
    onPressed: onPressed,
    icon: Icon(icon, size: 18),
  );
}

class _DurationBadge extends StatelessWidget {
  const _DurationBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: const Color(0xFFF1EDF4),
      borderRadius: BorderRadius.circular(9),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      child: Text(label, style: Theme.of(context).textTheme.labelSmall),
    ),
  );
}

class _PermissionState extends StatelessWidget {
  const _PermissionState({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.call_outlined, size: 42),
          const SizedBox(height: 12),
          const Text(
            'Allow call log access to view device calls.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 14),
          FilledButton.tonal(
            onPressed: onRetry,
            child: const Text('Try again'),
          ),
        ],
      ),
    ),
  );
}

class _CallEntry {
  const _CallEntry({
    required this.name,
    required this.number,
    required this.type,
    required this.timestamp,
    required this.durationSeconds,
  });

  final String name;
  final String number;
  final int type;
  final DateTime timestamp;
  final int durationSeconds;

  factory _CallEntry.fromPlatform(Map<String, dynamic> row) => _CallEntry(
    name: row['name'] as String? ?? '',
    number: row['number'] as String? ?? '',
    type: (row['type'] as num?)?.toInt() ?? 0,
    timestamp: DateTime.fromMillisecondsSinceEpoch(
      (row['timestamp'] as num?)?.toInt() ?? 0,
    ),
    durationSeconds: (row['durationSeconds'] as num?)?.toInt() ?? 0,
  );

  String get displayName => name.trim().isEmpty ? 'Unknown' : name.trim();
  String get directionLabel => switch (type) {
    1 => 'Incoming',
    2 => 'Outgoing',
    3 => 'Missed',
    _ => 'Call',
  };
  Color get color => switch (type) {
    1 => const Color(0xFF169C63),
    2 => const Color(0xFF347BD2),
    3 => const Color(0xFFD94755),
    _ => const Color(0xFF776F7E),
  };
  IconData get icon => switch (type) {
    1 => Icons.call_received_rounded,
    2 => Icons.call_made_rounded,
    3 => Icons.call_missed_rounded,
    _ => Icons.call_rounded,
  };
  String get durationLabel {
    final minutes = durationSeconds ~/ 60;
    final seconds = durationSeconds % 60;
    return minutes > 0 ? '${minutes}m ${seconds}s' : '${seconds}s';
  }

  String get displayTime {
    final local = timestamp.toLocal();
    final period = local.hour >= 12 ? 'pm' : 'am';
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    return '${local.day}/${local.month}/${local.year} · $hour:${local.minute.toString().padLeft(2, '0')} $period';
  }

  String get crmComment =>
      'Call log: $directionLabel call with $displayName ($number) on $displayTime. Duration: $durationLabel.';
}

enum _CallFilter {
  all('ALL'),
  incoming('INCOMING'),
  outgoing('OUTGOING'),
  missed('MISSED');

  const _CallFilter(this.label);
  final String label;

  bool includes(_CallEntry entry) => switch (this) {
    _CallFilter.all => true,
    _CallFilter.incoming => entry.type == 1,
    _CallFilter.outgoing => entry.type == 2,
    _CallFilter.missed => entry.type == 3,
  };
}

String _digits(String value) => value.replaceAll(RegExp(r'\D'), '');
