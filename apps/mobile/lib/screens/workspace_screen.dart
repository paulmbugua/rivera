import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../widgets/common.dart';
import 'workflow_screen.dart';

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
  Widget build(BuildContext context) => RiveraPage(
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
                    builder: (_) => feature.path ==
                            '/creators/me/payout-account'
                        ? PayoutSetupScreen(controller: controller)
                        : feature.path == '/creators/me/application-credits'
                            ? ApplicationCreditsScreen(controller: controller)
                            : CollectionScreen(
                                controller: controller, feature: feature),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
}

class PayoutSetupScreen extends StatefulWidget {
  const PayoutSetupScreen({super.key, required this.controller});
  final AppController controller;
  @override
  State<PayoutSetupScreen> createState() => _PayoutSetupScreenState();
}

class _PayoutSetupScreenState extends State<PayoutSetupScreen> {
  final phone = TextEditingController();
  Map<String, dynamic> account = {};
  String? error;
  bool loading = true;
  bool saving = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      account =
          mapOf(await widget.controller.fetch('/creators/me/payout-account'));
      error = null;
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> connect() async {
    if (phone.text.trim().isEmpty) {
      setState(() => error =
          'Enter the Kenyan M-Pesa number that should receive your earnings.');
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await widget.controller.send(
          'POST',
          '/creators/me/payout-account/onboard',
          {'phoneNumber': phone.text.trim()});
      phone.clear();
      await load();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  void dispose() {
    phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final active = account['payoutsEnabled'] == true;
    return Scaffold(
      appBar: AppBar(title: const Text('Payout account')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RiveraPage(
              children: [
                const Eyebrow('RIVERA EARNINGS'),
                const SizedBox(height: 12),
                Text(active ? 'Ready for payouts' : 'Connect M-Pesa',
                    style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 10),
                Text(active
                    ? 'Your Paystack recipient is ready to receive approved Rivera earnings in KES.'
                    : 'Use the Kenyan M-Pesa number registered to the person receiving creator earnings.'),
                const SizedBox(height: 22),
                if (!active) ...[
                  TextField(
                    controller: phone,
                    keyboardType: TextInputType.phone,
                    autofillHints: const [AutofillHints.telephoneNumber],
                    decoration: const InputDecoration(
                        labelText: 'M-Pesa number',
                        hintText: '+254712345678',
                        prefixIcon: Icon(Icons.phone_android_rounded)),
                  ),
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: saving ? null : connect,
                    icon: saving
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.verified_user_outlined),
                    label: Text(saving ? 'Connecting…' : 'Connect M-Pesa'),
                  ),
                ],
                if (error != null) ...[
                  const SizedBox(height: 16),
                  Text(error!,
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.error)),
                ],
              ],
            ),
    );
  }
}

class ApplicationCreditsScreen extends StatefulWidget {
  const ApplicationCreditsScreen({super.key, required this.controller});

  final AppController controller;

  @override
  State<ApplicationCreditsScreen> createState() =>
      _ApplicationCreditsScreenState();
}

class _ApplicationCreditsScreenState extends State<ApplicationCreditsScreen> {
  bool loading = true;
  String? error;
  int balance = 0;
  List<Map<String, dynamic>> history = const [];

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
      final response = mapOf(
        await widget.controller.fetch('/creators/me/application-credits'),
      );
      balance = (response['balance'] as num?)?.toInt() ?? 0;
      history = (response['history'] as List? ?? const [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    } catch (exception) {
      error = exception.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Application credits'),
          actions: [
            IconButton(
              tooltip: 'Refresh credits',
              onPressed: loading ? null : load,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : error != null
                ? RiveraEmpty(
                    icon: Icons.cloud_off_outlined,
                    title: 'Credits are unavailable',
                    copy: error!,
                    action: FilledButton(
                      onPressed: load,
                      child: const Text('Try again'),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: load,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: RiveraLayout.insets(
                        context,
                        top: 12,
                        bottom: 72,
                        maxWidth: RiveraLayout.formWidth,
                      ),
                      children: [
                        const Eyebrow('YOUR APPLICATION BALANCE'),
                        const SizedBox(height: 10),
                        Text(
                          'Apply with confidence.',
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 7),
                        Text(
                          'A free credit can cover one eligible campaign application fee.',
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                        ),
                        const SizedBox(height: 16),
                        _CreditBalanceCard(balance: balance),
                        const SizedBox(height: 22),
                        Text(
                          'Recent activity',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 10),
                        if (history.isEmpty)
                          const RiveraEmpty(
                            icon: Icons.receipt_long_outlined,
                            title: 'No credit activity yet',
                            copy:
                                'Credits you receive or use will appear here.',
                          )
                        else
                          ...history.map((item) => _CreditActivity(item: item)),
                      ],
                    ),
                  ),
      );
}

class _CreditBalanceCard extends StatelessWidget {
  const _CreditBalanceCard({required this.balance});
  final int balance;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Theme.of(context)
                    .colorScheme
                    .onPrimary
                    .withValues(alpha: .13),
                borderRadius: BorderRadius.circular(15),
              ),
              child: Icon(
                Icons.toll_rounded,
                color: Theme.of(context).colorScheme.onPrimary,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$balance',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onPrimary,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  Text(
                    balance == 1 ? 'credit available' : 'credits available',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onPrimary
                              .withValues(alpha: .78),
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
}

class _CreditActivity extends StatelessWidget {
  const _CreditActivity({required this.item});
  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final quantity = (item['quantity'] as num?)?.toInt() ?? 0;
    final positive = quantity >= 0;
    final reason = item['reason']?.toString().trim();
    final type = recordValue(item['type'] ?? (positive ? 'GRANT' : 'USED'));
    final date = recordValue(item['createdAt'] ?? '', key: 'createdAt');
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: (positive ? riveraGreen : riveraGold)
                    .withValues(alpha: .14),
                borderRadius: BorderRadius.circular(13),
              ),
              child: Icon(
                positive ? Icons.add_rounded : Icons.arrow_upward_rounded,
                color: positive ? riveraGreen : const Color(0xFF80591B),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          reason == null || reason.isEmpty ? type : reason,
                          style: Theme.of(context)
                              .textTheme
                              .titleSmall
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                      ),
                      Text(
                        '${positive ? '+' : ''}$quantity',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: positive
                                      ? Theme.of(context).colorScheme.primary
                                      : Theme.of(context).colorScheme.error,
                                  fontWeight: FontWeight.w900,
                                ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$type · $date',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                  if (item['balanceAfter'] != null) ...[
                    const SizedBox(height: 5),
                    Text(
                      'Balance after: ${item['balanceAfter']}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
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
          padding: RiveraLayout.insets(context,
              top: 12, bottom: 100, maxWidth: RiveraLayout.contentWidth),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (_, i) {
            final item = items[i];
            final title = _collectionTitle(item, widget.feature.title);
            final subtitle = _collectionSubtitle(item);
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
                  if (widget.feature.path == '/conversations') {
                    final conversationTitle = _collectionTitle(
                      item,
                      widget.feature.title,
                    );
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ConversationScreen(
                          controller: widget.controller,
                          conversationId: item['id'].toString(),
                          title: conversationTitle,
                        ),
                      ),
                    );
                    return;
                  }
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
                        builder: (_) => ActionableRecordScreen(
                          controller: widget.controller,
                          title: title,
                          collectionPath: widget.feature.path,
                          detailPath: widget.feature.detailPath,
                          initialData: mapOf(detail),
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

String _collectionTitle(
  Map<String, dynamic> item,
  String collection,
) {
  final direct = textOf(
    item,
    const [
      'title',
      'displayName',
      'businessName',
      'name',
      'reference',
      'subject',
      'email',
    ],
    '',
  );
  if (direct.isNotEmpty) return direct;
  for (final nestedKey in const ['campaign', 'creator', 'business']) {
    final nested = mapOf(item[nestedKey]);
    final value = textOf(
      nested,
      const ['title', 'displayName', 'name', 'businessName'],
      '',
    );
    if (value.isNotEmpty) return value;
  }
  return collection;
}

String _collectionSubtitle(Map<String, dynamic> item) {
  final lastMessage = mapOf(item['lastMessage']);
  if (lastMessage['content'] != null) return lastMessage['content'].toString();
  final business = mapOf(item['business']);
  if (business['name'] != null) return business['name'].toString();
  final creator = mapOf(item['creator']);
  if (creator['displayName'] != null) return creator['displayName'].toString();
  return textOf(
    item,
    const ['shortDescription', 'headline', 'description', 'status'],
    'Tap for details',
  );
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
  Widget build(BuildContext context) => RiveraPage(
        children: [
          const Eyebrow('Overview'),
          const SizedBox(height: 10),
          Text(title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 18),
          RiveraRecordView(data: data),
        ],
      );
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
      deliverableTitle = TextEditingController(text: 'TikTok video'),
      deliverableDescription = TextEditingController(),
      deliverableQuantity = TextEditingController(text: '1'),
      min = TextEditingController(),
      max = TextEditingController(),
      slots = TextEditingController(text: '1');
  String currency = 'USD', location = 'GLOBAL', objective = 'BRAND_AWARENESS';
  List<Map<String, dynamic>> categories = const [];
  final selectedCategories = <String>{};
  final selectedPlatforms = <String>{'TIKTOK'};
  bool busy = false, loadingTaxonomy = true;
  String? formError;

  @override
  void initState() {
    super.initState();
    currency = widget.controller.user?.countryCode == 'KE' ? 'KES' : 'USD';
    loadTaxonomy();
  }

  Future<void> loadTaxonomy() async {
    try {
      final result = await widget.controller.fetch('/categories');
      categories = (result as List? ?? const [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      formError = null;
    } catch (_) {
      formError =
          'Campaign categories could not be loaded. Check your connection and try again.';
    } finally {
      if (mounted) setState(() => loadingTaxonomy = false);
    }
  }

  @override
  void dispose() {
    for (final c in [
      title,
      short,
      full,
      product,
      audience,
      outcomes,
      deliverableTitle,
      deliverableDescription,
      deliverableQuantity,
      min,
      max,
      slots,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    if (title.text.trim().length < 2 || short.text.trim().length < 20) {
      setState(() => formError =
          'Add a clear campaign title and a short description of at least 20 characters.');
      return;
    }
    if (selectedCategories.isEmpty) {
      setState(() => formError = 'Choose at least one campaign category.');
      return;
    }
    if (selectedPlatforms.isEmpty) {
      setState(() => formError = 'Choose at least one creator platform.');
      return;
    }
    if (full.text.trim().length < 50) {
      setState(() => formError =
          'Tell creators more about the campaign in at least 50 characters.');
      return;
    }
    if (deliverableTitle.text.trim().length < 2) {
      setState(() => formError = 'Add at least one content deliverable.');
      return;
    }
    setState(() => busy = true);
    try {
      await widget.controller.send('POST', '/business/campaigns', {
        'title': title.text.trim(),
        'shortDescription': short.text.trim(),
        'fullDescription': full.text.trim(),
        'productOrServiceName': product.text.trim(),
        'campaignObjective': objective,
        'targetAudience': audience.text.trim(),
        'expectedOutcomes': outcomes.text.trim(),
        'categoryIds': selectedCategories.toList(),
        'platforms': selectedPlatforms
            .map((platform) => {'platform': platform, 'required': true})
            .toList(),
        'languages': const [
          {'languageCode': 'en', 'required': true},
        ],
        'deliverables': [
          {
            'title': deliverableTitle.text.trim(),
            'description': deliverableDescription.text.trim(),
            'quantity': int.tryParse(deliverableQuantity.text) ?? 1,
            'platform': selectedPlatforms.first,
          },
        ],
        'usageRights': 'TO_BE_DISCUSSED',
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
      if (mounted) setState(() => formError = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('New campaign')),
        body: RiveraPage(
          children: [
            const SectionHeading(
              eyebrow: 'CREATE A CAMPAIGN',
              title: 'A clear brief, in three steps.',
              copy:
                  'Give creators enough context to make a confident proposal.',
            ),
            const SizedBox(height: 16),
            _CampaignSection(
              number: '1',
              title: 'Campaign basics',
              child: Column(
                children: [
                  _field(title, 'Campaign title'),
                  const SizedBox(height: 10),
                  _field(short, 'Short description', lines: 2),
                  const SizedBox(height: 10),
                  _field(product, 'Product or service'),
                  const SizedBox(height: 10),
                  DropdownButtonFormField(
                    initialValue: objective,
                    decoration: const InputDecoration(labelText: 'Objective'),
                    items: const {
                      'BRAND_AWARENESS': 'Brand awareness',
                      'PRODUCT_LAUNCH': 'Product launch',
                      'SALES': 'Sales',
                      'CONTENT_CREATION': 'Content creation',
                    }
                        .entries
                        .map((item) => DropdownMenuItem(
                              value: item.key,
                              child: Text(item.value),
                            ))
                        .toList(),
                    onChanged: (value) =>
                        setState(() => objective = value ?? objective),
                  ),
                  const SizedBox(height: 13),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Campaign categories',
                        style: Theme.of(context).textTheme.labelLarge),
                  ),
                  const SizedBox(height: 7),
                  if (loadingTaxonomy)
                    const LinearProgressIndicator()
                  else
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Wrap(
                        spacing: 7,
                        runSpacing: 7,
                        children: categories.map((category) {
                          final id = category['id'].toString();
                          return FilterChip(
                            label: Text(textOf(category, const ['name'])),
                            selected: selectedCategories.contains(id),
                            onSelected: (selected) => setState(() => selected
                                ? selectedCategories.add(id)
                                : selectedCategories.remove(id)),
                          );
                        }).toList(),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _CampaignSection(
              number: '2',
              title: 'Audience and content',
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Where should the content appear?',
                        style: Theme.of(context).textTheme.labelLarge),
                  ),
                  const SizedBox(height: 7),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Wrap(
                      spacing: 7,
                      children: const [
                        'TIKTOK',
                        'INSTAGRAM',
                        'YOUTUBE',
                        'FACEBOOK'
                      ]
                          .map((platform) => FilterChip(
                                label: Text(platform[0] +
                                    platform.substring(1).toLowerCase()),
                                selected: selectedPlatforms.contains(platform),
                                onSelected: (selected) => setState(() =>
                                    selected
                                        ? selectedPlatforms.add(platform)
                                        : selectedPlatforms.remove(platform)),
                              ))
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 10),
                  _field(audience, 'Target audience', lines: 3),
                  const SizedBox(height: 10),
                  _field(full, 'Full campaign brief', lines: 5),
                  const SizedBox(height: 10),
                  _field(outcomes, 'Expected outcomes', lines: 3),
                  const SizedBox(height: 14),
                  _field(deliverableTitle, 'Content deliverable'),
                  const SizedBox(height: 10),
                  _field(deliverableDescription, 'Content instructions',
                      lines: 2),
                  const SizedBox(height: 10),
                  _field(deliverableQuantity, 'Quantity', number: true),
                ],
              ),
            ),
            const SizedBox(height: 12),
            _CampaignSection(
              number: '3',
              title: 'Budget and reach',
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: _field(min, 'Minimum', number: true)),
                      const SizedBox(width: 9),
                      Expanded(child: _field(max, 'Maximum', number: true)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField(
                          initialValue: currency,
                          decoration:
                              const InputDecoration(labelText: 'Currency'),
                          items: ['USD', 'KES']
                              .map((value) => DropdownMenuItem(
                                    value: value,
                                    child: Text(value),
                                  ))
                              .toList(),
                          onChanged: (value) =>
                              setState(() => currency = value ?? currency),
                        ),
                      ),
                      const SizedBox(width: 9),
                      Expanded(
                          child: _field(slots, 'Creator slots', number: true)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField(
                    initialValue: location,
                    decoration:
                        const InputDecoration(labelText: 'Creator location'),
                    items: const {
                      'GLOBAL': 'Anywhere',
                      'REMOTE': 'Remote',
                    }
                        .entries
                        .map((item) => DropdownMenuItem(
                              value: item.key,
                              child: Text(item.value),
                            ))
                        .toList(),
                    onChanged: (value) =>
                        setState(() => location = value ?? location),
                  ),
                ],
              ),
            ),
            if (formError != null) ...[
              const SizedBox(height: 12),
              Text(
                formError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: busy ? null : save,
              icon: const Icon(Icons.save_outlined),
              label: Text(busy ? 'Saving…' : 'Save campaign draft'),
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

class _CampaignSection extends StatelessWidget {
  const _CampaignSection({
    required this.number,
    required this.title,
    required this.child,
  });
  final String number, title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Theme.of(context).colorScheme.onPrimary,
                    child: Text(number,
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w800)),
                  ),
                  const SizedBox(width: 9),
                  Text(title,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800)),
                ],
              ),
              const SizedBox(height: 14),
              child,
            ],
          ),
        ),
      );
}
