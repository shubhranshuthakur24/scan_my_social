import 'package:dartz/dartz.dart';
import 'package:getx_starter/core/errors/failures.dart';

/// Base contract for every use case in the app.
///
/// [Type]   – the success return type (e.g. UserEntity, bool, void, …)
/// [Params] – the input parameters object; use [NoParams] when none are needed.
///
/// Example:
/// ```dart
/// class LoginUseCase extends UseCase<UserEntity, LoginParams> {
///   @override
///   Future<Either<Failure, UserEntity>> call(LoginParams params) { … }
/// }
/// ```
abstract class UseCase<Type, Params> {
  Future<Either<Failure, Type>> call(Params params);
}

/// Use as the [Params] type when a use case requires no input.
class NoParams {
  const NoParams();
}
