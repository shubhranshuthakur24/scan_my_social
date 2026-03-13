import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:getx_starter/presentation/pages/home/home_page.dart';
import 'package:getx_starter/features/auth/widgets/build_circle.dart';
import 'package:getx_starter/features/auth/presentation/views/widgets/build_rectangle.dart';

void main() {
  tearDown(() => Get.reset());

  // ── Rendering ──────────────────────────────────────────────────────────────

  group('HomePage rendering', () {
    testWidgets('renders AppBar with Home title', (tester) async {
      await tester.pumpWidget(const GetMaterialApp(home: HomePage()));

      expect(find.text('Home'), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('renders nested BuildRectangle containers', (tester) async {
      await tester.pumpWidget(const GetMaterialApp(home: HomePage()));

      // 3 nested BuildRectangles in the body
      expect(find.byType(BuildRectangle), findsNWidgets(3));
    });

    testWidgets('renders InnerColumnWidget inside the nested containers', (
      tester,
    ) async {
      await tester.pumpWidget(const GetMaterialApp(home: HomePage()));

      expect(find.byType(InnerColumnWidget), findsOneWidget);
    });

    testWidgets('renders BuildCircle inside InnerColumnWidget', (tester) async {
      await tester.pumpWidget(const GetMaterialApp(home: HomePage()));
      await tester.pump();

      expect(find.byType(BuildCircle), findsWidgets);
    });
  });
}
