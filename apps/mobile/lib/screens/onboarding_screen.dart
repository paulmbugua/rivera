import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/api_client.dart';
import '../widgets/common.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.controller});
  final AppController controller;
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final name = TextEditingController(),
      country = TextEditingController(text: 'KE'),
      city = TextEditingController(),
      description = TextEditingController(),
      website = TextEditingController();
  String category = 'Lifestyle',
      platform = 'Instagram',
      industry = 'Technology';
  @override
  void initState() {
    super.initState();
    name.text = widget.controller.user?.name ?? '';
  }

  @override
  void dispose() {
    for (final c in [name, country, city, description, website]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    try {
      final business = widget.controller.user!.isBusiness;
      await widget.controller.completeOnboarding(
        business
            ? {
                'name': name.text.trim(),
                'country': country.text.trim().toUpperCase(),
                'city': city.text.trim(),
                'industry': industry,
                'description': description.text.trim(),
                if (website.text.trim().isNotEmpty)
                  'website': website.text.trim(),
              }
            : {
                'displayName': name.text.trim(),
                'country': country.text.trim().toUpperCase(),
                'city': city.text.trim(),
                'primaryCategory': category,
                'primaryPlatform': platform,
                'bio': description.text.trim(),
              },
      );
      if (mounted) {
        showRiveraMessage(context, 'Your Rivera workspace is ready.');
      }
    } on ApiException catch (e) {
      if (mounted) showRiveraMessage(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final business = widget.controller.user!.isBusiness;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(22),
          children: [
            const RiveraLogo(),
            const SizedBox(height: 34),
            SectionHeading(
              eyebrow: 'Make a memorable first impression',
              title: business
                  ? 'Tell creators what your brand stands for.'
                  : 'Let your point of view come through.',
              copy:
                  'A thoughtful profile makes every future conversation easier.',
            ),
            const SizedBox(height: 24),
            _field(name, business ? 'Business name' : 'Display name'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(country, 'Country code')),
                const SizedBox(width: 10),
                Expanded(child: _field(city, 'City')),
              ],
            ),
            const SizedBox(height: 12),
            if (business) ...[
              DropdownButtonFormField(
                initialValue: industry,
                decoration: const InputDecoration(labelText: 'Industry'),
                items: [
                  'Technology',
                  'Fashion',
                  'Food',
                  'Travel',
                  'Beauty',
                  'Automotive',
                  'Fitness',
                  'Gaming',
                  'Lifestyle',
                  'Other',
                ]
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (v) => setState(() => industry = v!),
              ),
              const SizedBox(height: 12),
            ] else ...[
              DropdownButtonFormField(
                initialValue: category,
                decoration: const InputDecoration(
                  labelText: 'Primary category',
                ),
                items: [
                  'Technology',
                  'Fashion',
                  'Food',
                  'Travel',
                  'Beauty',
                  'Automotive',
                  'Fitness',
                  'Gaming',
                  'Lifestyle',
                  'Other',
                ]
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (v) => setState(() => category = v!),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField(
                initialValue: platform,
                decoration: const InputDecoration(
                  labelText: 'Primary platform',
                ),
                items: [
                  'Instagram',
                  'TikTok',
                  'YouTube',
                  'Facebook',
                  'X',
                  'LinkedIn',
                  'Snapchat',
                  'Twitch',
                  'Blog',
                  'Podcast',
                  'Other',
                ]
                    .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                    .toList(),
                onChanged: (v) => setState(() => platform = v!),
              ),
              const SizedBox(height: 12),
            ],
            _field(
              description,
              business
                  ? 'What does your business do?'
                  : 'Tell brands about your work',
              lines: 5,
            ),
            if (business) ...[
              const SizedBox(height: 12),
              _field(website, 'Website (optional)'),
            ],
            const SizedBox(height: 22),
            FilledButton(
              onPressed: widget.controller.busy ? null : save,
              child: const Text('Complete my profile'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label, {int lines = 1}) =>
      TextField(
        controller: c,
        minLines: lines,
        maxLines: lines,
        decoration: InputDecoration(
          labelText: label,
          alignLabelWithHint: lines > 1,
        ),
      );
}
