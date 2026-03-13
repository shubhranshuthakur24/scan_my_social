import 'package:dartz/dartz.dart';
import 'package:getx_starter/core/errors/failures.dart';

import '../entities/user_entity.dart';

/// Abstract contract that the data layer must fulfil.
abstract class AuthRepository {
  Future<Either<Failure, UserEntity>> login(String email, String password);
  Future<Either<Failure, UserEntity>> register(String email, String password);
  Future<Either<Failure, void>> logout();
  UserEntity? getCurrentUser();
}
