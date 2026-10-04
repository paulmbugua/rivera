import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/theme.dart';
import '../widgets/common.dart';
import 'auth_screen.dart';
import 'marketplace_screen.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key, required this.controller});
  final AppController controller;

  void auth(BuildContext context, AuthMode mode) => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AuthScreen(controller: controller, initialMode: mode),
        ),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      const RiveraLogo(),
                      const Spacer(),
                      TextButton(
                        onPressed: () => auth(context, AuthMode.login),
                        child: const Text('Log in'),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 30, 20, 32),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Eyebrow('Where brands meet creators'),
                      const SizedBox(height: 14),
                      Text(
                        'Make work\npeople feel.',
                        style: Theme.of(context)
                            .textTheme
                            .displaySmall
                            ?.copyWith(fontSize: 46, letterSpacing: -1.8),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'A calm place for brands and creators to discover each other, agree on the work and build something genuine.',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: .72),
                            ),
                      ),
                      const SizedBox(height: 22),
                      FilledButton(
                        onPressed: () => auth(context, AuthMode.register),
                        child: const Text('Join Rivera'),
                      ),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                PublicMarketplaceScreen(controller: controller),
                          ),
                        ),
                        icon: const Icon(Icons.explore_outlined),
                        label: const Text('Explore opportunities'),
                      ),
                      const SizedBox(height: 20),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(26),
                        child: Stack(
                          alignment: Alignment.bottomLeft,
                          children: [
                            Image.asset(
                              'assets/rivera-hero-diverse.png',
                              height: 265,
                              width: double.infinity,
                              fit: BoxFit.cover,
                            ),
                            Container(
                              height: 120,
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.transparent,
                                    Color(0xD9062F35)
                                  ],
                                ),
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.all(18),
                              child: Row(
                                children: [
                                  Icon(Icons.favorite_rounded,
                                      color: riveraRose),
                                  SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'Good chemistry matters. Rivera makes room for it.',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontFamily: 'Arial',
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .primaryContainer
                              .withValues(alpha: .45),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          children: [
                            Expanded(
                                child: _TrustPoint(Icons.verified_outlined,
                                    'Verified profiles')),
                            SizedBox(width: 8),
                            Expanded(
                                child: _TrustPoint(Icons.lock_outline_rounded,
                                    'Clear payments')),
                            SizedBox(width: 8),
                            Expanded(
                                child: _TrustPoint(Icons.handshake_outlined,
                                    'Shared workspace')),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}

class _TrustPoint extends StatelessWidget {
  const _TrustPoint(this.icon, this.label);
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 7),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontFamily: 'Arial',
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                ),
          ),
        ],
      );
}
