import 'package:dartz/dartz.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/core/errors/failures.dart';
import 'package:getx_starter/features/auth/login/presentation/controllers/register_controller.dart';
import 'package:getx_starter/features/login/presentation/views/pages/register/register_page.dart';

import '../mocks/mocks.mocks.dart';

// Use a taller test surface so all fields fit without scrolling
const Size _testSize = Size(800, 1400);

Widget _buildTestWidget(RegisterController controller) {
  Get.put<RegisterController>(controller);
  return MediaQuery(
    data: const MediaQueryData(size: _testSize),
    child: const GetMaterialApp(home: RegisterPage()),
  );
}

void main() {
  late MockRegisterUseCase mockRegisterUseCase;
  late RegisterController controller;

  setUp(() {
    mockRegisterUseCase = MockRegisterUseCase();
    controller = RegisterController(mockRegisterUseCase);
  });

  tearDown(() => Get.reset());

  // ── Rendering ──────────────────────────────────────────────────────────────

  group('RegisterPage rendering', () {
    testWidgets('renders all key UI elements', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pump();

      expect(find.text('Create account'), findsOneWidget);
      expect(find.text('Sign up to get started'), findsOneWidget);
      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Confirm Password'), findsOneWidget);
      expect(find.text('Create Account'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
    });

    testWidgets('renders 4 TextFormFields', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pump();

      expect(find.byType(TextFormField), findsNWidgets(4));
    });

    testWidgets('renders two password visibility icons', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pump();

      expect(find.byIcon(Icons.visibility_off_rounded), findsNWidgets(2));
    });

    testWidgets('renders password hint text', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pump();

      expect(find.text('Must be at least 6 characters'), findsOneWidget);
    });
  });

  // ── Form validation ────────────────────────────────────────────────────────

  group('RegisterPage form validation', () {
    testWidgets('shows validation errors when form submitted empty', (
      tester,
    ) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pump();

      await tester.tap(find.text('Create Account'));
      await tester.pump();

      expect(find.text('Name is required'), findsOneWidget);
      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
      expect(find.text('Please confirm your password'), findsOneWidget);
    });

    testWidgets('shows mismatch error when passwords differ', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pump();

      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), 'John Doe');
      await tester.enterText(fields.at(1), 'user@email.com');
      await tester.enterText(fields.at(2), 'password123');
      await tester.enterText(fields.at(3), 'differentpass');

      await tester.tap(find.text('Create Account'));
      await tester.pump();

      expect(find.text('Passwords do not match'), findsOneWidget);
    });

    testWidgets('shows name too short error', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pump();

      await tester.enterText(find.byType(TextFormField).first, 'A');
      await tester.tap(find.text('Create Account'));
      await tester.pump();

      expect(find.text('Name must be at least 2 characters'), findsOneWidget);
    });
  });

  // ── Interactions ───────────────────────────────────────────────────────────

  group('RegisterPage interactions', () {
    testWidgets('tapping first visibility icon toggles password field', (
      tester,
    ) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pump();

      expect(controller.isPasswordHidden.value, true);
      await tester.tap(find.byIcon(Icons.visibility_off_rounded).first);
      await tester.pump();
      expect(controller.isPasswordHidden.value, false);
    });

    testWidgets(
      'two visibility toggles operate independently on their own fields',
      (tester) async {
        tester.view.physicalSize = _testSize;
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(_buildTestWidget(controller));
        await tester.pump();

        // Both start hidden
        expect(controller.isPasswordHidden.value, true);
        expect(controller.isConfirmPasswordHidden.value, true);

        // Toggle password — only password changes
        controller.togglePasswordVisibility();
        expect(controller.isPasswordHidden.value, false);
        expect(controller.isConfirmPasswordHidden.value, true);

        // Toggle confirm — only confirm changes
        controller.toggleConfirmPasswordVisibility();
        expect(controller.isPasswordHidden.value, false);
        expect(controller.isConfirmPasswordHidden.value, false);
      },
    );

    testWidgets('shows inline error on registration failure', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const errorMsg = 'Authentication failed. Please try again.';
      when(
        mockRegisterUseCase(any, any),
      ).thenAnswer((_) async => left(const AuthFailure(errorMsg)));

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pump();

      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), 'John Doe');
      await tester.enterText(fields.at(1), 'user@email.com');
      await tester.enterText(fields.at(2), 'password123');
      await tester.enterText(fields.at(3), 'password123');

      await tester.tap(find.text('Create Account'));
      await tester.pumpAndSettle();

      expect(find.text(errorMsg), findsOneWidget);
    });
  });
}
