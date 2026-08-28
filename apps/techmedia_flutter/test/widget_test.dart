import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:techmedia_flutter/app/techmedia_flutter_app.dart';
import 'package:techmedia_flutter/core/api/techmedia_api.dart';
import 'package:techmedia_flutter/core/update/app_update_service.dart';
import 'package:techmedia_flutter/features/dashboard/dashboard_list_page.dart';
import 'package:techmedia_flutter/features/dashboard/dashboard_page.dart';
import 'package:techmedia_flutter/features/dashboard/job_detail_page.dart';
import 'package:techmedia_flutter/features/dashboard/messages_sample_page.dart';

void main() {
  test('compares app update versions safely', () {
    expect(isNewerVersion('1.0.2', '1.0.1'), isTrue);
    expect(isNewerVersion('1.0.1', '1.0.1'), isFalse);
    expect(isNewerVersion('1.0.0', '1.0.1'), isFalse);
  });

  testWidgets('shows the TechMedia sign-in screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const TechMediaFlutterApp());

    expect(find.text('Welcome'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('shows the dashboard dock destinations', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: DashboardPage(
          api: TechMediaApi('https://app.techmedia.in/api/platform'),
          session: const UserSession(
            accessToken: 'test-token',
            profile: UserProfile(
              name: 'Vijay Anand',
              email: 'vijay@techmedia.in',
              role: 'admin',
            ),
          ),
          onSignOut: () {},
        ),
      ),
    );

    expect(find.text('Job'), findsOneWidget);
    expect(find.text('Duty'), findsWidgets);
    expect(find.text('Actions'), findsWidgets);
    expect(find.text('Menu'), findsOneWidget);

    await tester.tap(find.text('Job'));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('shows the job detail comments and reply flow', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: JobDetailPage(
          enquiry: const DashboardListItem(
            enquiryNumber: '762',
            title: 'ROG Asus Adopter 240W',
            customer: 'Vee Cee Exports',
            list: 'Spares',
            assignedTo: 'Vijay Anand',
            dueDate: '03 Aug',
            createdBy: 'Vijay Anand',
            createdAgo: '3 days ago',
            lastAction: 'Awaiting customer confirmation',
          ),
        ),
      ),
    );

    expect(find.text('Job #762'), findsOneWidget);
    expect(find.text('Comments'), findsOneWidget);
    expect(find.text('Jobs'), findsOneWidget);
    expect(find.text('Activity'), findsOneWidget);

    await tester.enterText(
      find.byType(TextField),
      'Customer asked for a quotation update.',
    );
    await tester.tap(find.byTooltip('Send reply'));
    await tester.pump();

    expect(find.text('Customer asked for a quotation update.'), findsOneWidget);
  });

  testWidgets('shows the live Messages loading state', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MessagesPage(
          api: TechMediaApi('https://app.techmedia.in/api/platform'),
          session: const UserSession(
            accessToken: 'test-token',
            profile: UserProfile(
              name: 'Vijay Anand',
              email: 'vijay@techmedia.in',
              role: 'admin',
            ),
          ),
        ),
      ),
    );

    expect(find.text('Messages'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
