import 'package:equatable/equatable.dart';

abstract class Failure extends Equatable {
  final String message;
  const Failure(this.message);

  @override
  List<Object> get props => [message];
}

class AuthFailure extends Failure {
  const AuthFailure(super.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

/// Represents a non-2xx HTTP response from the remote API.
class ApiFailure extends Failure {
  final int statusCode;

  const ApiFailure(this.statusCode, String message) : super(message);

  @override
  List<Object> get props => [statusCode, message];
}

class UnknownFailure extends Failure {
  const UnknownFailure(super.message);
}
