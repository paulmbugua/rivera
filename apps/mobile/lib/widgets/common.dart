import 'package:flutter/material.dart';

import '../core/theme.dart';

class RiveraLogo extends StatelessWidget {
  const RiveraLogo({super.key, this.light = false});
  final bool light;
  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: light ? riveraPaper : riveraInk,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Text(
              'R.',
              style: TextStyle(
                color: light ? riveraInk : riveraPaper,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'rivera',
            style: TextStyle(
              color: light ? riveraPaper : riveraInk,
              fontSize: 23,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      );
}

class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.light = false});
  final String text;
  final bool light;
  @override
  Widget build(BuildContext context) => Row(
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: light ? riveraGold : riveraGreen,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              text.toUpperCase(),
              style: TextStyle(
                fontFamily: 'Arial',
                color: light ? riveraPaper : riveraGreen,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.5,
              ),
            ),
          ),
        ],
      );
}

class SectionHeading extends StatelessWidget {
  const SectionHeading({
    super.key,
    required this.eyebrow,
    required this.title,
    this.copy,
    this.action,
  });
  final String eyebrow, title;
  final String? copy;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Eyebrow(eyebrow),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
              ),
              if (action != null) action!,
            ],
          ),
          if (copy != null) ...[
            const SizedBox(height: 8),
            Text(
              copy!,
              style: Theme.of(context)
                  .textTheme
                  .bodyLarge
                  ?.copyWith(color: riveraInk.withValues(alpha: .72)),
            ),
          ],
        ],
      );
}

class RiveraEmpty extends StatelessWidget {
  const RiveraEmpty({
    super.key,
    required this.icon,
    required this.title,
    required this.copy,
    this.action,
  });
  final IconData icon;
  final String title, copy;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: const BoxDecoration(
                  color: Color(0xFFDDECE7),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: riveraGreen, size: 30),
              ),
              const SizedBox(height: 18),
              Text(
                title,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                copy,
                textAlign: TextAlign.center,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: riveraInk.withValues(alpha: .68)),
              ),
              if (action != null) ...[const SizedBox(height: 18), action!],
            ],
          ),
        ),
      );
}

class StatusPill extends StatelessWidget {
  const StatusPill(this.value, {super.key});
  final String value;
  @override
  Widget build(BuildContext context) {
    final positive = [
      'ACTIVE',
      'OPEN',
      'APPROVED',
      'FUNDED',
      'COMPLETED',
      'PUBLIC',
      'VERIFIED',
    ].contains(value.toUpperCase());
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: positive ? const Color(0xFFDDECE7) : const Color(0xFFF5E6C9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        value.replaceAll('_', ' '),
        style: TextStyle(
          fontFamily: 'Arial',
          color: positive ? riveraGreen : const Color(0xFF80591B),
          fontWeight: FontWeight.w700,
          fontSize: 11,
        ),
      ),
    );
  }
}

void showRiveraMessage(
  BuildContext context,
  String message, {
  bool error = false,
}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor:
            error ? Theme.of(context).colorScheme.error : riveraInk,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Text(message, style: const TextStyle(fontFamily: 'Arial')),
      ),
    );
}
