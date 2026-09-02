import 'package:flutter/material.dart';

class AppFooterDock extends StatelessWidget {
  const AppFooterDock({
    required this.selectedIndex,
    required this.onDestinationSelected,
    this.jobBadgeCount = 0,
    this.chatBadgeCount = 0,
    super.key,
  });

  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final int jobBadgeCount;
  final int chatBadgeCount;

  @override
  Widget build(BuildContext context) => Material(
    color: Theme.of(context).colorScheme.surface,
    child: DecoratedBox(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFF0ECF2))),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
        child: Row(
          children: List.generate(
            _destinations.length,
            (index) => Expanded(
              child: _DockItem(
                destination: _destinations[index],
                isSelected: index == _selectedDockIndex,
                onTap: () => onDestinationSelected(index),
                badgeCount: switch (index) {
                  1 => jobBadgeCount,
                  2 => chatBadgeCount,
                  _ => 0,
                },
              ),
            ),
          ),
        ),
      ),
    ),
  );

  int get _selectedDockIndex => selectedIndex == 3 ? 2 : selectedIndex;
}

class _DockItem extends StatelessWidget {
  const _DockItem({
    required this.destination,
    required this.isSelected,
    required this.onTap,
    required this.badgeCount,
  });

  final _Destination destination;
  final bool isSelected;
  final VoidCallback onTap;
  final int badgeCount;

  @override
  Widget build(BuildContext context) => Semantics(
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
              child: Badge(
                isLabelVisible: badgeCount > 0,
                label: Text(badgeCount > 99 ? '99+' : '$badgeCount'),
                child: Icon(
                  isSelected ? destination.selectedIcon : destination.icon,
                  color: _Destination.iconColor,
                  size: 24,
                ),
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
