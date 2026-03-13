import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/core/errors/failures.dart';
import 'package:getx_starter/features/auth/domain/entites/user_entity.dart';
import 'package:getx_starter/features/auth/domain/usecases/register_usecase.dart';

import '../../../mocks/mocks.mocks.dart';

void main() {
  late RegisterUseCase sut;
  late MockAuthRepository mockRepository;

  setUp(() {
    mockRepository = MockAuthRepository();
    sut = RegisterUseCase(mockRepository);
  });

  const tEmail = 'newuser@example.com';
  const tPassword = 'securePass1';
  const tUser = UserEntity(uid: 'uid-002', email: tEmail);

  group('RegisterUseCase', () {
    test('calls repository.register() with correct arguments', () async {
      when(
        mockRepository.register(any, any),
      ).thenAnswer((_) async => right(tUser));

      await sut(tEmail, tPassword);

      verify(mockRepository.register(tEmail, tPassword)).called(1);
      verifyNoMoreInteractions(mockRepository);
    });

    test('returns UserEntity on success', () async {
      when(
        mockRepository.register(any, any),
      ).thenAnswer((_) async => right(tUser));

      final result = await sut(tEmail, tPassword);

      expect(result, right(tUser));
    });

    test('returns AuthFailure when email already in use', () async {
      const tFailure = AuthFailure('Authentication failed. Please try again.');
      when(
        mockRepository.register(any, any),
      ).thenAnswer((_) async => left(tFailure));

      final result = await sut(tEmail, tPassword);

      expect(result, left(tFailure));
    });

    test('returns UnknownFailure on unexpected error', () async {
      const tFailure = UnknownFailure('Something went wrong');
      when(
        mockRepository.register(any, any),
      ).thenAnswer((_) async => left(tFailure));

      final result = await sut(tEmail, tPassword);

      result.fold(
        (f) => expect(f, isA<UnknownFailure>()),
        (_) => fail('Expected Left'),
      );
    });
  });
}
