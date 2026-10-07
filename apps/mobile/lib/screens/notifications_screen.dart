import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../widgets/common.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key, required this.controller});
  final AppController controller;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Notifications'),
          actions: [
            if (controller.notificationUnread > 0)
              TextButton.icon(
                onPressed: controller.markAllNotificationsRead,
                icon: const Icon(Icons.done_all_rounded, size: 18),
                label: const Text('Read all'),
              ),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: controller.refreshNotifications,
          child: controller.notifications.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 130),
                    RiveraEmpty(
                      icon: Icons.notifications_active_outlined,
                      title: 'You’re all caught up.',
                      copy:
                          'Campaign, message, collaboration and payment moments will appear here.',
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  itemCount: controller.notifications.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 9),
                  itemBuilder: (context, index) {
                    final item = controller.notifications[index];
                    final unread = item['readAt'] == null;
                    return Card(
                      color: unread
                          ? Theme.of(context).colorScheme.primaryContainer
                          : null,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(22),
                        onTap: () => controller.markNotificationRead(
                          textOf(item, ['id'], ''),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(17),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: unread
                                      ? riveraGold
                                      : Theme.of(context)
                                          .colorScheme
                                          .surfaceContainerHighest,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Icon(
                                  _icon(textOf(item, ['type'], 'ACCOUNT')),
                                  color: riveraInk,
                                  size: 21,
                                ),
                              ),
                              const SizedBox(width: 13),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            textOf(item, ['title'], 'Rivera update'),
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ),
                                        if (unread)
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: const BoxDecoration(
                                              color: riveraGreen,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 5),
                                    Text(textOf(item, ['body'], '')),
                                    const SizedBox(height: 9),
                                    Text(
                                      _when(item['createdAt']?.toString()),
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall
                                          ?.copyWith(
                                            color: Theme.of(context)
                                                .colorScheme
                                                .onSurface
                                                .withValues(alpha: .58),
                                          ),
                                    ),
                                  ],
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
      );

  static IconData _icon(String type) {
    final value = type.toUpperCase();
    if (value.contains('MESSAGE')) return Icons.forum_outlined;
    if (value.contains('PAYMENT') || value.contains('FUND')) {
      return Icons.account_balance_wallet_outlined;
    }
    if (value.contains('OFFER')) return Icons.handshake_outlined;
    if (value.contains('DELIVERABLE') || value.contains('REVISION')) {
      return Icons.task_alt_rounded;
    }
    if (value.contains('APPLICATION')) return Icons.description_outlined;
    if (value.contains('REVIEW')) return Icons.star_outline_rounded;
    return Icons.notifications_none_rounded;
  }

  static String _when(String? value) {
    final date = DateTime.tryParse(value ?? '')?.toLocal();
    if (date == null) return 'Just now';
    final difference = DateTime.now().difference(date);
    if (difference.inMinutes < 1) return 'Just now';
    if (difference.inHours < 1) return '${difference.inMinutes}m ago';
    if (difference.inDays < 1) return '${difference.inHours}h ago';
    if (difference.inDays < 7) return '${difference.inDays}d ago';
    return '${date.day}/${date.month}/${date.year}';
  }
}

class NotificationPreferencesScreen extends StatefulWidget {
  const NotificationPreferencesScreen({super.key, required this.controller});
  final AppController controller;

  @override
  State<NotificationPreferencesScreen> createState() =>
      _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState
    extends State<NotificationPreferencesScreen> {
  List<Map<String, dynamic>> items = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final value = await widget.controller.fetch(
        '/settings/notification-preferences',
      );
      if (mounted) setState(() => items = itemsOf(value));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _toggle(Map<String, dynamic> item, String field) async {
    if (item['critical'] == true) return;
    final previous = item[field] == true;
    setState(() => item[field] = !previous);
    try {
      await widget.controller.send(
        'PATCH',
        '/settings/notification-preferences',
        {
          'category': item['category'],
          'emailEnabled': item['emailEnabled'] == true,
          'inAppEnabled': item['inAppEnabled'] == true,
          'pushEnabled': item['pushEnabled'] == true,
        },
      );
    } catch (_) {
      if (mounted) setState(() => item[field] = previous);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Notification preferences')),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 32),
                children: [
                  const SectionHeading(
                    eyebrow: 'Your attention, your choice',
                    title: 'Choose how Rivera reaches you.',
                    copy:
                        'Account security and payment updates always stay on. Everything else is yours to shape.',
                  ),
                  const SizedBox(height: 20),
                  ...items.map(
                    (item) => Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    textOf(item, ['category'])
                                        .replaceAll('_', ' '),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                if (item['critical'] == true)
                                  const StatusPill('REQUIRED'),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 14,
                              children: [
                                _choice(item, 'pushEnabled', 'Push'),
                                _choice(item, 'inAppEnabled', 'In-app'),
                                _choice(item, 'emailEnabled', 'Email'),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
      );

  Widget _choice(Map<String, dynamic> item, String field, String label) =>
      FilterChip(
        selected: item[field] == true,
        label: Text(label),
        avatar: Icon(
          field == 'pushEnabled'
              ? Icons.notifications_active_outlined
              : field == 'emailEnabled'
                  ? Icons.mail_outline_rounded
                  : Icons.inbox_outlined,
          size: 17,
        ),
        onSelected: item['critical'] == true
            ? null
            : (_) => _toggle(item, field),
      );
}
