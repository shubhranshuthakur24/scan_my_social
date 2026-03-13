import 'package:dartz/dartz.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:getx_starter/core/errors/failures.dart';
import 'package:getx_starter/features/auth/data/repos/auth_repository_impl.dart';
import 'package:getx_starter/features/auth/domain/entites/user_entity.dart';

import '../../../mocks/mocks.mocks.dart';

void main() {
  late AuthRepositoryImpl sut;
  late MockAuthRemoteDataSource mockDataSource;
  late MockUserCredential mockCredential;
  late MockUser mockFirebaseUser;

  setUp(() {
    mockDataSource = MockAuthRemoteDataSource();
    mockCredential = MockUserCredential();
    mockFirebaseUser = MockUser();
    sut = AuthRepositoryImpl(mockDataSource);

    // Default stubs for mockFirebaseUser properties
    when(mockFirebaseUser.uid).thenReturn('uid-test');
    when(mockFirebaseUser.email).thenReturn('test@example.com');
    when(mockFirebaseUser.displayName).thenReturn(null);
  });

  const tEmail = 'test@example.com';
  const tPassword = 'pass1234';

  // ── login() ──────────────────────────────────────────────────────────────

  group('login()', () {
    test('returns UserEntity on success', () async {
      when(mockCredential.user).thenReturn(mockFirebaseUser);
      when(
        mockDataSource.login(tEmail, tPassword),
      ).thenAnswer((_) async => mockCredential);

      final result = await sut.login(tEmail, tPassword);

      expect(result.isRight(), true);
      result.fold((_) => fail('Expected Right'), (user) {
        expect(user, isA<UserEntity>());
        expect(user.uid, 'uid-test');
        expect(user.email, tEmail);
      });
    });

    test('returns AuthFailure when credential.user is null', () async {
      when(mockCredential.user).thenReturn(null);
      when(
        mockDataSource.login(tEmail, tPassword),
      ).thenAnswer((_) async => mockCredential);

      final result = await sut.login(tEmail, tPassword);

      expect(
        result,
        left(const AuthFailure('Login failed: no user returned.')),
      );
    });

    test(
      'returns AuthFailure on FirebaseAuthException: user-not-found',
      () async {
        when(
          mockDataSource.login(tEmail, tPassword),
        ).thenThrow(FirebaseAuthException(code: 'user-not-found'));

        final result = await sut.login(tEmail, tPassword);

        result.fold((f) {
          expect(f, isA<AuthFailure>());
          expect(f.message, 'No account found for this email.');
        }, (_) => fail('Expected Left'));
      },
    );

    test(
      'returns AuthFailure on FirebaseAuthException: wrong-password',
      () async {
        when(
          mockDataSource.login(tEmail, tPassword),
        ).thenThrow(FirebaseAuthException(code: 'wrong-password'));

        final result = await sut.login(tEmail, tPassword);

        result.fold(
          (f) => expect(f.message, 'Incorrect password. Please try again.'),
          (_) => fail('Expected Left'),
        );
      },
    );

    test(
      'returns AuthFailure on FirebaseAuthException: invalid-credential',
      () async {
        when(
          mockDataSource.login(tEmail, tPassword),
        ).thenThrow(FirebaseAuthException(code: 'invalid-credential'));

        final result = await sut.login(tEmail, tPassword);

        result.fold(
          (f) => expect(
            f.message,
            'Invalid credentials. Check your email and password.',
          ),
          (_) => fail('Expected Left'),
        );
      },
    );

    test('returns UnknownFailure on generic exception', () async {
      when(
        mockDataSource.login(tEmail, tPassword),
      ).thenThrow(Exception('Unexpected error'));

      final result = await sut.login(tEmail, tPassword);

      result.fold(
        (f) => expect(f, isA<UnknownFailure>()),
        (_) => fail('Expected Left'),
      );
    });
  });

  // ── register() ────────────────────────────────────────────────────────────

  group('register()', () {
    test('returns UserEntity on success', () async {
      when(mockCredential.user).thenReturn(mockFirebaseUser);
      when(
        mockDataSource.register(tEmail, tPassword),
      ).thenAnswer((_) async => mockCredential);

      final result = await sut.register(tEmail, tPassword);

      expect(result.isRight(), true);
      result.fold(
        (_) => fail('Expected Right'),
        (user) => expect(user.email, tEmail),
      );
    });

    test('returns AuthFailure when credential.user is null', () async {
      when(mockCredential.user).thenReturn(null);
      when(
        mockDataSource.register(tEmail, tPassword),
      ).thenAnswer((_) async => mockCredential);

      final result = await sut.register(tEmail, tPassword);

      expect(
        result,
        left(const AuthFailure('Registration failed: no user returned.')),
      );
    });

    test('returns AuthFailure on FirebaseAuthException', () async {
      when(
        mockDataSource.register(tEmail, tPassword),
      ).thenThrow(FirebaseAuthException(code: 'email-already-in-use'));

      final result = await sut.register(tEmail, tPassword);

      result.fold(
        (f) => expect(f, isA<AuthFailure>()),
        (_) => fail('Expected Left'),
      );
    });
  });

  // ── logout() ──────────────────────────────────────────────────────────────

  group('logout()', () {
    test('returns right(null) on success', () async {
      when(mockDataSource.logout()).thenAnswer((_) async {});

      final result = await sut.logout();

      expect(result, right(null));
      verify(mockDataSource.logout()).called(1);
    });

    test('returns UnknownFailure on exception', () async {
      when(mockDataSource.logout()).thenThrow(Exception('Sign out failed'));

      final result = await sut.logout();

      result.fold(
        (f) => expect(f, isA<UnknownFailure>()),
        (_) => fail('Expected Left'),
      );
    });
  });

  // ── getCurrentUser() ──────────────────────────────────────────────────────

  group('getCurrentUser()', () {
    test('returns UserEntity when user is signed in', () {
      when(mockDataSource.currentUser).thenReturn(mockFirebaseUser);

      final result = sut.getCurrentUser();

      expect(result, isA<UserEntity>());
      expect(result?.uid, 'uid-test');
    });

    test('returns null when no user is signed in', () {
      when(mockDataSource.currentUser).thenReturn(null);

      final result = sut.getCurrentUser();

      expect(result, isNull);
    });
  });
}
