import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rivera_mobile/core/theme.dart';
import 'package:rivera_mobile/widgets/common.dart';

void main() {
  testWidgets('Rivera brand renders with accessible text', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: riveraTheme(),
        home: const Scaffold(body: RiveraLogo()),
      ),
    );
    expect(find.text('rivera'), findsOneWidget);
    expect(find.text('R.'), findsOneWidget);
  });
}
