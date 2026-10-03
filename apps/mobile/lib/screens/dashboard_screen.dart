import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/theme.dart';
import '../widgets/common.dart';

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
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 34),
        children: [
          const RiveraLogo(),
          const SizedBox(height: 32),
          Eyebrow('$role dashboard'),
          const SizedBox(height: 10),
          Text(
            'Good to see you,\n${user.firstName}.',
            style: Theme.of(context).textTheme.displaySmall,
          ),
          const SizedBox(height: 10),
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
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(22),
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
                const SizedBox(height: 14),
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
                const SizedBox(height: 18),
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
          const SizedBox(height: 24),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 1.12,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: stats.length,
            itemBuilder: (_, i) {
              final stat = stats[i];
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(17),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Icon(
                        stat.icon,
                        color: Theme.of(context).colorScheme.primary,
                        size: 21,
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
              );
            },
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
