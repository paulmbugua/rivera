import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rivera_mobile/core/theme.dart';
import 'package:rivera_mobile/widgets/common.dart';

void main() {
  testWidgets('nested API data is presented without raw JSON or internal IDs',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: riveraTheme(),
        home: const Scaffold(
          body: SingleChildScrollView(
            child: RiveraRecordView(
              data: {
                'id': 'internal-record-id',
                'creatorId': 'internal-creator-id',
                'status': 'IN_PROGRESS',
                'createdAt': '2026-10-10T06:28:57.169Z',
                'history': [
                  {
                    'id': 'internal-history-id',
                    'type': 'GRANT',
                    'quantity': 3,
                    'reason': 'New Creator promotion',
                  },
                ],
              },
            ),
          ),
        ),
      ),
    );

    expect(find.text('History'), findsOneWidget);
    expect(find.text('New Creator Promotion'), findsWidgets);
    expect(find.text('In Progress'), findsOneWidget);
    expect(find.textContaining('internal-'), findsNothing);
    expect(find.textContaining('{'), findsNothing);
    expect(find.textContaining('['), findsNothing);
  });

  test('record values turn API primitives into human language', () {
    expect(recordValue(true), 'Yes');
    expect(recordValue('AWAITING_APPROVAL'), 'Awaiting Approval');
    expect(
      recordValue(12500, key: 'amountMinor', parent: {'currencyCode': 'USD'}),
      'USD 125.00',
    );
    expect(recordLabel('balanceAfter'), 'Balance after');
  });
}
