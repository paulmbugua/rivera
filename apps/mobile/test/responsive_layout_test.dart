import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rivera_mobile/core/app_controller.dart';
import 'package:rivera_mobile/core/theme.dart';
import 'package:rivera_mobile/screens/auth_screen.dart';
import 'package:rivera_mobile/widgets/responsive.dart';

void main() {
  for (final mode in [AuthMode.login, AuthMode.register]) {
    testWidgets('$mode respects large accessibility text on a narrow phone',
        (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final controller = AppController();
      await tester.pumpWidget(MaterialApp(
          theme: riveraTheme(),
          builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: const TextScaler.linear(1.5)),
              child: child!),
          home: AuthScreen(controller: controller, initialMode: mode)));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    });
  }
  for (final size in [
    const Size(320, 640),
    const Size(390, 844),
    const Size(768, 1024),
    const Size(1024, 768)
  ]) {
    for (final mode in [AuthMode.login, AuthMode.register]) {
      testWidgets(
          '$mode fits ${size.width} and remains scrollable with keyboard',
          (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final controller = AppController();
        await tester.pumpWidget(MaterialApp(
            theme: riveraTheme(),
            home: AuthScreen(controller: controller, initialMode: mode)));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        final field =
            find.byType(TextFormField).at(mode == AuthMode.register ? 2 : 0);
        final bounds = tester.getRect(field);
        expect(bounds.width, lessThanOrEqualTo(RiveraLayout.authWidth));
        expect(bounds.left, greaterThanOrEqualTo(16));
        expect(bounds.right, lessThanOrEqualTo(size.width - 16));
        expect(bounds.center.dx, closeTo(size.width / 2, 1));
        tester.view.viewInsets = const FakeViewPadding(bottom: 260);
        addTearDown(tester.view.resetViewInsets);
        await tester.tap(field);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
        controller.dispose();
      });
    }
  }

  testWidgets(
      'shared page supports large text on a narrow phone without clipping',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(
        theme: riveraTheme(),
        home: MediaQuery(
          data: const MediaQueryData(
              size: Size(320, 640), textScaler: TextScaler.linear(2)),
          child: Scaffold(
              body: RiveraPage(children: [
            Text('Your Rivera account',
                style: riveraTheme().textTheme.displaySmall),
            const TextField(
                decoration: InputDecoration(labelText: 'Email address')),
            const SizedBox(height: 16),
            FilledButton(
                onPressed: () {}, child: const Text('Continue securely')),
          ])),
        )));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(tester.getSize(find.byType(FilledButton)).height,
        greaterThanOrEqualTo(48));
  });
}
