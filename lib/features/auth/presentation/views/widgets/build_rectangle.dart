import 'package:flutter/material.dart';

/// A simple coloured [Container] wrapper that accepts a child [widget],
/// [padding], and background [color]. Used to compose nested coloured boxes.
class BuildRectangle extends StatelessWidget {
  const BuildRectangle({super.key, this.widget, this.padding, this.color});

  final Widget? widget;
  final EdgeInsets? padding;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(color: color, padding: padding, child: widget);
  }
}
