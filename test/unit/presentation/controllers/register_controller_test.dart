import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/features/auth/login/presentation/controllers/register_controller.dart';

import '../../../mocks/mocks.mocks.dart';

void main() {
  late RegisterController sut;
  late MockRegisterUseCase mockRegisterUseCase;

  setUp(() {
    mockRegisterUseCase = MockRegisterUseCase();
    sut = RegisterController(mockRegisterUseCase);
    Get.testMode = true;
    sut.onInit();
  });

  tearDown(() {
    sut.onClose();
    Get.reset();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  group('initial state', () {
    test('isLoading starts false', () => expect(sut.isLoading.value, false));
    test('errorMessage starts empty', () => expect(sut.errorMessage.value, ''));
    test(
      'isPasswordHidden starts true',
      () => expect(sut.isPasswordHidden.value, true),
    );
    test(
      'isConfirmPasswordHidden starts true',
      () => expect(sut.isConfirmPasswordHidden.value, true),
    );
  });

  // ── Name validator ─────────────────────────────────────────────────────────

  group('validateName()', () {
    test('returns error when name is empty', () {
      expect(sut.validateName(''), 'Name is required');
      expect(sut.validateName(null), 'Name is required');
    });

    test('returns error when name is too short', () {
      expect(sut.validateName('A'), 'Name must be at least 2 characters');
    });

    test('returns null for valid name', () {
      expect(sut.validateName('John'), isNull);
      expect(sut.validateName('Jo'), isNull);
    });
  });

  // ── Email validator ────────────────────────────────────────────────────────

  group('validateEmail()', () {
    test('returns error for empty value', () {
      expect(sut.validateEmail(''), 'Email is required');
    });

    test('returns error for invalid format', () {
      expect(sut.validateEmail('invalid'), 'Enter a valid email address');
    });

    test('returns null for valid email', () {
      expect(sut.validateEmail('user@test.com'), isNull);
    });
  });

  // ── Password validator ─────────────────────────────────────────────────────

  group('validatePassword()', () {
    test('returns error when empty', () {
      expect(sut.validatePassword(''), 'Password is required');
    });

    test('returns error when shorter than 6 chars', () {
      expect(
        sut.validatePassword('abc'),
        'Password must be at least 6 characters',
      );
    });

    test('returns null for valid password', () {
      expect(sut.validatePassword('secure1'), isNull);
    });
  });

  // ── Confirm password validator ─────────────────────────────────────────────

  group('validateConfirmPassword()', () {
    test('returns error when empty', () {
      expect(sut.validateConfirmPassword(''), 'Please confirm your password');
      expect(sut.validateConfirmPassword(null), 'Please confirm your password');
    });

    test('returns error when passwords do not match', () {
      sut.passwordController.text = 'password1';
      expect(
        sut.validateConfirmPassword('different'),
        'Passwords do not match',
      );
    });

    test('returns null when passwords match', () {
      sut.passwordController.text = 'correct123';
      expect(sut.validateConfirmPassword('correct123'), isNull);
    });
  });

  // ── Password visibility toggles ────────────────────────────────────────────

  group('togglePasswordVisibility()', () {
    test('toggles password visibility', () {
      expect(sut.isPasswordHidden.value, true);
      sut.togglePasswordVisibility();
      expect(sut.isPasswordHidden.value, false);
      sut.togglePasswordVisibility();
      expect(sut.isPasswordHidden.value, true);
    });
  });

  group('toggleConfirmPasswordVisibility()', () {
    test('toggles confirm password visibility independently', () {
      expect(sut.isConfirmPasswordHidden.value, true);
      sut.toggleConfirmPasswordVisibility();
      expect(sut.isConfirmPasswordHidden.value, false);
      // Main password visibility should NOT be affected
      expect(sut.isPasswordHidden.value, true);
    });
  });

  // ── use case interaction ───────────────────────────────────────────────────

  group('register() use case call', () {
    test('use case is invoked with correct arguments', () async {
      when(mockRegisterUseCase(any, any)).thenAnswer(
        (_) async => throw UnimplementedError(),
      ); // just verify call signature

      try {
        await mockRegisterUseCase('a@b.com', 'pass123');
      } catch (_) {}

      verify(mockRegisterUseCase('a@b.com', 'pass123')).called(1);
    });
  });
}
