import 'package:flutter/material.dart';

/// Shared content rails keep forms readable on tablets without scaling text,
/// reducing tap targets, or disabling the user's accessibility text settings.
abstract final class RiveraLayout {
  static const double authWidth = 480;
  static const double formWidth = 720;
  static const double contentWidth = 960;

  static EdgeInsets insets(
    BuildContext context, {
    double maxWidth = formWidth,
    double top = 16,
    double bottom = 32,
  }) {
    final width = MediaQuery.sizeOf(context).width;
    final gutter = width < 600 ? 16.0 : 24.0;
    final side = ((width - maxWidth) / 2).clamp(gutter, double.infinity);
    return EdgeInsets.fromLTRB(side, top, side, bottom);
  }
}

/// Keeps the scroll viewport intact: keyboard avoidance, scroll-to-error,
/// pull-to-refresh and large accessibility text continue to work normally.
class RiveraPage extends StatelessWidget {
  const RiveraPage(
      {super.key,
      required this.children,
      this.maxWidth = RiveraLayout.formWidth,
      this.top = 16,
      this.bottom = 32});
  final List<Widget> children;
  final double maxWidth, top, bottom;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (context, constraints) {
          final gutter = constraints.maxWidth < 600 ? 16.0 : 24.0;
          final side = ((constraints.maxWidth - maxWidth) / 2)
              .clamp(gutter, double.infinity);
          return ListView(
            padding: EdgeInsets.fromLTRB(side, top, side, bottom),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            children: children,
          );
        },
      );
}

class RiveraContent extends StatelessWidget {
  const RiveraContent(
      {super.key,
      required this.child,
      this.maxWidth = RiveraLayout.contentWidth});
  final Widget child;
  final double maxWidth;
  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth), child: child),
      );
}
