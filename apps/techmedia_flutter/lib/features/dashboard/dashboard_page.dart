import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/api/techmedia_api.dart';
import 'dashboard_home.dart';
import 'dashboard_list_page.dart';
import 'coming_soon_page.dart';
import 'messages_sample_page.dart';

const _dockVerticalPadding = 8.0;

class DashboardPage extends StatefulWidget {
  const DashboardPage({
    super.key,
    required this.api,
    required this.session,
    required this.onSignOut,
  });

  final TechMediaApi api;
  final UserSession session;
  final VoidCallback onSignOut;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  var _selectedIndex = 0;

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
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: MessageNotificationButton(
              key: const Key('message-notification-button'),
              unreadCount: 3,
              onPressed: _openMessages,
            ),
          ),
        ],
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
        onOpenList: _selectDestination,
      );
    }
    if (_selectedIndex == 2) {
      return const ComingSoonPage(title: 'Duty', icon: Icons.calendar_month);
    }
    if (_selectedIndex == 3) {
      return const ComingSoonPage(title: 'Actions', icon: Icons.bolt);
    }
    return DashboardListPage(
      api: widget.api,
      session: widget.session,
      section: dashboardListSections[_selectedIndex],
    );
  }

  void _onDestinationSelected(int index) {
    if (index == 4) {
      _showMenu();
      return;
    }
    _selectDestination(index);
  }

  void _selectDestination(int index) => setState(() => _selectedIndex = index);

  void _openMessages() {
    Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) =>
            MessagesPage(api: widget.api, session: widget.session),
      ),
    );
  }

  void _showMenu() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Account', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(widget.session.profile.name),
              Text(
                widget.session.profile.email,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.logout),
                title: const Text('Sign out'),
                onTap: () {
                  Navigator.pop(context);
                  widget.onSignOut();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
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
                isSelected: index == selectedIndex,
                onTap: () => onDestinationSelected(index),
              ),
            ),
          ),
        ),
      ),
    );
  }
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
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                height: 36,
                width: 36,
                decoration: BoxDecoration(
                  color: _Destination.backgroundColor.withValues(
                    alpha: isSelected ? 1 : 0.55,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isSelected ? destination.selectedIcon : destination.icon,
                  color: _Destination.iconColor,
                  size: 20,
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
    label: 'Duty',
    icon: Icons.calendar_month_outlined,
    selectedIcon: Icons.calendar_month,
  ),
  _Destination(
    label: 'Actions',
    icon: Icons.bolt_outlined,
    selectedIcon: Icons.bolt,
  ),
  _Destination(label: 'Menu', icon: Icons.menu, selectedIcon: Icons.menu),
];
