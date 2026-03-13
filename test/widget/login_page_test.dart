import 'dart:async';

import 'package:dartz/dartz.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:get/get.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/core/errors/failures.dart';
import 'package:getx_starter/features/auth/domain/entites/user_entity.dart';
import 'package:getx_starter/features/login/presentation/controllers/login_controller.dart';
import 'package:getx_starter/features/auth/presentation/views/login/login_page.dart';

import '../mocks/mocks.mocks.dart';

// Tall enough to avoid off-screen issues with Sign Up link at the bottom
const Size _testSize = Size(800, 1200);

Widget _buildTestWidget(LoginController controller) {
  Get.put<LoginController>(controller);
  return MediaQuery(
    data: const MediaQueryData(size: _testSize),
    child: GetMaterialApp(
      home: const LoginPage(),
      getPages: [
        GetPage(
          name: '/home',
          page: () => const Scaffold(body: Text('Home')),
        ),
        GetPage(
          name: '/register',
          page: () => const Scaffold(body: Text('Register Page')),
        ),
      ],
    ),
  );
}

void main() {
  late MockLoginUseCase mockLoginUseCase;
  late LoginController controller;

  setUp(() {
    mockLoginUseCase = MockLoginUseCase();
    controller = LoginController(mockLoginUseCase);
  });

  tearDown(() => Get.reset());

  // ── Rendering ──────────────────────────────────────────────────────────────

  group('LoginPage rendering', () {
    testWidgets('renders all key UI elements', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));

      expect(find.text('Welcome back'), findsOneWidget);
      expect(find.text('Sign in to continue'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
      expect(find.text('Forgot password?'), findsOneWidget);
      expect(find.text('Sign Up'), findsOneWidget);
    });

    testWidgets('renders email and password TextFormFields', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      expect(find.byType(TextFormField), findsNWidgets(2));
    });

    testWidgets('shows password visibility toggle icon', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      expect(find.byIcon(Icons.visibility_off_rounded), findsOneWidget);
    });
  });

  // ── Form validation ────────────────────────────────────────────────────────

  group('LoginPage form validation', () {
    testWidgets('shows validation errors when form submitted empty', (
      tester,
    ) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));

      await tester.tap(find.text('Sign In'));
      await tester.pump();

      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('shows invalid email error for bad format', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));

      await tester.enterText(find.byType(TextFormField).first, 'not-an-email');
      await tester.tap(find.text('Sign In'));
      await tester.pump();

      expect(find.text('Enter a valid email address'), findsOneWidget);
    });

    testWidgets('shows password too short error', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));

      await tester.enterText(
        find.byType(TextFormField).first,
        'user@email.com',
      );
      await tester.enterText(find.byType(TextFormField).last, '123');
      await tester.tap(find.text('Sign In'));
      await tester.pump();

      expect(
        find.text('Password must be at least 6 characters'),
        findsOneWidget,
      );
    });
  });

  // ── Interactions ───────────────────────────────────────────────────────────

  group('LoginPage interactions', () {
    testWidgets('tapping visibility icon toggles password field', (
      tester,
    ) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));

      expect(controller.isPasswordHidden.value, true);

      await tester.tap(find.byIcon(Icons.visibility_off_rounded));
      await tester.pump();

      expect(controller.isPasswordHidden.value, false);
      expect(find.byIcon(Icons.visibility_rounded), findsOneWidget);
    });

    testWidgets('shows inline error message on login failure', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const errorMsg = 'No account found for this email.';
      when(
        mockLoginUseCase(any, any),
      ).thenAnswer((_) async => left(const AuthFailure(errorMsg)));

      await tester.pumpWidget(_buildTestWidget(controller));

      await tester.enterText(
        find.byType(TextFormField).first,
        'test@email.com',
      );
      await tester.enterText(find.byType(TextFormField).last, 'password123');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle();

      expect(find.text(errorMsg), findsOneWidget);
    });

    testWidgets('navigates to register when Sign Up is tapped', (tester) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(_buildTestWidget(controller));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sign Up'));
      await tester.pumpAndSettle();

      expect(find.text('Register Page'), findsOneWidget);
    });

    testWidgets('shows CircularProgressIndicator while login is in progress', (
      tester,
    ) async {
      tester.view.physicalSize = _testSize;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      // Arrange: block login permanently so isLoading stays true
      final completer = Completer<Either<Failure, UserEntity>>();
      when(mockLoginUseCase(any, any)).thenAnswer((_) => completer.future);

      await tester.pumpWidget(_buildTestWidget(controller));

      await tester.enterText(
        find.byType(TextFormField).first,
        'test@email.com',
      );
      await tester.enterText(find.byType(TextFormField).last, 'password123');

      // Act: tap sign in — isLoading becomes true before awaiting use case
      await tester.tap(find.text('Sign In'));
      await tester.pump(); // start the microtask

      // Assert: loading spinner visible, button disabled
      expect(controller.isLoading.value, true);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // Complete the future with a failure to let the controller finish cleanly
      completer.complete(left(const AuthFailure('cancelled')));
      await tester.pumpAndSettle();
    });
  });
}
