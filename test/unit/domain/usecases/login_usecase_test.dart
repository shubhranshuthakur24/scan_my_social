import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/core/errors/failures.dart';
import 'package:getx_starter/features/auth/domain/entites/user_entity.dart';
import 'package:getx_starter/features/auth/domain/usecases/login_usecase.dart';

import '../../../mocks/mocks.mocks.dart';

void main() {
  late LoginUseCase sut;
  late MockAuthRepository mockRepository;

  setUp(() {
    mockRepository = MockAuthRepository();
    sut = LoginUseCase(mockRepository);
  });

  const tEmail = 'test@example.com';
  const tPassword = 'password123';
  const tUser = UserEntity(uid: 'uid-001', email: tEmail);

  group('LoginUseCase', () {
    test('calls repository.login() with correct arguments', () async {
      when(
        mockRepository.login(any, any),
      ).thenAnswer((_) async => right(tUser));

      await sut(tEmail, tPassword);

      verify(mockRepository.login(tEmail, tPassword)).called(1);
      verifyNoMoreInteractions(mockRepository);
    });

    test('returns UserEntity on success', () async {
      when(
        mockRepository.login(any, any),
      ).thenAnswer((_) async => right(tUser));

      final result = await sut(tEmail, tPassword);

      expect(result, right(tUser));
    });

    test('returns AuthFailure when repository fails', () async {
      const tFailure = AuthFailure(
        'Invalid credentials. Check your email and password.',
      );
      when(
        mockRepository.login(any, any),
      ).thenAnswer((_) async => left(tFailure));

      final result = await sut(tEmail, tPassword);

      expect(result, left(tFailure));
    });

    test('propagates any failure type returned by repository', () async {
      const tFailure = NetworkFailure('Network error. Check your connection.');
      when(
        mockRepository.login(any, any),
      ).thenAnswer((_) async => left(tFailure));

      final result = await sut(tEmail, tPassword);

      expect(result.isLeft(), true);
      result.fold(
        (f) => expect(f, isA<NetworkFailure>()),
        (_) => fail('Expected Left'),
      );
    });
  });
}
