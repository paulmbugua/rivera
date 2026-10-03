import 'dart:convert';

import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../widgets/common.dart';

class FeatureLink {
  const FeatureLink(
    this.title,
    this.copy,
    this.icon,
    this.path, {
    this.detailPath,
    this.accent = riveraGreen,
  });
  final String title, copy, path;
  final String? detailPath;
  final IconData icon;
  final Color accent;
}

class WorkspaceScreen extends StatelessWidget {
  const WorkspaceScreen({
    super.key,
    required this.controller,
    this.financeOnly = false,
  });
  final AppController controller;
  final bool financeOnly;

  List<FeatureLink> get features {
    final user = controller.user!;
    if (user.isAdmin) {
      final all = <FeatureLink>[
        const FeatureLink(
          'Creators',
          'Profiles, visibility and moderation',
          Icons.auto_awesome_outlined,
          '/admin/creators',
          detailPath: '/admin/creators/{id}',
        ),
        const FeatureLink(
          'Businesses',
          'Brand profiles and marketplace presence',
          Icons.storefront_outlined,
          '/admin/businesses',
          detailPath: '/admin/businesses/{id}',
        ),
        const FeatureLink(
          'Campaigns',
          'Every brief and campaign state',
          Icons.campaign_outlined,
          '/admin/campaigns',
          detailPath: '/admin/campaigns/{id}',
        ),
        const FeatureLink(
          'Applications',
          'Proposal activity across Rivera',
          Icons.description_outlined,
          '/admin/applications',
        ),
        const FeatureLink(
          'Verifications',
          'Trust and identity review queue',
          Icons.verified_user_outlined,
          '/admin/verifications',
        ),
        const FeatureLink(
          'Reviews',
          'Community reviews and reports',
          Icons.reviews_outlined,
          '/admin/reviews',
        ),
        const FeatureLink(
          'Reports',
          'Safety and marketplace reports',
          Icons.flag_outlined,
          '/admin/reports',
        ),
        const FeatureLink(
          'Support',
          'Find and support Rivera members',
          Icons.support_agent_outlined,
          '/admin/support/search',
        ),
        const FeatureLink(
          'Categories',
          'Creator discovery taxonomy',
          Icons.category_outlined,
          '/admin/categories',
        ),
        const FeatureLink(
          'Industries',
          'Business industry taxonomy',
          Icons.domain_outlined,
          '/admin/industries',
        ),
        const FeatureLink(
          'Content types',
          'Deliverable taxonomy',
          Icons.video_collection_outlined,
          '/admin/content-types',
        ),
        const FeatureLink(
          'Data requests',
          'Privacy and data operations',
          Icons.privacy_tip_outlined,
          '/admin/data-requests',
        ),
        const FeatureLink(
          'Application fees',
          'Fee rules and credits',
          Icons.price_change_outlined,
          '/admin/application-fees',
          accent: riveraGold,
        ),
        const FeatureLink(
          'Application payments',
          'Creator application payments',
          Icons.receipt_long_outlined,
          '/admin/payments',
          detailPath: '/admin/payments/{id}',
          accent: riveraGold,
        ),
        const FeatureLink(
          'Collaboration payments',
          'Funding and release states',
          Icons.account_balance_wallet_outlined,
          '/admin/collaboration-payments',
          accent: riveraGold,
        ),
        const FeatureLink(
          'Transfers',
          'Creator transfer operations',
          Icons.swap_horiz_rounded,
          '/admin/transfers',
          accent: riveraGold,
        ),
        const FeatureLink(
          'Refunds',
          'Marketplace refunds',
          Icons.currency_exchange_rounded,
          '/admin/refunds',
          accent: riveraGold,
        ),
        const FeatureLink(
          'Payment issues',
          'Investigate payment concerns',
          Icons.report_problem_outlined,
          '/admin/payment-issues',
          accent: riveraGold,
        ),
        const FeatureLink(
          'Payout accounts',
          'Connected creator accounts',
          Icons.account_balance_outlined,
          '/admin/payout-accounts',
          accent: riveraGold,
        ),
        const FeatureLink(
          'Analytics',
          'Marketplace health and trends',
          Icons.insights_outlined,
          '/admin/analytics',
        ),
      ];
      return financeOnly
          ? all.where((e) => e.accent == riveraGold).toList()
          : all.where((e) => e.accent != riveraGold).toList();
    }
    if (user.isBusiness) {
      return financeOnly
          ? const [
              FeatureLink(
                'Collaboration payments',
                'Fund creators and release approved work',
                Icons.account_balance_wallet_outlined,
                '/business/collaboration-payments',
                accent: riveraGold,
              ),
              FeatureLink(
                'Payment issues',
                'Raise and track a payment concern',
                Icons.support_agent_outlined,
                '/business/collaboration-payments',
                accent: riveraGold,
              ),
            ]
          : const [
              FeatureLink(
                'My campaigns',
                'Create, publish and manage briefs',
                Icons.campaign_outlined,
                '/business/campaigns',
                detailPath: '/business/campaigns/{id}',
              ),
              FeatureLink(
                'Applications',
                'Review proposals by campaign',
                Icons.description_outlined,
                '/business/applications/summary',
              ),
              FeatureLink(
                'Collaborations',
                'Track hired creators and deliverables',
                Icons.handshake_outlined,
                '/business/collaboration-summary',
              ),
              FeatureLink(
                'Messages',
                'Keep every partnership in context',
                Icons.forum_outlined,
                '/conversations',
                detailPath: '/conversations/{id}/messages',
              ),
              FeatureLink(
                'Find creators',
                'Discover a voice that fits',
                Icons.person_search_outlined,
                '/creators?limit=50',
              ),
            ];
    }
    return financeOnly
        ? const [
            FeatureLink(
              'Earnings',
              'Approved work and available earnings',
              Icons.trending_up_rounded,
              '/creators/me/earnings',
              accent: riveraGold,
            ),
            FeatureLink(
              'Transfers',
              'Track money moving to you',
              Icons.swap_horiz_rounded,
              '/creators/me/transfers',
              accent: riveraGold,
            ),
            FeatureLink(
              'Payout account',
              'Connect and manage payouts',
              Icons.account_balance_outlined,
              '/creators/me/payout-account',
              accent: riveraGold,
            ),
            FeatureLink(
              'Application payments',
              'Fees, credits and payment history',
              Icons.receipt_long_outlined,
              '/creators/me/payments',
              accent: riveraGold,
            ),
          ]
        : const [
            FeatureLink(
              'Opportunities',
              'Campaigns open to applications',
              Icons.explore_outlined,
              '/campaigns?limit=50',
              detailPath: '/campaigns/{slug}',
            ),
            FeatureLink(
              'Recommended',
              'A closer fit for your profile',
              Icons.auto_awesome_outlined,
              '/creator/campaigns/recommended/list',
            ),
            FeatureLink(
              'Saved campaigns',
              'Ideas you want to revisit',
              Icons.bookmark_outline,
              '/creator/campaigns/saved/list',
            ),
            FeatureLink(
              'Applications',
              'Drafts, reviews and submitted proposals',
              Icons.description_outlined,
              '/creators/me/applications',
              detailPath: '/creators/me/applications/{id}',
            ),
            FeatureLink(
              'Offers',
              'New invitations from brands',
              Icons.mark_email_unread_outlined,
              '/creators/me/offers',
              detailPath: '/creators/me/offers/{id}',
            ),
            FeatureLink(
              'Collaborations',
              'Your active campaign workspaces',
              Icons.handshake_outlined,
              '/creators/me/collaborations',
              detailPath: '/creators/me/collaborations/{id}',
            ),
            FeatureLink(
              'Messages',
              'Conversations with your partners',
              Icons.forum_outlined,
              '/conversations',
              detailPath: '/conversations/{id}/messages',
            ),
            FeatureLink(
              'Application credits',
              'Your free application balance',
              Icons.toll_outlined,
              '/creators/me/application-credits',
            ),
          ];
  }

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        children: [
          SectionHeading(
            eyebrow: financeOnly
                ? 'Money with context'
                : controller.user!.isAdmin
                    ? 'Rivera control room'
                    : 'Your work',
            title: financeOnly
                ? 'Clear at every step.'
                : controller.user!.isAdmin
                    ? 'Care for the marketplace.'
                    : 'Everything moving, in one place.',
            copy: financeOnly
                ? 'Understand every fee, funding state, earning and transfer.'
                : 'Open a space to see the live data from Rivera’s API.',
          ),
          const SizedBox(height: 22),
          ...features.map(
            (feature) => Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 10,
                ),
                leading: Container(
                  padding: const EdgeInsets.all(11),
                  decoration: BoxDecoration(
                    color: feature.accent.withValues(alpha: .14),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Icon(feature.icon, color: feature.accent),
                ),
                title: Text(
                  feature.title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(feature.copy),
                ),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 15),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CollectionScreen(
                        controller: controller, feature: feature),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
}

class CollectionScreen extends StatefulWidget {
  const CollectionScreen({
    super.key,
    required this.controller,
    required this.feature,
  });
  final AppController controller;
  final FeatureLink feature;
  @override
  State<CollectionScreen> createState() => _CollectionScreenState();
}

class _CollectionScreenState extends State<CollectionScreen> {
  dynamic data;
  String? error;
  bool loading = true;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      data = await widget.controller.fetch(widget.feature.path);
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = itemsOf(data);
    final singleton = data is Map && !(data as Map).containsKey('items');
    Widget body;
    if (loading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (error != null) {
      body = RiveraEmpty(
        icon: Icons.cloud_off_outlined,
        title: 'We couldn’t open this space',
        copy: error!,
        action: FilledButton(onPressed: load, child: const Text('Try again')),
      );
    } else if (singleton) {
      body = DetailView(
        title: widget.feature.title,
        data: mapOf(data),
        controller: widget.controller,
      );
    } else if (items.isEmpty) {
      body = RiveraEmpty(
        icon: widget.feature.icon,
        title: 'Nothing here yet',
        copy:
            'When activity begins, it will appear here with all the context you need.',
      );
    } else {
      body = RefreshIndicator(
        onRefresh: load,
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (_, i) {
            final item = items[i];
            final title = textOf(
                item,
                [
                  'title',
                  'displayName',
                  'businessName',
                  'name',
                  'reference',
                  'subject',
                  'email',
                ],
                '${widget.feature.title} item');
            final subtitle = textOf(
                item,
                [
                  'shortDescription',
                  'headline',
                  'description',
                  'status',
                  'createdAt',
                ],
                'Tap for details');
            return Card(
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 10,
                ),
                title: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: item['status'] != null
                    ? StatusPill(item['status'].toString())
                    : const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                onTap: () async {
                  dynamic detail = item;
                  if (widget.feature.detailPath != null) {
                    final path = widget.feature.detailPath!
                        .replaceAll('{id}', '${item['id']}')
                        .replaceAll('{slug}', '${item['slug']}');
                    try {
                      detail = await widget.controller.fetch(path);
                    } catch (_) {}
                  }
                  if (context.mounted) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => Scaffold(
                          appBar: AppBar(title: Text(title)),
                          body: DetailView(
                            title: title,
                            data: mapOf(detail),
                            controller: widget.controller,
                          ),
                        ),
                      ),
                    );
                  }
                },
              ),
            );
          },
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.feature.title),
        actions: [
          IconButton(onPressed: load, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      floatingActionButton: widget.feature.title == 'My campaigns'
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => CampaignEditor(controller: widget.controller),
                ),
              ).then((_) => load()),
              icon: const Icon(Icons.add_rounded),
              label: const Text('New campaign'),
            )
          : null,
      body: body,
    );
  }
}

class DetailView extends StatelessWidget {
  const DetailView({
    super.key,
    required this.title,
    required this.data,
    required this.controller,
  });
  final String title;
  final Map<String, dynamic> data;
  final AppController controller;
  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Eyebrow('Live Rivera record'),
          const SizedBox(height: 10),
          Text(title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 18),
          ...data.entries
              .where(
                (e) =>
                    e.value != null &&
                    !['id', 'passwordHash', 'deletedAt'].contains(e.key),
              )
              .map(
                (e) => Card(
                  margin: const EdgeInsets.only(bottom: 9),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _label(e.key),
                          style: TextStyle(
                            fontFamily: 'Arial',
                            color: Theme.of(context).colorScheme.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: .7,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _value(e.value),
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
        ],
      );
  String _label(String value) => value
      .replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m[1]}')
      .replaceAll('_', ' ')
      .trim()
      .toUpperCase();
  String _value(dynamic value) {
    if (value is Map || value is List) {
      return const JsonEncoder.withIndent('  ').convert(value);
    }
    return value.toString().replaceAll('_', ' ');
  }
}

class CampaignEditor extends StatefulWidget {
  const CampaignEditor({super.key, required this.controller});
  final AppController controller;
  @override
  State<CampaignEditor> createState() => _CampaignEditorState();
}

class _CampaignEditorState extends State<CampaignEditor> {
  final title = TextEditingController(),
      short = TextEditingController(),
      full = TextEditingController(),
      product = TextEditingController(),
      audience = TextEditingController(),
      outcomes = TextEditingController(),
      min = TextEditingController(),
      max = TextEditingController(),
      slots = TextEditingController(text: '1');
  String currency = 'USD', location = 'REMOTE';
  bool busy = false;
  @override
  void dispose() {
    for (final c in [
      title,
      short,
      full,
      product,
      audience,
      outcomes,
      min,
      max,
      slots,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    setState(() => busy = true);
    try {
      await widget.controller.send('POST', '/business/campaigns', {
        'title': title.text.trim(),
        'shortDescription': short.text.trim(),
        'fullDescription': full.text.trim(),
        'productOrServiceName': product.text.trim(),
        'targetAudience': audience.text.trim(),
        'expectedOutcomes': outcomes.text.trim(),
        'budgetMinMinor': ((double.tryParse(min.text) ?? 0) * 100).round(),
        'budgetMaxMinor': ((double.tryParse(max.text) ?? 0) * 100).round(),
        'currencyCode': currency,
        'budgetVisibility': 'PUBLIC',
        'creatorSlots': int.tryParse(slots.text) ?? 1,
        'locationType': location,
        'visibility': 'PUBLIC',
      });
      if (mounted) {
        showRiveraMessage(
          context,
          'Campaign draft created. Add final requirements before publishing.',
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) showRiveraMessage(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('New campaign')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SectionHeading(
              eyebrow: 'Start with clarity',
              title: 'Shape a brief creators can believe in.',
              copy:
                  'Save the foundation now, then add deliverables and requirements before publishing.',
            ),
            const SizedBox(height: 22),
            _field(title, 'Campaign title'),
            const SizedBox(height: 12),
            _field(short, 'Short description', lines: 2),
            const SizedBox(height: 12),
            _field(full, 'Full brief', lines: 6),
            const SizedBox(height: 12),
            _field(product, 'Product or service'),
            const SizedBox(height: 12),
            _field(audience, 'Target audience', lines: 3),
            const SizedBox(height: 12),
            _field(outcomes, 'Expected outcomes', lines: 3),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _field(min, 'Budget min', number: true)),
                const SizedBox(width: 10),
                Expanded(child: _field(max, 'Budget max', number: true)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField(
                    initialValue: currency,
                    decoration: const InputDecoration(labelText: 'Currency'),
                    items: ['USD', 'KES', 'EUR', 'GBP', 'QAR']
                        .map((e) => DropdownMenuItem(value: e, child: Text(e)))
                        .toList(),
                    onChanged: (v) => setState(() => currency = v!),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(child: _field(slots, 'Creator slots', number: true)),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField(
              initialValue: location,
              decoration: const InputDecoration(labelText: 'Location'),
              items: [
                'REMOTE',
                'LOCAL',
                'HYBRID',
                'GLOBAL',
              ].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
              onChanged: (v) => setState(() => location = v!),
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: busy ? null : save,
              child: const Text('Create campaign draft'),
            ),
          ],
        ),
      );
  Widget _field(
    TextEditingController c,
    String label, {
    int lines = 1,
    bool number = false,
  }) =>
      TextField(
        controller: c,
        minLines: lines,
        maxLines: lines,
        keyboardType: number ? TextInputType.number : TextInputType.text,
        decoration: InputDecoration(
          labelText: label,
          alignLabelWithHint: lines > 1,
        ),
      );
}
