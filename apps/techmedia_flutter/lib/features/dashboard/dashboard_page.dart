import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/api/techmedia_api.dart';
import '../../core/auth/secure_session_store.dart';
import '../../core/messaging/live_message_notifications.dart';
import 'action_activity_page.dart';
import 'admin_call_log_page.dart';
import 'dashboard_home.dart';
import 'dashboard_jobs_feed.dart';
import 'dashboard_list_page.dart';
import 'duty_page.dart';
import 'job_start_countdown.dart';
import 'job_start_store.dart';
import 'messages_sample_page.dart';
import 'my_enquiries_page.dart';

const _dockVerticalPadding = 8.0;

class DashboardPage extends StatefulWidget {
  const DashboardPage({
    super.key,
    required this.api,
    required this.session,
    required this.onSignOut,
    this.onResetPin,
    this.onCheckForUpdate,
    this.onChangePassword,
    this.enableLiveNotifications = true,
  });

  final TechMediaApi api;
  final UserSession session;
  final VoidCallback onSignOut;
  final Future<void> Function()? onResetPin;
  final Future<void> Function()? onCheckForUpdate;
  final Future<void> Function()? onChangePassword;
  final bool enableLiveNotifications;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  var _selectedIndex = 0;
  final _messagesPageKey = GlobalKey<MessagesPageState>();
  late final LiveMessageNotifications _messageNotifications;
  late final DashboardJobsFeed _jobsFeed;
  late final JobStartStore _jobStartStore;

  @override
  void initState() {
    super.initState();
    _messageNotifications = LiveMessageNotifications(
      api: widget.api,
      session: widget.session,
    );
    _jobsFeed = DashboardJobsFeed(api: widget.api, session: widget.session)
      ..start();
    _jobStartStore = JobStartStore(SecureSessionStore());
    unawaited(_restorePendingJobStarts());
    if (widget.enableLiveNotifications) {
      unawaited(_messageNotifications.start());
    }
  }

  Future<void> _restorePendingJobStarts() {
    return JobStartCountdown.instance.restore(
      store: _jobStartStore,
      onElapsed: (jobId) async {
        await widget.api.startJob(
          accessToken: widget.session.accessToken,
          id: jobId,
        );
        await _jobsFeed.refresh();
      },
    );
  }

  @override
  void dispose() {
    _messageNotifications.dispose();
    _jobsFeed.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 56,
        titleSpacing: 20,
        title: Row(
          children: [
            SvgPicture.asset('assets/logo.svg', height: 28, width: 34),
            const SizedBox(width: 9),
            const Text('Tech Media'),
            if (_selectedIndex == 1 || _selectedIndex == 3) ...[
              const SizedBox(width: 12),
              Container(height: 28, width: 1, color: const Color(0xFFD7D1DA)),
              const SizedBox(width: 12),
              Text(
                _selectedIndex == 1 ? 'My Jobs' : 'Chat',
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ],
        ),
        actions: switch (_selectedIndex) {
          0 => [
            PopupMenuButton<_HomeMenuAction>(
              tooltip: 'Account options',
              icon: const Icon(Icons.more_vert_rounded),
              onSelected: _handleHomeMenuAction,
              itemBuilder: (context) => [
                PopupMenuItem<_HomeMenuAction>(
                  enabled: false,
                  child: _AccountMenuHeader(profile: widget.session.profile),
                ),
                const PopupMenuDivider(),
                PopupMenuItem(
                  value: _HomeMenuAction.resetPin,
                  child: _HomeMenuItem(
                    icon: Icons.pin_outlined,
                    label: 'Reset PIN',
                  ),
                ),
                PopupMenuItem(
                  value: _HomeMenuAction.changePassword,
                  child: _HomeMenuItem(
                    icon: Icons.lock_reset_outlined,
                    label: 'Change password',
                  ),
                ),
                PopupMenuDivider(),
                PopupMenuItem(
                  value: _HomeMenuAction.checkForUpdates,
                  child: _HomeMenuItem(
                    icon: Icons.system_update_alt_rounded,
                    label: 'Check for updates',
                  ),
                ),
                PopupMenuDivider(),
                PopupMenuItem(
                  value: _HomeMenuAction.signOut,
                  child: _HomeMenuItem(icon: Icons.logout, label: 'Sign out'),
                ),
              ],
            ),
          ],
          3 => [
            IconButton(
              tooltip: 'New chat',
              onPressed: () => _messagesPageKey.currentState?.openNewChat(),
              icon: const Icon(Icons.add_rounded),
            ),
          ],
          _ => const [],
        },
      ),
      body: SafeArea(top: false, child: _buildBody()),
      bottomNavigationBar: SafeArea(
        top: false,
        child: _BottomDock(
          selectedIndex: _selectedIndex,
          onDestinationSelected: _onDestinationSelected,
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_selectedIndex == 0) {
      return DashboardHome(
        api: widget.api,
        session: widget.session,
        jobsFeed: _jobsFeed,
        onOpenList: _selectDestination,
        onOpenMyEnquiries: _openMyEnquiries,
      );
    }
    if (_selectedIndex == 2) {
      return DutyPage(api: widget.api, session: widget.session);
    }
    if (_selectedIndex == 3) {
      return MessagesPage(
        key: _messagesPageKey,
        api: widget.api,
        session: widget.session,
        embedded: true,
      );
    }
    return DashboardListPage(
      api: widget.api,
      session: widget.session,
      jobsFeed: _jobsFeed,
      section: dashboardListSections[_selectedIndex],
    );
  }

  void _onDestinationSelected(int index) {
    if (index == 3) {
      _showMenu();
      return;
    }
    _selectDestination(index == 2 ? 3 : index);
  }

  void _selectDestination(int index) => setState(() => _selectedIndex = index);

  Future<void> _openCallLogs() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) =>
            AdminCallLogPage(api: widget.api, session: widget.session),
      ),
    );
  }

  Future<void> _openMyEnquiries() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) =>
            MyEnquiriesPage(api: widget.api, session: widget.session),
      ),
    );
  }

  void _handleHomeMenuAction(_HomeMenuAction action) {
    if (action == _HomeMenuAction.signOut) {
      widget.onSignOut();
      return;
    }
    final task = switch (action) {
      _HomeMenuAction.resetPin => widget.onResetPin,
      _HomeMenuAction.changePassword => widget.onChangePassword,
      _HomeMenuAction.checkForUpdates => widget.onCheckForUpdate,
      _HomeMenuAction.signOut => null,
    };
    if (task != null) unawaited(task());
  }

  void _showMenu() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 6, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_month_outlined),
                  title: const Text('Duty'),
                  subtitle: const Text('View duty schedule and reminders.'),
                  onTap: () {
                    Navigator.pop(context);
                    _selectDestination(2);
                  },
                ),
                if (_canViewCallLogs)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.call_outlined),
                    title: const Text('Call logs'),
                    subtitle: const Text('Admin device calls and CRM logging.'),
                    onTap: () {
                      Navigator.pop(context);
                      _openCallLogs();
                    },
                  ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.bolt_outlined),
                  title: const Text('Actions'),
                  subtitle: const Text('View enquiry activity and follow-ups.'),
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.of(context).push<void>(
                      MaterialPageRoute(
                        builder: (context) => ActionActivityPage(
                          api: widget.api,
                          session: widget.session,
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  bool get _canViewCallLogs {
    final role = widget.session.profile.role.trim().toLowerCase();
    return const {
      'admin',
      'administrator',
      'super-admin',
      'system-admin',
      'system administrator',
    }.contains(role);
  }
}

enum _HomeMenuAction { resetPin, changePassword, checkForUpdates, signOut }

class _HomeMenuItem extends StatelessWidget {
  const _HomeMenuItem({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(icon, size: 20),
      const SizedBox(width: 12),
      Expanded(child: Text(label, overflow: TextOverflow.ellipsis)),
    ],
  );
}

class _AccountMenuHeader extends StatelessWidget {
  const _AccountMenuHeader({required this.profile});

  final UserProfile profile;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      Text('Account', style: Theme.of(context).textTheme.labelLarge),
      const SizedBox(height: 4),
      Text(profile.name, style: Theme.of(context).textTheme.titleSmall),
      Text(profile.email, style: Theme.of(context).textTheme.bodySmall),
    ],
  );
}

class _BottomDock extends StatelessWidget {
  const _BottomDock({
    required this.selectedIndex,
    required this.onDestinationSelected,
  });

  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: const Border(top: BorderSide(color: Color(0xFFF0ECF2))),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(10, _dockVerticalPadding, 10, 8),
        child: Row(
          children: List.generate(
            _destinations.length,
            (index) => Expanded(
              child: _DockItem(
                destination: _destinations[index],
                isSelected: index == _dockSelectedIndex,
                onTap: () => onDestinationSelected(index),
              ),
            ),
          ),
        ),
      ),
    );
  }

  int get _dockSelectedIndex => selectedIndex == 3 ? 2 : selectedIndex;
}

class _DockItem extends StatelessWidget {
  const _DockItem({
    required this.destination,
    required this.isSelected,
    required this.onTap,
  });

  final _Destination destination;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: isSelected,
      label: destination.label,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 54),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                height: 42,
                width: 42,
                decoration: BoxDecoration(
                  color: _Destination.backgroundColor.withValues(
                    alpha: isSelected ? 1 : 0.55,
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  isSelected ? destination.selectedIcon : destination.icon,
                  color: _Destination.iconColor,
                  size: 24,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                destination.label,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: isSelected ? _Destination.iconColor : null,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Destination {
  const _Destination({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;

  static const iconColor = Color(0xFF662C90);
  static const backgroundColor = Color(0xFFF2E5FA);
}

const _destinations = [
  _Destination(
    label: 'Home',
    icon: Icons.home_outlined,
    selectedIcon: Icons.home,
  ),
  _Destination(
    label: 'Job',
    icon: Icons.business_center_outlined,
    selectedIcon: Icons.business_center,
  ),
  _Destination(
    label: 'Chat',
    icon: Icons.forum_outlined,
    selectedIcon: Icons.forum,
  ),
  _Destination(label: 'Menu', icon: Icons.menu, selectedIcon: Icons.menu),
];
