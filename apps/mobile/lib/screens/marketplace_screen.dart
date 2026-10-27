import 'package:flutter/material.dart';

import '../core/app_controller.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../widgets/common.dart';

class PublicMarketplaceScreen extends StatefulWidget {
  const PublicMarketplaceScreen({
    super.key,
    required this.controller,
    this.embedded = false,
  });
  final AppController controller;
  final bool embedded;
  @override
  State<PublicMarketplaceScreen> createState() =>
      _PublicMarketplaceScreenState();
}

class _PublicMarketplaceScreenState extends State<PublicMarketplaceScreen>
    with SingleTickerProviderStateMixin {
  late final tabs = TabController(length: 2, vsync: this);
  final search = TextEditingController();
  bool loading = false;

  @override
  void dispose() {
    tabs.dispose();
    search.dispose();
    super.dispose();
  }

  Future<void> runSearch() async {
    setState(() => loading = true);
    try {
      final q = Uri.encodeQueryComponent(search.text.trim());
      if (tabs.index == 0) {
        widget.controller.campaigns = itemsOf(
          await widget.controller.fetch('/campaigns?limit=20&q=$q'),
        );
      } else {
        widget.controller.creators = itemsOf(
          await widget.controller.fetch('/creators?limit=20&q=$q'),
        );
      }
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) showRiveraMessage(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!widget.embedded) ...[
                const RiveraLogo(),
                const SizedBox(height: 28),
              ],
              const SectionHeading(
                eyebrow: 'Discover Rivera',
                title: 'Find work—and people—that feel right.',
                copy:
                    'Browse open campaigns or meet creators with a distinctive point of view.',
              ),
              const SizedBox(height: 20),
              TextField(
                controller: search,
                onSubmitted: (_) => runSearch(),
                decoration: InputDecoration(
                  hintText: 'Search by name, place or idea',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: IconButton(
                    onPressed: runSearch,
                    icon: loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.arrow_forward_rounded),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TabBar(
                controller: tabs,
                onTap: (_) => setState(() {}),
                tabs: const [
                  Tab(text: 'Campaigns'),
                  Tab(text: 'Creators'),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: tabs,
            children: [
              RefreshIndicator(
                onRefresh: widget.controller.loadPublic,
                child: widget.controller.campaigns.isEmpty
                    ? const RiveraEmpty(
                        icon: Icons.campaign_outlined,
                        title: 'Fresh ideas are on their way',
                        copy:
                            'New campaigns will appear here as brands publish them.',
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 30),
                        itemCount: widget.controller.campaigns.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => CampaignCard(
                          item: widget.controller.campaigns[i],
                          controller: widget.controller,
                        ),
                      ),
              ),
              RefreshIndicator(
                onRefresh: widget.controller.loadPublic,
                child: widget.controller.creators.isEmpty
                    ? const RiveraEmpty(
                        icon: Icons.auto_awesome_outlined,
                        title: 'The creator directory is growing',
                        copy: 'Published creator profiles will appear here.',
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 30),
                        itemCount: widget.controller.creators.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => CreatorCard(
                          item: widget.controller.creators[i],
                          controller: widget.controller,
                        ),
                      ),
              ),
            ],
          ),
        ),
      ],
    );
    return widget.embedded
        ? RiveraContent(child: body)
        : Scaffold(
            appBar: AppBar(backgroundColor: riveraCream),
            body: SafeArea(child: RiveraContent(child: body)),
          );
  }
}

class CampaignCard extends StatelessWidget {
  const CampaignCard({super.key, required this.item, required this.controller});
  final Map<String, dynamic> item;
  final AppController controller;
  @override
  Widget build(BuildContext context) {
    final business = mapOf(item['business']);
    final currency = item['currencyCode']?.toString() ?? 'USD';
    final max = item['budgetMaxMinor'] is num
        ? (item['budgetMaxMinor'] as num) / 100
        : null;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                CampaignDetailScreen(controller: controller, campaign: item),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      textOf(
                          business,
                          [
                            'name',
                            'businessName',
                          ],
                          'A Rivera brand'),
                      style: TextStyle(
                        fontFamily: 'Arial',
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                  if (item['status'] != null)
                    StatusPill(item['status'].toString()),
                ],
              ),
              const SizedBox(height: 13),
              Text(
                textOf(item, ['title']),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                textOf(
                    item,
                    [
                      'shortDescription',
                    ],
                    'A new creator opportunity.'),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: .7),
                    ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                children: [
                  _meta(
                    context,
                    Icons.location_on_outlined,
                    item['locationType']?.toString() ??
                        item['campaignCountryCode']?.toString() ??
                        'Flexible',
                  ),
                  if (max != null)
                    _meta(
                      context,
                      Icons.payments_outlined,
                      '$currency ${_compact(max)}',
                    ),
                  _meta(
                    context,
                    Icons.people_outline,
                    '${item['creatorSlots'] ?? 1} spot${item['creatorSlots'] == 1 ? '' : 's'}',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _meta(BuildContext context, IconData icon, String label) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 17, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 5),
          Text(
            label.replaceAll('_', ' '),
            style: const TextStyle(fontFamily: 'Arial', fontSize: 12),
          ),
        ],
      );
}

class CreatorCard extends StatelessWidget {
  const CreatorCard({super.key, required this.item, required this.controller});
  final Map<String, dynamic> item;
  final AppController controller;
  @override
  Widget build(BuildContext context) => Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) =>
                  CreatorDetailScreen(controller: controller, creator: item),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 29,
                  backgroundColor:
                      Theme.of(context).colorScheme.primaryContainer,
                  backgroundImage: item['profileImageUrl'] != null
                      ? NetworkImage(item['profileImageUrl'].toString())
                      : null,
                  child: item['profileImageUrl'] == null
                      ? Text(
                          textOf(
                                  item,
                                  [
                                    'displayName',
                                  ],
                                  'R')
                              .substring(0, 1)
                              .toUpperCase(),
                          style: TextStyle(
                            color: Theme.of(context)
                                .colorScheme
                                .onPrimaryContainer,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 15),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              textOf(item, ['displayName']),
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                          if (item['verificationStatus'] == 'VERIFIED')
                            Padding(
                              padding: const EdgeInsets.only(left: 5),
                              child: Icon(
                                Icons.verified_rounded,
                                size: 18,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        textOf(item, ['headline'], 'Creator on Rivera'),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${item['city'] ?? ''}${item['city'] != null ? ', ' : ''}${item['countryCode'] ?? 'Global'} · ${_compact(item['combinedFollowers'] ?? 0)} followers',
                        style: TextStyle(
                          fontFamily: 'Arial',
                          fontSize: 12,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios_rounded, size: 15),
              ],
            ),
          ),
        ),
      );
}

String _compact(num value) {
  if (value >= 1000000) {
    return '${(value / 1000000).toStringAsFixed(value >= 10000000 ? 0 : 1)}M';
  }
  if (value >= 1000) {
    return '${(value / 1000).toStringAsFixed(value >= 10000 ? 0 : 1)}K';
  }
  return value.toStringAsFixed(value % 1 == 0 ? 0 : 1);
}

class CampaignDetailScreen extends StatefulWidget {
  const CampaignDetailScreen({
    super.key,
    required this.controller,
    required this.campaign,
  });
  final AppController controller;
  final Map<String, dynamic> campaign;
  @override
  State<CampaignDetailScreen> createState() => _CampaignDetailScreenState();
}

class _CampaignDetailScreenState extends State<CampaignDetailScreen> {
  late Map<String, dynamic> item = widget.campaign;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final slug = item['slug'];
    if (slug != null) {
      try {
        final result = mapOf(await widget.controller.fetch('/campaigns/$slug'));
        if (mounted) setState(() => item = result);
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    final business = mapOf(item['business']);
    return Scaffold(
      appBar: AppBar(title: const RiveraLogo()),
      body: RiveraPage(
        children: [
          Eyebrow(textOf(business, ['name'], 'Rivera opportunity')),
          const SizedBox(height: 12),
          Text(
            textOf(item, ['title']),
            style: Theme.of(context).textTheme.displaySmall,
          ),
          const SizedBox(height: 14),
          Text(
            textOf(
                item,
                [
                  'fullDescription',
                  'shortDescription',
                ],
                'Details will be shared soon.'),
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 22),
          _detail(context, 'The brief', Icons.lightbulb_outline, [
            item['campaignObjective'],
            item['targetAudience'],
            item['expectedOutcomes'],
          ]),
          _detail(context, 'Where & when', Icons.location_on_outlined, [
            item['locationType'],
            item['campaignCountryCode'],
            item['campaignCity'],
            item['applicationDeadline'],
          ]),
          _detail(
            context,
            'What you’ll create',
            Icons.auto_awesome_outlined,
            (item['deliverables'] as List? ?? const [])
                .map(
                  (e) => '${mapOf(e)['quantity'] ?? 1} × ${textOf(mapOf(e), [
                        'title'
                      ])}',
                )
                .toList(),
          ),
          if (widget.controller.user?.isCreator == true) ...[
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ApplicationComposer(
                    controller: widget.controller,
                    campaign: item,
                  ),
                ),
              ),
              icon: const Icon(Icons.edit_note_rounded),
              label: const Text('Apply to this campaign'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _detail(
    BuildContext context,
    String title,
    IconData icon,
    Iterable<dynamic> values,
  ) {
    final clean =
        values.where((e) => e != null && e.toString().isNotEmpty).toList();
    if (clean.isEmpty) return const SizedBox.shrink();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 7),
                  ...clean.map(
                    (e) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        e.toString().replaceAll('_', ' '),
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
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
}

class CreatorDetailScreen extends StatelessWidget {
  const CreatorDetailScreen({
    super.key,
    required this.controller,
    required this.creator,
  });
  final AppController controller;
  final Map<String, dynamic> creator;
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const RiveraLogo()),
        body: RiveraPage(
          children: [
            _CreatorProfileHero(creator: creator),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  textOf(
                      creator, ['bio'], 'This creator is shaping their story.'),
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: (creator['categories'] as List? ?? const [])
                  .map((e) => Chip(label: Text(textOf(mapOf(e), ['name']))))
                  .toList(),
            ),
            const SizedBox(height: 18),
            const SectionHeading(eyebrow: 'Selected work', title: 'Portfolio'),
            const SizedBox(height: 12),
            ...(creator['portfolio'] as List? ?? const []).map((e) {
              final p = mapOf(e);
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  title: Text(textOf(p, ['title'])),
                  subtitle: Text(
                    textOf(p, ['brandName', 'description'], 'Independent work'),
                  ),
                  trailing: const Icon(Icons.open_in_new_rounded),
                ),
              );
            }),
          ],
        ),
      );
}

class _CreatorProfileHero extends StatelessWidget {
  const _CreatorProfileHero({required this.creator});
  final Map<String, dynamic> creator;

  @override
  Widget build(BuildContext context) {
    final cover = (creator['coverImageUrl'] ?? '').toString();
    final avatar = (creator['profileImageUrl'] ?? '').toString();
    final location = [creator['city'], creator['countryCode']]
        .where((value) => value != null && value.toString().trim().isNotEmpty)
        .join(', ');
    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: AspectRatio(
        aspectRatio: .88,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (cover.isNotEmpty)
              Image.network(
                cover,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const _CreatorHeroFallback(),
              )
            else
              const _CreatorHeroFallback(),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x16000000),
                    Color(0x8A031813),
                    Color(0xF0031813),
                  ],
                  stops: [0, .53, 1],
                ),
              ),
            ),
            Positioned(
              left: 14,
              right: 14,
              bottom: 14,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xEE0A2721),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0x4DFFFFFF)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x59000000),
                      blurRadius: 22,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    CircleAvatar(
                      radius: 29,
                      backgroundColor: riveraCream,
                      backgroundImage:
                          avatar.isNotEmpty ? NetworkImage(avatar) : null,
                      child: avatar.isEmpty
                          ? const Icon(Icons.person_outline, color: riveraInk)
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (location.isNotEmpty)
                            Text(
                              location.toUpperCase(),
                              style: const TextStyle(
                                color: Color(0xFFD9F59D),
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.25,
                              ),
                            ),
                          const SizedBox(height: 3),
                          Text(
                            textOf(creator, ['displayName']),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontFamily: 'Arial',
                              fontSize: 24,
                              height: 1.05,
                              fontWeight: FontWeight.w800,
                              shadows: [
                                Shadow(color: Colors.black87, blurRadius: 4),
                              ],
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            textOf(creator, ['headline'], 'Creator on Rivera'),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xFFE8F1ED),
                              fontSize: 13,
                              height: 1.35,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CreatorHeroFallback extends StatelessWidget {
  const _CreatorHeroFallback();
  @override
  Widget build(BuildContext context) => const DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF397464), Color(0xFF102E27)],
          ),
        ),
      );
}

class ApplicationComposer extends StatefulWidget {
  const ApplicationComposer({
    super.key,
    required this.controller,
    required this.campaign,
  });
  final AppController controller;
  final Map<String, dynamic> campaign;
  @override
  State<ApplicationComposer> createState() => _ApplicationComposerState();
}

class _ApplicationComposerState extends State<ApplicationComposer> {
  final message = TextEditingController(),
      amount = TextEditingController(),
      days = TextEditingController(text: '7');
  bool busy = false;
  @override
  void dispose() {
    message.dispose();
    amount.dispose();
    days.dispose();
    super.dispose();
  }

  Future<void> save({bool review = false}) async {
    setState(() => busy = true);
    try {
      final draft = mapOf(
        await widget.controller.send(
          'POST',
          '/campaigns/${widget.campaign['id']}/applications/draft',
          {
            'coverMessage': message.text.trim(),
            'proposedRateMinor':
                ((double.tryParse(amount.text) ?? 0) * 100).round(),
            'proposedCurrency': widget.campaign['currencyCode'] ?? 'USD',
            'estimatedDeliveryDays': int.tryParse(days.text) ?? 7,
          },
        ),
      );
      if (review && draft['id'] != null) {
        await widget.controller.send(
          'POST',
          '/creators/me/applications/${draft['id']}/review',
        );
      }
      if (mounted) {
        showRiveraMessage(
          context,
          review
              ? 'Application ready for your final review.'
              : 'Draft saved safely.',
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
        appBar: AppBar(title: const Text('Your proposal')),
        body: RiveraPage(
          children: [
            const Eyebrow('Make a thoughtful first impression'),
            const SizedBox(height: 12),
            Text(
              textOf(widget.campaign, ['title']),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 22),
            TextField(
              controller: message,
              minLines: 6,
              maxLines: 10,
              decoration: const InputDecoration(
                labelText: 'Why are you right for this campaign?',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: amount,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText:
                    'Your proposed fee (${widget.campaign['currencyCode'] ?? 'USD'})',
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: days,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Estimated delivery days',
              ),
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: busy ? null : () => save(review: true),
              child: const Text('Save and review application'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: busy ? null : save,
              child: const Text('Save as draft'),
            ),
          ],
        ),
      );
}
