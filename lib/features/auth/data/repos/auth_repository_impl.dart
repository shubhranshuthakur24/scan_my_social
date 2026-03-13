import 'package:dartz/dartz.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:getx_starter/core/errors/failures.dart';
import 'package:getx_starter/core/utils/app_logger.dart';
import 'package:getx_starter/features/auth/data/sources/remote/auth_remote_datasource.dart';
import 'package:getx_starter/features/auth/domain/entities/user_entity.dart';
import 'package:getx_starter/features/auth/domain/repos/auth_repository.dart';

import '../model/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;

  const AuthRepositoryImpl(this.remoteDataSource);

  static const _tag = 'AuthRepository';

  @override
  Future<Either<Failure, UserEntity>> login(
    String email,
    String password,
  ) async {
    AppLogger.info('Attempting login for: $email', tag: _tag);
    try {
      final credential = await remoteDataSource.login(email, password);
      final user = credential.user;
      if (user == null) {
        AppLogger.warning('Login returned null user', tag: _tag);
        return left(const AuthFailure('Login failed: no user returned.'));
      }
      AppLogger.info('Login successful — uid: ${user.uid}', tag: _tag);
      return right(UserModel.fromFirebaseUser(user));
    } on FirebaseAuthException catch (e, st) {
      final message = _mapFirebaseError(e.code);
      AppLogger.warning(
        'FirebaseAuthException [${e.code}]: $message',
        tag: _tag,
        error: e,
      );
      AppLogger.debug('Stack trace: $st', tag: _tag);
      return left(AuthFailure(message));
    } catch (e, st) {
      AppLogger.error(
        'Unexpected login error',
        tag: _tag,
        error: e,
        stackTrace: st,
      );
      return left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> register(
    String email,
    String password,
  ) async {
    AppLogger.info('Attempting registration for: $email', tag: _tag);
    try {
      final credential = await remoteDataSource.register(email, password);
      final user = credential.user;
      if (user == null) {
        AppLogger.warning('Registration returned null user', tag: _tag);
        return left(
          const AuthFailure('Registration failed: no user returned.'),
        );
      }
      AppLogger.info('Registration successful — uid: ${user.uid}', tag: _tag);
      return right(UserModel.fromFirebaseUser(user));
    } on FirebaseAuthException catch (e, st) {
      final message = _mapFirebaseError(e.code);
      AppLogger.warning(
        'FirebaseAuthException [${e.code}]: $message',
        tag: _tag,
        error: e,
      );
      AppLogger.debug('Stack trace: $st', tag: _tag);
      return left(AuthFailure(message));
    } catch (e, st) {
      AppLogger.error(
        'Unexpected registration error',
        tag: _tag,
        error: e,
        stackTrace: st,
      );
      return left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    AppLogger.info('Logging out current user', tag: _tag);
    try {
      await remoteDataSource.logout();
      AppLogger.info('Logout successful', tag: _tag);
      return right(null);
    } catch (e, st) {
      AppLogger.error('Logout failed', tag: _tag, error: e, stackTrace: st);
      return left(UnknownFailure(e.toString()));
    }
  }

  @override
  UserEntity? getCurrentUser() {
    final user = remoteDataSource.currentUser;
    if (user == null) {
      AppLogger.debug('getCurrentUser → no user signed in', tag: _tag);
      return null;
    }
    AppLogger.debug('getCurrentUser → uid: ${user.uid}', tag: _tag);
    return UserModel.fromFirebaseUser(user);
  }

  String _mapFirebaseError(String code) {
    switch (code) {
      case 'user-not-found':
        return 'No account found for this email.';
      case 'wrong-password':
        return 'Incorrect password. Please try again.';
      case 'invalid-email':
        return 'The email address is not valid.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'invalid-credential':
        return 'Invalid credentials. Check your email and password.';
      case 'network-request-failed':
        return 'Network error. Check your connection.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }
}
