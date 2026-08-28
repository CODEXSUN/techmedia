import 'package:flutter/material.dart';

import 'dashboard_list_page.dart';

const _detailSurfaceTone = Color(0xFFFCF9FD);

class JobDetailPage extends StatefulWidget {
  const JobDetailPage({required this.enquiry, super.key});

  final DashboardListItem enquiry;

  @override
  State<JobDetailPage> createState() => _JobDetailPageState();
}

class _JobDetailPageState extends State<JobDetailPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _replyController = TextEditingController();
  final List<_JobComment> _comments = List.of(_seedComments);

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
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
          _DetailTabs(controller: _tabs, commentCount: _comments.length),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _CommentsList(comments: _comments),
                _JobsTab(enquiry: widget.enquiry),
                const _ActivityTab(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _ReplyComposer(
        controller: _replyController,
        onSend: _addComment,
      ),
    );
  }

  void _addComment() {
    final message = _replyController.text.trim();
    if (message.isEmpty) return;
    setState(() {
      _comments.insert(
        0,
        _JobComment(
          author: 'Vijay Anand',
          body: message,
          time: 'Just now',
          initials: 'VA',
          isCurrentUser: true,
        ),
      );
    });
    _replyController.clear();
    FocusScope.of(context).unfocus();
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
  const _DetailTabs({required this.controller, required this.commentCount});

  final TabController controller;
  final int commentCount;

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
          const _DetailTab(icon: Icons.work_outline, label: 'Jobs', count: 1),
          const _DetailTab(
            icon: Icons.bolt_outlined,
            label: 'Activity',
            count: 3,
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
  const _JobsTab({required this.enquiry});

  final DashboardListItem enquiry;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: 1,
      separatorBuilder: (context, index) =>
          const Divider(height: 1, indent: 48, color: Color(0xFFE5DFE7)),
      itemBuilder: (context, index) => _InfoRow(
        icon: Icons.assignment_turned_in_outlined,
        title: 'Follow-up job',
        detail: enquiry.lastAction,
      ),
    );
  }
}

class _ActivityTab extends StatelessWidget {
  const _ActivityTab();

  @override
  Widget build(BuildContext context) {
    const activities = [
      _InfoRow(
        icon: Icons.edit_note_outlined,
        title: 'Enquiry updated',
        detail: 'Customer details updated today',
      ),
      _InfoRow(
        icon: Icons.call_outlined,
        title: 'Customer follow-up',
        detail: 'Awaiting confirmation',
      ),
      _InfoRow(
        icon: Icons.person_outline,
        title: 'Assigned to you',
        detail: 'Vijay Anand',
      ),
    ];
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: activities.length,
      separatorBuilder: (context, index) =>
          const Divider(height: 1, indent: 48, color: Color(0xFFE5DFE7)),
      itemBuilder: (context, index) => activities[index],
    );
  }
}

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
  final VoidCallback onSend;

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
}

const _seedComments = [
  _JobComment(
    author: 'Vijay Anand',
    body: 'Call not picked. I will update on WhatsApp.',
    time: '2 hours ago',
    initials: 'VA',
    isCurrentUser: true,
  ),
  _JobComment(
    author: 'Ratheesh P',
    body: 'Customer is out of station and will call back Monday.',
    time: '3 hours ago',
    initials: 'RP',
  ),
  _JobComment(
    author: 'Vijay Anand',
    body: 'Need suggestion for area coverage and net price.',
    time: '4 hours ago',
    initials: 'VA',
    isCurrentUser: true,
  ),
];
