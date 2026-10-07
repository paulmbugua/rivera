import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/theme.dart';
import '../widgets/common.dart';
import 'notifications_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({
    super.key,
    required this.controller,
    required this.openTab,
  });
  final AppController controller;
  final ValueChanged<int> openTab;

  @override
  Widget build(BuildContext context) {
    final user = controller.user!;
    final role = user.isAdmin
        ? 'ADMIN'
        : user.isBusiness
            ? 'BUSINESS'
            : 'CREATOR';
    final stats = user.isAdmin
        ? _adminStats()
        : user.isBusiness
            ? _businessStats()
            : _creatorStats();
    return RefreshIndicator(
      onRefresh: controller.refreshWorkspace,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
        children: [
          Row(
            children: [
              const RiveraLogo(),
              const Spacer(),
              Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton.filledTonal(
                    tooltip: 'Notifications',
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            NotificationsScreen(controller: controller),
                      ),
                    ),
                    icon: const Icon(Icons.notifications_none_rounded),
                  ),
                  if (controller.notificationUnread > 0)
                    Positioned(
                      right: -4,
                      top: -5,
                      child: Container(
                        constraints: const BoxConstraints(minWidth: 21),
                        height: 21,
                        alignment: Alignment.center,
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        decoration: BoxDecoration(
                          color: riveraGold,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: Theme.of(context).colorScheme.surface,
                            width: 2,
                          ),
                        ),
                        child: Text(
                          controller.notificationUnread > 99
                              ? '99+'
                              : '${controller.notificationUnread}',
                          style: const TextStyle(
                            color: riveraInk,
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 26),
          Eyebrow('$role dashboard'),
          const SizedBox(height: 9),
          Text(
            'Good to see you, ${user.firstName}.',
            style: Theme.of(context)
                .textTheme
                .displaySmall
                ?.copyWith(fontSize: 36, letterSpacing: -1.2),
          ),
          const SizedBox(height: 8),
          Text(
            user.isBusiness
                ? 'Turn a clear idea into a partnership people will remember.'
                : user.isCreator
                    ? 'Find opportunities that value your point of view and respect your craft.'
                    : 'Help Rivera remain a trusted place for purposeful partnerships.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: .7),
                ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: riveraInk,
              borderRadius: BorderRadius.circular(26),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Eyebrow(
                  user.isAdmin ? 'Today’s focus' : 'Your next best step',
                  light: true,
                ),
                const SizedBox(height: 11),
                Text(
                  user.isBusiness
                      ? 'Bring the right people into the idea.'
                      : user.isCreator
                          ? 'Find the opportunity that feels like you.'
                          : 'Keep the marketplace healthy.',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(color: riveraPaper),
                ),
                const SizedBox(height: 8),
                Text(
                  user.isBusiness
                      ? 'Share a considered brief or revisit the campaigns already moving.'
                      : user.isCreator
                          ? 'Browse fresh opportunities or give your profile one more detail.'
                          : 'Review people, campaigns and requests that need a thoughtful human decision.',
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: riveraPaper.withValues(alpha: .78)),
                ),
                const SizedBox(height: 15),
                FilledButton.tonalIcon(
                  style: FilledButton.styleFrom(
                    backgroundColor: riveraGold,
                    foregroundColor: riveraInk,
                  ),
                  onPressed: () => openTab(user.isAdmin ? 2 : 1),
                  icon: const Icon(Icons.arrow_forward_rounded),
                  label: Text(
                    user.isBusiness
                        ? 'Manage campaigns'
                        : user.isCreator
                            ? 'Explore opportunities'
                            : 'Open operations',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          Text('At a glance', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 11),
          SizedBox(
            height: 132,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: stats.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, i) {
                final stat = stats[i];
                return SizedBox(
                  width: 148,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Icon(
                            stat.icon,
                            color: Theme.of(context).colorScheme.primary,
                            size: 20,
                          ),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Text(
                              stat.value,
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineMedium
                                  ?.copyWith(
                                    fontSize: stat.value.length > 8 ? 20 : 30,
                                  ),
                            ),
                          ),
                          Text(
                            stat.label,
                            maxLines: 2,
                            style: TextStyle(
                              fontFamily: 'Arial',
                              fontSize: 12,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: .66),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  List<_Stat> _creatorStats() => [
        _Stat(
          '${controller.profile['profileCompletion'] ?? 0}%',
          'Profile completion',
          Icons.pie_chart_outline,
        ),
        _Stat(
          '${controller.profile['verificationStatus'] ?? 'PENDING'}',
          'Verification',
          Icons.verified_outlined,
        ),
        _Stat(
          '${controller.dashboard['applicationsSubmitted'] ?? 0}',
          'Applications submitted',
          Icons.send_outlined,
        ),
        _Stat(
          '${controller.dashboard['activeCollaborations'] ?? 0}',
          'Active collaborations',
          Icons.handshake_outlined,
        ),
        _Stat(
          '${controller.dashboard['offersReceived'] ?? 0}',
          'Offers received',
          Icons.mark_email_unread_outlined,
        ),
        _Stat(
          '${controller.dashboard['completedCollaborations'] ?? 0}',
          'Completed',
          Icons.task_alt_rounded,
        ),
      ];
  List<_Stat> _businessStats() => [
        _Stat(
          '${controller.profile['profileCompletion'] ?? 0}%',
          'Profile completion',
          Icons.pie_chart_outline,
        ),
        _Stat(
          '${controller.profile['verificationStatus'] ?? 'PENDING'}',
          'Verification',
          Icons.verified_outlined,
        ),
        _Stat(
          '${controller.dashboard['activeCampaigns'] ?? 0}',
          'Active campaigns',
          Icons.campaign_outlined,
        ),
        _Stat(
          '${controller.dashboard['applicationsReceived'] ?? 0}',
          'Applications received',
          Icons.inbox_outlined,
        ),
        _Stat(
          '${controller.dashboard['creatorsHired'] ?? 0}',
          'Creators hired',
          Icons.people_outline,
        ),
        _Stat(
          '${controller.dashboard['activeCollaborations'] ?? controller.dashboard['fundedCreators'] ?? 0}',
          'Active collaborations',
          Icons.handshake_outlined,
        ),
      ];
  List<_Stat> _adminStats() {
    final entries = controller.dashboard.entries
        .where((e) => e.value is num || e.value is String)
        .take(8);
    if (entries.isEmpty) {
      return [const _Stat('—', 'Marketplace summary', Icons.insights_outlined)];
    }
    return entries
        .map(
          (e) => _Stat(
            '${e.value}',
            e.key.replaceAllMapped(
              RegExp(r'([A-Z])'),
              (m) => ' ${m[1]!.toLowerCase()}',
            ),
            Icons.insights_outlined,
          ),
        )
        .toList();
  }
}

class _Stat {
  const _Stat(this.value, this.label, this.icon);
  final String value, label;
  final IconData icon;
}
