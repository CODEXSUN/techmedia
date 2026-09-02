import 'package:flutter/foundation.dart';

class DashboardNavigation extends ChangeNotifier {
  int _selectedIndex = 0;
  var _menuRequested = false;

  int get selectedIndex => _selectedIndex;

  void selectContent(int index) {
    if (_selectedIndex == index) return;
    _selectedIndex = index;
    notifyListeners();
  }

  void selectDockDestination(int index) {
    if (index == 3) {
      _menuRequested = true;
      notifyListeners();
      return;
    }
    selectContent(index == 2 ? 3 : index);
  }

  bool takeMenuRequest() {
    if (!_menuRequested) return false;
    _menuRequested = false;
    return true;
  }
}
