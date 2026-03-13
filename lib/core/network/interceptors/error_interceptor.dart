import 'package:dio/dio.dart';
import 'package:getx_starter/core/errors/failures.dart';
import 'package:getx_starter/core/utils/app_logger.dart';

/// Maps [DioException] types to domain [Failure] objects and re-throws
/// them so callers can handle errors uniformly.
class ErrorInterceptor extends Interceptor {
  static const _tag = 'ErrorInterceptor';

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final Failure failure;

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        failure = const NetworkFailure('Request timed out. Please try again.');

      case DioExceptionType.connectionError:
        failure = const NetworkFailure(
          'No internet connection. Check your network and try again.',
        );

      case DioExceptionType.badResponse:
        final status = err.response?.statusCode ?? 0;
        final message =
            _extractMessage(err.response) ??
            err.response?.statusMessage ??
            'Server error ($status)';
        failure = ApiFailure(status, message);

      case DioExceptionType.cancel:
        failure = const UnknownFailure('Request was cancelled.');

      default:
        failure = UnknownFailure(
          err.message ?? 'An unexpected error occurred.',
        );
    }

    AppLogger.error(
      '[${err.response?.statusCode ?? err.type.name}] ${failure.message}',
      tag: _tag,
    );

    // Attach the domain Failure so data-source catch blocks can read it.
    handler.next(err.copyWith(error: failure));
  }

  /// Tries to pull a human-readable message from common API response shapes:
  /// `{ "message": "..." }`, `{ "error": "..." }`, `{ "errors": [...] }`.
  String? _extractMessage(Response? response) {
    try {
      final data = response?.data;
      if (data is Map) {
        return (data['message'] ?? data['error'] ?? data['errors']?.first)
            ?.toString();
      }
    } catch (_) {}
    return null;
  }
}
