import 'package:flutter/material.dart';

import '../../core/api/techmedia_api.dart';
import 'dashboard_list_page.dart';

const _detailSurfaceTone = Color(0xFFFCF9FD);

class JobDetailPage extends StatefulWidget {
  const JobDetailPage({
    required this.api,
    required this.session,
    required this.enquiry,
    required this.initialJob,
    super.key,
  });

  final TechMediaApi api;
  final UserSession session;
  final DashboardListItem enquiry;
  final CrmJob initialJob;

  @override
  State<JobDetailPage> createState() => _JobDetailPageState();
}

class _JobDetailPageState extends State<JobDetailPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _replyController = TextEditingController();
  late CrmJob _job;
  var _isLoading = false;
  var _isSending = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _job = widget.initialJob;
    _refresh();
  }

  @override
  void dispose() {
    _tabs.dispose();
    _replyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Job #${widget.enquiry.enquiryNumber}')),
      body: Column(
        children: [
          _CompactJobDetail(enquiry: widget.enquiry),
          _DetailTabs(
            controller: _tabs,
            commentCount: _job.comments.length,
            jobCount: _job.jobs.length,
            activityCount: _job.activities.length,
          ),
          if (_isLoading) const LinearProgressIndicator(minHeight: 2),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _CommentsList(
                  comments: _job.comments
                      .map(
                        (comment) =>
                            _JobComment.fromCrm(comment, widget.session),
                      )
                      .toList(),
                ),
                _JobsTab(
                  jobs: _job.jobs,
                  pending: _isSending,
                  onStart: _startJob,
                  onStop: _stopJob,
                ),
                _ActivityTab(activities: _job.activities),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _ReplyComposer(
        controller: _replyController,
        onSend: _isSending ? null : _addComment,
      ),
    );
  }

  Future<void> _refresh() async {
    setState(() => _isLoading = true);
    try {
      final job = await widget.api.job(
        widget.session.accessToken,
        widget.initialJob.sourceId,
      );
      if (mounted) setState(() => _job = job);
    } on TechMediaApiException catch (error) {
      if (mounted) _showError(error.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _addComment() async {
    final message = _replyController.text.trim();
    if (message.isEmpty) return;
    setState(() => _isSending = true);
    try {
      final job = await widget.api.addJobComment(
        accessToken: widget.session.accessToken,
        id: widget.initialJob.sourceId,
        comment: message,
      );
      if (!mounted) return;
      setState(() => _job = job);
      _replyController.clear();
      FocusScope.of(context).unfocus();
    } on TechMediaApiException catch (error) {
      if (mounted) _showError(error.message);
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _startJob() => _runJobAction(
    () => widget.api.startJob(
      accessToken: widget.session.accessToken,
      id: widget.initialJob.sourceId,
    ),
  );

  Future<void> _stopJob(CrmJobExecution execution) => _runJobAction(
    () => widget.api.stopJob(
      accessToken: widget.session.accessToken,
      id: widget.initialJob.sourceId,
      jobName: execution.name,
    ),
  );

  Future<void> _runJobAction(Future<CrmJob> Function() action) async {
    setState(() => _isSending = true);
    try {
      final job = await action();
      if (mounted) setState(() => _job = job);
    } on TechMediaApiException catch (error) {
      if (mounted) _showError(error.message);
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }
}

class _CompactJobDetail extends StatelessWidget {
  const _CompactJobDetail({required this.enquiry});

  final DashboardListItem enquiry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: _detailSurfaceTone,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFEAE3ED)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x180F0B14),
              blurRadius: 10,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '#${enquiry.enquiryNumber}',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: const Color(0xFF662C90),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  const _DetailStatusBadge(),
                ],
              ),
              const SizedBox(height: 7),
              Text(
                enquiry.title,
                style: Theme.of(context).textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 2),
              Text(
                enquiry.customer,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 11),
              Row(
                children: [
                  _DetailValue(label: 'List in', value: enquiry.list),
                  _DetailValue(label: 'Due date', value: enquiry.dueDate),
                  _DetailValue(label: 'Created', value: enquiry.createdAgo),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailValue extends StatelessWidget {
  const _DetailValue({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall
                ?.copyWith(color: const Color(0xFF827A89)),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _DetailStatusBadge extends StatelessWidget {
  const _DetailStatusBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF4F7FD4),
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.radio_button_checked, size: 12, color: Colors.white),
          SizedBox(width: 3),
          Text(
            'Open',
            style: TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailTabs extends StatelessWidget {
  const _DetailTabs({
    required this.controller,
    required this.commentCount,
    required this.jobCount,
    required this.activityCount,
  });

  final TabController controller;
  final int commentCount;
  final int jobCount;
  final int activityCount;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _detailSurfaceTone,
      child: TabBar(
        controller: controller,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        labelColor: const Color(0xFF662C90),
        unselectedLabelColor: const Color(0xFF756D7A),
        indicatorColor: const Color(0xFF662C90),
        dividerColor: const Color(0xFFE5DFE7),
        indicatorWeight: 1.5,
        indicatorSize: TabBarIndicatorSize.label,
        indicatorAnimation: TabIndicatorAnimation.elastic,
        labelPadding: const EdgeInsets.symmetric(horizontal: 10),
        tabs: [
          _DetailTab(
            icon: Icons.chat_bubble_outline,
            label: 'Comments',
            count: commentCount,
          ),
          _DetailTab(icon: Icons.work_outline, label: 'Jobs', count: jobCount),
          _DetailTab(
            icon: Icons.bolt_outlined,
            label: 'Activity',
            count: activityCount,
          ),
        ],
      ),
    );
  }
}

class _DetailTab extends StatelessWidget {
  const _DetailTab({
    required this.icon,
    required this.label,
    required this.count,
  });

  final IconData icon;
  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Tab(
      height: 42,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(fontSize: 13)),
          const SizedBox(width: 4),
          Container(
            constraints: const BoxConstraints(minWidth: 16),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
            decoration: BoxDecoration(
              color: const Color(0xFFF0E2FA),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentsList extends StatelessWidget {
  const _CommentsList({required this.comments});

  final List<_JobComment> comments;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 22),
      itemCount: comments.length,
      separatorBuilder: (context, index) =>
          const Divider(height: 1, indent: 44, color: Color(0xFFE5DFE7)),
      itemBuilder: (context, index) => _CommentTile(comment: comments[index]),
    );
  }
}

class _CommentTile extends StatelessWidget {
  const _CommentTile({required this.comment});

  final _JobComment comment;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 17,
            backgroundColor: const Color(0xFFF0E2FA),
            foregroundColor: const Color(0xFF662C90),
            child: Text(
              comment.initials,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(comment.body),
                const SizedBox(height: 5),
                Align(
                  alignment: Alignment.centerRight,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        comment.author,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        comment.time,
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _JobsTab extends StatelessWidget {
  const _JobsTab({
    required this.jobs,
    required this.pending,
    required this.onStart,
    required this.onStop,
  });

  final List<CrmJobExecution> jobs;
  final bool pending;
  final VoidCallback onStart;
  final ValueChanged<CrmJobExecution> onStop;

  @override
  Widget build(BuildContext context) {
    final running = jobs.where((job) => job.isRunning).firstOrNull;
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 22),
      itemCount: jobs.length + 1,
      separatorBuilder: (context, index) =>
          const Divider(height: 1, indent: 48, color: Color(0xFFE5DFE7)),
      itemBuilder: (context, index) {
        if (index == 0) {
          return Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: pending
                  ? null
                  : running == null
                  ? onStart
                  : () => onStop(running),
              icon: Icon(running == null ? Icons.play_arrow : Icons.stop),
              label: Text(running == null ? 'Start job' : 'Stop job'),
            ),
          );
        }
        final job = jobs[index - 1];
        return _InfoRow(
          icon: job.isRunning
              ? Icons.timer_outlined
              : Icons.assignment_turned_in_outlined,
          title: '${job.name} · ${job.status}',
          detail:
              '${job.employee} · ${_jobTime(job.startTime)}–${_jobTime(job.stopTime)} · ${job.hours.toStringAsFixed(2)} hr · ₹${job.totalCost.toStringAsFixed(2)}',
        );
      },
    );
  }
}

class _ActivityTab extends StatelessWidget {
  const _ActivityTab({required this.activities});

  final List<CrmActivity> activities;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: activities.length,
      separatorBuilder: (context, index) =>
          const Divider(height: 1, indent: 48, color: Color(0xFFE5DFE7)),
      itemBuilder: (context, index) {
        final activity = activities[index];
        return _InfoRow(
          icon: _activityIcon(activity.action),
          title: _activityTitle(activity.action),
          detail:
              '${activity.details} · ${_relativeCommentTime(activity.createdAt)}',
        );
      },
    );
  }
}

String _jobTime(String? value) {
  if (value == null || value.isEmpty) return 'Running';
  return value.length >= 8 ? value.substring(0, 8) : value;
}

IconData _activityIcon(String action) => switch (action) {
  'added' => Icons.add_circle_outline,
  'removed' => Icons.remove_circle_outline,
  'viewed' => Icons.visibility_outlined,
  _ => Icons.edit_note_outlined,
};

String _activityTitle(String action) => switch (action) {
  'added' => 'Added',
  'changed' => 'Changed',
  'removed' => 'Removed',
  'viewed' => 'Viewed',
  _ => 'Edited',
};

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: const Color(0xFFF0E2FA),
            foregroundColor: const Color(0xFF662C90),
            child: Icon(icon, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(detail, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReplyComposer extends StatelessWidget {
  const _ReplyComposer({required this.controller, required this.onSend});

  final TextEditingController controller;
  final VoidCallback? onSend;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: DecoratedBox(
        decoration: const BoxDecoration(
          color: _detailSurfaceTone,
          border: Border(top: BorderSide(color: Color(0xFFF0ECF2))),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 9, 14, 10),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 3,
                  textInputAction: TextInputAction.newline,
                  decoration: InputDecoration(
                    hintText: 'Write a comment or reply…',
                    isDense: true,
                    filled: true,
                    fillColor: const Color(0xFFF9F7FA),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                tooltip: 'Send reply',
                onPressed: onSend,
                icon: const Icon(Icons.send, size: 19),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _JobComment {
  const _JobComment({
    required this.author,
    required this.body,
    required this.time,
    required this.initials,
    this.isCurrentUser = false,
  });

  final String author;
  final String body;
  final String time;
  final String initials;
  final bool isCurrentUser;

  factory _JobComment.fromCrm(CrmComment comment, UserSession session) {
    final isCurrentUser = comment.createdByUserId == session.profile.email;
    final author = isCurrentUser
        ? session.profile.name
        : _displayUser(comment.createdByUserId);
    return _JobComment(
      author: author,
      body: comment.comment,
      time: _relativeCommentTime(comment.createdAt),
      initials: _initials(author),
      isCurrentUser: isCurrentUser,
    );
  }
}

String _displayUser(String value) {
  final localPart = value.split('@').first.replaceAll(RegExp(r'[._-]+'), ' ');
  return localPart
      .split(' ')
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

String _initials(String value) => value
    .split(' ')
    .where((part) => part.isNotEmpty)
    .take(2)
    .map((part) => part[0].toUpperCase())
    .join();

String _relativeCommentTime(DateTime value) {
  final difference = DateTime.now().difference(value.toLocal());
  if (difference.inDays > 0) return '${difference.inDays} days ago';
  if (difference.inHours > 0) return '${difference.inHours} hours ago';
  if (difference.inMinutes > 0) return '${difference.inMinutes} min ago';
  return 'Just now';
}
