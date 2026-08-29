import 'package:flutter/material.dart';

import '../../core/api/techmedia_api.dart';

class DashboardHome extends StatelessWidget {
  const DashboardHome({
    required this.api,
    required this.session,
    required this.onOpenList,
    super.key,
  });

  final TechMediaApi api;
  final UserSession session;
  final ValueChanged<int> onOpenList;

  @override
  Widget build(BuildContext context) {
    final greeting = _Greeting.forTime(DateTime.now());
    final firstName = session.profile.name.split(' ').first;
    return FutureBuilder<List<CrmJob>>(
      future: api.assignedJobs(session.accessToken),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const Center(
            child: Text('Could not load live dashboard data.'),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final jobs = snapshot.data!;
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            Text(
              '${greeting.label}, $firstName',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            Text(
              greeting.quote,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF5F5967),
                fontStyle: FontStyle.italic,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 24),
            _StatsRow(jobCount: jobs.length, onOpenList: onOpenList),
          ],
        );
      },
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.jobCount, required this.onOpenList});

  final int jobCount;
  final ValueChanged<int> onOpenList;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.business_center_outlined,
            label: 'Jobs',
            value: '$jobCount',
            onTap: () => onOpenList(1),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.calendar_month_outlined,
            label: 'Duty',
            value: 'Soon',
            onTap: () => onOpenList(2),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.bolt_outlined,
            label: 'Actions',
            value: 'Soon',
            onTap: () => onOpenList(3),
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      button: true,
      label: 'Open $label list',
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          height: 96,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE9E1EE)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 17, color: theme.colorScheme.primary),
              const Spacer(),
              Text(value, style: theme.textTheme.titleMedium),
              Text(label, style: theme.textTheme.labelMedium),
            ],
          ),
        ),
      ),
    );
  }
}

class _Greeting {
  const _Greeting(this.label, this.quote);

  final String label;
  final String quote;

  factory _Greeting.forTime(DateTime time) {
    final hour = time.hour;
    if (hour >= 5 && hour < 12) {
      return const _Greeting(
        'Good morning',
        'Small progress today builds meaningful results.',
      );
    }
    if (hour < 16) {
      return const _Greeting(
        'Good noon',
        'Stay focused: the next clear action moves work forward.',
      );
    }
    if (hour < 20) {
      return const _Greeting(
        'Good evening',
        'Finish the day with one useful step completed.',
      );
    }
    return const _Greeting(
      'Good night',
      'Review, recharge, and return ready for tomorrow.',
    );
  }
}
