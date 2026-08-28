import 'package:flutter/material.dart';

import 'dashboard_list_page.dart';
import 'job_detail_page.dart';

class JobEnquiryCard extends StatelessWidget {
  const JobEnquiryCard({required this.enquiry, super.key});

  final DashboardListItem enquiry;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      elevation: 4,
      shadowColor: const Color(0x380F0B14),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFCFC4D3), width: 1.25),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => _openDetail(context),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 9, 9, 7),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _CardHeader(enquiry: enquiry),
              const SizedBox(height: 5),
              Text(
                enquiry.title,
                style: Theme.of(context).textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 1),
              Text(
                enquiry.customer,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 6),
              _MetaRow(enquiry: enquiry),
              const SizedBox(height: 5),
              const Divider(height: 1),
              const SizedBox(height: 4),
              _CardFooter(enquiry: enquiry, onOpen: () => _openDetail(context)),
            ],
          ),
        ),
      ),
    );
  }

  void _openDetail(BuildContext context) {
    Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (context) => JobDetailPage(enquiry: enquiry)),
    );
  }
}

class _CardHeader extends StatelessWidget {
  const _CardHeader({required this.enquiry});

  final DashboardListItem enquiry;

  @override
  Widget build(BuildContext context) {
    final priorityColor = switch (enquiry.priority) {
      JobPriority.normal => const Color(0xFF10B9A8),
      JobPriority.high => const Color(0xFFFF4054),
      JobPriority.urgent => const Color(0xFFE55400),
    };
    return Row(
      children: [
        Container(
          height: 24,
          width: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: priorityColor.withValues(alpha: 0.12),
            shape: BoxShape.circle,
            border: Border.all(color: priorityColor.withValues(alpha: 0.28)),
          ),
          child: Container(
            height: 10,
            width: 10,
            decoration: BoxDecoration(
              color: priorityColor,
              shape: BoxShape.circle,
            ),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          '#${enquiry.enquiryNumber}',
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: const Color(0xFF662C90),
            fontWeight: FontWeight.w800,
          ),
        ),
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerRight,
                child: Text(
                  enquiry.createdBy,
                  maxLines: 1,
                  textAlign: TextAlign.right,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: const Color(0xFF827A89),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                enquiry.createdAgo,
                maxLines: 1,
                textAlign: TextAlign.right,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: const Color(0xFF9B94A3),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        _StatusBadge(status: enquiry.status),
      ],
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.enquiry});

  final DashboardListItem enquiry;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _MetaItem(label: 'List in', value: enquiry.list),
        const SizedBox(width: 16),
        _MetaItem(label: 'Due date', value: enquiry.dueDate, alignEnd: true),
      ],
    );
  }
}

class _MetaItem extends StatelessWidget {
  const _MetaItem({
    required this.label,
    required this.value,
    this.alignEnd = false,
  });

  final String label;
  final String value;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(right: 6),
        child: Column(
          crossAxisAlignment: alignEnd
              ? CrossAxisAlignment.end
              : CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: const Color(0xFF827A89),
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: alignEnd ? TextAlign.right : TextAlign.left,
              style: Theme.of(context).textTheme.labelLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardFooter extends StatelessWidget {
  const _CardFooter({required this.enquiry, required this.onOpen});

  final DashboardListItem enquiry;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            enquiry.lastAction,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        IconButton(
          visualDensity: VisualDensity.compact,
          tooltip: 'Open enquiry',
          icon: const Icon(Icons.open_in_new, size: 19),
          onPressed: onOpen,
        ),
        PopupMenuButton<_JobAction>(
          tooltip: 'Enquiry actions',
          onSelected: (action) => _showAction(
            context,
            '${action.label} for #${enquiry.enquiryNumber}',
          ),
          itemBuilder: (context) => const [
            PopupMenuItem(
              value: _JobAction.call,
              child: _ActionMenuItem(icon: Icons.call_outlined, label: 'Call'),
            ),
            PopupMenuItem(
              value: _JobAction.whatsApp,
              child: _ActionMenuItem(
                icon: Icons.chat_outlined,
                label: 'WhatsApp',
              ),
            ),
            PopupMenuItem(
              value: _JobAction.location,
              child: _ActionMenuItem(
                icon: Icons.location_on_outlined,
                label: 'Location',
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showAction(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final JobStatus status;

  @override
  Widget build(BuildContext context) {
    final details = switch (status) {
      JobStatus.open => (
        label: 'Open',
        color: const Color(0xFF4F7FD4),
        icon: Icons.radio_button_checked,
      ),
      JobStatus.won => (
        label: 'Won',
        color: const Color(0xFF3C9975),
        icon: Icons.check_circle_outline,
      ),
      JobStatus.lost => (
        label: 'Lost',
        color: const Color(0xFFC85A65),
        icon: Icons.cancel_outlined,
      ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: details.color,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(details.icon, size: 12, color: Colors.white),
          const SizedBox(width: 3),
          Text(
            details.label,
            style: const TextStyle(
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

class _ActionMenuItem extends StatelessWidget {
  const _ActionMenuItem({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [Icon(icon, size: 19), const SizedBox(width: 10), Text(label)],
    );
  }
}

enum _JobAction {
  call('Call'),
  whatsApp('WhatsApp'),
  location('Location');

  const _JobAction(this.label);

  final String label;
}
