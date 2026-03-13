import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:getx_starter/features/splash/presentation/controllers/splash_controller.dart';

class SplashPage extends GetView<SplashController> {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: _SplashAnimator());
  }
}

class _SplashAnimator extends StatefulWidget {
  const _SplashAnimator();

  @override
  State<_SplashAnimator> createState() => _SplashAnimatorState();
}

class _SplashAnimatorState extends State<_SplashAnimator>
    with TickerProviderStateMixin {
  // ── Controllers ──────────────────────────────────────────────────────────
  late final AnimationController _logoController;
  late final AnimationController _textController;
  late final AnimationController _pulseController;
  late final AnimationController _orbController;

  // ── Logo animations ───────────────────────────────────────────────────────
  late final Animation<double> _logoScale;
  late final Animation<double> _logoOpacity;
  late final Animation<double> _logoRotate;

  // ── Text animations ───────────────────────────────────────────────────────
  late final Animation<double> _textOpacity;
  late final Animation<Offset> _textSlide;

  // ── Pulse (ring behind logo) ──────────────────────────────────────────────
  late final Animation<double> _pulseScale;
  late final Animation<double> _pulseOpacity;

  // ── Floating orbs ─────────────────────────────────────────────────────────
  late final Animation<double> _orbFloat;

  @override
  void initState() {
    super.initState();

    // ── Logo: scale + fade + slight spin on entry (0 → 800 ms) ─────────────
    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _logoScale = CurvedAnimation(
      parent: _logoController,
      curve: Curves.elasticOut,
    );
    _logoOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeIn),
      ),
    );
    _logoRotate = Tween<double>(begin: -0.15, end: 0).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.elasticOut),
    );

    // ── Text: slide up + fade in (starts at 600 ms, duration 600 ms) ────────
    _textController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _textOpacity = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(parent: _textController, curve: Curves.easeOut));
    _textSlide = Tween<Offset>(begin: const Offset(0, 0.4), end: Offset.zero)
        .animate(
          CurvedAnimation(parent: _textController, curve: Curves.easeOutCubic),
        );

    // ── Pulse ring: repeating scale + fade ──────────────────────────────────
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat();
    _pulseScale = Tween<double>(
      begin: 1.0,
      end: 2.2,
    ).animate(CurvedAnimation(parent: _pulseController, curve: Curves.easeOut));
    _pulseOpacity = Tween<double>(
      begin: 0.55,
      end: 0.0,
    ).animate(CurvedAnimation(parent: _pulseController, curve: Curves.easeOut));

    // ── Floating orbs: gentle oscillation ───────────────────────────────────
    _orbController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat(reverse: true);
    _orbFloat = Tween<double>(
      begin: -12,
      end: 12,
    ).animate(CurvedAnimation(parent: _orbController, curve: Curves.easeInOut));

    // ── Sequence: logo → text ────────────────────────────────────────────────
    _logoController.forward().then((_) {
      Future.delayed(const Duration(milliseconds: 100), () {
        if (mounted) _textController.forward();
      });
    });
  }

  @override
  void dispose() {
    _logoController.dispose();
    _textController.dispose();
    _pulseController.dispose();
    _orbController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0F0C29), Color(0xFF302B63), Color(0xFF24243E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          // ── Floating orbs (decorative) ─────────────────────────────────
          AnimatedBuilder(
            animation: _orbFloat,
            builder: (_, __) => Stack(
              children: [
                Positioned(
                  top: size.height * 0.12 + _orbFloat.value,
                  left: size.width * 0.08,
                  child: _Orb(
                    size: 120,
                    color: const Color(0xFF7C6FCD).withAlpha(60),
                  ),
                ),
                Positioned(
                  bottom: size.height * 0.18 - _orbFloat.value,
                  right: size.width * 0.06,
                  child: _Orb(
                    size: 90,
                    color: const Color(0xFF4FACFE).withAlpha(50),
                  ),
                ),
                Positioned(
                  top: size.height * 0.45 + _orbFloat.value * 0.5,
                  right: size.width * 0.15,
                  child: _Orb(
                    size: 55,
                    color: const Color(0xFFA18CD1).withAlpha(40),
                  ),
                ),
              ],
            ),
          ),

          // ── Centre content ──────────────────────────────────────────────
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Pulse ring + logo
                AnimatedBuilder(
                  animation: Listenable.merge([
                    _pulseController,
                    _logoController,
                  ]),
                  builder: (_, __) {
                    return SizedBox(
                      width: 160,
                      height: 160,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Pulse ring
                          Transform.scale(
                            scale: _pulseScale.value,
                            child: Opacity(
                              opacity: _pulseOpacity.value,
                              child: Container(
                                width: 88,
                                height: 88,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: const Color(0xFF7C6FCD),
                                    width: 2.5,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          // Logo icon
                          Opacity(
                            opacity: _logoOpacity.value,
                            child: Transform.rotate(
                              angle: _logoRotate.value,
                              child: Transform.scale(
                                scale: _logoScale.value,
                                child: Container(
                                  width: 88,
                                  height: 88,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [
                                        Color(0xFF7C6FCD),
                                        Color(0xFF4FACFE),
                                      ],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    borderRadius: BorderRadius.circular(26),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(
                                          0xFF7C6FCD,
                                        ).withAlpha(140),
                                        blurRadius: 32,
                                        spreadRadius: 4,
                                        offset: const Offset(0, 10),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(
                                    Icons.local_fire_department_rounded,
                                    size: 46,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),

                const SizedBox(height: 36),

                // App name + tagline
                FadeTransition(
                  opacity: _textOpacity,
                  child: SlideTransition(
                    position: _textSlide,
                    child: Column(
                      children: [
                        ShaderMask(
                          shaderCallback: (bounds) => const LinearGradient(
                            colors: [Color(0xFFA18CD1), Color(0xFF4FACFE)],
                          ).createShader(bounds),
                          child: const Text(
                            'GetX Starter',
                            style: TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Clean • Scalable • Production-ready',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.white.withAlpha(140),
                            fontWeight: FontWeight.w400,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Loading dots at bottom ──────────────────────────────────────
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: FadeTransition(
              opacity: _textOpacity,
              child: const _LoadingDots(),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

class _Orb extends StatelessWidget {
  final double size;
  final Color color;
  const _Orb({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color),
    );
  }
}

class _LoadingDots extends StatefulWidget {
  const _LoadingDots();

  @override
  State<_LoadingDots> createState() => _LoadingDotsState();
}

class _LoadingDotsState extends State<_LoadingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (i) {
        return AnimatedBuilder(
          animation: _ctrl,
          builder: (_, __) {
            // Each dot is offset by 200 ms
            final t = (_ctrl.value - i * 0.25).clamp(0.0, 1.0);
            final bounce = (t < 0.5 ? t * 2 : (1 - t) * 2);
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 5),
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Color.lerp(
                  Colors.white.withAlpha(60),
                  const Color(0xFF7C6FCD),
                  bounce,
                ),
              ),
              transform: Matrix4.translationValues(0, -8 * bounce, 0),
            );
          },
        );
      }),
    );
  }
}
