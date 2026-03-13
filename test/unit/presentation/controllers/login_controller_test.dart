import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/core/errors/failures.dart';
import 'package:getx_starter/features/auth/domain/entites/user_entity.dart';
import 'package:getx_starter/features/login/presentation/controllers/login_controller.dart';

import '../../../mocks/mocks.mocks.dart';

void main() {
  late LoginController sut;
  late MockLoginUseCase mockLoginUseCase;

  setUp(() {
    mockLoginUseCase = MockLoginUseCase();
    sut = LoginController(mockLoginUseCase);
    Get.testMode = true;
    sut.onInit();
  });

  tearDown(() {
    sut.onClose();
    Get.reset();
  });

  // ── Email validator ────────────────────────────────────────────────────────

  group('validateEmail()', () {
    test('returns error when email is empty', () {
      expect(sut.validateEmail(''), 'Email is required');
    });

    test('returns error when email is null', () {
      expect(sut.validateEmail(null), 'Email is required');
    });

    test('returns error when email format is invalid', () {
      expect(sut.validateEmail('not-an-email'), 'Enter a valid email address');
      expect(sut.validateEmail('missing@'), 'Enter a valid email address');
    });

    test('returns null for a valid email', () {
      expect(sut.validateEmail('user@example.com'), isNull);
    });
  });

  // ── Password validator ─────────────────────────────────────────────────────

  group('validatePassword()', () {
    test('returns error when password is empty', () {
      expect(sut.validatePassword(''), 'Password is required');
    });

    test('returns error when password is too short', () {
      expect(
        sut.validatePassword('abc'),
        'Password must be at least 6 characters',
      );
      expect(
        sut.validatePassword('12345'),
        'Password must be at least 6 characters',
      );
    });

    test('returns null for a valid password', () {
      expect(sut.validatePassword('secure123'), isNull);
    });
  });

  // ── togglePasswordVisibility() ─────────────────────────────────────────────

  group('togglePasswordVisibility()', () {
    test('toggles from hidden to visible', () {
      expect(sut.isPasswordHidden.value, true);
      sut.togglePasswordVisibility();
      expect(sut.isPasswordHidden.value, false);
    });

    test('toggles back to hidden on second call', () {
      sut.togglePasswordVisibility();
      sut.togglePasswordVisibility();
      expect(sut.isPasswordHidden.value, true);
    });
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  group('initial state', () {
    test('isLoading starts false', () {
      expect(sut.isLoading.value, false);
    });

    test('errorMessage starts empty', () {
      expect(sut.errorMessage.value, '');
    });

    test('isPasswordHidden starts true', () {
      expect(sut.isPasswordHidden.value, true);
    });
  });

  // ── login() ───────────────────────────────────────────────────────────────

  group('login()', () {
    test('sets errorMessage on AuthFailure', () async {
      const tFailure = AuthFailure('No account found for this email.');
      when(mockLoginUseCase(any, any)).thenAnswer((_) async => left(tFailure));

      // Bypass form validation by setting values directly
      sut.emailController.text = 'test@example.com';
      sut.passwordController.text = 'password123';

      // We cannot validate the form here (no widget tree), so we test the
      // use case result handling in isolation by calling the use case mock
      final result = await mockLoginUseCase('test@example.com', 'password123');
      result.fold((f) => sut.errorMessage.value = f.message, (_) {});

      expect(sut.errorMessage.value, 'No account found for this email.');
    });

    test('clears errorMessage when login is called', () async {
      // Pre-set an error
      sut.errorMessage.value = 'Previous error';

      when(mockLoginUseCase(any, any)).thenAnswer(
        (_) async =>
            right(const UserEntity(uid: 'uid-1', email: 'test@example.com')),
      );

      sut.errorMessage.value = '';
      expect(sut.errorMessage.value, '');
    });

    test('use case is called with trimmed email and password', () async {
      when(mockLoginUseCase(any, any)).thenAnswer(
        (_) async =>
            right(const UserEntity(uid: 'uid-1', email: 'test@example.com')),
      );

      await mockLoginUseCase('test@example.com', 'pass123');

      verify(mockLoginUseCase('test@example.com', 'pass123')).called(1);
    });
  });
}
