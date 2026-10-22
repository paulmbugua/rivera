import 'package:flutter/material.dart';

const _hiddenRecordKeys = <String>{
  'id',
  'creatorId',
  'businessId',
  'userId',
  'campaignId',
  'applicationId',
  'collaborationId',
  'participantId',
  'payoutAccountId',
  'providerPaymentId',
  'providerCheckoutSessionId',
  'passwordHash',
  'deletedAt',
  'updatedAt',
};

/// Presents API records as native mobile content. It intentionally never
/// serializes nested maps or lists, so users do not see database-shaped JSON.
class RiveraRecordView extends StatelessWidget {
  const RiveraRecordView({super.key, required this.data, this.depth = 0});

  final Map<String, dynamic> data;
  final int depth;

  @override
  Widget build(BuildContext context) {
    final entries = data.entries
        .where((entry) => _isVisible(entry.key, entry.value))
        .toList();
    if (entries.isEmpty) {
      return Text(
        'No additional details are available.',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: entries
          .map((entry) => _RecordField(
                name: entry.key,
                value: entry.value,
                parent: data,
                depth: depth,
              ))
          .toList(),
    );
  }
}

class _RecordField extends StatelessWidget {
  const _RecordField({
    required this.name,
    required this.value,
    required this.parent,
    required this.depth,
  });

  final String name;
  final dynamic value;
  final Map<String, dynamic> parent;
  final int depth;

  @override
  Widget build(BuildContext context) {
    if (value is Map) {
      final nested = Map<String, dynamic>.from(value as Map);
      return _RecordSection(
        title: recordLabel(name),
        child: RiveraRecordView(data: nested, depth: depth + 1),
      );
    }
    if (value is List) {
      final values = value as List;
      return _RecordSection(
        title: recordLabel(name),
        child: values.isEmpty
            ? const Text('Nothing here yet.')
            : values.every((item) => item is! Map)
                ? Wrap(
                    spacing: 7,
                    runSpacing: 7,
                    children: values
                        .map((item) => Chip(
                              visualDensity: VisualDensity.compact,
                              label: Text(recordValue(item)),
                            ))
                        .toList(),
                  )
                : Column(
                    children: values.indexed.map((indexed) {
                      final item = indexed.$2;
                      if (item is! Map) return Text(recordValue(item));
                      final map = Map<String, dynamic>.from(item);
                      final heading = recordItemTitle(map, indexed.$1 + 1);
                      return Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 9),
                        padding: const EdgeInsets.all(13),
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest
                              .withValues(alpha: .42),
                          borderRadius: BorderRadius.circular(13),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(heading,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w800)),
                            const SizedBox(height: 8),
                            RiveraRecordView(data: map, depth: depth + 1),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor.withValues(alpha: .5),
          ),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 4,
            child: Text(
              recordLabel(name),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            flex: 6,
            child: Text(
              recordValue(value, key: name, parent: parent),
              textAlign: TextAlign.end,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RecordSection extends StatelessWidget {
  const _RecordSection({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontFamily: 'Arial',
                  color: Theme.of(context).colorScheme.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: .7,
                ),
              ),
              const SizedBox(height: 9),
              child,
            ],
          ),
        ),
      );
}

bool _isVisible(String key, dynamic value) {
  if (value == null || _hiddenRecordKeys.contains(key)) return false;
  if (key.endsWith('Id') && key != 'referenceId') return false;
  if (value is String && value.trim().isEmpty) return false;
  return true;
}

String recordItemTitle(Map<String, dynamic> item, int position) {
  for (final key in const [
    'title',
    'name',
    'displayName',
    'businessName',
    'subject',
    'reason',
    'type',
    'status',
  ]) {
    final value = item[key];
    if (value != null && value.toString().trim().isNotEmpty) {
      return recordValue(value);
    }
  }
  return 'Item $position';
}

String recordLabel(String value) {
  const friendly = <String, String>{
    'createdAt': 'Date',
    'paidAt': 'Paid on',
    'refundedAt': 'Refunded on',
    'balanceAfter': 'Balance after',
    'currencyCode': 'Currency',
    'amountMinor': 'Amount',
    'budgetMinMinor': 'Minimum budget',
    'budgetMaxMinor': 'Maximum budget',
    'freeApplicationCredits': 'Application credits',
    'profileImageUrl': 'Profile image',
    'coverImageUrl': 'Cover image',
  };
  if (friendly[value] case final label?) return label;
  final spaced = value
      .replaceAllMapped(RegExp(r'([a-z0-9])([A-Z])'), (m) => '${m[1]} ${m[2]}')
      .replaceAll('_', ' ')
      .trim();
  if (spaced.isEmpty) return value;
  return '${spaced[0].toUpperCase()}${spaced.substring(1)}';
}

String recordValue(
  dynamic value, {
  String? key,
  Map<String, dynamic>? parent,
}) {
  if (value is bool) return value ? 'Yes' : 'No';
  if (value is num && key != null && key.endsWith('Minor')) {
    final currency = parent?['currencyCode']?.toString() ?? 'USD';
    return '$currency ${(value / 100).toStringAsFixed(2)}';
  }
  final raw = value.toString();
  final date = DateTime.tryParse(raw);
  if (date != null && (raw.contains('T') || (key?.endsWith('At') ?? false))) {
    final local = date.toLocal();
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final hour = local.hour == 0
        ? 12
        : local.hour > 12
            ? local.hour - 12
            : local.hour;
    final minute = local.minute.toString().padLeft(2, '0');
    final period = local.hour >= 12 ? 'PM' : 'AM';
    return '${months[local.month - 1]} ${local.day}, ${local.year} · $hour:$minute $period';
  }
  return raw.replaceAll('_', ' ').toLowerCase().split(' ').map((word) {
    if (word.isEmpty) return word;
    return '${word[0].toUpperCase()}${word.substring(1)}';
  }).join(' ');
}
