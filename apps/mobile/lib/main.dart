import 'package:flutter/material.dart';

import 'core/app_controller.dart';
import 'core/theme.dart';
import 'core/google_auth.dart';
import 'core/notification_service.dart';
import 'screens/home_shell.dart';
import 'screens/landing_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/onboarding_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await RiveraGoogleAuth.initialize();
  runApp(const RiveraApp());
}

class RiveraApp extends StatefulWidget {
  const RiveraApp({super.key});
  @override
  State<RiveraApp> createState() => _RiveraAppState();
}

class _RiveraAppState extends State<RiveraApp> with WidgetsBindingObserver {
  final controller = AppController();
  final navigatorKey = GlobalKey<NavigatorState>();
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    controller.addListener(_changed);
    controller.bootstrap();
    RiveraNotifications.instance.initialize(onTap: (_) {
      if (controller.user == null) return;
      navigatorKey.currentState?.push(
        MaterialPageRoute(
          builder: (_) => NotificationsScreen(controller: controller),
        ),
      );
      controller.refreshNotifications();
    }).catchError((_) {});
  }

  void _changed() => setState(() {});
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && controller.user != null) {
      controller.refreshWorkspace();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    controller.removeListener(_changed);
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        navigatorKey: navigatorKey,
        debugShowCheckedModeBanner: false,
        title: 'Rivera',
        theme: riveraTheme(Brightness.light),
        darkTheme: riveraTheme(Brightness.dark),
        themeMode: controller.themeMode,
        scrollBehavior: const MaterialScrollBehavior().copyWith(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
        ),
        home: controller.booting
            ? const RiveraSplash()
            : controller.user == null
                ? LandingScreen(controller: controller)
                : !controller.user!.isAdmin &&
                        !controller.user!.onboardingCompleted
                    ? OnboardingScreen(controller: controller)
                    : HomeShell(controller: controller),
      );
}
