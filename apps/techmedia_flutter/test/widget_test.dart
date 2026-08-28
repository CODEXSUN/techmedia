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

  test('converts Frappe rich-text comments to readable mobile text', () {
    final comment = CrmComment.fromJson({
      'id': 'message-1',
      'comment':
          '<p>Test &amp; verify</p><p>Second&nbsp;line<br>Done &#x2713;</p>',
      'createdAt': '2026-08-03T11:42:00.000Z',
      'createdByUserId': 'vijay@example.com',
    });

    expect(comment.comment, 'Test & verify\nSecond line\nDone ✓');
  });

  test('maps Frappe job executions and enquiry activities', () {
    final job = CrmJob.fromJson({
      'id': 762,
      'frappeName': '762',
      'messages': <Object>[],
      'jobs': [
        {
          'name': 'JOBEXE3',
          'employee': 'HR-EMP-00001',
          'createdAt': '2026-08-03T09:17:45.000Z',
          'startTime': '14:47:45',
          'stopTime': '14:48:12',
          'hours': 0.01,
          'employeeCostPerHour': 0,
          'totalCost': 0,
          'status': 'Completed',
        },
      ],
      'activities': [
        {
          'uuid': 'activity-1',
          'action': 'changed',
          'details': 'Vijay changed Status',
          'createdAt': '2026-08-03T09:18:12.000Z',
        },
      ],
    });

    expect(job.jobs.single.name, 'JOBEXE3');
    expect(job.jobs.single.status, 'Completed');
    expect(job.activities.single.details, 'Vijay changed Status');
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
          enableLiveNotifications: false,
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
          api: _FakeTechMediaApi(),
          session: const UserSession(
            accessToken: 'test-token',
            profile: UserProfile(
              email: 'vijay@example.com',
              name: 'Vijay Anand',
              role: 'user',
            ),
          ),
          initialJob: _testCrmJob,
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
    await tester.pumpAndSettle();

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

final _testCrmJob = CrmJob(
  id: 762,
  sourceId: '762',
  number: '762',
  title: 'ROG Asus Adopter 240W',
  customer: 'Vee Cee Exports',
  list: 'Spares',
  dueDate: '03 Aug',
  createdBy: 'Vijay Anand',
  createdAt: DateTime(2026, 8, 3),
  lastAction: 'Awaiting customer confirmation',
  status: 'open',
  priority: 'normal',
  comments: const [],
  jobs: const [],
  activities: const [],
);

class _FakeTechMediaApi extends TechMediaApi {
  _FakeTechMediaApi() : super('https://app.techmedia.in/api/platform');

  CrmJob _job = _testCrmJob;

  @override
  Future<CrmJob> job(String accessToken, String id) async => _job;

  @override
  Future<CrmJob> addJobComment({
    required String accessToken,
    required String id,
    required String comment,
  }) async {
    _job = CrmJob(
      id: _job.id,
      sourceId: _job.sourceId,
      number: _job.number,
      title: _job.title,
      customer: _job.customer,
      list: _job.list,
      dueDate: _job.dueDate,
      createdBy: _job.createdBy,
      createdAt: _job.createdAt,
      lastAction: comment,
      status: _job.status,
      priority: _job.priority,
      comments: [
        ..._job.comments,
        CrmComment(
          id: 'new-comment',
          comment: comment,
          createdAt: DateTime.now(),
          createdByUserId: 'vijay@example.com',
        ),
      ],
      jobs: _job.jobs,
      activities: _job.activities,
    );
    return _job;
  }
}
