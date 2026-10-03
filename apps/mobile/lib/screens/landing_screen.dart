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
                padding: const EdgeInsets.fromLTRB(20, 42, 20, 0),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Eyebrow('Where brands meet creators'),
                      const SizedBox(height: 16),
                      Text(
                        'Ideas feel bigger\nwhen the right people\nmake them together.',
                        style: Theme.of(context)
                            .textTheme
                            .displaySmall
                            ?.copyWith(fontSize: 45),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        'Rivera brings thoughtful brands and distinctive creators into one clear, trusted place to discover, agree and deliver meaningful work.',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: .72),
                            ),
                      ),
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: () => auth(context, AuthMode.register),
                        child: const Text('Find your next partnership'),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                PublicMarketplaceScreen(controller: controller),
                          ),
                        ),
                        icon: const Icon(Icons.explore_outlined),
                        label: const Text('Explore the marketplace'),
                      ),
                      const SizedBox(height: 28),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(28),
                        child: Stack(
                          alignment: Alignment.bottomLeft,
                          children: [
                            Image.asset(
                              'assets/rivera-hero.png',
                              height: 330,
                              width: double.infinity,
                              fit: BoxFit.cover,
                            ),
                            Container(
                              height: 180,
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
                              padding: EdgeInsets.all(22),
                              child: Row(
                                children: [
                                  Icon(Icons.favorite_rounded,
                                      color: riveraRose),
                                  SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'Real partnerships. Clear expectations. Work worth sharing.',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontFamily: 'Arial',
                                        fontWeight: FontWeight.w700,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 38, 20, 40),
                sliver: SliverList.list(
                  children: [
                    const SectionHeading(
                      eyebrow: 'Made for both sides',
                      title: 'One shared place. Two distinct journeys.',
                      copy:
                          'Every screen gives each person the context and confidence they need.',
                    ),
                    const SizedBox(height: 20),
                    _story(
                      context,
                      Icons.storefront_outlined,
                      'For brands',
                      'Turn a clear brief into a partnership. Discover creators, manage applications, fund work and review deliverables.',
                    ),
                    const SizedBox(height: 14),
                    _story(
                      context,
                      Icons.auto_awesome_outlined,
                      'For creators',
                      'Find opportunities that fit your voice. Apply with confidence, collaborate clearly and track every earning.',
                    ),
                    const SizedBox(height: 14),
                    _story(
                      context,
                      Icons.verified_user_outlined,
                      'Built around trust',
                      'Profiles, verification, protected workspaces and transparent payment states make every next step understandable.',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

  Widget _story(
    BuildContext context,
    IconData icon,
    String title,
    String copy,
  ) =>
      Card(
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(13),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  icon,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 7),
                    Text(
                      copy,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: .7),
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}
