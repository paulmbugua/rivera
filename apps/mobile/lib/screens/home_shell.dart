import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/theme.dart';
import 'account_screen.dart';
import 'dashboard_screen.dart';
import 'marketplace_screen.dart';
import 'workspace_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.controller});
  final AppController controller;
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardScreen(
        controller: widget.controller,
        openTab: (value) => setState(() => index = value),
      ),
      PublicMarketplaceScreen(controller: widget.controller, embedded: true),
      WorkspaceScreen(controller: widget.controller),
      WorkspaceScreen(controller: widget.controller, financeOnly: true),
      AccountScreen(controller: widget.controller),
    ];
    return Scaffold(
      body: SafeArea(
        child: IndexedStack(index: index, children: pages),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore_rounded),
            label: 'Discover',
          ),
          NavigationDestination(
            icon: Icon(Icons.work_outline_rounded),
            selectedIcon: Icon(Icons.work_rounded),
            label: 'Work',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet_rounded),
            label: 'Money',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'You',
          ),
        ],
      ),
    );
  }
}

class RiveraSplash extends StatelessWidget {
  const RiveraSplash({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(
        backgroundColor: riveraInk,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'R.',
                style: TextStyle(
                  fontSize: 58,
                  fontWeight: FontWeight.w800,
                  color: riveraPaper,
                ),
              ),
              SizedBox(height: 15),
              Text('rivera',
                  style: TextStyle(fontSize: 25, color: riveraPaper)),
              SizedBox(height: 28),
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                    color: riveraGold, strokeWidth: 2),
              ),
            ],
          ),
        ),
      );
}
