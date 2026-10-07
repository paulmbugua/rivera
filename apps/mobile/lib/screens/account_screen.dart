import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/api_client.dart';
import '../widgets/common.dart';
import 'workspace_screen.dart';
import 'notifications_screen.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key, required this.controller});
  final AppController controller;
  @override
  Widget build(BuildContext context) {
    final user = controller.user!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 34),
      children: [
        const SectionHeading(
          eyebrow: 'Your Rivera',
          title: 'A profile that keeps growing with you.',
          copy:
              'Shape how you appear, protect your account and choose what Rivera sends you.',
        ),
        const SizedBox(height: 22),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor:
                      Theme.of(context).colorScheme.primaryContainer,
                  backgroundImage: user.profileImageUrl != null
                      ? NetworkImage(user.profileImageUrl!)
                      : null,
                  child: user.profileImageUrl == null
                      ? Text(
                          user.firstName.isEmpty ? 'R' : user.firstName[0],
                          style: TextStyle(
                            fontSize: 24,
                            color: Theme.of(context)
                                .colorScheme
                                .onPrimaryContainer,
                            fontWeight: FontWeight.w800,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.name,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(user.email),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        children: user.roles.map((e) => StatusPill(e)).toList(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        _ThemeChooser(controller: controller),
        const SizedBox(height: 14),
        _tile(
          context,
          Icons.person_outline,
          'Account details',
          'Name, phone, country, city and photo',
          () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => AccountEditor(controller: controller),
            ),
          ),
        ),
        _tile(
          context,
          Icons.badge_outlined,
          'Marketplace profile',
          'Story, contact details, visibility and publishing',
          () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => MarketplaceProfileEditor(controller: controller),
            ),
          ),
        ),
        if (user.isCreator) ...[
          _tile(
            context,
            Icons.share_outlined,
            'Social accounts',
            'Audience, reach and primary channel',
            () => _open(
              context,
              'Social accounts',
              '/creators/me/social-accounts',
            ),
          ),
          _tile(
            context,
            Icons.collections_outlined,
            'Portfolio',
            'Your strongest published work',
            () => _open(context, 'Portfolio', '/creators/me/portfolio'),
          ),
        ],
        if (!user.isAdmin)
          _tile(
            context,
            Icons.verified_user_outlined,
            'Verification',
            'Request and track Rivera verification',
            () => _open(context, 'Verification', '/verifications/my'),
          ),
        _tile(
          context,
          Icons.notifications_none_rounded,
          'Notification preferences',
          'Choose the updates that deserve your attention',
          () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => NotificationPreferencesScreen(
                controller: controller,
              ),
            ),
          ),
        ),
        _tile(
          context,
          Icons.privacy_tip_outlined,
          'Privacy & data',
          'Review and submit data requests',
          () => _open(context, 'Data requests', '/settings/data-requests'),
        ),
        _tile(
          context,
          Icons.lock_outline_rounded,
          'Change password',
          'Keep your Rivera account protected',
          () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PasswordScreen(controller: controller),
            ),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
          onPressed: controller.logout,
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Log out'),
        ),
      ],
    );
  }

  Widget _tile(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap,
  ) =>
      Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
          leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
          title:
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text(subtitle),
          trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
          onTap: onTap,
        ),
      );
  void _open(BuildContext context, String title, String path) => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CollectionScreen(
            controller: controller,
            feature: FeatureLink(
              title,
              'Rivera settings',
              Icons.settings_outlined,
              path,
            ),
          ),
        ),
      );
}

class _ThemeChooser extends StatelessWidget {
  const _ThemeChooser({required this.controller});
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: colors.primaryContainer,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(15),
                      topRight: Radius.circular(15),
                      bottomRight: Radius.circular(15),
                      bottomLeft: Radius.circular(5),
                    ),
                  ),
                  child: Icon(
                    controller.themeMode == ThemeMode.dark
                        ? Icons.dark_mode_rounded
                        : Icons.light_mode_rounded,
                    color: colors.onPrimaryContainer,
                  ),
                ),
                const SizedBox(width: 13),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Appearance',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontFamily: 'Arial',
                        ),
                      ),
                      SizedBox(height: 3),
                      Text('Device mode is the Rivera default.'),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            SegmentedButton<ThemeMode>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment(
                  value: ThemeMode.system,
                  icon: Icon(Icons.phone_android_rounded, size: 18),
                  label: Text('Device'),
                ),
                ButtonSegment(
                  value: ThemeMode.light,
                  icon: Icon(Icons.light_mode_outlined, size: 18),
                  label: Text('Light'),
                ),
                ButtonSegment(
                  value: ThemeMode.dark,
                  icon: Icon(Icons.dark_mode_outlined, size: 18),
                  label: Text('Dark'),
                ),
              ],
              selected: {controller.themeMode},
              onSelectionChanged: (value) {
                controller.setThemeMode(value.first);
              },
              style: ButtonStyle(
                visualDensity: VisualDensity.compact,
                shape: WidgetStatePropertyAll(
                  RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AccountEditor extends StatefulWidget {
  const AccountEditor({super.key, required this.controller});
  final AppController controller;
  @override
  State<AccountEditor> createState() => _AccountEditorState();
}

class _AccountEditorState extends State<AccountEditor> {
  late final first = TextEditingController(
        text: widget.controller.user!.firstName,
      ),
      last = TextEditingController(text: widget.controller.user!.lastName),
      phone = TextEditingController(text: widget.controller.user!.phone),
      country = TextEditingController(
        text: widget.controller.user!.countryCode,
      ),
      city = TextEditingController(text: widget.controller.user!.city),
      image = TextEditingController(
        text: widget.controller.user!.profileImageUrl,
      );
  bool busy = false;
  Future<void> save() async {
    try {
      await widget.controller.updateAccount({
        'firstName': first.text.trim(),
        'lastName': last.text.trim(),
        'phone': phone.text.trim(),
        'countryCode': country.text.trim().toUpperCase(),
        'city': city.text.trim(),
        'profileImageUrl': image.text.trim(),
      });
      if (mounted) {
        showRiveraMessage(context, 'Account details updated.');
        Navigator.pop(context);
      }
    } on ApiException catch (e) {
      if (mounted) showRiveraMessage(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Account details')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundImage:
                        image.text.isNotEmpty ? NetworkImage(image.text) : null,
                    child: image.text.isEmpty
                        ? const Icon(Icons.person_outline, size: 38)
                        : null,
                  ),
                  const SizedBox(height: 8),
                  const Text('Use an uploaded image URL below',
                      style: TextStyle(fontFamily: 'Arial', fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _field(first, 'First name')),
                const SizedBox(width: 10),
                Expanded(child: _field(last, 'Last name')),
              ],
            ),
            const SizedBox(height: 12),
            _field(phone, 'Phone'),
            const SizedBox(height: 12),
            _field(image, 'Profile image URL'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(country, 'Country code')),
                const SizedBox(width: 10),
                Expanded(child: _field(city, 'City')),
              ],
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: busy || widget.controller.busy ? null : save,
              child: const Text('Save changes'),
            ),
          ],
        ),
      );
  Widget _field(TextEditingController c, String label) => TextField(
        controller: c,
        decoration: InputDecoration(labelText: label),
      );
}

class MarketplaceProfileEditor extends StatefulWidget {
  const MarketplaceProfileEditor({super.key, required this.controller});
  final AppController controller;
  @override
  State<MarketplaceProfileEditor> createState() =>
      _MarketplaceProfileEditorState();
}

class _MarketplaceProfileEditorState extends State<MarketplaceProfileEditor> {
  late final Map<String, dynamic> p = widget.controller.profile;
  late final name = TextEditingController(
        text: (p['businessName'] ?? p['displayName'] ?? '').toString(),
      ),
      headline = TextEditingController(
        text: (p['shortDescription'] ?? p['headline'] ?? '').toString(),
      ),
      description = TextEditingController(
        text: (p['description'] ?? p['bio'] ?? '').toString(),
      ),
      slug = TextEditingController(text: (p['slug'] ?? '').toString()),
      website = TextEditingController(
        text: (p['website'] ?? p['websiteUrl'] ?? '').toString(),
      ),
      city = TextEditingController(text: (p['city'] ?? '').toString()),
      country = TextEditingController(
        text: (p['countryCode'] ?? '').toString(),
      );
  Future<void> save() async {
    final business = widget.controller.user!.isBusiness;
    try {
      final updated = await widget.controller.send(
        'PATCH',
        business ? '/businesses/me/profile' : '/creators/me/profile',
        business
            ? {
                'businessName': name.text,
                'slug': slug.text,
                'shortDescription': headline.text,
                'description': description.text,
                'website': website.text,
                'countryCode': country.text.toUpperCase(),
                'city': city.text,
              }
            : {
                'displayName': name.text,
                'slug': slug.text,
                'headline': headline.text,
                'bio': description.text,
                'websiteUrl': website.text,
                'countryCode': country.text.toUpperCase(),
                'city': city.text,
              },
      );
      widget.controller.profile = Map<String, dynamic>.from(updated as Map);
      if (mounted) showRiveraMessage(context, 'Marketplace profile saved.');
    } catch (e) {
      if (mounted) showRiveraMessage(context, e.toString(), error: true);
    }
  }

  Future<void> visibility(String action) async {
    final base = widget.controller.user!.isBusiness ? 'businesses' : 'creators';
    try {
      await widget.controller.send('POST', '/$base/me/$action');
      if (mounted) {
        showRiveraMessage(
          context,
          action == 'publish'
              ? 'Your profile is now live.'
              : 'Your profile is now private.',
        );
      }
      await widget.controller.refreshWorkspace();
      setState(() {});
    } catch (e) {
      if (mounted) showRiveraMessage(context, e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Marketplace profile')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            SectionHeading(
              eyebrow: '${p['profileCompletion'] ?? 0}% complete',
              title: 'Make the right first impression.',
              copy:
                  'Publish when your story feels clear. You can return and refine it any time.',
            ),
            const SizedBox(height: 20),
            _field(
              name,
              widget.controller.user!.isBusiness
                  ? 'Business name'
                  : 'Display name',
            ),
            const SizedBox(height: 12),
            _field(slug, 'Public profile slug'),
            const SizedBox(height: 12),
            _field(
              headline,
              widget.controller.user!.isBusiness
                  ? 'Short description'
                  : 'Headline',
              lines: 2,
            ),
            const SizedBox(height: 12),
            _field(
              description,
              widget.controller.user!.isBusiness ? 'About the business' : 'Bio',
              lines: 6,
            ),
            const SizedBox(height: 12),
            _field(website, 'Website'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(country, 'Country code')),
                const SizedBox(width: 10),
                Expanded(child: _field(city, 'City')),
              ],
            ),
            const SizedBox(height: 20),
            FilledButton(onPressed: save, child: const Text('Save profile')),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => visibility(
                p['profileVisibility'] == 'PUBLIC' ? 'unpublish' : 'publish',
              ),
              child: Text(
                p['profileVisibility'] == 'PUBLIC'
                    ? 'Make profile private'
                    : 'Publish profile',
              ),
            ),
          ],
        ),
      );
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

class PasswordScreen extends StatefulWidget {
  const PasswordScreen({super.key, required this.controller});
  final AppController controller;
  @override
  State<PasswordScreen> createState() => _PasswordScreenState();
}

class _PasswordScreenState extends State<PasswordScreen> {
  final current = TextEditingController(),
      next = TextEditingController(),
      confirm = TextEditingController();
  bool hideCurrent = true, hideNext = true, hideConfirmation = true;
  Future<void> save() async {
    if (next.text.length < 8 ||
        !RegExp('[a-z]').hasMatch(next.text) ||
        !RegExp('[A-Z]').hasMatch(next.text) ||
        !RegExp(r'\d').hasMatch(next.text)) {
      showRiveraMessage(
        context,
        'Use 8 or more characters with uppercase, lowercase and a number.',
        error: true,
      );
      return;
    }
    if (next.text != confirm.text) {
      showRiveraMessage(context, 'New passwords do not match.', error: true);
      return;
    }
    try {
      await widget.controller.changePassword(current.text, next.text);
      if (mounted) {
        showRiveraMessage(context, 'Password changed. Please sign in again.');
        Navigator.popUntil(context, (route) => route.isFirst);
      }
    } catch (e) {
      if (mounted) showRiveraMessage(context, e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Change password')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SectionHeading(
              eyebrow: 'Protect your work',
              title: 'Choose something secure and memorable.',
              copy:
                  'Use 8 or more characters with uppercase, lowercase and a number.',
            ),
            const SizedBox(height: 22),
            _field(current, 'Current password', hideCurrent,
                () => setState(() => hideCurrent = !hideCurrent)),
            const SizedBox(height: 12),
            _field(next, 'New password', hideNext,
                () => setState(() => hideNext = !hideNext)),
            const SizedBox(height: 12),
            _field(confirm, 'Confirm new password', hideConfirmation,
                () => setState(() => hideConfirmation = !hideConfirmation)),
            const SizedBox(height: 22),
            FilledButton(onPressed: save, child: const Text('Change password')),
          ],
        ),
      );
  Widget _field(TextEditingController c, String label, bool hidden,
          VoidCallback toggle) =>
      TextField(
        controller: c,
        obscureText: hidden,
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: IconButton(
            tooltip: hidden
                ? 'Show ${label.toLowerCase()}'
                : 'Hide ${label.toLowerCase()}',
            icon: Icon(hidden
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined),
            onPressed: toggle,
          ),
        ),
      );
}
