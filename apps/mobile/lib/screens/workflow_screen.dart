import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_controller.dart';
import '../core/models.dart';
import '../widgets/common.dart';

class ConversationScreen extends StatefulWidget {
  const ConversationScreen({
    super.key,
    required this.controller,
    required this.conversationId,
    required this.title,
  });

  final AppController controller;
  final String conversationId;
  final String title;

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  final composer = TextEditingController();
  final scroll = ScrollController();
  List<Map<String, dynamic>> messages = const [];
  bool loading = true;
  bool sending = false;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final response = mapOf(await widget.controller.fetch(
        '/conversations/${widget.conversationId}/messages?limit=100',
      ));
      messages = itemsOf(response);
      error = null;
      await widget.controller.send(
        'POST',
        '/conversations/${widget.conversationId}/read',
      );
    } catch (exception) {
      error = exception.toString();
    } finally {
      if (mounted) {
        setState(() => loading = false);
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToEnd());
      }
    }
  }

  void _scrollToEnd() {
    if (scroll.hasClients) {
      scroll.animateTo(
        scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> send() async {
    final text = composer.text.trim();
    if (text.isEmpty || sending) return;
    setState(() {
      sending = true;
      error = null;
    });
    try {
      await widget.controller.send(
        'POST',
        '/conversations/${widget.conversationId}/messages',
        {'content': text},
      );
      composer.clear();
      await load();
    } catch (exception) {
      if (mounted) setState(() => error = exception.toString());
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  void dispose() {
    composer.dispose();
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(widget.title),
          actions: [
            IconButton(
              tooltip: 'Refresh conversation',
              onPressed: load,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              if (error != null)
                MaterialBanner(
                  content: Text(error!),
                  actions: [
                    TextButton(onPressed: load, child: const Text('Retry')),
                  ],
                ),
              Expanded(
                child: loading
                    ? const Center(child: CircularProgressIndicator())
                    : messages.isEmpty
                        ? const RiveraEmpty(
                            icon: Icons.forum_outlined,
                            title: 'Start the conversation',
                            copy:
                                'Keep campaign decisions and next steps together here.',
                          )
                        : ListView.builder(
                            controller: scroll,
                            padding: RiveraLayout.insets(
                              context,
                              top: 12,
                              bottom: 18,
                              maxWidth: RiveraLayout.formWidth,
                            ),
                            itemCount: messages.length,
                            itemBuilder: (_, index) => _MessageBubble(
                              message: messages[index],
                              myUserId: widget.controller.user?.id ?? '',
                            ),
                          ),
              ),
              Container(
                padding: EdgeInsets.fromLTRB(
                  MediaQuery.sizeOf(context).width < 500 ? 12 : 20,
                  10,
                  MediaQuery.sizeOf(context).width < 500 ? 12 : 20,
                  10,
                ),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  border: Border(
                    top: BorderSide(color: Theme.of(context).dividerColor),
                  ),
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: RiveraLayout.formWidth,
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: TextField(
                            controller: composer,
                            minLines: 1,
                            maxLines: 4,
                            maxLength: 3000,
                            textCapitalization: TextCapitalization.sentences,
                            decoration: const InputDecoration(
                              hintText: 'Write a message…',
                              counterText: '',
                            ),
                          ),
                        ),
                        const SizedBox(width: 9),
                        IconButton.filled(
                          tooltip: 'Send message',
                          onPressed: sending ? null : send,
                          icon: sending
                              ? const SizedBox.square(
                                  dimension: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.send_rounded),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.myUserId});
  final Map<String, dynamic> message;
  final String myUserId;

  @override
  Widget build(BuildContext context) {
    final sender = mapOf(message['sender']);
    final system = message['type'] == 'SYSTEM';
    final mine = !system && sender['id']?.toString() == myUserId;
    final name = system
        ? 'Rivera'
        : mine
            ? 'You'
            : '${sender['firstName'] ?? ''} ${sender['lastName'] ?? ''}'.trim();
    return Align(
      alignment: system
          ? Alignment.center
          : mine
              ? Alignment.centerRight
              : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 520),
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: system
              ? Theme.of(context).colorScheme.surfaceContainerHighest
              : mine
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(context).colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name.isEmpty ? 'Rivera member' : name,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: mine
                        ? Theme.of(context).colorScheme.onPrimary
                        : Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 3),
            Text(
              message['content']?.toString() ?? '',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color:
                        mine ? Theme.of(context).colorScheme.onPrimary : null,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              recordValue(message['createdAt'] ?? '', key: 'createdAt'),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: mine
                        ? Theme.of(context)
                            .colorScheme
                            .onPrimary
                            .withValues(alpha: .72)
                        : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class ActionableRecordScreen extends StatefulWidget {
  const ActionableRecordScreen({
    super.key,
    required this.controller,
    required this.title,
    required this.collectionPath,
    required this.detailPath,
    required this.initialData,
  });

  final AppController controller;
  final String title;
  final String collectionPath;
  final String? detailPath;
  final Map<String, dynamic> initialData;

  @override
  State<ActionableRecordScreen> createState() => _ActionableRecordScreenState();
}

class _ActionableRecordScreenState extends State<ActionableRecordScreen> {
  late Map<String, dynamic> data = widget.initialData;
  Map<String, dynamic>? review;
  bool busy = false;

  Future<void> refresh() async {
    final template = widget.detailPath;
    final id = data['id']?.toString() ?? widget.initialData['id']?.toString();
    if (template == null || id == null) return;
    setState(() => busy = true);
    try {
      final path = template
          .replaceAll('{id}', id)
          .replaceAll('{slug}', data['slug']?.toString() ?? id);
      data = mapOf(await widget.controller.fetch(path));
      review = null;
    } catch (exception) {
      if (mounted) {
        showRiveraMessage(context, exception.toString(), error: true);
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> checkout(String id) async {
    setState(() => busy = true);
    try {
      final result = mapOf(await widget.controller.send(
        'POST',
        '/creators/me/applications/$id/checkout',
      ));
      final checkoutUrl = result['checkoutUrl']?.toString();
      if (checkoutUrl == null || checkoutUrl.isEmpty) {
        data = {...data, 'status': 'SUBMITTED'};
        if (mounted) {
          showRiveraMessage(context, 'Proposal submitted successfully.');
        }
        return;
      }
      final opened = await launchUrl(
        Uri.parse(checkoutUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!opened) throw Exception('Secure payment could not be opened.');
      if (mounted) {
        showRiveraMessage(
          context,
          'Complete payment securely, then return and refresh this proposal.',
        );
      }
    } catch (exception) {
      if (mounted) {
        showRiveraMessage(context, exception.toString(), error: true);
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> act(String path, String success) async {
    setState(() => busy = true);
    try {
      final result = await widget.controller.send('POST', path);
      final mapped = mapOf(result);
      if (mapped['application'] is Map) {
        review = mapped;
        data = mapOf(mapped['application']);
      } else if (mapped.isNotEmpty) {
        data = {...data, ...mapped};
      }
      if (mounted) showRiveraMessage(context, success);
    } catch (exception) {
      if (mounted) {
        showRiveraMessage(context, exception.toString(), error: true);
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<bool> confirm(String title, String copy) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(copy),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Not now'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Continue'),
            ),
          ],
        ),
      ) ??
      false;

  List<Widget> actions(BuildContext context) {
    final id = data['id']?.toString() ?? widget.initialData['id']?.toString();
    if (id == null || id.isEmpty) return const [];
    final status = data['status']?.toString() ?? '';
    if (widget.collectionPath == '/creators/me/offers' && status == 'SENT') {
      return [
        FilledButton.icon(
          onPressed: busy
              ? null
              : () async {
                  if (await confirm(
                    'Accept this offer?',
                    'The business will be asked to fund the collaboration before work starts.',
                  )) {
                    await act(
                        '/creators/me/offers/$id/accept', 'Offer accepted.');
                  }
                },
          icon: const Icon(Icons.handshake_outlined),
          label: const Text('Accept offer'),
        ),
        OutlinedButton(
          onPressed: busy
              ? null
              : () async {
                  if (await confirm(
                    'Decline this offer?',
                    'You can continue the conversation, but this offer version will close.',
                  )) {
                    await act(
                        '/creators/me/offers/$id/decline', 'Offer declined.');
                  }
                },
          child: const Text('Decline offer'),
        ),
      ];
    }
    if (widget.collectionPath == '/creators/me/applications') {
      if (status == 'DRAFT') {
        final credits =
            (review?['freeApplicationCredits'] as num?)?.toInt() ?? 0;
        return [
          FilledButton(
            onPressed: busy
                ? null
                : () => act(
                      '/creators/me/applications/$id/review',
                      'Proposal checked and ready for submission.',
                    ),
            child: const Text('Review proposal'),
          ),
          if (review != null && credits > 0)
            OutlinedButton.icon(
              onPressed: busy
                  ? null
                  : () => act(
                        '/creators/me/applications/$id/use-credit',
                        'Proposal submitted with one application credit.',
                      ),
              icon: const Icon(Icons.toll_outlined),
              label: Text('Submit with 1 credit ($credits available)'),
            ),
          if (review != null && credits == 0)
            FilledButton.icon(
              onPressed: busy ? null : () => checkout(id),
              icon: Icon(
                ((mapOf(review!['fee'])['amountMinor'] as num?)?.toInt() ??
                            0) ==
                        0
                    ? Icons.send_outlined
                    : Icons.lock_outline_rounded,
              ),
              label: Text(
                ((mapOf(review!['fee'])['amountMinor'] as num?)?.toInt() ??
                            0) ==
                        0
                    ? 'Submit free application'
                    : 'Continue to secure payment',
              ),
            ),
        ];
      }
      if (const ['SUBMITTED', 'VIEWED', 'SHORTLISTED', 'OFFERED']
          .contains(status)) {
        return [
          OutlinedButton(
            onPressed: busy
                ? null
                : () async {
                    if (await confirm(
                      'Withdraw this proposal?',
                      'Application fees and credits are not automatically returned.',
                    )) {
                      await act(
                        '/creators/me/applications/$id/withdraw',
                        'Proposal withdrawn.',
                      );
                    }
                  },
            child: const Text('Withdraw proposal'),
          ),
        ];
      }
    }
    if (widget.collectionPath == '/business/campaigns') {
      final controls = <Widget>[];
      if (status == 'DRAFT') {
        controls.add(FilledButton(
          onPressed: busy
              ? null
              : () =>
                  act('/business/campaigns/$id/publish', 'Campaign published.'),
          child: const Text('Publish campaign'),
        ));
      }
      if (status == 'ACTIVE') {
        controls.add(OutlinedButton(
          onPressed: busy
              ? null
              : () => act('/business/campaigns/$id/pause', 'Campaign paused.'),
          child: const Text('Pause campaign'),
        ));
      }
      if (status == 'PAUSED') {
        controls.add(FilledButton(
          onPressed: busy
              ? null
              : () =>
                  act('/business/campaigns/$id/resume', 'Campaign resumed.'),
          child: const Text('Resume campaign'),
        ));
      }
      if (const ['ACTIVE', 'PAUSED'].contains(status)) {
        controls.add(OutlinedButton(
          onPressed: busy
              ? null
              : () => act('/business/campaigns/$id/close', 'Campaign closed.'),
          child: const Text('Close campaign'),
        ));
      }
      return controls;
    }
    return const [];
  }

  @override
  Widget build(BuildContext context) {
    final buttons = actions(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          if (widget.detailPath != null)
            IconButton(
              tooltip: 'Refresh details',
              onPressed: busy ? null : refresh,
              icon: const Icon(Icons.refresh_rounded),
            ),
        ],
      ),
      body: RiveraPage(
        maxWidth: RiveraLayout.formWidth,
        children: [
          const Eyebrow('OVERVIEW'),
          const SizedBox(height: 9),
          Text(widget.title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 16),
          RiveraRecordView(data: data),
          if (review != null) ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(15),
                child: Text(
                  'Rivera fee: ${recordValue(review!['fee'] is Map ? mapOf(review!['fee'])['amountMinor'] : 0, key: 'amountMinor', parent: mapOf(review!['fee']))}',
                ),
              ),
            ),
          ],
          if (buttons.isNotEmpty) ...[
            const SizedBox(height: 16),
            ...buttons.expand((button) => [button, const SizedBox(height: 9)]),
          ],
        ],
      ),
    );
  }
}
