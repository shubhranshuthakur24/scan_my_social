import 'dart:math' as math;

import 'package:flutter/material.dart';

/// A circular (pill-shaped) container with a purple gradient shadow,
/// rotated by π radians.
class BuildCircle extends StatelessWidget {
  const BuildCircle({super.key});

  @override
  Widget build(BuildContext context) {
    return Transform.rotate(
      angle: math.pi,
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          color: Colors.purple,
          boxShadow: [
            BoxShadow(
              color: Colors.deepPurple.withAlpha(120),
              spreadRadius: 4,
              blurRadius: 15,
              offset: Offset.fromDirection(1.0, 30),
            ),
          ],
          borderRadius: const BorderRadius.all(Radius.circular(200)),
        ),
      ),
    );
  }
}

/// Two [BuildCircle]s stacked vertically inside a fixed-height container.
class StackedCircles extends StatelessWidget {
  const StackedCircles({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 20),
      height: MediaQuery.of(context).size.height * 0.5,
      width: 100,
      child: Stack(
        children: [
          Positioned(
            top: 30,
            child: Transform.rotate(angle: math.pi, child: const BuildCircle()),
          ),
          Positioned(
            top: 130,
            child: Transform.rotate(angle: math.pi, child: const BuildCircle()),
          ),
        ],
      ),
    );
  }
}

/// Scrollable column of [StackedCircles] and a single [BuildCircle].
class InnerColumnWidget extends StatelessWidget {
  const InnerColumnWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(children: const [StackedCircles(), BuildCircle()]);
  }
}
